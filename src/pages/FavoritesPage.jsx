import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { favoritesAPI } from '../services/api'
import { useUIStore } from '../store'
import { useAuth } from '../hooks/useAuth'
import { CATEGORY_EMOJI, COUNTRY_FLAG } from '../hooks/useChannels'
import { useToast } from '../components/ui/ToastContainer'

const SORT_OPTIONS = [
  { value: 'added',   label: '🕐 Ajoutés récemment' },
  { value: 'name',    label: '🔤 Nom A–Z' },
  { value: 'country', label: '🌍 Pays' },
]

export default function FavoritesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setCurrentChannel } = useUIStore()
  const { isDemo } = useAuth()
  const toast = useToast()
  const [sort, setSort] = useState('added')
  const [view, setView] = useState('grid')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const { data } = await favoritesAPI.getAll()
      return data.data
    },
    enabled: !isDemo,
  })

  const channels = useMemo(() => {
    const list = data || []
    let filtered = search.trim()
      ? list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.country?.toLowerCase().includes(search.toLowerCase()))
      : list
    if (sort === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'country') filtered = [...filtered].sort((a, b) => (a.country || '').localeCompare(b.country || ''))
    return filtered
  }, [data, sort, search])

  const remove = async (id) => {
    try {
      await favoritesAPI.remove(id)
      qc.setQueryData(['favorites'], (old) => (old || []).filter(c => c.id !== id))
      toast.info('Retiré des favoris')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const open = (ch) => { setCurrentChannel(ch); navigate(`/player/${ch.id}`) }

  // Demo mode
  if (isDemo) {
    return (
      <div style={{ padding: 16 }}>
        <div className="section-header" style={{ padding: '4px 0 16px' }}>
          <h2 style={{ fontWeight: 800 }}>⭐ Mes Favoris</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <div className="empty-state-title">Connexion requise</div>
          <div className="empty-state-text">Créez un compte gratuit pour sauvegarder vos chaînes favorites et y accéder depuis n'importe quel appareil.</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              🚀 Créer un compte
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/live')}>
              📡 Explorer les chaînes
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontWeight: 800 }}>⭐ Mes Favoris</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {isLoading ? '…' : `${(data || []).length} chaîne${(data || []).length !== 1 ? 's' : ''}`}
          </div>
        </div>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            {['grid', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 16, minWidth: 36, padding: '6px 10px' }}
                title={v === 'grid' ? 'Vue grille' : 'Vue liste'}>
                {v === 'grid' ? '▦' : '≡'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search within favorites */}
      {(data || []).length > 4 && (
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
          <input className="input" placeholder="Filtrer mes favoris…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36, paddingRight: search ? 36 : 14 }} />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18, padding: 4 }}>
              ×
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(160px, 1fr))' : '1fr', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: view === 'grid' ? 140 : 64, borderRadius: 12 }} />
          ))}
        </div>
      ) : channels.length === 0 && !search ? (
        <div className="empty-state">
          <div className="empty-state-icon">⭐</div>
          <div className="empty-state-title">Aucun favori</div>
          <div className="empty-state-text">Ajoutez des chaînes à vos favoris depuis le player en cliquant sur ☆</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/live')}>
            📡 Explorer les chaînes
          </button>
        </div>
      ) : channels.length === 0 && search ? (
        <div className="empty-state" style={{ paddingTop: 20 }}>
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">Aucun résultat</div>
          <div className="empty-state-text">Aucun favori ne correspond à "{search}"</div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setSearch('')}>
            Effacer la recherche
          </button>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {channels.map(ch => (
            <div key={ch.id} className="card channel-card" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => open(ch)}>
              <div className="channel-card-logo" style={{ height: 90 }}>
                {ch.logo
                  ? <img src={ch.logo} alt={ch.name} style={{ width: 50, height: 50, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                  : <span className="logo-fallback">{CATEGORY_EMOJI[ch.categories?.[0]] || '📺'}</span>
                }
                <span style={{ position: 'absolute', top: 6, right: 6 }} className={`badge ${ch.streams?.length > 0 ? 'badge-success' : 'badge-danger'}`}>
                  {ch.streams?.length > 0 ? '● LIVE' : 'OFF'}
                </span>
              </div>
              <div className="channel-card-info">
                <div className="channel-card-name">{ch.name}</div>
                <div className="channel-card-meta">
                  <span>{COUNTRY_FLAG[ch.country] || '🌐'}</span>
                  {ch.streams?.[0]?.quality && <span className="badge badge-hd" style={{ marginLeft: 2 }}>{ch.streams[0].quality}</span>}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); remove(ch.id) }}
                style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, color: '#fff', width: 24, height: 24, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                title="Retirer des favoris">
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {channels.map(ch => (
            <div key={ch.id} className="channel-list-item" onClick={() => open(ch)}>
              <div className="channel-list-logo">
                {ch.logo
                  ? <img src={ch.logo} alt={ch.name} style={{ width: 32, height: 32, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                  : <span style={{ fontSize: '1.3rem' }}>{CATEGORY_EMOJI[ch.categories?.[0]] || '📺'}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {COUNTRY_FLAG[ch.country]} {ch.country} · {ch.categories?.[0] || 'Général'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {ch.streams?.[0]?.quality && <span className="badge badge-hd">{ch.streams[0].quality}</span>}
                <span className={`badge ${ch.streams?.length > 0 ? 'badge-success' : 'badge-danger'}`}>
                  {ch.streams?.length > 0 ? '🔴 LIVE' : 'OFF'}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); remove(ch.id) }}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 8px', fontSize: 12 }}
                  title="Retirer des favoris">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
