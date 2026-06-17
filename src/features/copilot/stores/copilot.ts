"use client";
import { create } from "zustand";
import { useDataStore } from "@/shared/stores/data";
import { uid } from "@/shared/utils";
import { thinkingDelay } from "@/shared/ai/useFakeThinking";
import { runCopilot } from "../domain/handlers";
import { GREETING } from "../constants";
import type { ChatMessage } from "../types";

function greetingMessage(): ChatMessage {
  return { id: "greeting", role: "assistant", text: GREETING };
}

interface CopilotState {
  isOpen: boolean;
  messages: ChatMessage[];
  isThinking: boolean;
  selectedVehicleId: string | null;
  dismissedInsightIds: string[];
  open: () => void;
  close: () => void;
  toggle: () => void;
  setSelectedVehicle: (id: string | null) => void;
  dismissInsight: (id: string) => void;
  resetChat: () => void;
  sendMessage: (text: string) => void;
}

/** Store RIÊNG cho Copilot (KHÔNG persist) — tách khỏi store dữ liệu lớn. */
export const useCopilotStore = create<CopilotState>((set, get) => ({
  isOpen: false,
  messages: [greetingMessage()],
  isThinking: false,
  selectedVehicleId: null,
  dismissedInsightIds: [],
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  setSelectedVehicle: (id) => set({ selectedVehicleId: id }),
  dismissInsight: (id) => set((s) => ({ dismissedInsightIds: [...s.dismissedInsightIds, id] })),
  resetChat: () => set({ messages: [greetingMessage()], isThinking: false }),
  sendMessage: (text) => {
    const t = text.trim();
    if (!t || get().isThinking) return;
    const userMsg: ChatMessage = { id: uid("m"), role: "user", text: t };
    set((s) => ({ messages: [...s.messages, userMsg], isThinking: true, isOpen: true }));

    // Giả lập "đang suy nghĩ" với delay TẤT ĐỊNH theo nội dung (không random).
    setTimeout(() => {
      const d = useDataStore.getState();
      const res = runCopilot(t, {
        orders: d.orders,
        vehicles: d.vehicles,
        customers: d.customers,
        returns: d.returns,
        sos: d.sos,
        warehouses: d.warehouses,
        carriers: d.carriers,
      });
      const aiMsg: ChatMessage = {
        id: uid("m"),
        role: "assistant",
        text: res.sentence,
        cards: res.cards,
        confidence: res.confidence,
        followUps: res.followUps,
        streaming: true,
      };
      set((s) => ({ messages: [...s.messages, aiMsg], isThinking: false }));
    }, thinkingDelay(t));
  },
}));
