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

      // Versioning state (não persistido — recarrega sob demanda)
      versions: [],
      loadingVersions: false,
      versionsPaletteId: null,

      // Onboarding state (persisted)
      onboardingCompleted: false,
      userSegment: null, // hobby | iniciante | profissional | empreendedor
      userName: "",
      userEmail: "",

      // Hidratação do Zustand persist (resolve race com OnboardingFlow)
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: !!v }),

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
          // Normaliza colors: aceita ["#hex", ...] OU [{hex,name,role}, ...]
          const rawColors = palette.colors || [];
          const colors = rawColors
            .map((c, i) => {
              if (!c) return null;
              if (typeof c === "string") {
                return { hex: c, name: `Cor ${i + 1}`, role: "detalhe" };
              }
              if (typeof c === "object" && c.hex) {
                return {
                  hex: c.hex,
                  name: c.name || `Cor ${i + 1}`,
                  role: c.role || "detalhe",
                };
              }
              return null;
            })
            .filter(Boolean);
          const payload = {
            name: palette.name || palette.title || "Paleta sem nome",
            description: palette.description || "",
            colors,
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

      // ===== Versioning ops =====
      loadVersions: async (paletteId) => {
        if (!paletteId) return;
        set({ loadingVersions: true, versionsPaletteId: paletteId, lastError: null });
        try {
          const res = await axios.get(`${API}/palettes/${paletteId}/versions`);
          set({
            versions: res.data?.versions || [],
            loadingVersions: false,
          });
        } catch (e) {
          set({ loadingVersions: false, versions: [], lastError: e.message });
          throw e;
        }
      },

      saveManualVersion: async (paletteId, label) => {
        if (!paletteId || !label?.trim()) return null;
        try {
          const res = await axios.post(`${API}/palettes/${paletteId}/versions`, {
            label: label.trim(),
          });
          // Atualiza lista local mantendo ordem: manuais primeiro
          set((s) => {
            if (s.versionsPaletteId !== paletteId) return {};
            const manual = [res.data, ...s.versions.filter((v) => v.kind === "manual")];
            const auto = s.versions.filter((v) => v.kind === "auto");
            return { versions: [...manual, ...auto] };
          });
          return res.data;
        } catch (e) {
          set({ lastError: e.message });
          throw e;
        }
      },

      restoreVersion: async (paletteId, versionId) => {
        try {
          const res = await axios.post(
            `${API}/palettes/${paletteId}/versions/${versionId}/restore`
          );
          // Atualiza a paleta na lista saved com os novos campos
          set((s) => ({
            saved: s.saved.map((p) => (p.id === paletteId ? { ...p, ...res.data } : p)),
          }));
          // Recarrega versões (porque o restore cria auto-snapshot do estado anterior)
          await get().loadVersions(paletteId);
          return res.data;
        } catch (e) {
          set({ lastError: e.message });
          throw e;
        }
      },

      deleteVersion: async (paletteId, versionId) => {
        const prev = get().versions;
        // Optimistic
        set((s) => ({ versions: s.versions.filter((v) => v.id !== versionId) }));
        try {
          await axios.delete(`${API}/palettes/${paletteId}/versions/${versionId}`);
        } catch (e) {
          set({ versions: prev, lastError: e.message });
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
      onRehydrateStorage: () => (state) => {
        // Marca hidratação concluída para os componentes que dependem do
        // estado persistido (ex: OnboardingFlow não pode abrir antes da
        // hidratação senão sobrepõe o Studio mesmo já tendo sido concluído).
        try {
          state?.setHasHydrated(true);
        } catch {}
      },
    }
  )
);
