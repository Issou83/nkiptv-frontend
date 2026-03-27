import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { subscriptionsAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/ui/ToastContainer'

const PLAN_ICONS = { free: '🆓', premium: '💎', pro: '🚀' }
const PLAN_COLORS = { free: 'var(--text-muted)', premium: 'var(--accent)', pro: '#f59e0b' }

export default function PricingPage() {
  const { user, isDemo } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(null)

  const { data } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await subscriptionsAPI.getPlans()
      return data.data
    },
  })

  const { data: status } = useQuery({
    queryKey: ['sub-status'],
    queryFn: async () => {
      const { data } = await subscriptionsAPI.getStatus()
      return data.data
    },
  })

  const plans = data ? Object.entries(data) : [
    ['free', { name: 'Gratuit', price: 0, channels: 500, profiles: 1, quality: 'SD', features: [] }],
    ['premium', { name: 'Premium', price: 4.99, channels: 10000, profiles: 3, quality: 'HD', features: ['EPG 7 jours', 'Favoris illimités', 'Import M3U', 'Sans pub'] }],
    ['pro', { name: 'Pro', price: 9.99, channels: 10000, profiles: 5, quality: '4K', features: ['Tout Premium', 'Multi-écrans', 'Support prioritaire', 'API accès', 'Catchup TV'] }],
  ]

  const currentPlan = status?.plan || user?.plan?.type || 'free'

  const checkout = async (plan) => {
    if (plan === 'free') return
    if (isDemo) { toast.info('Créez un compte pour souscrire'); return }
    setLoading(plan)
    try {
      const { data } = await subscriptionsAPI.checkout(plan)
      if (data.data.checkoutUrl) {
        window.location.href = data.data.checkoutUrl
      } else if (data.data.demo) {
        toast.info('Mode démo — configurez Stripe pour les paiements réels')
      }
    } catch {
      toast.error('Erreur lors de la redirection vers le paiement')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 10 }}>
          Choisissez votre plan
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
          Accédez à 10 000+ chaînes TV du monde entier
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 40 }}>
        {plans.map(([key, plan]) => {
          const isCurrentPlan = currentPlan === key
          const isPopular = key === 'premium'

          return (
            <div key={key} className="card" style={{
              padding: 28,
              border: isPopular ? `2px solid var(--accent)` : isCurrentPlan ? '2px solid var(--success)' : '1px solid var(--border)',
              position: 'relative',
            }}>
              {isPopular && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)' }}>
                  <span className="badge badge-accent" style={{ fontSize: 12 }}>⭐ LE PLUS POPULAIRE</span>
                </div>
              )}
              {isCurrentPlan && (
                <div style={{ position: 'absolute', top: -12, right: 16 }}>
                  <span className="badge badge-success">✓ Votre plan</span>
                </div>
              )}

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{PLAN_ICONS[key]}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{plan.name}</div>
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: PLAN_COLORS[key] }}>
                    {plan.price === 0 ? 'Gratuit' : `${plan.price}€`}
                  </span>
                  {plan.price > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>/mois</span>}
                </div>
              </div>

              <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <PlanFeature icon="📺" label={`${plan.channels >= 10000 ? '10 000+' : plan.channels} chaînes`} />
                <PlanFeature icon="👥" label={`${plan.profiles} profil${plan.profiles > 1 ? 's' : ''}`} />
                <PlanFeature icon="🎬" label={`Qualité ${plan.quality}`} />
                {plan.features?.map(f => <PlanFeature key={f} icon="✅" label={f} />)}
              </div>

              <button
                className={`btn btn-full ${key === 'free' ? 'btn-secondary' : isCurrentPlan ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => !isCurrentPlan && checkout(key)}
                disabled={isCurrentPlan || loading === key}
                style={isPopular && !isCurrentPlan ? { boxShadow: '0 0 30px var(--accent-glow)' } : {}}
              >
                {loading === key ? '⏳ Chargement…' :
                  isCurrentPlan ? '✓ Plan actuel' :
                  key === 'free' ? 'Plan actuel' :
                  `Passer ${plan.name} →`}
              </button>
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 16, padding: 24 }}>
        <h3 style={{ marginBottom: 16 }}>❓ Questions fréquentes</h3>
        {[
          { q: 'Puis-je annuler à tout moment ?', r: "Oui, vous pouvez annuler à tout moment depuis vos paramètres. L'abonnement reste actif jusqu'à la fin de la période." },
          { q: 'Quels modes de paiement acceptés ?', r: 'Nous acceptons les cartes Visa, Mastercard, American Express et PayPal via Stripe.' },
          { q: 'Y a-t-il une période d\'essai ?', r: "Le plan Gratuit est disponible sans limite de temps. Testez Premium pendant 7 jours sans engagement." },
          { q: 'Puis-je regarder sur plusieurs appareils ?', r: "Avec le plan Pro, vous pouvez regarder sur jusqu'à 5 écrans simultanément." },
        ].map(({ q, r }) => (
          <div key={q} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{q}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{r}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlanFeature({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  )
}
