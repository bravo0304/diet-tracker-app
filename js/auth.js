// ================= AUTH UTILITIES =================

export function parseJwt(token) {
  return JSON.parse(atob(token.split('.')[1]));
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUserIdFromToken() {
  const token = getToken();
  if (!token) return null;
  const user = parseJwt(token);
  return user.sub;
}
