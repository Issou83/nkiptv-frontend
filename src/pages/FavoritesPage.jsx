import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { favoritesAPI } from '../services/api'
import { useUIStore } from '../store'
import { CATEGORY_EMOJI, COUNTRY_FLAG } from '../hooks/useChannels'
import { useToast } from '../components/ui/ToastContainer'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setCurrentChannel } = useUIStore()
  const toast = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const { data } = await favoritesAPI.getAll()
      return data.data
    },
  })

  const channels = data || []

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

  return (
    <div style={{ padding: 16 }}>
      <div className="section-header" style={{ padding: '4px 0 16px' }}>
        <div>
          <h2 style={{ fontWeight: 800 }}>⭐ Mes Favoris</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            {channels.length} chaîne{channels.length > 1 ? 's' : ''} sauvegardée{channels.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⭐</div>
          <div className="empty-state-title">Aucun favori</div>
          <div className="empty-state-text">Ajoutez des chaînes à vos favoris depuis le player</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/live')}>
            📡 Explorer les chaînes
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {channels.map(ch => (
            <div key={ch.id} className="card" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => open(ch)}>
              <div style={{ height: 80, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px 12px 0 0' }}>
                {ch.logo
                  ? <img src={ch.logo} alt="" style={{ maxWidth: '60%', maxHeight: '60%', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                  : <span style={{ fontSize: '2rem' }}>{CATEGORY_EMOJI[ch.categories?.[0]] || '📺'}</span>
                }
              </div>
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {COUNTRY_FLAG[ch.country]} {ch.country}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); remove(ch.id) }}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, color: '#fff', width: 24, height: 24, cursor: 'pointer', fontSize: 12 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
