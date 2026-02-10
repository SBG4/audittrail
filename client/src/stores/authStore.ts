import { create } from "zustand";
import { api } from "../lib/api.ts";

const TOKEN_KEY = "token";

interface User {
  id: string;
  username: string;
  fullName: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface MeResponse {
  id: string;
  username: string;
  full_name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, _get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username: string, password: string) => {
    const body = new URLSearchParams({
      username,
      password,
    }).toString();

    const data = await api.postForm<TokenResponse>("/api/auth/login", body);

    localStorage.setItem(TOKEN_KEY, data.access_token);
    set({ token: data.access_token, isAuthenticated: true });

    const me = await api.get<MeResponse>("/api/auth/me");
    set({
      user: {
        id: me.id,
        username: me.username,
        fullName: me.full_name,
      },
    });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({
      token: null,
      user: null,
      isAuthenticated: false,
    });
  },

  initialize: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ isLoading: false });
      return;
    }

    set({ token, isAuthenticated: true });

    try {
      const me = await api.get<MeResponse>("/api/auth/me");
      set({
        user: {
          id: me.id,
          username: me.username,
          fullName: me.full_name,
        },
        isLoading: false,
      });
    } catch {
      // Token is invalid or expired
      localStorage.removeItem(TOKEN_KEY);
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));

// Initialize auth state from localStorage on module load
useAuthStore.getState().initialize();
