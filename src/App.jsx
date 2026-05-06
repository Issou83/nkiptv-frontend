import React, { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useAuthStore } from './store'
import Layout from './components/layout/Layout'
import Splash from './components/ui/Splash'
import AuthPage from './pages/AuthPage'

// Lazy loading des pages (code splitting)
const HomePage     = lazy(() => import('./pages/HomePage'))
const LivePage     = lazy(() => import('./pages/LivePage'))
const PlayerPage   = lazy(() => import('./pages/PlayerPage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const SearchPage   = lazy(() => import('./pages/SearchPage'))
const EpgPage      = lazy(() => import('./pages/EpgPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const PricingPage  = lazy(() => import('./pages/PricingPage'))
const PlaylistsPage = lazy(() => import('./pages/PlaylistsPage'))
const ProfilesPage = lazy(() => import('./pages/ProfilesPage'))
const AdminPage    = lazy(() => import('./pages/AdminPage'))
const NotFound     = lazy(() => import('./pages/NotFound'))

const PageLoader = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', minHeight:'300px' }}>
    <div className="splash-loader">
      <span/><span/><span/>
    </div>
  </div>
)

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAdmin } = useAuth()
  // Lecture directe du store — localStorage hydration is synchronous, no need to wait
  const accessToken = useAuthStore(s => s.accessToken)
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated())
  const persistedAccessToken = (() => {
    try {
      return JSON.parse(window.localStorage.getItem('nkiptv-auth') || '{}')?.state?.accessToken || null
    } catch {
      return null
    }
  })()
  const effectiveAccessToken = accessToken || persistedAccessToken
  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    if (useAuthStore.persist.hasHydrated()) setHydrated(true)
    return unsubscribe
  }, [])

  if (!hydrated && !effectiveAccessToken) return <PageLoader />
  if (!effectiveAccessToken) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [showSplash, setShowSplash] = React.useState(true)
  // Lecture directe du store pour éviter les problèmes de getters Zustand après persist
  const accessToken = useAuthStore(s => s.accessToken)

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800)
    return () => clearTimeout(timer)
  }, [])

  if (showSplash) return <Splash />

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={accessToken ? <Navigate to="/" replace /> : <AuthPage />} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<HomePage />} />
            <Route path="live" element={<LivePage />} />
            <Route path="player" element={<PlayerPage />} />
            <Route path="player/:channelId" element={<PlayerPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="epg" element={<EpgPage />} />
            <Route path="playlists" element={<PlaylistsPage />} />
            <Route path="profiles" element={<ProfilesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
