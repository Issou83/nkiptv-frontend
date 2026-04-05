import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useChannels, useChannelStats, CATEGORY_EMOJI, COUNTRY_FLAG } from '../hooks/useChannels'
import { useUIStore } from '../store'

const CATEGORIES = [null, 'news', 'sports', 'music', 'movies', 'entertainment', 'documentary', 'kids', 'business', 'culture', 'family', 'religious']

const COUNTRIES = [
  { code: '', name: 'Tous les pays' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'MA', name: '🇲🇦 Maroc' },
  { code: 'DZ', name: '🇩🇿 Algérie' },
  { code: 'TN', name: '🇹🇳 Tunisie' },
  { code: 'EG', name: '🇪🇬 Égypte' },
  { code: 'SA', name: '🇸🇦 Arabie Saoudite' },
  { code: 'US', name: '🇺🇸 USA' },
  { code: 'GB', name: '🇬🇧 UK' },
  { code: 'DE', name: '🇩🇪 Allemagne' },
  { code: 'ES', name: '🇪🇸 Espagne' },
  { code: 'IT', name: '🇮🇹 Italie' },
  { code: 'TR', name: '🇹🇷 Turquie' },
  { code: 'BR', name: '🇧🇷 Brésil' },
  { code: 'IN', name: '🇮🇳 Inde' },
  { code: 'SN', name: '🇸🇳 Sénégal' },
  { code: 'CI', name: "🇨🇮 Côte d'Ivoire" },
  { code: 'CM', name: '🇨🇲 Cameroun' },
  { code: 'NG', name: '🇳🇬 Nigeria' },
]

const SORT_OPTIONS = [
  { value: 'viewCount', label: '👍 Populaires' },
  { value: 'name',      label: '🔤 A-Z' },
  { value: 'newest',    label: '✨ Nouveaux' },
]

const getLogoSrc = (logo) => {
  if (!logo) return null
  const apiUrl = import.meta.env.VITE_API_URL || 'https://nkiptv-backend.onrender.com'
  return apiUrl + '/api/proxy/logo?url=' + encodeURIComponent(logo)
}

