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
  if (!user) {
    console.error("[DEBUG] addAlbum: No user logged in");
    return { error: "No user" };
  }
  // Remove root-level onTheWay property if present
  const { onTheWay, ...albumToSave } = album;
  const { data, error } = await supabase
    .from("albums")
    .insert([{ ...albumToSave, user_id: user.id }]);
  if (error) {
    console.error("[DEBUG] addAlbum: Supabase error", error);
    return { error };
  }
  console.log("[DEBUG] addAlbum: Supabase insert data", data);
  return { data };
}

export async function updateAlbum(id, album) {
  const user = await getCurrentUser();
  if (!user) return { error: "No user" };
  // Remove root-level onTheWay property if present
  const { onTheWay, ...albumToSave } = album;
  const { data, error } = await supabase
    .from("albums")
    .update(albumToSave)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[DEBUG] updateAlbum: Supabase error", error);
    return { error };
  }
  return { data };
}

export async function deleteAlbum(id) {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase.from("albums").delete().eq("id", id).eq("user_id", user.id);
}
