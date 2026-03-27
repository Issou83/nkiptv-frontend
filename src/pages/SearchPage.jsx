import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useChannels, CATEGORY_EMOJI, COUNTRY_FLAG } from '../hooks/useChannels'
import { useUIStore } from '../store'

export default function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setCurrentChannel } = useUIStore()
  const [q, setQ] = useState(params.get('q') || '')

  const { data, isLoading } = useChannels(q.trim() ? { search: q, limit: 50 } : {})
  const channels = data?.data || []

  useEffect(() => { setQ(params.get('q') || '') }, [params])

  const open = (ch) => { setCurrentChannel(ch); navigate(`/player/${ch.id}`) }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontWeight: 800, marginBottom: 16 }}>🔍 Recherche</h2>
      <input className="input" placeholder="Nom de chaîne, pays, catégorie…"
        value={q} autoFocus
        onChange={e => setQ(e.target.value)}
        style={{ marginBottom: 20 }} />

      {q && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
          {isLoading ? 'Recherche en cours…' : `${channels.length} résultats pour "${q}"`}
        </p>
      )}

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12 }} />
          ))}
        </div>
      ) : channels.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {channels.map(ch => (
            <div key={ch.id} className="channel-list-item" onClick={() => open(ch)}>
              <div className="channel-list-logo">
                {ch.logo
                  ? <img src={ch.logo} alt="" onError={e => e.target.style.display = 'none'} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                  : <span>{CATEGORY_EMOJI[ch.categories?.[0]] || '📺'}</span>
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{ch.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {COUNTRY_FLAG[ch.country]} {ch.country} · {ch.categories?.[0] || '—'}
                </div>
              </div>
              <span className={`badge ${ch.streams?.length ? 'badge-success' : 'badge-danger'}`}>
                {ch.streams?.length ? 'LIVE' : 'OFF'}
              </span>
            </div>
          ))}
        </div>
      ) : q ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">Aucun résultat</div>
          <div className="empty-state-text">Essayez un autre nom ou pays</div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">Rechercher une chaîne</div>
          <div className="empty-state-text">Saisissez le nom d'une chaîne, un pays ou une catégorie</div>
        </div>
      )}
    </div>
  )
}
