const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";


// ---------- LOGIN ----------
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const status = document.getElementById("status");

  status.innerText = "Logging in...";

  // 1️⃣ login
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (!data.access_token) {
    status.innerText = "Login failed";
    return;
  }

  // save token
  localStorage.setItem("token", data.access_token);

  // 2️⃣ check if profile exists
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${data.access_token}`
    }
  });

  const profile = await profileRes.json();

  // 3️⃣ route user
  if (profile.length === 0) {
    // FIRST TIME USER
    window.location.href = "/onboarding.html";
  } else {
    // RETURNING USER
    window.location.href = "/dashboard.html";
  }
}



// ---------- DASHBOARD LOAD ----------
function parseJwt(token) {
  return JSON.parse(atob(token.split('.')[1]));
}


async function loadCalories() {

  const remainingEl = document.getElementById("remaining");
  if (!remainingEl) return;

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/";
    return;
  }

  const user = parseJwt(token);
  const user_id = user.sub;
  const today = new Date().toISOString().split("T")[0];

  // 1️⃣ Fetch profile
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}&select=*`,
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`
      }
    }
  );

  const profiles = await profileRes.json();
  if (profiles.length === 0) return;

  const profile = profiles[0];

  // 2️⃣ Calculate BMR
  const W = profile.weight_kg;
  const H = profile.height_cm;
  const A = profile.age;

  let bmr = 0;

  if (profile.sex === "male") {
    bmr = 10 * W + 6.25 * H - 5 * A + 5;
  } else {
    bmr = 10 * W + 6.25 * H - 5 * A - 161;
  }

  const tdee = bmr * 1.4;

  // 3️⃣ Apply weight loss deficit
  let deficit = 0;

  if (profile.goal === "weight_loss") {
    if (profile.weight_loss_speed === "slow") deficit = 300;
    if (profile.weight_loss_speed === "moderate") deficit = 500;
    if (profile.weight_loss_speed === "aggressive") deficit = 750;
  }

  const targetCalories = Math.round(tdee - deficit);

  // 4️⃣ Fetch today's meals
  const mealsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/meals?user_id=eq.${user_id}&created_at=gte.${today}&select=calories`,
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`
      }
    }
  );

  const meals = await mealsRes.json();

  let eaten = 0;
  meals.forEach(m => eaten += m.calories);

  const remaining = targetCalories - eaten;

  remainingEl.innerText = remaining + " kcal";
}



// ---------- CAMERA ----------
function openCamera() {
  document.getElementById("cameraInput").click();
}

function setupCamera(){
  const input = document.getElementById("cameraInput");
  if (!input) return;

  input.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById("preview");
    preview.src = URL.createObjectURL(file);
  });
}


// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  loadCalories();
  setupCamera();
});
