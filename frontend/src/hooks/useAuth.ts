import { create } from 'zustand';
import { User } from '@/types';
import api from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('handyman_token') : null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (token: string, user: User) => {
    localStorage.setItem('handyman_token', token);
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('handyman_token');
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },

  fetchUser: async () => {
    const token = get().token;
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const response = await api.get('/api/auth/me');
      set({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem('handyman_token');
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  hasRole: (...roles: string[]) => {
    const user = get().user;
    if (!user) return false;
    return roles.includes(user.role);
  },
}));
