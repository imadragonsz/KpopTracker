import { supabase } from "./supabaseClient.js";
import { getCurrentUser } from "../auth.js";

export async function fetchGroups() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("user_id", user.id);
  return data || [];
}

export async function addGroup(name, image, notes) {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase
    .from("groups")
    .insert([{ name, image, notes, user_id: user.id }]);
}

export async function updateGroup(id, name, image, notes) {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase
    .from("groups")
    .update({ name, image, notes })
    .eq("id", id)
    .eq("user_id", user.id);
}
