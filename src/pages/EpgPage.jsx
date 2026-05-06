import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { epgAPI, getProxiedLogoUrl } from '../services/api'
import { useChannels, COUNTRY_FLAG } from '../hooks/useChannels'
import { useUIStore } from '../store'
import { format, addHours, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function EpgPage() {
  const navigate = useNavigate()
  const { setCurrentChannel } = useUIStore()
  const [country, setCountry] = useState('FR')
  const [selectedChannel, setSelectedChannel] = useState(null)

  const { data: channelsData } = useChannels({ country, hasStream: 'true', limit: 30 })
  const channels = channelsData?.data || []

  const { data: gridData } = useQuery({
    queryKey: ['epg-grid', country],
    queryFn: async () => {
      const { data } = await epgAPI.getGrid({ country })
      return data.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const now = new Date()
  const hours = Array.from({ length: 6 }, (_, i) => addHours(now, i - 1))

  const playChannel = (ch) => {
    setCurrentChannel(ch)
    navigate(`/player/${ch.id}`)
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontWeight: 800 }}>📅 Programme TV</h2>
        <select value={country} onChange={e => setCountry(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
          {[
            { code: 'FR', name: '🇫🇷 France' }, { code: 'US', name: '🇺🇸 USA' },
            { code: 'GB', name: '🇬🇧 UK' }, { code: 'DE', name: '🇩🇪 Allemagne' },
            { code: 'ES', name: '🇪🇸 Espagne' }, { code: 'MA', name: '🇲🇦 Maroc' },
            { code: 'DZ', name: '🇩🇿 Algérie' }, { code: 'TN', name: '🇹🇳 Tunisie' },
          ].map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </div>

      {/* Heure actuelle */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="live-dot" style={{ display: 'inline-block' }} />
        Maintenant : <strong>{format(now, "EEEE d MMMM · HH:mm", { locale: fr })}</strong>
      </div>

      {/* Grille EPG */}
      {gridData?.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 900 }}>
            {/* Timeline header */}
            <div style={{ display: 'flex', paddingLeft: 180, marginBottom: 4 }}>
              {hours.map(h => (
                <div key={h.toISOString()} style={{ minWidth: 120, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {format(h, 'HH:mm')}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {gridData.slice(0, 20).map(({ channel, programs }) => (
              <div key={channel.id} className="epg-grid-row">
                {/* Channel cell */}
                <div style={{ width: 180, minWidth: 180, padding: '8px 12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'var(--bg-secondary)' }}
                  onClick={() => playChannel(channel)}>
                  {channel.logo
                    ? <img src={getProxiedLogoUrl(channel.logo)} style={{ width: 32, height: 32, objectFit: 'contain' }} alt="" onError={e => e.target.style.display = 'none'} />
                    : <span style={{ fontSize: '1.3rem' }}>📺</span>
                  }
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{COUNTRY_FLAG[channel.country]}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--accent)' }}>▶</span>
                </div>

                {/* Programs */}
                <div style={{ display: 'flex', flex: 1, position: 'relative', minHeight: 60 }}>
                  {programs.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
                      Programme non disponible
                    </div>
                  ) : (
                    programs.slice(0, 8).map((prog, i) => {
                      const start = new Date(prog.start)
                      const stop = new Date(prog.stop)
                      const isCurrent = isWithinInterval(now, { start, end: stop })
                      const durationMin = (stop - start) / 60000
                      const width = Math.max(durationMin * 2, 80) // 2px par minute, min 80px

                      return (
                        <div key={i} className={`epg-program${isCurrent ? ' current' : ''}`}
                          style={{ minWidth: `${width}px`, maxWidth: `${width}px` }}>
                          <div className="epg-program-title">{prog.title}</div>
                          <div className="epg-program-time">
                            {format(start, 'HH:mm')} – {format(stop, 'HH:mm')}
                          </div>
                          {isCurrent && (
                            <div style={{ height: 2, background: 'var(--accent)', borderRadius: 1, marginTop: 4 }} />
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">Programme EPG indisponible</div>
          <div className="empty-state-text">Les données EPG sont importées depuis les sources XMLTV. Revenez plus tard.</div>
          <div style={{ marginTop: 20 }}>
            <h4 style={{ marginBottom: 12 }}>Chaînes disponibles pour {country}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {channels.slice(0, 12).map(ch => (
                <div key={ch.id} className="channel-list-item" onClick={() => playChannel(ch)} style={{ background: 'var(--bg-card)', borderRadius: 10 }}>
                  <div className="channel-list-logo">
                    {ch.logo ? <img src={getProxiedLogoUrl(ch.logo)} style={{ width: 28, height: 28, objectFit: 'contain' }} alt="" onError={e => e.target.style.display = 'none'} /> : <span>📺</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--accent)' }}>▶</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
