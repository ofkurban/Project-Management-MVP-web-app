export type AuthUser = {
  username: string;
};

export async function fetchMe(): Promise<AuthUser | null> {
  const response = await fetch("/api/me", { credentials: "include" });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Failed to check session");
  }
  return response.json();
}

export async function login(
  username: string,
  password: string
): Promise<AuthUser> {
  const response = await fetch("/api/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error("Invalid credentials");
  }
  return response.json();
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/logout", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to log out");
  }
}
