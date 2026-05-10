import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUIStore } from '../store'
import { useQuery } from '@tanstack/react-query'
import { channelsAPI, epgAPI, favoritesAPI, getProxiedLogoUrl, proxyAPI } from '../services/api'
import { CATEGORY_EMOJI, COUNTRY_FLAG } from '../hooks/useChannels'
import HLSPlayer from '../components/player/HLSPlayer'
import { useToast } from '../components/ui/ToastContainer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const FRANCE_TV_MASTERS = {
  'France2.fr': 'https://raw.githubusercontent.com/schumijo/iptv/main/playlists/francetv/france2.m3u8',
  'France3.fr': 'https://raw.githubusercontent.com/schumijo/iptv/main/playlists/francetv/france3.m3u8',
  'France4.fr': 'https://raw.githubusercontent.com/schumijo/iptv/main/playlists/francetv/france4.m3u8',
  'Franceinfo.fr': 'https://raw.githubusercontent.com/schumijo/iptv/main/playlists/francetv/franceinfo.m3u8',
  'FranceInfoTV.fr': 'https://raw.githubusercontent.com/schumijo/iptv/main/playlists/francetv/franceinfo.m3u8',
}

export default function PlayerPage() {
  const { channelId } = useParams()
  const navigate = useNavigate()
  const { currentChannel, setCurrentChannel, watchHistory } = useUIStore()
  const toast = useToast()
  const [isFav, setIsFav] = useState(false)
  const [showEpg, setShowEpg] = useState(false)
  const [streamIndex, setStreamIndex] = useState(0)
  const [showSidebar, setShowSidebar] = useState(false)
  const currentChannelMatchesRoute = !channelId || currentChannel?.id === channelId

  // Charger la chaîne si accès direct via URL
  const { data: channelData } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      if (!channelId) return null
      const { data } = await channelsAPI.getById(channelId)
      return data.data
    },
    enabled: !!channelId && !currentChannelMatchesRoute,
  })

  const channel = currentChannelMatchesRoute ? currentChannel : channelData

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
    if (channelData && currentChannel?.id !== channelData.id) setCurrentChannel(channelData)
  }, [channelData, currentChannel?.id, setCurrentChannel])

  // Reset stream index when channel changes
  useEffect(() => {
    setStreamIndex(0)
  }, [channel?.id])

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

  const handleError = useCallback((msg) => {
    const streams = channel?.streams || []
    if (streamIndex < streams.length - 1) {
      toast.info(`⚡ Tentative avec le flux suivant… (${streamIndex + 1}/${streams.length})`)
      setStreamIndex(i => i + 1)
    } else {
      toast.error(`Erreur stream : ${msg}`)
    }
  }, [channel, streamIndex, toast])

  const handlePiP = async () => {
    try {
      const video = document.querySelector('.player-video')
      if (!video) return
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture()
        toast.info('Mode PiP activé')
      } else {
        toast.info('PiP non supporté par ce navigateur')
      }
    } catch (e) {
      toast.error('PiP indisponible')
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

  const streams = channel.streams || []
  const sortedStreams = [...streams].sort((a, b) => {
    const score = (stream) => {
      const url = stream?.url || ''
      let value = 0
      if (
        url.includes('live-cdn-stream-euw1.') ||
        url.includes('ncdn-live-bfm.pfd.sfr.net') ||
        url.includes('artesimulcast.akamaized.net') ||
        url.includes('ott.tv5monde.com') ||
        url.includes('qwest') ||
        url.includes('persiana')
      ) value -= 20
      if (url.startsWith('http://')) value += 15
      if (!url.includes('.m3u8')) value += 20
      if (url.endsWith('.mpd') || url.includes('browser-dash')) value += 30
      if (url.includes('viamotionhsi.netplus.ch')) value += 70
      if (url.includes('jmp2.uk')) value += 25
      if (url.includes('raw.githubusercontent.com')) value += 35
      if (stream?.status === 'offline') value += 50
      return value
    }
    return score(a) - score(b)
  })
  const freshFranceTvStream = FRANCE_TV_MASTERS[channel.id]
    ? [{ url: FRANCE_TV_MASTERS[channel.id], quality: 'AUTO', source_origin: 'francetv-master' }]
    : []
  const useBackendBestFirst = false
  const playableStreams = useBackendBestFirst
    ? [{ proxyUrl: proxyAPI.getBestStreamUrl(channel.id), quality: 'AUTO', source_origin: 'backend-best' }, ...freshFranceTvStream, ...sortedStreams]
    : [...freshFranceTvStream, ...sortedStreams]
  const currentStream = playableStreams[streamIndex] || streams[streamIndex]

  // Préférer HLS (.m3u8) sur DASH (.mpd)
  const rawStreamUrl = (() => {
    if (currentStream?.proxyUrl) return null
    const url = currentStream?.url
    if (!url) return null
    if (url.endsWith('.mpd') || url.includes('browser-dash')) {
      const hlsAlt = sortedStreams.find(s => s.url?.includes('.m3u8'))
      return hlsAlt?.url || channel.bestStreamUrl || url
    }
    return url
  })()

  const streamUrl = currentStream?.proxyUrl || (rawStreamUrl
    ? proxyAPI.getStreamUrl(rawStreamUrl, channel.country)
    : channel.proxyUrl || (channel.bestStreamUrl ? proxyAPI.getStreamUrl(channel.bestStreamUrl, channel.country) : proxyAPI.getBestStreamUrl(channel.id)))

  const currentProg = epgData?.current
  const nextProg = epgData?.next

  // Chaînes récentes pour la barre latérale
  const recentChannels = (watchHistory || []).filter(h => h.id !== channel.id).slice(0, 8)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Player */}
      <div style={{ background: '#000', position: 'relative', flexShrink: 0 }}>
        <HLSPlayer
          key={`${channel.id}-${streamIndex}`}
          src={streamUrl}
          channelId={channel.id}
          autoplay={true}
          onError={handleError}
        />
      </div>

      {/* Channel info — layout responsive via CSS classes */}
      <div className="player-channel-info">
        <div className="player-channel-top">
          {/* Logo */}
          <div style={{
            width: 52, height: 52,
            background: 'var(--bg-card)', borderRadius: 10, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', border: '1px solid var(--border)'
          }}>
            {channel.logo
              ? <img src={getProxiedLogoUrl(channel.logo)} style={{ width: 40, height: 40, objectFit: 'contain' }} alt=""
                  onError={e => e.target.style.display = 'none'} />
              : <span style={{ fontSize: '1.6rem' }}>{CATEGORY_EMOJI[channel.categories?.[0]] || '📺'}</span>
            }
          </div>

          {/* Info */}
          <div className="player-channel-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{channel.name}</h2>
              <span className="badge badge-danger">🔴 LIVE</span>
              {currentStream?.quality && <span className="badge badge-hd">{currentStream.quality}</span>}
              {streams.length > 1 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Flux {streamIndex + 1}/{streams.length}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
                    {format(new Date(currentProg.start), 'HH:mm', { locale: fr })} –{' '}
                    {format(new Date(currentProg.stop), 'HH:mm', { locale: fr })}
                  </span>
                </div>
                <div className="epg-progress">
                  <div className="epg-progress-fill" style={{ width: `${currentProg.progress || 0}%` }} />
                </div>
                {nextProg && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Suivant : {nextProg.title} · {format(new Date(nextProg.start), 'HH:mm', { locale: fr })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions — ligne séparée, responsive */}
        <div className="player-channel-actions">
          <button
            className={`btn btn-sm ${isFav ? 'btn-primary' : 'btn-secondary'}`}
            onClick={toggleFav}
            title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            {isFav ? '⭐' : '☆'}
          </button>
          {document.pictureInPictureEnabled && (
            <button className="btn btn-secondary btn-sm" onClick={handlePiP} title="Picture in Picture">
              ⧉
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowEpg(v => !v)} title="Programme TV">
            📅
          </button>
          {streams.length > 1 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setStreamIndex(i => (i + 1) % streams.length)}
              title="Changer de flux"
            >
              ⟳
            </button>
          )}
          {recentChannels.length > 0 && (
            <button
              className={`btn btn-sm ${showSidebar ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowSidebar(v => !v)}
              title="Chaînes récentes"
            >
              📋
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/live')} title="Changer de chaîne">
            📡
          </button>
        </div>
      </div>

      {/* Main area with optional sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
        {/* EPG Panel */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {showEpg && <EpgPanel channelId={channel.id} />}
        </div>

        {/* Backdrop pour fermer le sidebar sur mobile */}
        {showSidebar && recentChannels.length > 0 && (
          <div className="player-sidebar-backdrop" onClick={() => setShowSidebar(false)} />
        )}

        {/* Recent channels sidebar */}
        {showSidebar && recentChannels.length > 0 && (
          <div className="player-recent-sidebar" style={{
            background: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border)',
            overflowY: 'auto',
            flexShrink: 0,
          }}>
            <div style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border)',
              fontSize: 12, fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.5px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              🕐 RÉCEMMENT VUS
              <button
                className="topbar-btn"
                style={{ width: 28, height: 28, fontSize: 13 }}
                onClick={() => setShowSidebar(false)}
              >✕</button>
            </div>
            {recentChannels.map(ch => (
              <div
                key={ch.id}
                className="channel-list-item"
                style={{ padding: '8px 10px', gap: 8 }}
                onClick={() => { setCurrentChannel(ch); navigate(`/player/${ch.id}`) }}
              >
                <div style={{
                  width: 32, height: 32,
                  background: 'var(--bg-card)', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, overflow: 'hidden'
                }}>
                  {ch.logo
                    ? <img src={getProxiedLogoUrl(ch.logo)} style={{ width: 24, height: 24, objectFit: 'contain' }} alt=""
                        onError={e => e.target.style.display = 'none'} />
                    : <span style={{ fontSize: '1rem' }}>{CATEGORY_EMOJI[ch.categories?.[0]] || '📺'}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ch.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{COUNTRY_FLAG[ch.country]}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
    <div style={{ padding: '14px 16px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)' }}>
      <h4 style={{ marginBottom: 12 }}>📅 Prochains programmes</h4>
      {programs.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Programme non disponible pour cette chaîne</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {programs.slice(0, 8).map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--accent)', minWidth: 40, fontWeight: 600, flexShrink: 0 }}>
                {format(new Date(p.start), 'HH:mm', { locale: fr })}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.title}
                </div>
                {p.description && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.description.slice(0, 120)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
