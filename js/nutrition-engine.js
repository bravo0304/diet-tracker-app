export function calculateTargets(profile) {
  const W = profile.weight_kg || 72;
  const H = profile.height_cm || 170;
  const A = profile.age || 30;
  const sex = profile.sex || "male";
  const goal = profile.goal || "maintain";
  const multiplier = profile.activity_multiplier || 1.4;

  const bmr = sex === "male"
    ? 10 * W + 6.25 * H - 5 * A + 5
    : 10 * W + 6.25 * H - 5 * A - 161;

  const tdee = bmr * multiplier;

  let calorieMultiplier = 1;
  if (goal === "lose") calorieMultiplier = 0.85;
  if (goal === "gain") calorieMultiplier = 1.08;

  const calories = Math.round(tdee * calorieMultiplier);

  const protein = Math.round(W * (goal === "lose" ? 2.0 : 1.8));
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(
    0,
    Math.round((calories - (protein * 4) - (fat * 9)) / 4)
  );

  return {
    calories_target: calories,
    protein_target: protein,
    fat_target: fat,
    carbs_target: carbs
  };
}