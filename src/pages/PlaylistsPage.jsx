import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { playlistsAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useUIStore } from '../store'
import { useToast } from '../components/ui/ToastContainer'

export default function PlaylistsPage() {
  const { isPremium, isDemo } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const { setCurrentChannel } = useUIStore()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', url: '' })
  const [adding, setAdding] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(null)

  const { data } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => { const { data } = await playlistsAPI.getAll(); return data.data },
    enabled: !isDemo,
  })

  const playlists = data || []

  const { data: playlistChannels } = useQuery({
    queryKey: ['playlist-channels', selectedIdx],
    queryFn: async () => { const { data } = await playlistsAPI.getChannels(selectedIdx); return data.data },
    enabled: selectedIdx !== null,
  })

  const addPlaylist = async () => {
    if (!form.name || !form.url) { toast.error('Nom et URL requis'); return }
    setAdding(true)
    try {
      await playlistsAPI.create(form)
      qc.invalidateQueries(['playlists'])
      setShowAdd(false)
      setForm({ name: '', url: '' })
      toast.success('Playlist importée avec succès ✅')
    } catch (e) { toast.error(e.response?.data?.message || 'Erreur import playlist') }
    finally { setAdding(false) }
  }

  const deletePlaylist = async (idx) => {
    try {
      await playlistsAPI.delete(idx)
      qc.invalidateQueries(['playlists'])
      toast.info('Playlist supprimée')
    } catch { toast.error('Erreur suppression') }
  }

  const openChannel = (ch) => {
    setCurrentChannel({ id: ch.tvgId || ch.name, name: ch.name, logo: ch.logo, streams: [{ url: ch.url }] })
    navigate('/player')
  }

  if (!isPremium) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontWeight: 800, marginBottom: 16 }}>📂 Mes Playlists M3U</h2>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>💎</div>
          <h3>Fonctionnalité Premium</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, marginBottom: 20 }}>
            L'import de playlists M3U est disponible avec un abonnement Premium ou Pro.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/pricing')}>
            Passer Premium →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontWeight: 800 }}>📂 Mes Playlists M3U</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{playlists.length}/10 playlists</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)} disabled={playlists.length >= 10}>
          + Importer une playlist
        </button>
      </div>

      {/* Form ajout */}
      {showAdd && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Importer une playlist M3U</h3>
          <div className="form-group">
            <label className="input-label">Nom de la playlist</label>
            <input className="input" placeholder="Ma liste IPTV" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="input-label">URL de la playlist M3U</label>
            <input className="input" placeholder="https://exemple.com/playlist.m3u" value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={addPlaylist} disabled={adding}>
              {adding ? '⏳ Import en cours…' : '✅ Importer'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Annuler</button>
          </div>
        </div>
      )}

      {playlists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <div className="empty-state-title">Aucune playlist</div>
          <div className="empty-state-text">Importez une playlist M3U pour accéder à vos chaînes personnalisées</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {playlists.map((p, idx) => (
            <div key={idx} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    {p.channelCount} chaînes · {p.type?.toUpperCase()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}>
                    {selectedIdx === idx ? 'Fermer' : 'Voir'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => deletePlaylist(idx)}>🗑</button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.url}</div>
              {p.lastSync && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Sync : {new Date(p.lastSync).toLocaleDateString('fr')}</div>}

              {/* Chaînes de la playlist */}
              {selectedIdx === idx && playlistChannels && (
                <div style={{ marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
                  {playlistChannels.map((ch, i) => (
                    <div key={i} className="channel-list-item" onClick={() => openChannel(ch)} style={{ fontSize: 13 }}>
                      {ch.logo && <img src={ch.logo} style={{ width: 24, height: 24, objectFit: 'contain' }} alt="" onError={e => e.target.style.display = 'none'} />}
                      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                      <span style={{ color: 'var(--accent)', fontSize: 11 }}>▶</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
