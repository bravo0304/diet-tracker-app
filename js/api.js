import { getToken, getUserIdFromToken } from "./auth.js";

export const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
export const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";

// ===== UTIL =====

export function getTodayString() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split("T")[0];
}

// ===== API =====

export async function saveMeal(meal, dateString) {
  const token = getToken();
  const user_id = getUserIdFromToken();

  if (!token || !user_id) {
    window.location.href = "/";
    return;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/meals`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({
      user_id,
      food_name: meal.food_name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      meal_type: "general",
      date: dateString
    })
  });

  if (!res.ok) {
    alert("Error saving meal.");
  }
}


export async function deleteMeal(id) {
  const token = getToken();

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/meals?id=eq.${id}`,
    {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    alert("Failed to delete meal.");
    return;
  }
}

