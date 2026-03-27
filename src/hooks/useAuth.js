import { useAuthStore } from '../store'
import { authAPI } from '../services/api'

export const useAuth = () => {
  const store = useAuthStore()

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
      if (!store.isDemo) await authAPI.logout(store.refreshToken)
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
    user: store.user,
    isAuth: store.isAuth || !!store.accessToken,
    isDemo: store.isDemo,
    isAdmin: store.isAdmin,
    isPremium: store.isPremium,
    activeProfile: store.activeProfile,
    login,
    register,
    loginDemo,
    logout,
    refreshMe,
  }
}
