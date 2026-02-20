import { supabase } from "./auth.js";
import { calculateTargets } from "./nutrition-engine.js";

export async function getOrCreateDailyTarget(user_id, dateStr) {

  // 1️⃣ Try to fetch existing snapshot
  const { data: existing, error: fetchError } = await supabase
    .from("daily_targets")
    .select("*")
    .eq("user_id", user_id)
    .eq("date", dateStr)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching daily target:", fetchError);
    return null;
  }

  if (existing) {
    return existing;
  }

  // 2️⃣ If not found, fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user_id)
    .single();

  if (profileError || !profile) {
    console.error("Error fetching profile:", profileError);
    return null;
  }

  // 3️⃣ Calculate targets
  const calculated = calculateTargets(profile);

  // 4️⃣ Insert snapshot
  const { data: inserted, error: insertError } = await supabase
    .from("daily_targets")
    .insert({
      user_id,
      date: dateStr,
      ...calculated,
      mode_used: "auto"
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting daily target:", insertError);
    return null;
  }

  return inserted;
}