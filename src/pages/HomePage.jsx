import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useChannels, useChannelStats, CATEGORY_EMOJI, COUNTRY_FLAG } from '../hooks/useChannels'
import { useUIStore } from '../store'

const CATEGORIES = ['news', 'sports', 'music', 'movies', 'entertainment', 'documentary', 'kids', 'business', 'culture']

const FEATURED_COUNTRIES = [
  { code: 'FR', name: 'France',        color: '#003189' },
  { code: 'MA', name: 'Maroc',         color: '#c1272d' },
  { code: 'DZ', name: 'Algérie',       color: '#006233' },
  { code: 'TN', name: 'Tunisie',       color: '#e70013' },
  { code: 'US', name: 'USA',           color: '#3c3b6e' },
  { code: 'GB', name: 'UK',            color: '#012169' },
  { code: 'SA', name: 'Arabie Saoudite', color: '#006c35' },
  { code: 'TR', name: 'Turquie',       color: '#e30a17' },
  { code: 'ES', name: 'Espagne',       color: '#aa151b' },
  { code: 'DE', name: 'Allemagne',     color: '#dd0000' },
  { code: 'IT', name: 'Italie',        color: '#008c45' },
  { code: 'BR', name: 'Brésil',        color: '#009c3b' },
  { code: 'EG', name: 'Égypte',        color: '#ce1126' },
  { code: 'SN', name: 'Sénégal',       color: '#00853f' },
  { code: 'CI', name: "Côte d'Ivoire", color: '#f77f00' },
  { code: 'CM', name: 'Cameroun',      color: '#007a5e' },
]

