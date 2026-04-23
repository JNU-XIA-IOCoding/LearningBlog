import { create } from "zustand";
import { setToken } from "../api/client";

type UserProfile = {
  id: number;
  username: string;
  display_name: string;
  streak: number;
  role: "admin" | "user";
  email?: string;
};

type AuthState = {
  token: string | null;
  user: UserProfile | null;
  init: () => void;
  login: (payload: { token: string; user: UserProfile }) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  init: () => {
    const token = localStorage.getItem("phoenix_token");
    const userText = localStorage.getItem("phoenix_user");
    const user = userText ? (JSON.parse(userText) as UserProfile) : null;
    setToken(token);
    set({ token, user });
  },
  login: ({ token, user }) => {
    localStorage.setItem("phoenix_token", token);
    localStorage.setItem("phoenix_user", JSON.stringify(user));
    setToken(token);
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("phoenix_token");
    localStorage.removeItem("phoenix_user");
    setToken(null);
    set({ token: null, user: null });
  }
}));
