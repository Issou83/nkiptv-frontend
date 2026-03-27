import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useChannels, useChannelStats, useFeaturedChannels, CATEGORY_EMOJI, COUNTRY_FLAG } from '../hooks/useChannels'
import { useUIStore } from '../store'

const CATEGORIES = ['news', 'sports', 'music', 'movies', 'entertainment', 'documentary', 'kids', 'business', 'culture']

function ChannelCard({ channel, onClick }) {
  return (
    <div className="card channel-card" onClick={onClick}>
      <div className="channel-card-logo">
        {channel.logo
          ? <img src={channel.logo} alt={channel.name} onError={e => e.target.style.display = 'none'} />
          : <span className="logo-fallback">{CATEGORY_EMOJI[channel.categories?.[0]] || '📺'}</span>
        }
        {channel.streams?.length > 0 && (
          <span style={{ position: 'absolute', top: 6, right: 6 }} className="badge badge-success">LIVE</span>
        )}
      </div>
      <div className="channel-card-info">
        <div className="channel-card-name">{channel.name}</div>
        <div className="channel-card-meta">
          <span>{COUNTRY_FLAG[channel.country] || '🌐'} {channel.country}</span>
          {channel.categories?.[0] && <span>· {CATEGORY_EMOJI[channel.categories[0]]} {channel.categories[0]}</span>}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label }) {
  return (
    <div className="card" style={{ padding: '20px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setCurrentChannel } = useUIStore()
  const { data: statsData } = useChannelStats()
  const { data: trending } = useChannels({ sort: 'viewCount', hasStream: 'true', limit: 10 })
  const { data: featured } = useChannels({ featured: 'true', limit: 12 })

  const trendingChannels = trending?.data || []
  const featuredChannels = featured?.data || []

  const openChannel = (channel) => {
    setCurrentChannel(channel)
    navigate(`/player/${channel.id}`)
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Hero */}
      <div style={{
        padding: '32px 24px',
        background: 'linear-gradient(135deg, rgba(108,99,255,0.1) 0%, transparent 60%)',
        borderBottom: '1px solid var(--border)',
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>
          Bonjour, {user?.name?.split(' ')[0] || 'Viewer'} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
          {statsData?.total?.toLocaleString() || '10 000'}+ chaînes du monde entier en direct
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/live')}>
            📡 Regarder maintenant
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/epg')}>
            📅 Programme TV
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/search')}>
            🔍 Rechercher
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '16px 16px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <StatCard icon="📺" value={statsData?.total?.toLocaleString() || '10K+'} label="Chaînes" />
        <StatCard icon="🔴" value={statsData?.withStream?.toLocaleString() || '7.5K+'} label="En direct" />
        <StatCard icon="🌍" value={statsData?.countries || '180+'} label="Pays" />
        <StatCard icon="🗂️" value={statsData?.categories || '20+'} label="Catégories" />
      </div>

      {/* Catégories */}
      <div className="section-header" style={{ paddingTop: 24 }}>
        <div>
          <div className="section-title">Explorer par catégorie</div>
        </div>
      </div>
      <div className="filter-row">
        {CATEGORIES.map(cat => (
          <div key={cat} className="filter-chip" onClick={() => navigate(`/live?category=${cat}`)}>
            {CATEGORY_EMOJI[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </div>
        ))}
      </div>

      {/* Tendances */}
      {trendingChannels.length > 0 && (
        <>
          <div className="section-header">
            <div>
              <div className="section-title">🔥 Tendances</div>
              <div className="section-subtitle">Les chaînes les plus regardées</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/live')}>Voir tout →</button>
          </div>
          <div className="channel-grid channel-grid-lg" style={{ paddingTop: 0 }}>
            {trendingChannels.slice(0, 8).map(ch => (
              <ChannelCard key={ch.id} channel={ch} onClick={() => openChannel(ch)} />
            ))}
          </div>
        </>
      )}

      {/* Quick access */}
      <div className="section-header" style={{ paddingTop: 8 }}>
        <div className="section-title">⚡ Accès rapide</div>
      </div>
      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {[
          { icon: '📰', label: 'Infos & Actualités', color: '#3b82f6', path: '/live?category=news' },
          { icon: '⚽', label: 'Sport', color: '#22d16a', path: '/live?category=sports' },
          { icon: '🎵', label: 'Musique', color: '#f59e0b', path: '/live?category=music' },
          { icon: '🎬', label: 'Cinéma', color: '#ec4899', path: '/live?category=movies' },
          { icon: '📅', label: 'Programme TV', color: 'var(--accent)', path: '/epg' },
          { icon: '📂', label: 'Ma Playlist M3U', color: '#8b5cf6', path: '/playlists' },
        ].map(item => (
          <div key={item.path} className="card" onClick={() => navigate(item.path)}
            style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.8rem' }}>{item.icon}</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Pays populaires */}
      <div className="section-header" style={{ paddingTop: 16 }}>
        <div className="section-title">🌍 Par pays</div>
      </div>
      <div className="filter-row">
        {[
          { code: 'FR', name: 'France' }, { code: 'US', name: 'USA' }, { code: 'GB', name: 'UK' },
          { code: 'DE', name: 'Allemagne' }, { code: 'ES', name: 'Espagne' }, { code: 'IT', name: 'Italie' },
          { code: 'MA', name: 'Maroc' }, { code: 'DZ', name: 'Algérie' }, { code: 'TN', name: 'Tunisie' },
          { code: 'TR', name: 'Turquie' }, { code: 'SA', name: 'Arabie' }, { code: 'BR', name: 'Brésil' },
        ].map(c => (
          <div key={c.code} className="filter-chip" onClick={() => navigate(`/live?country=${c.code}`)}>
            {COUNTRY_FLAG[c.code]} {c.name}
          </div>
        ))}
      </div>
    </div>
  )
}
