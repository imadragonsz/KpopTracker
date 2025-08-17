// Handles user authentication (login, register, logout) using Supabase Auth
import { supabasePromise } from "./api/supabaseClient.js";

export async function signUp(email, password) {
  const supabase = await supabasePromise;
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signIn(email, password) {
  const supabase = await supabasePromise;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const supabase = await supabasePromise;
  const { error } = await supabase.auth.signOut();
  return { error };
}

export function onAuthStateChange(callback) {
  return supabasePromise.then((supabase) =>
    supabase.auth.onAuthStateChange(callback)
  );
}

export async function getCurrentUser() {
  const supabase = await supabasePromise;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
