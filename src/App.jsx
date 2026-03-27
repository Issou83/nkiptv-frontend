// v2.3 - reliable hydration via _hasHydrated store field
import React, { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useAuthStore } from './store'
import Layout from './components/layout/Layout'
import Splash from './components/ui/Splash'
import AuthPage from './pages/AuthPage'

// Lazy loading des pages
const HomePage = lazy(() => import('./pages/HomePage'))
const LivePage = lazy(() => import('./pages/LivePage'))
const PlayerPage = lazy(() => import('./pages/PlayerPage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const EpgPage = lazy(() => import('./pages/EpgPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const PlaylistsPage = lazy(() => import('./pages/PlaylistsPage'))
const ProfilesPage = lazy(() => import('./pages/ProfilesPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

const PageLoader = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
    <div className="splash-loader"><span/><span/><span/></div>
  </div>
)

// ProtectedRoute uses _hasHydrated from store - fully reactive, no race conditions
function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuth, isAdmin } = useAuth()
  const hydrated = useAuthStore(s => s._hasHydrated)

  if (!hydrated) return <PageLoader />
  if (!isAuth) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const { isAuth } = useAuth()

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800)
    return () => clearTimeout(timer)
  }, [])

  if (showSplash) return <Splash />

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={isAuth ? <Navigate to="/" replace /> : <AuthPage />} />
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
