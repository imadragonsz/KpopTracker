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
  if (!user) return { success: false, error: "Not logged in" };
  // Fetch album data
  const { data: albums } = await supabase
    .from("albums")
    .select("user_id")
    .eq("id", albumId);
  if (!albums || !albums.length)
    return { success: false, error: "Album not found" };
  let userIds = albums[0].user_id || [];
  if (!userIds.includes(user.id)) {
    userIds.push(user.id);
    const { error } = await supabase
      .from("albums")
      .update({ user_id: userIds })
      .eq("id", albumId);
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
