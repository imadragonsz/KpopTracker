// Remove the current user from a group's user_id array (soft remove)
export async function removeUserFromGroup(groupId) {
  const user = await getCurrentUser();
  if (!user) return { error: "No user" };
  const supabase = await supabasePromise;
  // Fetch current user_id array
  const { data: groups, error } = await supabase
    .from("groups")
    .select("user_id")
    .eq("id", groupId);
  if (error || !groups || !groups.length) {
    console.error("[removeUserFromGroup] Error fetching group:", error);
    return { error };
  }
  let userIds = groups[0].user_id || [];
  userIds = userIds.filter((uid) => uid !== user.id);
  if (userIds.length === 0) {
    // No users left, delete group
    await supabase.from("groups").delete().eq("id", groupId);
    return { deleted: true };
  } else {
    // Update user_id array
    const { error: updateError } = await supabase
      .from("groups")
      .update({ user_id: userIds })
      .eq("id", groupId);
    if (updateError) {
      console.error("[removeUserFromGroup] Error updating group:", updateError);
      return { error: updateError };
    }
    return { removed: true };
  }
}
import { supabasePromise } from "./supabaseClient.js";
import { getCurrentUser } from "../auth.js";

export async function fetchGroups() {
  const user = await getCurrentUser();
  if (!user) return [];
  const cacheKey = `groups_${user.id}`;
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
    fetchGroups._backgroundRefresh = fetchGroups._backgroundRefresh || false;
    if (!fetchGroups._backgroundRefresh) {
      fetchGroups._backgroundRefresh = true;
      fetchGroups._refreshPromise = (async () => {
        const supabase = await supabasePromise;
        const { data, error } = await supabase.from("groups").select("*");
        if (!error && data) {
          const filtered = (data || []).filter(
            (g) => Array.isArray(g.user_id) && g.user_id.includes(user.id)
          );
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ _ts: Date.now(), data: filtered })
          );
        }
        fetchGroups._backgroundRefresh = false;
      })();
    }
    return cached;
  }
  // No cache, fetch from backend
  const supabase = await supabasePromise;
  const { data, error } = await supabase.from("groups").select("*");
  if (error) return [];
  const filtered = (data || []).filter(
    (g) => Array.isArray(g.user_id) && g.user_id.includes(user.id)
  );
  localStorage.setItem(
    cacheKey,
    JSON.stringify({ _ts: Date.now(), data: filtered })
  );
  return filtered;
}

export async function addGroup(name, image, notes) {
  const user = await getCurrentUser();
  if (!user) {
    console.error("[DEBUG] addGroup: No user logged in");
    return { error: "No user" };
  }
  const supabase = await supabasePromise;
  // Always insert user_id as array
  const { data, error } = await supabase
    .from("groups")
    .insert([{ name, image, notes, user_id: [user.id] }]);
  if (error) {
    console.error("[DEBUG] addGroup: Supabase error", error);
    return { error };
  }
  return { data };
}

export async function updateGroup(id, name, image, notes) {
  const supabase = await supabasePromise;
  const { data, error } = await supabase
    .from("groups")
    .update({ name, image, notes })
    .eq("id", id)
    .select()
    .throwOnError();
  return { data, error };
}
