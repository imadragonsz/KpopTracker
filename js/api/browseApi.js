// browseApi.js
// API for fetching all groups/albums and adding to user collection
import { supabasePromise } from "./supabaseClient.js";
import { getCurrentUser } from "../auth.js";

export async function fetchAllGroups() {
  const supabase = await supabasePromise;
  const { data, error } = await supabase.from("groups").select("*");
  return data || [];
}

export async function fetchAllAlbums() {
  const supabase = await supabasePromise;
  const { data, error } = await supabase.from("albums").select("*");
  return data || [];
}

export async function addAlbumToUser(albumId) {
  const supabase = await supabasePromise;
  const user = await getCurrentUser();
  if (!user) {
    console.error("[addAlbumToUser] Not logged in");
    return { success: false, error: "Not logged in" };
  }
  // Fetch album data
  const { data: albums, error: fetchError } = await supabase
    .from("albums")
    .select("user_id")
    .eq("id", albumId);
  console.log("[addAlbumToUser] Fetched album:", albums, "Error:", fetchError);
  if (!albums || !albums.length) {
    console.error("[addAlbumToUser] Album not found for id:", albumId);
    return { success: false, error: "Album not found" };
  }
  let userIds = albums[0].user_id || [];
  console.log("[addAlbumToUser] userIds before:", userIds, "user:", user.id);
  if (!userIds.includes(user.id)) {
    userIds.push(user.id);
    const { error: updateError } = await supabase
      .from("albums")
      .update({ user_id: userIds })
      .eq("id", albumId);
    if (updateError) {
      console.error("[addAlbumToUser] Error updating album:", updateError);
      return { success: false, error: updateError };
    }
    // Clear album cache for this user so fetchAlbums gets fresh data
    try {
      localStorage.removeItem(`albums_${user.id}`);
    } catch {}
    console.log(
      "[addAlbumToUser] Album updated for id:",
      albumId,
      "userIds:",
      userIds
    );
    return { success: true };
  } else {
    // Already in collection
    console.warn(
      "[addAlbumToUser] Album already in collection for user:",
      user.id,
      "albumId:",
      albumId
    );
    return {
      success: false,
      error: { code: "23505", message: "Already in your collection" },
    };
  }
}

export async function addGroupToUser(groupId) {
  const supabase = await supabasePromise;
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Not logged in" };
  // Fetch group data
  const { data: groups } = await supabase
    .from("groups")
    .select("user_id")
    .eq("id", groupId);
  if (!groups || !groups.length)
    return { success: false, error: "Group not found" };
  let userIds = groups[0].user_id || [];
  if (!userIds.includes(user.id)) {
    userIds.push(user.id);
    const { error } = await supabase
      .from("groups")
      .update({ user_id: userIds })
      .eq("id", groupId);
    if (error) return { success: false, error };
    return { success: true };
  } else {
    // Already in collection
    return {
      success: false,
      error: { code: "23505", message: "Already in your collection" },
    };
  }
}
