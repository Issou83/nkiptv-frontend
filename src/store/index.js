// v2.2 - reliable hydration + no stale getters
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Store Auth ──────────────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeProfileId: null,
      _hasHydrated: false,

      setHasHydrated: (val) => set({ _hasHydrated: val }),

      login: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, activeProfileId: user.activeProfileId || null })
      },
      logout: () => set({ user: null, accessToken: null, refreshToken: null, activeProfileId: null }),
      updateUser: (updates) => set(s => ({ user: s.user ? { ...s.user, ...updates } : null })),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setActiveProfile: (profileId) => set({ activeProfileId: profileId }),
    }),
    {
      name: 'nkiptv-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        activeProfileId: s.activeProfileId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

// ── Store UI ─────────────────────────────────────────────────────────────────
export const useUIStore = create(
  persist(
    (set) => ({
      sidebarOpen: true,
      lang: 'fr',
      theme: 'dark',
      currentChannel: null,
      volume: 80,
      muted: false,
      fullscreen: false,
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
      setLang: (lang) => set({ lang }),
      setTheme: (theme) => set({ theme }),
      setCurrentChannel: (ch) => set({ currentChannel: ch }),
      setVolume: (volume) => set({ volume }),
      setMuted: (muted) => set({ muted }),
      setFullscreen: (fullscreen) => set({ fullscreen }),
    }),
    {
      name: 'nkiptv-ui',
      partialize: (s) => ({ sidebarOpen: s.sidebarOpen, lang: s.lang, theme: s.theme, volume: s.volume })
    }
  )
)

// ── Store Player ─────────────────────────────────────────────────────────────
export const usePlayerStore = create((set) => ({
  isLoading: false,
  isPlaying: false,
  hasError: false,
  errorMsg: '',
  quality: 'auto',
  buffered: 0,
  setLoading: (v) => set({ isLoading: v, hasError: false }),
  setPlaying: (v) => set({ isPlaying: v, isLoading: false }),
  setError: (msg) => set({ hasError: true, errorMsg: msg, isLoading: false, isPlaying: false }),
  setQuality: (q) => set({ quality: q }),
  setBuffered: (v) => set({ buffered: v }),
  reset: () => set({ isLoading: false, isPlaying: false, hasError: false, errorMsg: '', buffered: 0 }),
}))
