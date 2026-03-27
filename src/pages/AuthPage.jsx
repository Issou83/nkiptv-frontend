import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const navigate = useNavigate()
  const { login, register, loginDemo } = useAuth()
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setError('')
    if (!form.email || !form.password) { setError('Remplissez tous les champs'); return }
    if (tab === 'register' && !form.name) { setError('Votre prénom est requis'); return }
    if (form.password.length < 6) { setError('Mot de passe : 6 caractères minimum'); return }

    setLoading(true)
    try {
      if (tab === 'login') await login(form.email, form.password)
      else await register(form.name, form.email, form.password)
      navigate('/')
    } catch (e) {
      setError(e.response?.data?.message || 'Backend hors ligne — essayez le mode démo')
    } finally {
      setLoading(false)
    }
  }

  const handleDemo = () => { loginDemo(); navigate('/') }

  return (
    <div className="auth-screen">
      {/* Visual Panel */}
      <div className="auth-visual">
        <div className="auth-glow" />
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div style={{ fontSize: '5rem', marginBottom: 16 }}>📺</div>
          <div className="auth-tagline">
            <h2>La télévision du <em>monde entier</em>,<br />dans votre poche.</h2>
            <p style={{ marginTop: 12 }}>10 000+ chaînes live · EPG 7 jours · Multi-profils</p>
          </div>
        </div>
        <div className="auth-stats">
          <div className="auth-stat"><strong>10K+</strong><span>Chaînes</span></div>
          <div className="auth-stat"><strong>220+</strong><span>Pays</span></div>
          <div className="auth-stat"><strong>Gratuit</strong><span>Pour toujours</span></div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
          {['📰 News', '⚽ Sports', '🎵 Musique', '🎬 Films', '🌍 Docs', '🧸 Enfants'].map(c => (
            <span key={c} className="badge badge-accent" style={{ fontSize: 13, padding: '6px 12px' }}>{c}</span>
          ))}
        </div>
      </div>

      {/* Form Panel */}
      <div className="auth-panel">
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, var(--accent), #9c67ff)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📺</div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800 }}><span style={{ color: 'var(--accent)' }}>NK</span>iptv</span>
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setError('') }}>
              Connexion
            </button>
            <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => { setTab('register'); setError('') }}>
              Inscription
            </button>
          </div>
        </div>

        <h2 className="auth-title">{tab === 'login' ? 'Bon retour 👋' : 'Créer un compte 🚀'}</h2>
        <p className="auth-subtitle">
          {tab === 'login' ? 'Accédez à vos chaînes favorites' : 'Rejoignez des milliers de viewers. Gratuit.'}
        </p>

        {error && <div className="auth-error">⚠️ {error}</div>}

        {tab === 'register' && (
          <div className="form-group">
            <label className="input-label">Prénom / Pseudo</label>
            <input className="input" placeholder="Jean Dupont" value={form.name}
              onChange={e => update('name', e.target.value)} />
          </div>
        )}

        <div className="form-group">
          <label className="input-label">Adresse email</label>
          <input className="input" type="email" placeholder="vous@email.com" value={form.email}
            onChange={e => update('email', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="input-label">Mot de passe</label>
          <input className="input" type="password" placeholder="••••••••" value={form.password}
            onChange={e => update('password', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>

        {tab === 'login' && (
          <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
            <span style={{ color: 'var(--accent)', fontSize: 13, cursor: 'pointer' }}>
              Mot de passe oublié ?
            </span>
          </div>
        )}

        <button className="btn btn-primary btn-full btn-lg" onClick={submit} disabled={loading}>
          {loading ? '⏳ En cours…' : tab === 'login' ? 'Se connecter →' : 'Créer mon compte →'}
        </button>

        <div className="auth-divider">ou continuer avec</div>

        <button className="btn-demo" onClick={handleDemo}>
          🧪 Mode démo — sans compte, sans backend
        </button>

        {tab === 'register' && (
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
            En créant un compte, vous acceptez nos{' '}
            <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>CGU</span> et notre{' '}
            <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>politique de confidentialité</span>.
          </p>
        )}
      </div>
    </div>
  )
}
