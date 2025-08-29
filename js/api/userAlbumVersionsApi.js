// Remove a version by index for the current user and album
export async function removeUserAlbumVersion(albumId, versionIdx) {
  const user = await getCurrentUser();
  if (!user) return { error: "No user" };
  const supabase = await supabasePromise;
  // Fetch current versions
  const { data, error: fetchError } = await supabase
    .from("user_album_versions")
    .select("versions")
    .eq("user_id", user.id)
    .eq("album_id", albumId)
    .single();
  if (fetchError || !data || !Array.isArray(data.versions)) {
    return { error: fetchError || "No versions found" };
  }
  const versions = [...data.versions];
  if (versionIdx < 0 || versionIdx >= versions.length) {
    return { error: "Invalid version index" };
  }
  versions.splice(versionIdx, 1);
  // Update the row with the new versions array
  const { error: updateError } = await supabase.from("user_album_versions").upsert(
    {
      user_id: user.id,
      album_id: albumId,
      versions: versions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: ["user_id", "album_id"] }
  );
  return { error: updateError };
}
// Batch fetch all user album versions for a list of album IDs
export async function fetchUserAlbumVersionsBatch(albumIds) {
  const user = await getCurrentUser();
  if (!user || !Array.isArray(albumIds) || albumIds.length === 0) return {};
  const supabase = await supabasePromise;
  const { data, error } = await supabase
    .from("user_album_versions")
    .select("album_id, versions")
    .eq("user_id", user.id)
    .in("album_id", albumIds);
  if (error || !data) return {};
  // Return a map: { albumId: versionsArray }
  const result = {};
  for (const row of data) {
    result[row.album_id] = Array.isArray(row.versions) ? row.versions : [];
  }
  return result;
}
import { supabasePromise } from "./supabaseClient.js";
import { getCurrentUser } from "../auth.js";

// Fetch the current user's versions for a given album
export async function fetchUserAlbumVersions(albumId) {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await supabasePromise;
  const { data, error } = await supabase
    .from("user_album_versions")
    .select("versions")
    .eq("user_id", user.id)
    .eq("album_id", albumId)
    .single();
  if (error || !data) return [];
  return Array.isArray(data.versions) ? data.versions : [];
}

// Upsert (insert or update) the current user's versions for a given album
export async function upsertUserAlbumVersions(albumId, versions) {
  const user = await getCurrentUser();
  if (!user) return { error: "No user" };
  const supabase = await supabasePromise;
  const { error } = await supabase.from("user_album_versions").upsert(
    {
      user_id: user.id,
      album_id: albumId,
      versions: versions,
      updated_at: new Date().toISOString(),
    },
    { onConflict: ["user_id", "album_id"] }
  );
  return { error };
}