const getLogoSrc = (logo) => {
  if (!logo) return null
  return 'https://wsrv.nl/?url=' + encodeURIComponent(logo.replace(/^https?:\/\//, '')) + '&w=80&h=80&fit=contain'
}

function CountryCard({ country, onClick }) {
  return (
    <div className="country-card" onClick={onClick} style={{ '--country-color': country.color }}>
      <div className="country-card-flag">{COUNTRY_FLAG[country.code] || '🌍'}</div>
      <div className="country-card-name">{country.name}</div>
    </div>
  )
}

function ChannelCard({ channel, onClick, showBadge = true }) {
  return (
    <div className="card channel-card" onClick={onClick}>
      <div className="channel-card-logo">
        {channel.logo
          ? <img src={getLogoSrc(channel.logo)} alt={channel.name} onError={e => e.target.style.display = 'none'} />
          : <span className="logo-fallback">{CATEGORY_EMOJI[channel.categories?.[0]] || '📺'}</span>
        }
        {showBadge && channel.streams?.length > 0 && (
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

function StatCard({ icon, value, label, color }) {
  return (
    <div className="stat-card" style={{ '--stat-color': color || 'var(--accent)' }}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setCurrentChannel, watchHistory } = useUIStore()
  const { data: statsData } = useChannelStats()
  const { data: trending } = useChannels({ sort: 'viewCount', hasStream: 'true', limit: 10 })

  const trendingChannels = trending?.data || []
  const recentChannels = watchHistory || []

  const openChannel = (channel) => {
    setCurrentChannel(channel)
    navigate('/player/' + channel.id)
  }

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 6) return 'Bonne nuit'
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  return (
    <div className="home-page">

      <div className="home-hero">
        <div className="home-hero-content">
          <h1 className="home-hero-title">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Viewer'} 👋
          </h1>
          <p className="home-hero-sub">
            {statsData?.total?.toLocaleString() || '10 000'}+ chaînes du monde entier · {statsData?.countries || '180'}+ pays
          </p>
          <div className="home-hero-actions">
            <button className="btn btn-primary" onClick={() => navigate('/live')}>
              📺 Regarder maintenant
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/epg')}>
              📺 Programme TV
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/search')}>
              🔍 Rechercher
            </button>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon="📺" value={statsData?.total?.toLocaleString() || '10K+'} label="Chaînes" color="#6c63f0" />
        <StatCard icon="🔴" value={statsData?.withStream?.toLocaleString() || '7.5K+'} label="En direct" color="#e8251a" />
        <StatCard icon="🌐" value={statsData?.countries || '180+'} label="Pays" color="#22d16a" />
        <StatCard icon="🏷️" value={statsData?.categories || '20+'} label="Catégories" color="#f59e0b" />
      </div>

      {recentChannels.length > 0 && (
        <>
          <div className="section-header">
            <div>
              <div className="section-title">🔙 Récemment regardé</div>
              <div className="section-subtitle">Reprenez là où vous vous étiez arrêté</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/favorites')}>Voir tout ➜</button>
          </div>
          <div className="channel-grid channel-grid-lg" style={{ paddingTop: 0 }}>
            {recentChannels.slice(0, 6).map(ch => (
              <div key={ch.id} className="card channel-card" onClick={() => openChannel(ch)} style={{ position: 'relative' }}>
                <div className="channel-card-logo">
                  {ch.logo
                    ? <img src={getLogoSrc(ch.logo)} alt={ch.name} onError={e => e.target.style.display = 'none'} />
                    : <span className="logo-fallback">{CATEGORY_EMOJI[ch.categories?.[0]] || '📺'}</span>
                  }
                  <span style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '2px 6px', fontSize: 10, color: 'rgba(255,255,255,0.8)' }}>
                    ▶ Continuer
                  </span>
                </div>
                <div className="channel-card-info">
                  <div className="channel-card-name">{ch.name}</div>
                  <div className="channel-card-meta">
                    <span>{COUNTRY_FLAG[ch.country] || '🌐'}</span>
                    {ch.categories?.[0] && <span>{CATEGORY_EMOJI[ch.categories[0]]} {ch.categories[0]}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="countries-section">
        <div className="countries-section-bg" />
        <div className="section-header">
          <div>
            <div className="section-title">🌐 Chaînes par pays</div>
            <div className="section-subtitle">Explorez les chaînes de votre pays</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/live')}>Voir tout ➜</button>
        </div>
        <div className="countries-scroll">
          {FEATURED_COUNTRIES.map(c => (
            <CountryCard key={c.code} country={c} onClick={() => navigate('/live?country=' + c.code)} />
          ))}
        </div>
      </div>

      <div className="section-header" style={{ paddingTop: 8 }}>
        <div className="section-title">🏷️ Explorer par catégorie</div>
      </div>
      <div className="filter-row">
        {CATEGORIES.map(cat => (
          <div key={cat} className="filter-chip" onClick={() => navigate('/live?category=' + cat)}>
            {CATEGORY_EMOJI[cat]}{cat.charAt(0).toUpperCase() + cat.slice(1)}
          </div>
        ))}
      </div>

      {trendingChannels.length > 0 && (
        <>
          <div className="section-header">
            <div>
              <div className="section-title">⭐ Tendances</div>
              <div className="section-subtitle">Les chaînes les plus regardées</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/live?sort=viewCount')}>Voir tout ➜</button>
          </div>
          <div className="channel-grid channel-grid-lg" style={{ paddingTop: 0 }}>
            {trendingChannels.slice(0, 8).map(ch => (
              <ChannelCard key={ch.id} channel={ch} onClick={() => openChannel(ch)} />
            ))}
          </div>
        </>
      )}

      <div className="section-header" style={{ paddingTop: 8 }}>
        <div className="section-title">⚡ Accès rapide</div>
      </div>
      <div className="quick-access-grid">
        {[
          { icon: '📰', label: 'Infos & Actualités', color: '#3b82f6',   path: '/live?category=news' },
          { icon: '⚽', label: 'Sport',               color: '#22d16a',   path: '/live?category=sports' },
          { icon: '🎵', label: 'Musique',             color: '#f59e0b',   path: '/live?category=music' },
          { icon: '🎬', label: 'Cinéma',              color: '#ec4899',   path: '/live?category=movies' },
          { icon: '📺', label: 'Programme TV',       color: 'var(--accent)', path: '/epg' },
          { icon: '📻', label: 'Ma Playlist M3U',    color: '#8b5cf6',   path: '/playlists' },
          { icon: '❤️', label: 'Mes Favoris',        color: '#f59e0b',   path: '/favorites' },
          { icon: '🧸', label: 'Enfants',            color: '#22d16a',   path: '/live?category=kids' },
        ].map(item => (
          <div key={item.path} className="quick-access-card" onClick={() => navigate(item.path)} style={{ '--qa-color': item.color }}>
            <span className="quick-access-icon">{item.icon}</span>
            <span className="quick-access-label">{item.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}