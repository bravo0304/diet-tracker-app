import { supabase, requireAuth } from "./auth.js";

function nextStep(step){
  document.querySelectorAll(".step").forEach(s => s.style.display="none");
  document.getElementById("step-" + step).style.display = "block";

  if(step === 3){
    toggleWeightLossOptions();
  }
}

function toggleWeightLossOptions(){
  const goal = document.getElementById("goal").value;
  const box = document.getElementById("weightloss_box");
  box.style.display = goal === "weight_loss" ? "block" : "none";
}

async function finishOnboarding(){

  const session = await requireAuth();
  if(!session) return;

  const user_id = session.user.id;

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const age = parseInt(document.getElementById("age").value);
  const sex = document.getElementById("sex").value;

  // ✅ Now using direct metric values
  const height_cm = parseFloat(document.getElementById("height").value);
  const weight_kg = parseFloat(document.getElementById("weight").value);

  const activityMultiplier = parseFloat(
    document.getElementById("activityMultiplier").value
  );

  const goal = document.getElementById("goal").value;
  const weight_loss_speed =
    document.getElementById("weightLossSpeed")?.value || null;

  // Basic validation
  if (!height_cm || !weight_kg || !age) {
    alert("Please complete all required fields.");
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .insert([
      {
        id: user_id,
        first_name: firstName,
        last_name: lastName,
        age,
        sex,
        height_cm,
        weight_kg,
        activity_multiplier: activityMultiplier,
        goal,
        weight_loss_speed
      }
    ]);

  if(error){
    console.error(error);
    alert("Error saving profile.");
    return;
  }

  window.location.href = "/dashboard.html";
}

window.nextStep = nextStep;
window.finishOnboarding = finishOnboarding;
