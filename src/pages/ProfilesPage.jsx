import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { profilesAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/ToastContainer'

const AVATARS = ['👤', '👨', '👩', '🧑', '👦', '👧', '👴', '👵', '🦸', '🧙', '🐱', '🐶', '🦊', '🐼', '🦁', '🐯']

export default function ProfilesPage() {
  const { user, refreshMe, isDemo } = useAuth()
  const toast = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', avatar: '👤', isKid: false })
  const [saving, setSaving] = useState(false)

  const profiles = user?.profiles || []

  const createProfile = async () => {
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    setSaving(true)
    try {
      await profilesAPI.create(form)
      await refreshMe()
      setShowAdd(false)
      setForm({ name: '', avatar: '👤', isKid: false })
      toast.success('Profil créé ✅')
    } catch (e) { toast.error(e.response?.data?.message || 'Erreur') }
    finally { setSaving(false) }
  }

  const deleteProfile = async (id) => {
    try {
      await profilesAPI.delete(id)
      await refreshMe()
      toast.info('Profil supprimé')
    } catch (e) { toast.error(e.response?.data?.message || 'Erreur') }
  }

  const activateProfile = async (id) => {
    try {
      await profilesAPI.activate(id)
      await refreshMe()
      toast.success('Profil activé')
    } catch { toast.error('Erreur activation') }
  }

  return (
    <div style={{ padding: 16, maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontWeight: 800 }}>👥 Mes Profils</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{profiles.length}/5 profils</p>
        </div>
        {profiles.length < 5 && !isDemo && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Nouveau profil</button>
        )}
      </div>

      {/* Formulaire création */}
      {showAdd && (
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Créer un profil</h3>
          <div className="form-group">
            <label className="input-label">Nom du profil</label>
            <input className="input" placeholder="Maman, Papa, Junior…" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="input-label">Avatar</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {AVATARS.map(a => (
                <span key={a} onClick={() => setForm(f => ({ ...f, avatar: a }))}
                  style={{ fontSize: '1.6rem', cursor: 'pointer', padding: 4, borderRadius: 8,
                    background: form.avatar === a ? 'rgba(108,99,255,0.2)' : 'transparent',
                    border: form.avatar === a ? '2px solid var(--accent)' : '2px solid transparent' }}>
                  {a}
                </span>
              ))}
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 16 }}>
            <input type="checkbox" checked={form.isKid} onChange={e => setForm(f => ({ ...f, isKid: e.target.checked }))} />
            <span style={{ fontSize: 14 }}>Profil enfant (contenu filtré)</span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={createProfile} disabled={saving}>
              {saving ? '⏳…' : '✅ Créer'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Liste profils */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {profiles.map(p => {
          const isActive = user?.activeProfileId === p._id?.toString() || user?.activeProfileId === p._id

          return (
            <div key={p._id} className="card" style={{ padding: 20, textAlign: 'center', border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 8 }}>{p.avatar || '👤'}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{p.name}</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                {isActive && <span className="badge badge-success">✓ Actif</span>}
                {p.isKid && <span className="badge badge-info">👦 Enfant</span>}
                {p.pin && <span className="badge badge-warning">🔒 PIN</span>}
                <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  {p.favorites?.length || 0} favoris
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                {!isActive && (
                  <button className="btn btn-primary btn-sm" onClick={() => activateProfile(p._id)}>
                    Activer
                  </button>
                )}
                {profiles.length > 1 && (
                  <button className="btn btn-danger btn-sm" onClick={() => deleteProfile(p._id)}>
                    🗑
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ padding: 16, marginTop: 20 }}>
        <h4 style={{ marginBottom: 8 }}>ℹ️ À propos des profils</h4>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Chaque profil a ses propres favoris et historique de visionnage.
          Les profils enfants filtrent automatiquement le contenu adulte.
          Maximum 5 profils par compte.
        </p>
      </div>
    </div>
  )
}
