const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";

async function login() {
  const email = document.getElementById("email")?.value;
  const password = document.getElementById("password")?.value;
  const status = document.getElementById("status");

  if (!email || !password) {
    if (status) status.innerText = "Enter email and password";
    return;
  }

  if (status) status.innerText = "Logging in...";

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
    if (status) status.innerText = "Login failed";
    return;
  }

  localStorage.setItem("token", data.access_token);
  window.location.href = "/dashboard.html";
}

// make login global for inline onclick
window.login = login;
