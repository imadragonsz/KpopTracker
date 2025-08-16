// Handles user authentication (login, register, logout) using Supabase Auth
import { supabase } from "./api/supabaseClient.js";

if (!supabase) {
  throw new Error(
    "Supabase client is not initialized. Check that the CDN script is loaded and supabaseClient.js is correct."
  );
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
