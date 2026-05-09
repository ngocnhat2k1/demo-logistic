"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { idbStorage } from "@/shared/db/persist";
import type { User, UserRole } from "@/shared/types";

interface AuthState {
  currentUser: User | null;
  _hasHydrated: boolean;
  setUser: (u: User | null) => void;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      _hasHydrated: false,
      setUser: (u) => {
        set({ currentUser: u });
        if (typeof document !== "undefined") {
          if (u) {
            document.cookie = `dispatch_role=${u.role}; path=/; max-age=86400; SameSite=Lax`;
          } else {
            document.cookie = `dispatch_role=; path=/; max-age=0; SameSite=Lax`;
          }
        }
      },
      logout: () => {
        set({ currentUser: null });
        if (typeof document !== "undefined") {
          document.cookie = `dispatch_role=; path=/; max-age=0; SameSite=Lax`;
        }
      },
      hasRole: (...roles) => {
        const u = get().currentUser;
        return !!u && roles.includes(u.role);
      },
      setHydrated: () => set({ _hasHydrated: true }),
    }),
    {
      name: "auth",
      storage: createJSONStorage(() => idbStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
        // sync cookie after rehydrate
        if (typeof document !== "undefined" && state?.currentUser) {
          document.cookie = `dispatch_role=${state.currentUser.role}; path=/; max-age=86400; SameSite=Lax`;
        }
      },
    }
  )
);
