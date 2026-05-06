import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { API_BASE_URL, authAPI } from '../services/api'
import { useToast } from '../components/ui/ToastContainer'
import { useUIStore } from '../store'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, refreshMe, isDemo, logout } = useAuth()
  const toast = useToast()
  const { lang, setLang, theme, setTheme, watchHistory, clearHistory } = useUIStore()
  const [saving, setSaving] = useState(false)
  const [pwdForm, setPwdForm] = useState({ current: '', new: '', confirm: '' })
  const [name, setName] = useState(user?.name || '')

  const saveName = async () => {
    if (!name.trim() || name === user?.name) return
    setSaving(true)
    try {
      await authAPI.updateMe({ name })
      await refreshMe()
      toast.success('Nom mis à jour')
    } catch { toast.error('Erreur lors de la sauvegarde') }
    finally { setSaving(false) }
  }

  const changePassword = async () => {
    if (pwdForm.new !== pwdForm.confirm) { toast.error('Les mots de passe ne correspondent pas'); return }
    if (pwdForm.new.length < 6) { toast.error('6 caractères minimum'); return }
    setSaving(true)
    try {
      await authAPI.changePassword(pwdForm.current, pwdForm.new)
      setPwdForm({ current: '', new: '', confirm: '' })
      toast.success('Mot de passe modifié — reconnectez-vous')
    } catch (e) { toast.error(e.response?.data?.message || 'Erreur') }
    finally { setSaving(false) }
  }

  const handleClearHistory = () => {
    clearHistory()
    toast.info('Historique effacé')
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ padding: '16px', maxWidth: 640 }}>
      <h2 style={{ fontWeight: 800, marginBottom: 20 }}>⚙️ Paramètres</h2>

      {/* Demo banner */}
      {isDemo && (
        <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.4rem' }}>🎭</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: 14 }}>Mode démo</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Certaines fonctionnalités sont limitées. Créez un compte pour tout débloquer.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>Créer un compte</button>
        </div>
      )}

      {/* Compte */}
      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 style={{ marginBottom: 16 }}>👤 Mon compte</h3>
        {!isDemo ? (
          <>
            <div className="form-group">
              <label className="input-label">Nom affiché</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" />
                <button className="btn btn-primary" onClick={saveName} disabled={saving || name === user?.name || !name.trim()}>
                  {saving ? '…' : 'Sauvegarder'}
                </button>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="input-label">Email</label>
              <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
            </div>
          </>
        ) : (
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
            Connecté en tant que <strong>Demo User</strong>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`badge ${user?.plan?.type === 'pro' ? 'badge-warning' : user?.plan?.type === 'premium' ? 'badge-accent' : ''}`}
            style={{ background: user?.plan?.type === 'free' ? 'rgba(100,100,120,0.2)' : undefined }}>
            💎 {user?.plan?.type || 'free'}
          </span>
          <span className={`badge ${user?.role === 'admin' ? 'badge-danger' : 'badge-success'}`}
            style={{ background: user?.role === 'user' ? 'rgba(100,100,120,0.2)' : undefined }}>
            🎭 {user?.role || 'user'}
          </span>
          {user?.plan?.type === 'free' && !isDemo && (
            <button className="btn btn-sm" style={{ background: 'linear-gradient(135deg,#a78bfa,#6c63ff)', color: '#fff', border: 'none', fontSize: 12 }}
              onClick={() => navigate('/pricing')}>
              ✨ Passer Premium
            </button>
          )}
        </div>
      </div>

      {/* Apparence */}
      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 style={{ marginBottom: 16 }}>🎨 Apparence</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { value: 'dark',  label: '🌙 Sombre',  desc: 'Thème sombre' },
            { value: 'light', label: '☀️ Clair',    desc: 'Thème clair' },
            { value: 'auto',  label: '🖥️ Système', desc: 'Automatique' },
          ].map(t => (
            <button key={t.value} onClick={() => { setTheme(t.value); toast.info(`Thème ${t.desc} activé`) }}
              className={`btn btn-sm ${theme === t.value ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: '1 0 auto', minWidth: 100 }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Langue */}
      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 style={{ marginBottom: 16 }}>🌐 Langue de l'interface</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { code: 'fr', label: '🇫🇷 Français' },
            { code: 'en', label: '🇬🇧 English' },
            { code: 'ar', label: '🇸🇦 العربية' },
            { code: 'es', label: '🇪🇸 Español' },
            { code: 'de', label: '🇩🇪 Deutsch' },
            { code: 'pt', label: '🇧🇷 Português' },
          ].map(l => (
            <button key={l.code} onClick={() => setLang(l.code)}
              className={`btn ${lang === l.code ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Historique */}
      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 style={{ marginBottom: 8 }}>🕐 Historique de visionnage</h3>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
          {watchHistory?.length || 0} chaîne{(watchHistory?.length || 0) !== 1 ? 's' : ''} récemment regardée{(watchHistory?.length || 0) !== 1 ? 's' : ''}
        </div>
        {watchHistory?.length > 0 ? (
          <button className="btn btn-secondary btn-sm" onClick={handleClearHistory}>
            🗑️ Effacer l'historique
          </button>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucun historique</div>
        )}
      </div>

      {/* Mot de passe */}
      {!isDemo && (
        <div className="card" style={{ padding: 24, marginBottom: 14 }}>
          <h3 style={{ marginBottom: 16 }}>🔒 Changer le mot de passe</h3>
          <div className="form-group">
            <label className="input-label">Mot de passe actuel</label>
            <input className="input" type="password" value={pwdForm.current}
              onChange={e => setPwdForm(f => ({ ...f, current: e.target.value }))} autoComplete="current-password" />
          </div>
          <div className="form-group">
            <label className="input-label">Nouveau mot de passe</label>
            <input className="input" type="password" value={pwdForm.new}
              onChange={e => setPwdForm(f => ({ ...f, new: e.target.value }))} autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label className="input-label">Confirmer le nouveau mot de passe</label>
            <input className="input" type="password" value={pwdForm.confirm}
              onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))} autoComplete="new-password" />
          </div>
          <button className="btn btn-primary" onClick={changePassword} disabled={saving || !pwdForm.current || !pwdForm.new}>
            {saving ? '…' : 'Changer le mot de passe'}
          </button>
        </div>
      )}

      {/* Système */}
      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 style={{ marginBottom: 12 }}>🔧 État du système</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={async () => {
            try {
              const resp = await fetch(API_BASE_URL + '/api/health')
              if (resp.ok) toast.success('✅ Backend connecté')
              else toast.error('⚠️ Backend répond avec erreur ' + resp.status)
            } catch { toast.error('❌ Backend hors ligne') }
          }}>
            🔍 Tester le backend
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { navigate('/live'); toast.info('Bienvenue sur Live TV') }}>
            📡 Voir les chaînes
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          NKiptv v2.0 · React + Vite · Node.js + Express · MongoDB
        </div>
      </div>

      {/* Déconnexion */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 12 }}>🚪 Session</h3>
        <button className="btn btn-secondary btn-sm" onClick={handleLogout} style={{ color: 'var(--error, #ef4444)', borderColor: 'var(--error, #ef4444)' }}>
          🚪 Se déconnecter
        </button>
      </div>
    </div>
  )
}
