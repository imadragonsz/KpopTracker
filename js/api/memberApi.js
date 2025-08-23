// Remove member by id (for modal usage)
export async function removeMember(id) {
  // This is just an alias for deleteMember for UI clarity
  return await deleteMember(id);
}
import { supabasePromise } from "./supabaseClient.js";
import { getCurrentUser } from "../auth.js";

export async function fetchMembersByGroup(groupId) {
  const user = await getCurrentUser();
  if (!user) return [];
  const cacheKey = `members_${groupId}_${user.id}`;
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
    fetchMembersByGroup._backgroundRefresh =
      fetchMembersByGroup._backgroundRefresh || {};
    if (!fetchMembersByGroup._backgroundRefresh[groupId]) {
      fetchMembersByGroup._backgroundRefresh[groupId] = true;
      fetchMembersByGroup._refreshPromise = (async () => {
        const supabase = await supabasePromise;
        const { data, error } = await supabase
          .from("members")
          .select("id, group_id, name, info, image, birthday, height, user_id")
          .eq("group_id", groupId);
        if (!error && data) {
          const filtered = (data || []).filter(
            (m) => Array.isArray(m.user_id) && m.user_id.includes(user.id)
          );
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ _ts: Date.now(), data: filtered })
          );
        }
        fetchMembersByGroup._backgroundRefresh[groupId] = false;
      })();
    }
    return cached;
  }
  // No cache, fetch from backend
  const supabase = await supabasePromise;
  const { data, error } = await supabase
    .from("members")
    .select("id, group_id, name, info, image, birthday, height, user_id")
    .eq("group_id", groupId);
  if (error) {
    console.error("[fetchMembersByGroup] Error:", error);
    return [];
  }
  const filtered = (data || []).filter(
    (m) => Array.isArray(m.user_id) && m.user_id.includes(user.id)
  );
  localStorage.setItem(
    cacheKey,
    JSON.stringify({ _ts: Date.now(), data: filtered })
  );
  return filtered;
}

export async function addMember(groupId, name, info, image, birthday, height) {
  const user = await getCurrentUser();
  if (!user) return;
  // Capitalize first letter of name
  const capName = name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
  const memberData = {
    group_id: groupId,
    name: capName,
    info,
    image,
    birthday: birthday ? birthday : null,
    height: height ? height : null,
    user_id: [user.id],
  };
  const supabase = await supabasePromise;
  const { error } = await supabase.from("members").insert([memberData]);
  if (error) console.error("Add member error:", error);
}

export async function updateMember(id, name, info, image, birthday, height) {
  // ...removed debug log...
  // Convert empty string birthday/height to null for Postgres compatibility
  const safeBirthday = birthday === "" ? null : birthday;
  const safeHeight = height === "" ? null : height;
  const user = await getCurrentUser();
  if (!user) {
    console.error("[updateMember] No user found.");
    return;
  }
  const supabase = await supabasePromise;
  // Fetch member by id
  const { data: members, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", id);
  if (error || !members || !members.length) {
    console.error(
      "[updateMember] Error fetching member:",
      error,
      "Fetched:",
      members
    );
    return;
  }
  // ...removed debug log...
  const userIds = members[0].user_id || [];
  if (!userIds.includes(user.id)) {
    console.warn(
      "[updateMember] User does not have permission to update this member"
    );
    return;
  }
  const { data, error: updateError } = await supabase
    .from("members")
    .update({ name, info, image, birthday: safeBirthday, height: safeHeight })
    .eq("id", id);
  if (updateError) {
    console.error("[updateMember] Update error:", updateError);
  } else {
    // ...removed debug log...
  }
}

export async function deleteMember(id) {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await supabasePromise;
  // Fetch member by id
  const { data: members, error } = await supabase
    .from("members")
    .select("user_id")
    .eq("id", id);
  if (error || !members || !members.length) {
    console.error("[deleteMember] Error fetching member:", error);
    return;
  }
  const userIds = members[0].user_id || [];
  if (!userIds.includes(user.id)) {
    console.warn(
      "[deleteMember] User does not have permission to delete this member"
    );
    return;
  }
  await supabase.from("members").delete().eq("id", id);
}
