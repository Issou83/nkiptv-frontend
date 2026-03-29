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
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [syncing, setSyncing] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['playlists'],
    queryFn: async () => { const { data } = await playlistsAPI.getAll(); return data.data },
    enabled: !isDemo && isPremium,
  })

  const playlists = data || []

  const { data: playlistChannels, isLoading: loadingChannels } = useQuery({
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
      if (selectedIdx === idx) setSelectedIdx(null)
      setConfirmDelete(null)
      toast.info('Playlist supprimée')
    } catch { toast.error('Erreur suppression') }
  }

  const syncPlaylist = async (idx) => {
    setSyncing(idx)
    try {
      await playlistsAPI.sync?.(idx)
      qc.invalidateQueries(['playlists'])
      qc.invalidateQueries(['playlist-channels', idx])
      toast.success('Playlist synchronisée ✅')
    } catch { toast.error('Erreur de synchronisation') }
    finally { setSyncing(null) }
  }

  const openChannel = (ch) => {
    setCurrentChannel({ id: ch.tvgId || ch.name, name: ch.name, logo: ch.logo, streams: [{ url: ch.url }] })
    navigate('/player')
  }

  // Demo mode
  if (isDemo) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontWeight: 800, marginBottom: 16 }}>📂 Mes Playlists M3U</h2>
        <div className="empty-state">
          <div className="empty-state-icon">🔒</div>
          <div className="empty-state-title">Connexion requise</div>
          <div className="empty-state-text">Créez un compte et passez Premium pour importer vos playlists M3U personnalisées.</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/login')}>🚀 Créer un compte</button>
            <button className="btn btn-secondary" onClick={() => navigate('/pricing')}>💎 Voir les offres</button>
          </div>
        </div>
      </div>
    )
  }

  if (!isPremium) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ fontWeight: 800, marginBottom: 16 }}>📂 Mes Playlists M3U</h2>
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>💎</div>
          <h3>Fonctionnalité Premium</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, marginBottom: 8 }}>
            L'import de playlists M3U est disponible avec un abonnement Premium ou Pro.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Importez jusqu'à 10 playlists et accédez à vos chaînes IPTV personnalisées.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/pricing')}>
            ✨ Passer Premium →
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
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {isLoading ? '…' : `${playlists.length}/10 playlists`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(v => !v)} disabled={playlists.length >= 10}>
          {showAdd ? '✕ Annuler' : '+ Importer une playlist'}
        </button>
      </div>

      {/* Form ajout */}
      {showAdd && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16 }}>📥 Importer une playlist M3U</h3>
          <div className="form-group">
            <label className="input-label">Nom de la playlist</label>
            <input className="input" placeholder="Ma liste IPTV" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addPlaylist()} />
          </div>
          <div className="form-group">
            <label className="input-label">URL de la playlist M3U</label>
            <input className="input" placeholder="https://exemple.com/playlist.m3u" value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addPlaylist()} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={addPlaylist} disabled={adding || !form.name || !form.url}>
              {adding ? '⏳ Import en cours…' : '✅ Importer'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowAdd(false); setForm({ name: '', url: '' }) }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
        </div>
      ) : playlists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <div className="empty-state-title">Aucune playlist</div>
          <div className="empty-state-text">Importez une playlist M3U pour accéder à vos chaînes personnalisées</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowAdd(true)}>
            + Importer ma première playlist
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {playlists.map((p, idx) => (
            <div key={idx} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    <span className="badge badge-success" style={{ marginRight: 6 }}>{p.channelCount} chaînes</span>
                    {p.type && <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>{p.type.toUpperCase()}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button className={`btn btn-sm ${selectedIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
                    title={selectedIdx === idx ? 'Fermer les chaînes' : 'Voir les chaînes'}>
                    {selectedIdx === idx ? '▲' : '▼'}
                  </button>
                  <button className="btn btn-secondary btn-sm" title="Resynchroniser"
                    disabled={syncing === idx}
                    onClick={() => syncPlaylist(idx)}>
                    {syncing === idx ? '⏳' : '🔄'}
                  </button>
                  {confirmDelete === idx ? (
                    <>
                      <button className="btn btn-danger btn-sm" onClick={() => deletePlaylist(idx)}>Confirmer</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>✕</button>
                    </>
                  ) : (
                    <button className="btn btn-secondary btn-sm" style={{ color: 'var(--error, #ef4444)' }}
                      onClick={() => setConfirmDelete(idx)} title="Supprimer">🗑</button>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}
                title={p.url}>
                🔗 {p.url}
              </div>
              {p.lastSync && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  🕐 Sync : {new Date(p.lastSync).toLocaleDateString('fr')}
                </div>
              )}

              {/* Chaînes de la playlist */}
              {selectedIdx === idx && (
                <div style={{ marginTop: 12, maxHeight: 280, overflowY: 'auto', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {loadingChannels ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />)}
                    </div>
                  ) : playlistChannels?.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                      Aucune chaîne dans cette playlist
                    </p>
                  ) : (
                    playlistChannels?.map((ch, i) => (
                      <div key={i} className="channel-list-item" onClick={() => openChannel(ch)} style={{ fontSize: 13, padding: '6px 8px' }}>
                        {ch.logo && <img src={ch.logo} style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 4 }} alt="" onError={e => e.target.style.display = 'none'} />}
                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                        {ch.group && <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{ch.group}</span>}
                        <span style={{ color: 'var(--accent)', fontSize: 12, flexShrink: 0 }}>▶</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
