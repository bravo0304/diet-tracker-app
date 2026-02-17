const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";

// decode token to get user id
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = atob(base64Url);
  return JSON.parse(base64);
}

async function saveProfile() {

  const token = localStorage.getItem("token");
  if(!token){
    window.location.href="/";
    return;
  }

  const user = parseJwt(token);
  const user_id = user.sub;

  const profile = {
    id: user_id,
    name: document.getElementById("name").value,
    goal: document.getElementById("goal").value,
    sex: document.getElementById("sex").value,
    age: Number(document.getElementById("age").value),
    height_cm: Number(document.getElementById("height").value),
    weight_kg: Number(document.getElementById("weight").value)
  };

  document.getElementById("status").innerText = "Saving...";

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(profile)
  });

  if(res.ok){
    window.location.href="/dashboard.html";
  } else {
    document.getElementById("status").innerText = "Error saving profile";
  }
}
