"use client";

import { create } from "zustand";

const WAREHOUSE_LS_KEY = "logistic:wh";

/** `null` = chưa chọn kho; `"ALL"` = xem tất cả kho (ADMIN/OPS_MANAGER). */
export type WarehouseSelection = string | null;

function readStoredWarehouse(): WarehouseSelection {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(WAREHOUSE_LS_KEY);
  } catch {
    return null;
  }
}

function writeStoredWarehouse(id: WarehouseSelection) {
  if (typeof window === "undefined") return;
  try {
    if (id == null) window.localStorage.removeItem(WAREHOUSE_LS_KEY);
    else window.localStorage.setItem(WAREHOUSE_LS_KEY, id);
  } catch {
    /* ignore */
  }
}

interface UIState {
  mobileNavOpen: boolean;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;

  /** Kho đang làm việc. Lưu ở localStorage (key "logistic:wh"), không persist trong IndexedDB. */
  currentWarehouseId: WarehouseSelection;
  setCurrentWarehouse: (id: WarehouseSelection) => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileNavOpen: false,
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),

  currentWarehouseId: readStoredWarehouse(),
  setCurrentWarehouse: (id) => {
    writeStoredWarehouse(id);
    set({ currentWarehouseId: id });
  },
}));
