import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useChannels, useChannelStats, CATEGORY_EMOJI, COUNTRY_FLAG } from '../hooks/useChannels'
import { useUIStore } from '../store'

const CATEGORIES = [null, 'news', 'sports', 'music', 'movies', 'entertainment', 'documentary', 'kids', 'business', 'culture', 'family', 'religious']
const SORT_OPTIONS = [
  { value: 'viewCount', label: 'Populaires' },
  { value: 'name', label: 'A-Z' },
  { value: 'newest', label: 'Nouveaux' },
]

export default function LivePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { setCurrentChannel } = useUIStore()
  const [view, setView] = useState('grid')
  const [page, setPage] = useState(1)

  const category = params.get('category') || ''
  const country = params.get('country') || ''
  const sort = params.get('sort') || 'viewCount'

  const { data, isLoading } = useChannels({
    category, country, sort,
    hasStream: 'true', limit: 50,
    page,
  })

  const channels = data?.data || []
  const total = data?.pagination?.total || 0
  const pages = data?.pagination?.pages || 1

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

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontWeight: 800 }}>📡 Live TV</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 3 }}>
          {isLoading ? '…' : `${total.toLocaleString()} chaînes disponibles`}
          {category && ` · ${CATEGORY_EMOJI[category]} ${category}`}
          {country && ` · ${COUNTRY_FLAG[country]} ${country}`}
        </p>
      </div>

      {/* Filtres catégories */}
      <div className="filter-row" style={{ paddingTop: 12 }}>
        {CATEGORIES.map(cat => (
          <div key={cat || 'all'} className={`filter-chip${(cat || '') === category ? ' active' : ''}`}
            onClick={() => setFilter('category', cat)}>
            {cat ? `${CATEGORY_EMOJI[cat] || '📺'} ${cat.charAt(0).toUpperCase() + cat.slice(1)}` : '🌐 Toutes'}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
        <select value={sort} onChange={e => setFilter('sort', e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {['grid', 'list'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`btn btn-secondary btn-sm${view === v ? ' btn-primary' : ''}`}
              style={{ padding: '6px 10px', fontSize: 16 }}>
              {v === 'grid' ? '▦' : '≡'}
            </button>
          ))}
        </div>
      </div>

      {/* Channels */}
      {isLoading ? (
        <div className={view === 'grid' ? 'channel-grid channel-grid-lg' : ''} style={{ padding: 16 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: view === 'grid' ? 160 : 56, borderRadius: 12 }} />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📺</div>
          <div className="empty-state-title">Aucune chaîne trouvée</div>
          <div className="empty-state-text">Modifiez les filtres ou vérifiez votre connexion</div>
        </div>
      ) : view === 'grid' ? (
        <div className="channel-grid channel-grid-lg">
          {channels.map(ch => (
            <div key={ch.id} className="card channel-card" onClick={() => openChannel(ch)}>
              <div className="channel-card-logo">
                {ch.logo
                  ? <img src={ch.logo} alt={ch.name} onError={e => e.target.style.display = 'none'} />
                  : <span className="logo-fallback">{CATEGORY_EMOJI[ch.categories?.[0]] || '📺'}</span>
                }
                <span style={{ position: 'absolute', top: 6, right: 6 }} className={`badge ${ch.streams?.length > 0 ? 'badge-success' : 'badge-danger'}`}>
                  {ch.streams?.length > 0 ? 'LIVE' : 'OFF'}
                </span>
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
          ))}
        </div>
      ) : (
        <div style={{ padding: '8px 16px' }}>
          {channels.map(ch => (
            <div key={ch.id} className="channel-list-item" onClick={() => openChannel(ch)}>
              <div className="channel-list-logo">
                {ch.logo
                  ? <img src={ch.logo} alt={ch.name} onError={e => e.target.style.display = 'none'} />
                  : <span>{CATEGORY_EMOJI[ch.categories?.[0]] || '📺'}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {COUNTRY_FLAG[ch.country]} {ch.country} · {ch.categories?.[0] || 'Général'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {ch.streams?.[0]?.quality && <span className="badge badge-hd">{ch.streams[0].quality}</span>}
                <span className={`badge ${ch.streams?.length > 0 ? 'badge-success' : 'badge-danger'}`}>
                  {ch.streams?.length > 0 ? '🔴 LIVE' : 'OFF'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '24px 16px' }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Préc.</button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            Page {page} / {pages}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Suiv. →</button>
        </div>
      )}
    </div>
  )
}
