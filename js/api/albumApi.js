import { supabase } from "./supabaseClient.js";
import { getCurrentUser } from "../auth.js";

export async function fetchAlbums() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .eq("user_id", user.id);
  return data || [];
}

export async function addAlbum(album) {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase.from("albums").insert([{ ...album, user_id: user.id }]);
}

export async function updateAlbum(id, album) {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase
    .from("albums")
    .update(album)
    .eq("id", id)
    .eq("user_id", user.id);
}

export async function deleteAlbum(id) {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase.from("albums").delete().eq("id", id).eq("user_id", user.id);
}
