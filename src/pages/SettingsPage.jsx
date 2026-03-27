import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { authAPI } from '../services/api'
import { useToast } from '../components/ui/ToastContainer'
import { useUIStore } from '../store'

export default function SettingsPage() {
  const { user, refreshMe, isDemo } = useAuth()
  const toast = useToast()
  const { lang, setLang } = useUIStore()
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

  return (
    <div style={{ padding: '16px', maxWidth: 640 }}>
      <h2 style={{ fontWeight: 800, marginBottom: 20 }}>⚙️ Paramètres</h2>

      {/* Compte */}
      <div className="card" style={{ padding: 24, marginBottom: 14 }}>
        <h3 style={{ marginBottom: 16 }}>👤 Mon compte</h3>
        <div className="form-group">
          <label className="input-label">Nom affiché</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" value={name} onChange={e => setName(e.target.value)} disabled={isDemo} />
            <button className="btn btn-primary" onClick={saveName} disabled={saving || isDemo || name === user?.name}>
              Sauvegarder
            </button>
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="input-label">Email</label>
          <input className="input" value={user?.email || 'demo@nkiptv.fr'} disabled style={{ opacity: 0.6 }} />
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`badge ${user?.plan?.type === 'pro' ? 'badge-warning' : user?.plan?.type === 'premium' ? 'badge-accent' : ''}`}>
            Plan : {user?.plan?.type || 'free'}
          </span>
          <span className={`badge ${user?.role === 'admin' ? 'badge-danger' : 'badge-success'}`}>
            Rôle : {user?.role || 'user'}
          </span>
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

      {/* Mot de passe */}
      {!isDemo && (
        <div className="card" style={{ padding: 24, marginBottom: 14 }}>
          <h3 style={{ marginBottom: 16 }}>🔒 Changer le mot de passe</h3>
          <div className="form-group">
            <label className="input-label">Mot de passe actuel</label>
            <input className="input" type="password" value={pwdForm.current}
              onChange={e => setPwdForm(f => ({ ...f, current: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="input-label">Nouveau mot de passe</label>
            <input className="input" type="password" value={pwdForm.new}
              onChange={e => setPwdForm(f => ({ ...f, new: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="input-label">Confirmer le nouveau mot de passe</label>
            <input className="input" type="password" value={pwdForm.confirm}
              onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))} />
          </div>
          <button className="btn btn-primary" onClick={changePassword} disabled={saving || !pwdForm.current || !pwdForm.new}>
            Changer le mot de passe
          </button>
        </div>
      )}

      {/* Backend status */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 12 }}>🔧 État du système</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={async () => {
            try {
              await fetch('/api/health').then(r => r.json())
              toast.success('✅ Backend connecté')
            } catch { toast.error('❌ Backend hors ligne') }
          }}>
            Tester le backend
          </button>
          {isDemo && (
            <div className="badge badge-warning" style={{ display: 'flex', alignItems: 'center' }}>
              Mode démo — certaines fonctionnalités désactivées
            </div>
          )}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          NKiptv v2.0 · React + Vite · Node.js + Express · MongoDB
        </div>
      </div>
    </div>
  )
}
