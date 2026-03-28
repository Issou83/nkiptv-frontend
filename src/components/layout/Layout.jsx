import React, { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUIStore } from '../../store'
import ToastContainer from '../ui/ToastContainer'

const NAV_ITEMS = [
  { path: '/',          icon: '🏠', label: 'Accueil',    mobile: true  },
  { path: '/live',      icon: '📡', label: 'Live TV',    mobile: true,  badge: '10K+' },
  { path: '/search',    icon: '🔍', label: 'Recherche',  mobile: true  },
  { path: '/favorites', icon: '⭐', label: 'Favoris',    mobile: true  },
  { path: '/profiles',  icon: '👥', label: 'Profils',    mobile: true  },
  { path: '/epg',       icon: '📅', label: 'Programme',  mobile: false },
  { path: '/player',    icon: '▶',  label: 'Player',     mobile: false },
  { path: '/playlists', icon: '📂', label: 'Playlists',  mobile: false },
  { path: '/pricing',   icon: '💎', label: 'Premium',    mobile: false },
  { path: '/settings',  icon: '⚙️', label: 'Paramètres', mobile: false },
]

const ADMIN_NAV = { path: '/admin', icon: '🛡️', label: 'Admin', mobile: false }

const LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'ar', flag: '🇸🇦', label: 'AR' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
  { code: 'de', flag: '🇩🇪', label: 'DE' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { user, logout, isAdmin } = useAuth()
  const { sidebarOpen, toggleSidebar, lang, setLang } = useUIStore()
  const [showLang, setShowLang] = useState(false)
  const [showAvatar, setShowAvatar] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const langRef = useRef(null)
  const avatarRef = useRef(null)

  const currentLang = LANGS.find(l => l.code === lang) || LANGS[0]

  useEffect(() => {
    const handler = (e) => {
      if (!langRef.current?.contains(e.target)) setShowLang(false)
      if (!avatarRef.current?.contains(e.target)) setShowAvatar(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  const handleSearch = (e) => {
    setSearchVal(e.target.value)
    if (e.target.value.trim()) navigate(`/search?q=${encodeURIComponent(e.target.value)}`)
  }

  const handleLogout = async () => {
    setShowAvatar(false)
    await logout()
    navigate('/login')
  }

  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV] : NAV_ITEMS

  return (
    <div className={`app-grid${sidebarOpen ? ' sidebar-open' : ''}`}>
      {/* TOPBAR */}
      <header className="topbar">
        <button className="topbar-btn" onClick={toggleSidebar} title="Menu" style={{ marginRight: 4 }}>
          ☰
        </button>

        <NavLink to="/" className="topbar-logo">
          <div className="topbar-logo-icon">📺</div>
          <span className="topbar-logo-text"><span>NK</span>iptv</span>
        </NavLink>

        <div className="topbar-search">
          <span className="search-icon">🔍</span>
          <input
            placeholder="Rechercher une chaîne, pays, catégorie…"
            value={searchVal}
            onChange={handleSearch}
            onKeyDown={e => e.key === 'Enter' && navigate(`/search?q=${encodeURIComponent(searchVal)}`)}
          />
        </div>

        <div className="topbar-right">
          <div className="live-pill">
            <div className="live-dot" />
            LIVE
          </div>

          {/* Langue */}
          <div ref={langRef} style={{ position: 'relative' }} className="topbar-lang-btn">
            <button
              className="topbar-btn"
              onClick={() => setShowLang(v => !v)}
              style={{ gap: 4, width: 'auto', padding: '0 10px', fontSize: 13, fontWeight: 600 }}
            >
              {currentLang.flag} {currentLang.label} ▾
            </button>
            {showLang && (
              <div className="dropdown">
                {LANGS.map(l => (
                  <div key={l.code} className={`dropdown-item${l.code === lang ? ' active' : ''}`}
                    onClick={() => { setLang(l.code); setShowLang(false) }}>
                    {l.flag} {l.label}
                    {l.code === lang && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Avatar */}
          <div ref={avatarRef} style={{ position: 'relative' }}>
            <div className="avatar-btn" onClick={() => setShowAvatar(v => !v)}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            {showAvatar && (
              <div className="dropdown" style={{ right: 0, minWidth: 200 }}>
                <div className="dropdown-item" style={{ fontWeight: 700 }}>
                  👤 {user?.name}
                </div>
                <div className="dropdown-item" style={{ fontSize: 12, color: 'var(--text-muted)', paddingTop: 0 }}>
                  {user?.email}
                </div>
                {user?.plan?.type !== 'free' && (
                  <div className="dropdown-item" style={{ fontSize: 12 }}>
                    💎 Plan {user?.plan?.type}
                  </div>
                )}
                <div className="dropdown-divider" />
                <div className="dropdown-item" onClick={() => { navigate('/profiles'); setShowAvatar(false) }}>
                  👥 Mes profils
                </div>
                <div className="dropdown-item" onClick={() => { navigate('/settings'); setShowAvatar(false) }}>
                  ⚙️ Paramètres
                </div>
                {user?.plan?.type === 'free' && (
                  <div className="dropdown-item" style={{ color: '#a78bfa' }} onClick={() => { navigate('/pricing'); setShowAvatar(false) }}>
                    💎 Passer Premium
                  </div>
                )}
                <div className="dropdown-divider" />
                <div className="dropdown-item danger" onClick={handleLogout}>
                  🚪 Déconnexion
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SIDEBAR */}
      <nav className="sidebar">
        <div className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `nav-item${isActive ? ' active' : ''}${item.mobile === false ? ' nav-desktop-only' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="nav-item" onClick={toggleSidebar} style={{ cursor: 'pointer' }}>
            <span className="nav-icon">{sidebarOpen ? '◀' : '▶'}</span>
            <span className="nav-label">Réduire</span>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main className="main-content">
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  )
}
