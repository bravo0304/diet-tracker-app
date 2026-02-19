import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function requireAuth() {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    window.location.href = "/";
    return null;
  }

  return data.session;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/";
}
