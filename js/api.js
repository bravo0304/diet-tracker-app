import { supabase, requireAuth } from "./auth.js";

/* ===========================
   UTIL
=========================== */

export function getTodayString() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split("T")[0];
}

/* ===========================
   SAVE MEAL
=========================== */

export async function saveMeal(meal, dateString) {

  const session = await requireAuth();
  if (!session) return;

  const user_id = session.user.id;

  const { error } = await supabase
    .from("meals")
    .insert([
      {
        user_id,
        food_name: meal.food_name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        meal_type: "general",
        date: dateString
      }
    ]);

  if (error) {
    alert("Error saving meal.");
    console.error(error.message);
  }
}

/* ===========================
   DELETE MEAL
=========================== */

export async function deleteMeal(id) {

  const session = await requireAuth();
  if (!session) return;

  const user_id = session.user.id;

  const { error } = await supabase
    .from("meals")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);

  if (error) {
    alert("Failed to delete meal.");
    console.error(error.message);
  }
}



/* ===========================
   UPDATE MEAL
=========================== */

export async function updateMeal(id, updatedMeal) {

  const session = await requireAuth();
  if (!session) return;

  const user_id = session.user.id;
console.log("Update called with ID:", id);
  const { data, error } = await supabase
  .from("meals")
  .update({
    food_name: updatedMeal.food_name,
    calories: updatedMeal.calories,
    protein: updatedMeal.protein,
    carbs: updatedMeal.carbs,
    fat: updatedMeal.fat
  })
  .eq("id", id)
  .select();

console.log("Update result:", data);
console.log("Update error:", error);
}