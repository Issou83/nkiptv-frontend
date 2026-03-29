import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useChannels, useChannelStats, CATEGORY_EMOJI, COUNTRY_FLAG } from '../hooks/useChannels'
import { useUIStore } from '../store'

const CATEGORIES = [null, 'news', 'sports', 'music', 'movies', 'entertainment', 'documentary', 'kids', 'business', 'culture', 'family', 'religious']

const COUNTRIES = [
  { code: '', name: 'Tous les pays' },
  { code: 'FR', name: 'ð«ð· France' },
  { code: 'MA', name: 'ð²ð¦ Maroc' },
  { code: 'DZ', name: 'ð©ð¿ AlgÃ©rie' },
  { code: 'TN', name: 'ð¹ð³ Tunisie' },
  { code: 'EG', name: 'ðªð¬ Ãgypte' },
  { code: 'SA', name: 'ð¸ð¦ Arabie Saoudite' },
  { code: 'US', name: 'ðºð¸ USA' },
  { code: 'GB', name: 'ð¬ð§ UK' },
  { code: 'DE', name: 'ð©ðª Allemagne' },
  { code: 'ES', name: 'ðªð¸ Espagne' },
  { code: 'IT', name: 'ð®ð¹ Italie' },
  { code: 'TR', name: 'ð¹ð· Turquie' },
  { code: 'BR', name: 'ð§ð· BrÃ©sil' },
  { code: 'IN', name: 'ð®ð³ Inde' },
  { code: 'SN', name: 'ð¸ð³ SÃ©nÃ©gal' },
  { code: 'CI', name: 'ð¨ð® CÃ´te d\'Ivoire' },
  { code: 'CM', name: 'ð¨ð² Cameroun' },
  { code: 'NG', name: 'ð³ð¬ Nigeria' },
]

const SORT_OPTIONS = [
  { value: 'viewCount', label: 'ð¥ Populaires' },
  { value: 'name',      label: 'ð¤ A-Z' },
  { value: 'newest',    label: 'â¨ Nouveaux' },
]

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

  // Fermer menu pays au clic extÃ©rieur
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
    navigate(`/player/${ch.id}`)
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

  const selectedCountry = COUNTRIES.find(c => c.code === country)

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontWeight: 800 }}>ð¡ Live TV</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 3 }}>
          {isLoading ? 'â¦' : `${total.toLocaleString()} chaÃ®nes`}
          {category && ` Â· ${CATEGORY_EMOJI[category]} ${category}`}
          {country && ` Â· ${COUNTRY_FLAG[country]} ${country}`}
        </p>
      </div>

      {/* Filtres catÃ©gories */}
      <div className="filter-row" style={{ paddingTop: 12 }}>
        {CATEGORIES.map(cat => (
          <div
            key={cat || 'all'}
            className={`filter-chip${(cat || '') === category ? ' active' : ''}`}
            onClick={() => setFilter('category', cat)}
          >
            {cat ? `${CATEGORY_EMOJI[cat] || 'ðº'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}` : 'ð Toutes'}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {/* Pays */}
        <div ref={countryRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowCountryMenu(v => !v)}
            className="btn btn-secondary btn-sm"
            style={{ gap: 6 }}
          >
            {country ? `${COUNTRY_FLAG[country]} ${country}` : 'ð Pays'} â¾
          </button>
          {showCountryMenu && (
            <div className="dropdown" style={{ top: 'calc(100% + 6px)', left: 0, right: 'auto', minWidth: 220, maxHeight: 300, overflowY: 'auto' }}>
              {COUNTRIES.map(c => (
                <div
                  key={c.code}
                  className={`dropdown-item${country === c.code ? ' active' : ''}`}
                  onClick={() => { setFilter('country', c.code); setShowCountryMenu(false) }}
                >
                  {c.name}
                  {country === c.code && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>â</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => setFilter('sort', e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Active filters */}
        {(category || country) && (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => { setParams({}); setPage(1) }}
            style={{ fontSize: 12 }}
          >
            â RÃ©initialiser
          </button>
        )}

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {['grid', 'list'].map(v => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`btn btn-secondary btn-sm${view === v ? ' btn-primary' : ''}`}
              style={{ fontSize: 16, minWidth: 36, padding: '6px 10px' }}
              title={v === 'grid' ? 'Vue grille' : 'Vue liste'}
            >
              {v === 'grid' ? 'â¦' : 'â¡'}
            </button>
          ))}
        </div>
      </div>

      {/* Channels */}
      {isLoading ? (
        <div className={view === 'grid' ? 'channel-grid channel-grid-lg' : ''} style={view === 'list' ? { padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 8 } : {}}>
          {Array.from({ length: view === 'grid' ? 12 : 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: view === 'grid' ? 150 : 58, borderRadius: 12 }} />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">ðº</div>
          <div className="empty-state-title">Aucune chaÃ®ne trouvÃ©e</div>
          <div className="empty-state-text">Modifiez les filtres ou vÃ©rifiez votre connexion</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setParams({}); setPage(1) }}>
            RÃ©initialiser les filtres
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="channel-grid channel-grid-lg">
          {channels.map(ch => {
            const isCurrently = currentChannel?.id === ch.id
            return (
              <div key={ch.id} className={`card channel-card${isCurrently ? ' channel-card-active' : ''}`} onClick={() => openChannel(ch)}>
                <div className="channel-card-logo">
                  {ch.logo
                    ? <img src={ch.logo} alt={ch.name} onError={e => e.target.style.display = 'none'} />
                    : <span className="logo-fallback">{CATEGORY_EMOJI[ch.categories?.[0]] || 'ðº'}</span>
                  }
                  <span style={{ position: 'absolute', top: 6, right: 6 }} className={`badge ${ch.streams?.length > 0 ? 'badge-success' : 'badge-danger'}`}>
                    {ch.streams?.length > 0 ? 'â LIVE' : 'OFF'}
                  </span>
                  {isCurrently && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(108,99,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '1.5rem' }}>â¶</span>
                    </div>
                  )}
                </div>
                <div className="channel-card-info">
                  <div className="channel-card-name">{ch.name}</div>
                  <div className="channel-card-meta">
                    <span>{COUNTRY_FLAG[ch.country] || 'ð'}</span>
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
              <div key={ch.id} className={`channel-list-item${isCurrently ? ' active' : ''}`} onClick={() => openChannel(ch)}>
                <div className="channel-list-logo">
                  {ch.logo
                    ? <img src={ch.logo} alt={ch.name} onError={e => e.target.style.display = 'none'} />
                    : <span>{CATEGORY_EMOJI[ch.categories?.[0]] || 'ðº'}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {COUNTRY_FLAG[ch.country]} {ch.country} Â· {ch.categories?.[0] || 'GÃ©nÃ©ral'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {ch.streams?.[0]?.quality && <span className="badge badge-hd">{ch.streams[0].quality}</span>}
                  {isCurrently
                    ? <span className="badge badge-success" style={{ background: 'rgba(108,99,255,0.2)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>â¶ En cours</span>
                    : <span className={`badge ${ch.streams?.length > 0 ? 'badge-success' : 'badge-danger'}`}>
                       {ch.streams?.length > 0 ? 'ð´ LIVE' : 'OFF'}
                      </span>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '24px 16px' }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0) }}>â PrÃ©c.</button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 80, textAlign: 'center' }}>
            {page} / {pages}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page === pages} onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0) }}>Suiv. â</button>
        </div>
      )}
    </div>
  )
}
