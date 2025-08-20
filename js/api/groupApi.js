// Remove the current user from a group's user_id array (soft remove)
export async function removeUserFromGroup(groupId) {
  const user = await getCurrentUser();
  if (!user) {
    console.error("[removeUserFromGroup] No user logged in");
    return { error: "No user" };
  }
  // Clear group cache for this user
  try {
    localStorage.removeItem(`groups_${user.id}`);
  } catch {}
  const supabase = await supabasePromise;
  // Fetch current user_id array
  const { data: groups, error } = await supabase
    .from("groups")
    .select("user_id")
    .eq("id", groupId);
  // ...existing code...
  if (error || !groups || !groups.length) {
    console.error(
      "[removeUserFromGroup] Error fetching group:",
      error,
      "groupId:",
      groupId
    );
    return { error };
  }
  let userIds = groups[0].user_id || [];
  // ...existing code...
  userIds = userIds.filter((uid) => String(uid) !== String(user.id));
  // ...existing code...
  // Always update user_id array, never delete group row
  const { error: updateError, data: updateData } = await supabase
    .from("groups")
    .update({ user_id: userIds })
    .eq("id", groupId)
    .select();
  if (updateError) {
    console.error(
      "[removeUserFromGroup] Error updating group:",
      updateError,
      "groupId:",
      groupId,
      "userIds:",
      userIds
    );
    alert(
      "[removeUserFromGroup] Error updating group: " +
        (updateError.message || updateError)
    );
    return { error: updateError };
  }
  // ...existing code...
  if (!updateData || !Array.isArray(updateData) || !updateData.length) {
    alert(
      "[removeUserFromGroup] No data returned from update. Check Supabase table and permissions."
    );
  }
  return { removed: true, updateData };
}
import { supabasePromise } from "./supabaseClient.js";
import { getCurrentUser } from "../auth.js";

export async function fetchGroups() {
  const user = await getCurrentUser();
  if (!user) return [];
  // BYPASS CACHE: Always fetch fresh data from Supabase
  const supabase = await supabasePromise;
  const { data, error } = await supabase.from("groups").select("*");
  if (error) return [];
  const filtered = (data || []).filter(
    (g) =>
      Array.isArray(g.user_id) &&
      g.user_id.some((uid) => String(uid) === String(user.id))
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
