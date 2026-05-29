import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { PRESET_PALETTES, STYLES, PIECES } from "@/data/palettes";
import { chamarIA, ApiError } from "@/utils/api";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const usePaletteStore = create(
  persist(
    (set, get) => ({
      // Current studio state
      activePaletteId: PRESET_PALETTES[0].id,
      activeStyleId: STYLES[0].id,
      activePieceId: PIECES[0].id,

      // Library (server-backed) + local favorites cache
      saved: [],
      loadingSaved: false,
      lastError: null,

      // AI state
      aiGenerating: false,
      aiResult: null,

      // Onboarding state (persisted)
      onboardingCompleted: false,
      userSegment: null, // hobby | iniciante | profissional | empreendedor
      userName: "",
      userEmail: "",

      setOnboardingCompleted: (v) => set({ onboardingCompleted: !!v }),
      setUserSegment: (segment) => set({ userSegment: segment }),
      setUserIdentity: ({ name, email }) =>
        set((s) => ({
          userName: name ?? s.userName,
          userEmail: email ?? s.userEmail,
        })),
      resetOnboarding: () =>
        set({
          onboardingCompleted: false,
          userSegment: null,
          userName: "",
          userEmail: "",
        }),

      // Selectors
      getActivePalette: () => {
        const { activePaletteId, saved } = get();
        const all = [...PRESET_PALETTES, ...saved];
        return all.find((p) => p.id === activePaletteId) || PRESET_PALETTES[0];
      },

      setActivePalette: (id) => set({ activePaletteId: id }),
      setActiveStyle: (id) => set({ activeStyleId: id }),
      setActivePiece: (id) => set({ activePieceId: id }),

      // ===== Backend ops =====
      loadSaved: async () => {
        set({ loadingSaved: true, lastError: null });
        try {
          const res = await axios.get(`${API}/palettes`);
          set({ saved: res.data, loadingSaved: false });
        } catch (e) {
          set({ loadingSaved: false, lastError: e.message });
        }
      },

      savePalette: async (palette) => {
        try {
          const payload = {
            name: palette.name,
            description: palette.description || "",
            colors: palette.colors,
            style: palette.style || "luxo",
            tags: palette.tags || [],
            favorite: palette.favorite || false,
            source: palette.source || "user",
          };
          const res = await axios.post(`${API}/palettes`, payload);
          set((s) => ({ saved: [res.data, ...s.saved] }));
          return res.data;
        } catch (e) {
          set({ lastError: e.message });
          throw e;
        }
      },

      toggleFavorite: async (id) => {
        const item = get().saved.find((p) => p.id === id);
        if (!item) return;
        const next = !item.favorite;
        // Optimistic update
        set((s) => ({
          saved: s.saved.map((p) => (p.id === id ? { ...p, favorite: next } : p)),
        }));
        try {
          await axios.patch(`${API}/palettes/${id}`, { favorite: next });
        } catch (e) {
          // revert
          set((s) => ({
            saved: s.saved.map((p) => (p.id === id ? { ...p, favorite: !next } : p)),
            lastError: e.message,
          }));
        }
      },

      deletePalette: async (id) => {
        const prev = get().saved;
        set((s) => ({ saved: s.saved.filter((p) => p.id !== id) }));
        try {
          await axios.delete(`${API}/palettes/${id}`);
        } catch (e) {
          set({ saved: prev, lastError: e.message });
        }
      },

      generateWithAI: async (prompt, style, image_base64 = null) => {
        set({ aiGenerating: true, aiResult: null, lastError: null });
        try {
          // chamarIA: retry 3x com backoff (2s/4s/8s) + AbortController 60s timeout
          // + categorização de erro (limite/saldo/timeout/rede/servidor).
          const payload = { prompt, style };
          if (image_base64) payload.image_base64 = image_base64;
          const data = await chamarIA("/ai/generate-palette", payload);
          set({ aiGenerating: false, aiResult: data });
          return data;
        } catch (e) {
          // Mantém ApiError com .tipo preservado para a UI distinguir o motivo.
          const lastError =
            e instanceof ApiError
              ? { message: e.message, tipo: e.tipo, status: e.status, detail: e.detail }
              : { message: e?.message || "Falha desconhecida", tipo: "servidor" };
          set({ aiGenerating: false, lastError });
          throw e;
        }
      },
    }),
    {
      name: "lindart-store-v1",
      partialize: (s) => ({
        activePaletteId: s.activePaletteId,
        activeStyleId: s.activeStyleId,
        activePieceId: s.activePieceId,
        onboardingCompleted: s.onboardingCompleted,
        userSegment: s.userSegment,
        userName: s.userName,
        userEmail: s.userEmail,
      }),
    }
  )
);
