import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useChannels, CATEGORY_EMOJI, COUNTRY_FLAG } from '../hooks/useChannels'
import { useUIStore } from '../store'
import { getProxiedLogoUrl } from '../services/api'

const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

const QUICK_CATEGORIES = [
  { key: 'news',          label: 'Infos',     icon: '📰' },
  { key: 'sports',        label: 'Sport',     icon: '⚽' },
  { key: 'music',         label: 'Musique',   icon: '🎵' },
  { key: 'movies',        label: 'Cinéma',    icon: '🎬' },
  { key: 'entertainment', label: 'Divertissement', icon: '🎭' },
  { key: 'kids',          label: 'Enfants',   icon: '🧸' },
  { key: 'documentary',   label: 'Docs',      icon: '🌍' },
  { key: 'business',      label: 'Business',  icon: '📊' },
]

export default function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setCurrentChannel } = useUIStore()
  const [q, setQ] = useState(params.get('q') || '')
  const [debouncedQ, setDebouncedQ] = useState(q)
  const [activeCategory, setActiveCategory] = useState('')
  const inputRef = useRef(null)

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(t)
  }, [q])

  // Sync with URL param
  useEffect(() => {
    const urlQ = params.get('q') || ''
    setQ(urlQ)
    setDebouncedQ(urlQ)
  }, [params])

  const searchFilters = {}
  if (debouncedQ.trim()) searchFilters.search = debouncedQ.trim()
  if (activeCategory) searchFilters.category = activeCategory
  searchFilters.limit = 60

  const { data, isLoading } = useChannels(
    (debouncedQ.trim() || activeCategory) ? searchFilters : { limit: 0 }
  )

  const channels = data?.data || []
  const hasQuery = debouncedQ.trim().length > 0 || activeCategory

  const open = (ch) => {
    setCurrentChannel(ch)
    navigate(`/player/${ch.id}`)
  }

  const clearAll = () => {
    setQ('')
    setDebouncedQ('')
    setActiveCategory('')
    inputRef.current?.focus()
  }

  const highlightMatch = (text, query) => {
    if (!query.trim()) return text
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} style={{ background: 'rgba(108,99,255,0.3)', color: 'var(--text-primary)', borderRadius: 3, padding: '0 2px' }}>{part}</mark>
        : part
    )
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 16 }}>🔍</span>
        <input
          ref={inputRef}
          className="input"
          placeholder="Nom de chaîne, pays, catégorie…"
          value={q}
          autoFocus={!isTouch}
          onChange={e => setQ(e.target.value)}
          style={{ paddingLeft: 42, paddingRight: q ? 42 : 14 }}
        />
        {q && (
          <button
            onClick={clearAll}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        )}
      </div>

      {/* Quick category filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {QUICK_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(activeCategory === cat.key ? '' : cat.key)}
            className={`btn btn-sm ${activeCategory === cat.key ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12 }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      {hasQuery && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
          {isLoading
            ? '🔍 Recherche en cours…'
            : channels.length > 0
              ? `${channels.length} résultat${channels.length > 1 ? 's' : ''}${debouncedQ ? ` pour "${debouncedQ}"` : ''}${activeCategory ? ` · ${activeCategory}` : ''}`
              : `Aucun résultat${debouncedQ ? ` pour "${debouncedQ}"` : ''}`
          }
        </p>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
          ))}
        </div>
      ) : channels.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {channels.map(ch => (
            <div key={ch.id} className="channel-list-item" onClick={() => open(ch)}>
              <div className="channel-list-logo">
                {ch.logo
                  ? <img src={getProxiedLogoUrl(ch.logo)} alt="" onError={e => e.target.style.display = 'none'} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                  : <span style={{ fontSize: '1.3rem' }}>{CATEGORY_EMOJI[ch.categories?.[0]] || '📺'}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {highlightMatch(ch.name, debouncedQ)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {COUNTRY_FLAG[ch.country]} {ch.country} · {ch.categories?.[0] || '—'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {ch.streams?.[0]?.quality && <span className="badge badge-hd">{ch.streams[0].quality}</span>}
                <span className={`badge ${ch.streams?.length ? 'badge-success' : 'badge-danger'}`}>
                  {ch.streams?.length ? '🔴 LIVE' : 'OFF'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : hasQuery ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">Aucun résultat</div>
          <div className="empty-state-text">Essayez un autre nom, pays ou catégorie</div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={clearAll}>
            Effacer la recherche
          </button>
        </div>
      ) : (
        <div>
          <div className="empty-state" style={{ paddingTop: 20 }}>
            <div className="empty-state-icon">🔍</div>
            <div className="empty-state-title">Rechercher une chaîne</div>
            <div className="empty-state-text">Saisissez le nom d'une chaîne, un pays ou utiliser les catégories ci-dessus</div>
          </div>
        </div>
      )}
    </div>
  )
}
