"use client";

import { get, set, del, keys, clear } from "idb-keyval";
import { type StateStorage } from "zustand/middleware";

const NS = "logistic:v3:";

export const idbStorage: StateStorage = {
  async getItem(name) {
    if (typeof window === "undefined") return null;
    const v = await get(NS + name);
    return v ? (typeof v === "string" ? v : JSON.stringify(v)) : null;
  },
  async setItem(name, value) {
    if (typeof window === "undefined") return;
    await set(NS + name, value);
  },
  async removeItem(name) {
    if (typeof window === "undefined") return;
    await del(NS + name);
  },
};

export async function clearAllStores(): Promise<void> {
  if (typeof window === "undefined") return;
  const all = (await keys()) as string[];
  await Promise.all(all.filter((k) => k.startsWith(NS)).map((k) => del(k)));
}

export async function clearEverything(): Promise<void> {
  await clear();
}
