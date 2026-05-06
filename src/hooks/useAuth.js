import { getPersistedAuthSnapshot, useAuthStore } from '../store'
import { authAPI } from '../services/api'

export const useAuth = () => {
  const store = useAuthStore()
  const persisted = getPersistedAuthSnapshot()
  const accessToken = store.accessToken || persisted.accessToken
  const user = store.user || persisted.user
  const activeProfileId = store.activeProfileId || persisted.activeProfileId

  // Compute derived auth state directly from raw fields (no stale getters)
  const isAuth = !!accessToken && accessToken !== 'demo'
  const isDemo = accessToken === 'demo'
  const isAdmin = user?.role === 'admin'
  const isPremium = user?.role === 'admin' || ['premium', 'pro'].includes(user?.plan?.type)
  const activeProfile = (() => {
    if (!user?.profiles?.length) return null
    return user.profiles.find(p => p._id === activeProfileId) || user.profiles[0]
  })()

  const login = async (email, password) => {
    const { data } = await authAPI.login(email, password)
    store.login(data.data.user, data.data.accessToken, data.data.refreshToken)
    return data.data.user
  }

  const register = async (name, email, password) => {
    const { data } = await authAPI.register(name, email, password)
    store.login(data.data.user, data.data.accessToken, data.data.refreshToken)
    return data.data.user
  }

  const loginDemo = () => {
    store.login(
      { _id: 'demo', name: 'Demo User', email: 'demo@nkiptv.fr', role: 'user', plan: { type: 'free' }, profiles: [{ _id: 'p1', name: 'Demo', avatar: '📺', favorites: [] }] },
      'demo',
      'demo'
    )
  }

  const logout = async () => {
    try {
      if (store.accessToken !== 'demo') await authAPI.logout(store.refreshToken)
    } catch { /* ignore */ }
    store.logout()
  }

  const refreshMe = async () => {
    try {
      const { data } = await authAPI.me()
      store.updateUser(data.data)
      return data.data
    } catch { /* ignore */ }
  }

  return {
    user,
    isAuth,
    isDemo,
    isAdmin,
    isPremium,
    activeProfile,
    login,
    register,
    loginDemo,
    logout,
    refreshMe,
  }
}
