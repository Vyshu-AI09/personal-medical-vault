import client from "./client";

export async function signup({ email, password, full_name }) {
  const { data } = await client.post("/auth/signup", { email, password, full_name });
  return data;
}

export async function login({ email, password }) {
  // Backend uses OAuth2PasswordRequestForm, which expects form-encoded data
  // with a "username" field (we treat it as email).
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const { data } = await client.post("/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data;
}
