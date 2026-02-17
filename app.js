const SUPABASE_URL = "https://rvwozaxippmuwwekubbn.supabase.co";
const SUPABASE_KEY = "sb_publishable_u3Cz5ndzBjEJvSA7MkC32g_jezgzQxM";


async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  document.getElementById("status").innerText = "Logging in...";

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (data.access_token) {
    localStorage.setItem("token", data.access_token);
    document.getElementById("status").innerText = "Login success";
    window.location.href = "/dashboard.html";
  } else {
    document.getElementById("status").innerText = "Login failed";
  }
}
