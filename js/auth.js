import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

/* ===========================
   WAIT FOR SESSION (IMPORTANT)
=========================== */

export async function getSessionSafe() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session;
}

/* ===========================
   REQUIRE AUTH
=========================== */

export async function requireAuth() {
  const session = await getSessionSafe();

  if (!session) {
    window.location.href = "/";
    return null;
  }

  return session;
}

/* ===========================
   AUTH LISTENER (CRITICAL)
=========================== */

export function initAuthListener() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (!session) {
      window.location.href = "/";
    }
  });
}

/* ===========================
   LOGOUT
=========================== */

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/";
}
