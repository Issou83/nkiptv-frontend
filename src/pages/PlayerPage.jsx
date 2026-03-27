import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUIStore } from '../store'
import { useQuery } from '@tanstack/react-query'
import { channelsAPI, epgAPI, favoritesAPI, proxyAPI } from '../services/api'
import { CATEGORY_EMOJI, COUNTRY_FLAG } from '../hooks/useChannels'
import HLSPlayer from '../components/player/HLSPlayer'
import { useToast } from '../components/ui/ToastContainer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function PlayerPage() {
  const { channelId } = useParams()
  const navigate = useNavigate()
  const { currentChannel, setCurrentChannel } = useUIStore()
  const toast = useToast()
  const [isFav, setIsFav] = useState(false)
  const [showEpg, setShowEpg] = useState(false)

  // Charger la chaîne si accès direct via URL
  const { data: channelData } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      if (!channelId) return null
      const { data } = await channelsAPI.getById(channelId)
      return data.data
    },
    enabled: !!channelId && !currentChannel,
  })

  const channel = currentChannel || channelData

  // EPG actuel
  const { data: epgData } = useQuery({
    queryKey: ['epg-now', channel?.id],
    queryFn: async () => {
      const { data } = await epgAPI.getCurrent(channel.id)
      return data.data
    },
    enabled: !!channel?.id,
    refetchInterval: 60 * 1000,
  })

  useEffect(() => {
    if (channelData && !currentChannel) setCurrentChannel(channelData)
  }, [channelData])

  const toggleFav = async () => {
    if (!channel) return
    try {
      if (isFav) {
        await favoritesAPI.remove(channel.id)
        setIsFav(false)
        toast.info('Retiré des favoris')
      } else {
        await favoritesAPI.add(channel.id)
        setIsFav(true)
        toast.success('Ajouté aux favoris ⭐')
      }
    } catch {
      toast.error('Connectez-vous pour gérer vos favoris')
    }
  }

  if (!channel) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📺</div>
        <div className="empty-state-title">Aucune chaîne sélectionnée</div>
        <div className="empty-state-text">Choisissez une chaîne dans Live TV</div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/live')}>
          📡 Parcourir les chaînes
        </button>
      </div>
    )
  }

  const streamUrl = channel.streams?.[0]?.url
    ? proxyAPI.getStreamUrl(channel.streams[0].url, channel.country)
    : proxyAPI.getBestStreamUrl(channel.id)

  const currentProg = epgData?.current
  const nextProg = epgData?.next

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Player */}
      <div style={{ background: '#000', position: 'relative' }}>
        <HLSPlayer
          src={streamUrl}
          channelId={channel.id}
          autoplay={true}
          onError={(msg) => toast.error(`Erreur stream : ${msg}`)}
        />
      </div>

      {/* Channel info */}
      <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Logo */}
          <div style={{ width: 56, height: 56, background: 'var(--bg-card)', borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {channel.logo
              ? <img src={channel.logo} style={{ width: 44, height: 44, objectFit: 'contain' }} alt="" onError={e => e.target.style.display = 'none'} />
              : <span style={{ fontSize: '1.8rem' }}>{CATEGORY_EMOJI[channel.categories?.[0]] || '📺'}</span>
            }
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{channel.name}</h2>
              <span className="badge badge-danger">🔴 LIVE</span>
              {channel.streams?.[0]?.quality && (
                <span className="badge badge-hd">{channel.streams[0].quality}</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 10 }}>
              <span>{COUNTRY_FLAG[channel.country]} {channel.country}</span>
              {channel.categories?.map(c => (
                <span key={c}>{CATEGORY_EMOJI[c]} {c}</span>
              ))}
            </div>

            {/* EPG actuel */}
            {currentProg && (
              <div className="epg-bar" style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <strong>▶ {currentProg.title}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {format(new Date(currentProg.start), 'HH:mm', { locale: fr })} –
                    {format(new Date(currentProg.stop), 'HH:mm', { locale: fr })}
                  </span>
                </div>
                <div className="epg-progress">
                  <div className="epg-progress-fill" style={{ width: `${currentProg.progress || 0}%` }} />
                </div>
                {nextProg && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Suivant : {nextProg.title} · {format(new Date(nextProg.start), 'HH:mm', { locale: fr })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className={`btn btn-sm ${isFav ? 'btn-primary' : 'btn-secondary'}`} onClick={toggleFav}>
              {isFav ? '⭐' : '☆'} Favori
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowEpg(v => !v)}>
              📅 Programme
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/live')}>
              📡 Changer
            </button>
          </div>
        </div>
      </div>

      {/* EPG Panel */}
      {showEpg && (
        <EpgPanel channelId={channel.id} />
      )}
    </div>
  )
}

function EpgPanel({ channelId }) {
  const { data } = useQuery({
    queryKey: ['epg-upcoming', channelId],
    queryFn: async () => {
      const { data } = await epgAPI.getUpcoming(channelId, 12)
      return data.data
    },
    enabled: !!channelId,
  })

  const programs = data || []

  return (
    <div style={{ padding: '16px 20px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
      <h4 style={{ marginBottom: 12 }}>📅 Prochains programmes</h4>
      {programs.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Programme non disponible pour cette chaîne</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {programs.slice(0, 8).map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)', minWidth: 40, fontWeight: 600 }}>
                {format(new Date(p.start), 'HH:mm', { locale: fr })}
              </span>
              <div>
                <div style={{ fontWeight: 600 }}>{p.title}</div>
                {p.description && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{p.description.slice(0, 100)}{p.description.length > 100 ? '…' : ''}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
