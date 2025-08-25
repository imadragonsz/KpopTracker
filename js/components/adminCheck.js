// Helper to check if the current user is an admin (client-side, mirrors photocardGallery.js)
import { supabasePromise } from "../api/supabaseClient.js";

let isAdmin = false;
let lastCheckedUserId = null;
let lastCheckedIsAdmin = null;

export async function checkAdminStatus() {
  const supabase = await supabasePromise;
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) {
    isAdmin = false;
    lastCheckedUserId = null;
    lastCheckedIsAdmin = false;
    return false;
  }
  if (user.id === lastCheckedUserId && lastCheckedIsAdmin !== null) {
    isAdmin = lastCheckedIsAdmin;
    return isAdmin;
  }
  const { data, error } = await supabase
    .from("user_roles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();
  isAdmin = !!(data && data.is_admin);
  lastCheckedUserId = user.id;
  lastCheckedIsAdmin = isAdmin;
  return isAdmin;
}

// Make available globally for dynamic script loading
window.checkAdminStatus = checkAdminStatus;