export default function LivePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { setCurrentChannel, currentChannel } = useUIStore()
  const [view, setView] = useState(() => localStorage.getItem('nkiptv-view') || 'grid')
  const [page, setPage] = useState(1)
  const [showCountryMenu, setShowCountryMenu] = useState(false)
  const countryRef = useRef(null)

  const category = params.get('category') || ''
  const country  = params.get('country')  || ''
  const sort     = params.get('sort')     || 'viewCount'

  const { data, isLoading } = useChannels({
    category, country, sort,
    hasStream: 'true', limit: 60,
    page,
  })

  const channels = data?.data || []
  const total    = data?.pagination?.total || 0
  const pages    = data?.pagination?.pages || 1

  useEffect(() => {
    const handler = (e) => {
      if (!countryRef.current?.contains(e.target)) setShowCountryMenu(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [])

  const openChannel = (ch) => {
    setCurrentChannel(ch)
    navigate('/player/' + ch.id)
  }

  const setFilter = (key, val) => {
    const next = new URLSearchParams(params)
    if (val) next.set(key, val)
    else next.delete(key)
    setParams(next)
    setPage(1)
  }

  const setViewMode = (v) => {
    setView(v)
    localStorage.setItem('nkiptv-view', v)
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontWeight: 800 }}>📺 Live TV</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 3 }}>
          {isLoading ? '⏳' : total.toLocaleString() + ' chaînes'}
          {category && ' 🗂 ' + (CATEGORY_EMOJI[category] || '') + ' ' + category}
          {country && ' 🗂 ' + (COUNTRY_FLAG[country] || '') + ' ' + country}
        </p>
      </div>

      <div className="filter-row" style={{ paddingTop: 12 }}>
        {CATEGORIES.map(cat => (
          <div
            key={cat || 'all'}
            className={'filter-chip' + ((cat || '') === category ? ' active' : '')}
            onClick={() => setFilter('category', cat)}
          >
            {cat ? (CATEGORY_EMOJI[cat] || '📺') + ' ' + cat.charAt(0).toUpperCase() + cat.slice(1) : '🌍 Toutes'}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div ref={countryRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowCountryMenu(v => !v)} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            {country ? (COUNTRY_FLAG[country] || '') + ' ' + country : '🌍 Pays'} ⌄
          </button>
          {showCountryMenu && (
            <div className="dropdown" style={{ top: 'calc(100% + 6px)', left: 0, right: 'auto', minWidth: 220, maxHeight: 300, overflowY: 'auto' }}>
              {COUNTRIES.map(c => (
                <div
                  key={c.code}
                  className={'dropdown-item' + (country === c.code ? ' active' : '')}
                  onClick={() => { setFilter('country', c.code); setShowCountryMenu(false) }}
                >
                  {c.name}
                  {country === c.code && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <select value={sort} onChange={e => setFilter('sort', e.target.value)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {(category || country) && (
          <button className="btn btn-danger btn-sm" onClick={() => { setParams({}); setPage(1) }} style={{ fontSize: 12 }}>
            ↺ Réinitialiser
          </button>
        )}

        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {['grid', 'list'].map(v => (
            <button key={v} onClick={() => setViewMode(v)} className={'btn btn-secondary btn-sm' + (view === v ? ' btn-primary' : '')} style={{ fontSize: 16, minWidth: 36, padding: '6px 10px' }} title={v === 'grid' ? 'Vue grille' : 'Vue liste'}>
              {v === 'grid' ? '▦' : '☰'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className={view === 'grid' ? 'channel-grid channel-grid-lg' : ''} style={view === 'list' ? { padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 } : {}}>
          {Array.from({ length: view === 'grid' ? 12 : 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: view === 'grid' ? 150 : 58, borderRadius: 12 }} />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📺</div>
          <div className="empty-state-title">Aucune chaîne trouvée</div>
          <div className="empty-state-text">Modifiez les filtres ou vérifiez votre connexion</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setParams({}); setPage(1) }}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="channel-grid channel-grid-lg">
          {channels.map(ch => {
            const isCurrently = currentChannel?.id === ch.id
            return (
              <div key={ch.id} className={'card channel-card' + (isCurrently ? ' channel-card-active' : '')} onClick={() => openChannel(ch)}>
                <div className="channel-card-logo">
                  {ch.logo
                    ? <img src={getLogoSrc(ch.logo)} alt={ch.name} onError={e => e.target.style.display = 'none'} />
                    : <span className="logo-fallback">{CATEGORY_EMOJI[ch.categories?.[0]] || '📺'}</span>
                  }
                  <span style={{ position: 'absolute', top: 6, right: 6 }} className={'badge ' + (ch.streams?.length > 0 ? 'badge-success' : 'badge-danger')}>
                    {ch.status === 'down' ? '⛔ HORS LIGNE' : ch.streams?.length > 0 ? '▶️ LIVE' : 'OFF'}
                  </span>
                  {isCurrently && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.5rem' }}>▶</span>
                    </div>
                  )}
                </div>
                <div className="channel-card-info">
                  <div className="channel-card-name">{ch.name}</div>
                  <div className="channel-card-meta">
                    <span>{COUNTRY_FLAG[ch.country] || '🌐'}</span>
                    {ch.categories?.[0] && <span>{CATEGORY_EMOJI[ch.categories[0]]}</span>}
                    {ch.streams?.[0]?.quality && <span className="badge badge-hd" style={{ marginLeft: 2 }}>{ch.streams[0].quality}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ padding: '8px 16px' }}>
          {channels.map(ch => {
            const isCurrently = currentChannel?.id === ch.id
            return (
              <div key={ch.id} className={'channel-list-item' + (isCurrently ? ' active' : '')} onClick={() => openChannel(ch)}>
                <div className="channel-list-logo">
                  {ch.logo
                    ? <img src={getLogoSrc(ch.logo)} alt={ch.name} onError={e => e.target.style.display = 'none'} />
                    : <span>{CATEGORY_EMOJI[ch.categories?.[0]] || '📺'}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {COUNTRY_FLAG[ch.country]} {ch.country} 🗂 {ch.categories?.[0] || 'Général'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {ch.streams?.[0]?.quality && <span className="badge badge-hd">{ch.streams[0].quality}</span>}
                  {isCurrently
                    ? <span className="badge badge-success" style={{ background: 'rgba(108,99,255,0.2)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>▶ En cours</span>
                    : <span className={'badge ' + (ch.streams?.length > 0 ? 'badge-success' : 'badge-danger')}>
                        {ch.status === 'down' ? '⛔ HORS LIGNE' : ch.streams?.length > 0 ? '▶ LIVE' : 'OFF'}
                      </span>
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '24px 16px' }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0) }}>⬅ Préc.</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 80, textAlign: 'center' }}>{page} / {pages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page === pages} onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0) }}>Suiv. ➡</button>
        </div>
      )}
    </div>
  )
}
