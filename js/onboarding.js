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

  const firstName = document.getElementById("firstName").value;
  const lastName = document.getElementById("lastName").value;
  const age = parseInt(document.getElementById("age").value);
  const sex = document.getElementById("sex").value;

  const heightInput = document.getElementById("height").value.split("'");
  const heightFt = parseInt(heightInput[0]);
  const heightIn = parseInt(heightInput[1]);
  const height_cm = heightFt*30.48 + heightIn*2.54;

  const weight_lb = parseFloat(document.getElementById("weight").value);
  const weight_kg = weight_lb * 0.453592;

  const goal = document.getElementById("goal").value;
  const weight_loss_speed = document.getElementById("weightLossSpeed")?.value || null;

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
        goal_type: goal,
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
