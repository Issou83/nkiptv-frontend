import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="empty-state" style={{ height: '100vh' }}>
      <div style={{ fontSize: '5rem' }}>📺</div>
      <h1 style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--accent)' }}>404</h1>
      <div className="empty-state-title">Page introuvable</div>
      <div className="empty-state-text">Cette page n'existe pas ou a été déplacée.</div>
      <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/')}>
        🏠 Retour à l'accueil
      </button>
    </div>
  )
}
