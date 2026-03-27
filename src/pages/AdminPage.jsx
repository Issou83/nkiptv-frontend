import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminAPI } from '../services/api'
import { useToast } from '../components/ui/ToastContainer'

const TABS = ['dashboard', 'users', 'channels', 'sync']

export default function AdminPage() {
  const [tab, setTab] = useState('dashboard')
  const toast = useToast()

  return (
    <div style={{ padding: 16, maxWidth: 1400 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ fontSize: '2rem' }}>🛡️</div>
        <div>
          <h1 style={{ fontWeight: 800 }}>Panneau Admin</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Gestion complète de NKiptv</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'dashboard' ? '📊 Dashboard' :
             t === 'users' ? '👥 Utilisateurs' :
             t === 'channels' ? '📺 Chaînes' : '🔄 Sync'}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <AdminDashboard toast={toast} />}
      {tab === 'users' && <AdminUsers toast={toast} />}
      {tab === 'channels' && <AdminChannels toast={toast} />}
      {tab === 'sync' && <AdminSync toast={toast} />}
    </div>
  )
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => { const { data } = await adminAPI.getStats(); return data.data },
  })

  if (isLoading) return <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />

  const stats = data || {}

  const cards = [
    { icon: '👥', label: 'Utilisateurs total', value: stats.users?.total || 0, sub: `+${stats.growth?.today || 0} aujourd'hui`, color: 'var(--accent)' },
    { icon: '💎', label: 'Abonnés Premium+Pro', value: (stats.users?.premium || 0) + (stats.users?.pro || 0), sub: `${stats.users?.free || 0} gratuits`, color: '#f59e0b' },
    { icon: '📺', label: 'Chaînes actives', value: stats.channels?.total || 0, sub: `${stats.channels?.online || 0} en direct`, color: 'var(--success)' },
    { icon: '💰', label: 'MRR', value: `${stats.revenue?.mrr || '0'}€`, sub: `ARR : ${stats.revenue?.arr || '0'}€`, color: '#ec4899' },
    { icon: '📈', label: 'Inscrits cette semaine', value: stats.growth?.week || 0, sub: `${stats.growth?.today || 0} aujourd'hui`, color: 'var(--info)' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {cards.map(c => (
          <div key={c.label} className="card" style={{ padding: '20px 18px' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Répartition des plans</h3>
          {[
            { label: 'Gratuit', count: stats.users?.free || 0, color: 'var(--text-muted)' },
            { label: 'Premium', count: stats.users?.premium || 0, color: 'var(--accent)' },
            { label: 'Pro', count: stats.users?.pro || 0, color: '#f59e0b' },
          ].map(p => {
            const total = stats.users?.total || 1
            return (
              <div key={p.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{p.label}</span>
                  <span style={{ fontWeight: 600 }}>{p.count} ({Math.round(p.count/total*100)}%)</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${p.count/total*100}%`, background: p.color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ marginBottom: 12 }}>État des chaînes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>🔴 En direct</span>
              <strong style={{ color: 'var(--success)' }}>{stats.channels?.online || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>📺 Total actives</span>
              <strong>{stats.channels?.total || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13 }}>✅ Taux disponibilité</span>
              <strong style={{ color: 'var(--accent)' }}>
                {stats.channels?.total ? Math.round(stats.channels.online / stats.channels.total * 100) : 0}%
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AdminUsers({ toast }) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, planFilter],
    queryFn: async () => { const { data } = await adminAPI.getUsers({ page, limit: 20, search, plan: planFilter }); return data },
  })

  const users = data?.data || []
  const pagination = data?.pagination || {}

  const update = async (id, updates) => {
    try {
      await adminAPI.updateUser(id, updates)
      qc.invalidateQueries(['admin-users'])
      toast.success('Utilisateur mis à jour')
    } catch { toast.error('Erreur mise à jour') }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input className="input" placeholder="Rechercher…" value={search}
          onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit' }}>
          <option value="">Tous les plans</option>
          <option value="free">Gratuit</option>
          <option value="premium">Premium</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Nom', 'Email', 'Plan', 'Rôle', 'Inscrit le', 'Statut', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement…</td></tr>
            ) : users.map(u => (
              <tr key={u._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{u.email}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span className={`badge ${u.plan?.type === 'pro' ? 'badge-warning' : u.plan?.type === 'premium' ? 'badge-accent' : ''}`}>
                    {u.plan?.type || 'free'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>{u.role}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                  {new Date(u.createdAt).toLocaleDateString('fr')}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span className={`badge ${u.isBanned ? 'badge-danger' : !u.isActive ? 'badge-warning' : 'badge-success'}`}>
                    {u.isBanned ? 'Banni' : !u.isActive ? 'Inactif' : 'Actif'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select value={u.plan?.type || 'free'} onChange={e => update(u._id, { plan: e.target.value })}
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', color: 'var(--text-primary)', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' }}>
                      <option value="free">Gratuit</option>
                      <option value="premium">Premium</option>
                      <option value="pro">Pro</option>
                    </select>
                    {!u.isBanned
                      ? <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => update(u._id, { isBanned: true })}>Bannir</button>
                      : <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => update(u._id, { isBanned: false })}>Débannir</button>
                    }
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Préc.</button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} / {pagination.pages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)}>Suiv. →</button>
        </div>
      )}
    </div>
  )
}

function AdminChannels({ toast }) {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['admin-channels', search],
    queryFn: async () => { const { data } = await adminAPI.getChannels({ search, limit: 50 }); return data },
  })

  const channels = data?.data || []

  return (
    <div>
      <input className="input" placeholder="Rechercher une chaîne…" value={search}
        onChange={e => setSearch(e.target.value)} style={{ maxWidth: 400, marginBottom: 16 }} />
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Chaîne', 'Pays', 'Catégories', 'Streams', 'Vues', 'État'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement…</td></tr>
              : channels.map(ch => (
                <tr key={ch.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {ch.logo && <img src={ch.logo} style={{ width: 24, height: 24, objectFit: 'contain' }} alt="" />}
                      {ch.name}
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{ch.country}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{ch.categories?.slice(0,2).join(', ')}</td>
                  <td style={{ padding: '10px 14px' }}>{ch.streams?.length || 0}</td>
                  <td style={{ padding: '10px 14px' }}>{ch.viewCount?.toLocaleString() || 0}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span className={`badge ${ch.hasStream ? 'badge-success' : 'badge-danger'}`}>
                      {ch.hasStream ? 'LIVE' : 'OFF'}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AdminSync({ toast }) {
  const [syncing, setSyncing] = useState(false)

  const launchSync = async () => {
    setSyncing(true)
    try {
      await adminAPI.syncChannels()
      toast.success('Synchronisation lancée — cela peut prendre quelques minutes')
    } catch { toast.error('Erreur lancement sync') }
    finally { setTimeout(() => setSyncing(false), 3000) }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="card" style={{ padding: 28 }}>
        <h3 style={{ marginBottom: 12 }}>🔄 Synchronisation iptv-org</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
          Synchronise les chaînes depuis la base de données iptv-org.github.io.
          La sync automatique tourne toutes les 12 heures.
        </p>
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 13 }}>
          <div style={{ marginBottom: 8 }}>📥 Source : <strong>iptv-org.github.io/api</strong></div>
          <div style={{ marginBottom: 8 }}>⏱️ Fréquence : <strong>12 heures</strong></div>
          <div>📊 Contenu : <strong>~10 000 chaînes + 50 000+ streams</strong></div>
        </div>
        <button className="btn btn-primary" onClick={launchSync} disabled={syncing}>
          {syncing ? '⏳ Sync en cours…' : '🔄 Lancer une sync maintenant'}
        </button>
      </div>

      <div className="card" style={{ padding: 28, marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>📊 Vérification des streams</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
          Teste si les streams sont accessibles (HEAD request). Vérifie 100 chaînes par lancement.
        </p>
        <button className="btn btn-secondary">🔍 Vérifier les streams</button>
      </div>
    </div>
  )
}
