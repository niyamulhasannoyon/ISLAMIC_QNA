export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  password_hash?: string;
  role: "user" | "admin";
  provider: "credentials" | "google";
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: "user" | "admin";
  provider: "credentials" | "google";
}
