import { supabase } from "./supabaseClient.js";
import { getCurrentUser } from "../auth.js";

export async function fetchMembersByGroup(groupId) {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("members")
    .select("id, group_id, name, info, image, birthday, height")
    .eq("group_id", groupId)
    .eq("user_id", user.id);
  return data || [];
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
    user_id: user.id,
  };
  const { error } = await supabase.from("members").insert([memberData]);
  if (error) console.error("Add member error:", error);
}

export async function updateMember(id, name, info, image, birthday, height) {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase
    .from("members")
    .update({ name, info, image, birthday, height })
    .eq("id", id)
    .eq("user_id", user.id);
}

export async function deleteMember(id) {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase.from("members").delete().eq("id", id).eq("user_id", user.id);
}
