import { supabasePromise } from "./supabaseClient.js";
import { getCurrentUser } from "../auth.js";

export async function fetchAlbums() {
  const user = await getCurrentUser();
  if (!user) return [];
  const cacheKey = `albums_${user.id}`;
  const cacheTTL = 5 * 60 * 1000; // 5 minutes
  let cached = null;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed._ts && Date.now() - parsed._ts < cacheTTL) {
        cached = parsed.data;
      }
    }
  } catch {}
  if (cached) {
    // Fetch in background to update cache
    fetchAlbums._backgroundRefresh = fetchAlbums._backgroundRefresh || false;
    if (!fetchAlbums._backgroundRefresh) {
      fetchAlbums._backgroundRefresh = true;
      fetchAlbums._refreshPromise = (async () => {
        const supabase = await supabasePromise;
        const { data, error } = await supabase
          .from("albums")
          .select("*")
          .filter("user_id", "cs", `[\"${user.id}\"]`);
        if (!error && data) {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ _ts: Date.now(), data })
          );
        }
        fetchAlbums._backgroundRefresh = false;
      })();
    }
    return cached;
  }
  // No cache, fetch from backend
  const supabase = await supabasePromise;
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .filter("user_id", "cs", `[\"${user.id}\"]`);
  if (error) return [];
  localStorage.setItem(cacheKey, JSON.stringify({ _ts: Date.now(), data }));
  return data || [];
}

export async function addAlbum(album) {
  const user = await getCurrentUser();
  if (!user) {
    console.error("[DEBUG] addAlbum: No user logged in");
    return { error: "No user" };
  }
  // Remove root-level onTheWay property if present
  const { onTheWay, ...albumToSave } = album;
  // Check if album exists (by unique fields, e.g., album name & group)
  const supabase = await supabasePromise;
  const { data: existing } = await supabase
    .from("albums")
    .select("id, user_id")
    .eq("album", albumToSave.album)
    .eq("group", albumToSave.group);
  if (existing && existing.length > 0) {
    // Update user_id array if not present
    const albumId = existing[0].id;
    let userIds = existing[0].user_id || [];
    if (!userIds.includes(user.id)) {
      userIds.push(user.id);
      await supabase
        .from("albums")
        .update({ user_id: userIds })
        .eq("id", albumId);
    }
    return { data: { id: albumId }, updated: true };
  } else {
    // Insert new album with user_id array
    const { data, error } = await supabase
      .from("albums")
      .insert([{ ...albumToSave, user_id: [user.id] }]);
    if (error) {
      console.error("[DEBUG] addAlbum: Supabase error", error);
      return { error };
    }
    return { data };
  }
}

export async function updateAlbum(id, album) {
  // No user_id filtering here, just update the album fields
  const { onTheWay, ...albumToSave } = album;
  const supabase = await supabasePromise;
  const { data, error } = await supabase
    .from("albums")
    .update(albumToSave)
    .eq("id", id);
  if (error) {
    console.error("[DEBUG] updateAlbum: Supabase error", error);
    return { error };
  }
  return { data };
}

export async function deleteAlbum(id) {
  const user = await getCurrentUser();
  if (!user) {
    console.error("[deleteAlbum] No user found");
    return;
  }
  const supabase = await supabasePromise;
  const { data: albums, error: fetchError } = await supabase
    .from("albums")
    .select("user_id")
    .eq("id", id);
  if (fetchError) {
    console.error("[deleteAlbum] Error fetching album:", fetchError);
    return;
  }
  if (!albums || !albums.length) {
    console.warn("[deleteAlbum] No album found with id", id);
    return;
  }
  let userIds = Array.isArray(albums[0].user_id) ? [...albums[0].user_id] : [];
  console.log("[deleteAlbum] userIds before:", userIds);
  // Remove the user from the array (as UUID string)
  userIds = userIds.filter((uid) => String(uid) !== String(user.id));
  console.log("[deleteAlbum] userIds after removal:", userIds);
  // Only update if the user was present
  if (albums[0].user_id.some((uid) => String(uid) === String(user.id))) {
    const { error: updateError } = await supabase
      .from("albums")
      .update({ user_id: userIds })
      .eq("id", id);
    if (updateError) {
      console.error("[deleteAlbum] Error updating user_id array:", updateError);
    } else {
      console.log("[deleteAlbum] user_id updated:", userIds);
    }
  } else {
    console.warn(
      "[deleteAlbum] User not present in user_id array, no update performed."
    );
  }
}
