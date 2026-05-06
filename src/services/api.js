import axios from 'axios'
import { useAuthStore } from '../store'

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://nkiptv.alwaysdata.net').replace(/\/$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Injecter le JWT ───────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token && token !== 'demo') {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Auto-refresh si 401 ───────────────────────────────────────────────────────
let refreshing = false
let refreshQueue = []

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status !== 401 || original._retry) return Promise.reject(err)

    const { refreshToken, setTokens, logout } = useAuthStore.getState()
    if (!refreshToken || refreshToken === 'demo') return Promise.reject(err)

    if (refreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject })
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    refreshing = true

    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
      setTokens(data.data.accessToken, data.data.refreshToken)
      refreshQueue.forEach(q => q.resolve(data.data.accessToken))
      refreshQueue = []
      original.headers.Authorization = `Bearer ${data.data.accessToken}`
      return api(original)
    } catch (refreshErr) {
      refreshQueue.forEach(q => q.reject(refreshErr))
      refreshQueue = []
      logout()
      window.location.href = '/login'
      return Promise.reject(refreshErr)
    } finally {
      refreshing = false
    }
  }
)

export default api

export const getProxiedLogoUrl = (logo) => {
  if (!logo) return null
  return `${API_BASE_URL}/api/proxy/logo?url=${encodeURIComponent(logo)}`
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
  changePassword: (currentPassword, newPassword) => api.put('/auth/password', { currentPassword, newPassword }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
}

// ── Channels ─────────────────────────────────────────────────────────────────
export const channelsAPI = {
  getAll: (params = {}) => api.get('/api/channels', { params }),
  getStats: () => api.get('/api/channels/stats'),
  getCategories: () => api.get('/api/channels/categories'),
  getCountries: () => api.get('/api/channels/countries'),
  getFeatured: () => api.get('/api/channels/featured'),
  getById: (id) => api.get(`/api/channels/${id}`),
  rate: (id, rating) => api.post(`/api/channels/${id}/rate`, { rating }),
}

// ── Proxy ─────────────────────────────────────────────────────────────────────
export const proxyAPI = {
  getBestStreamUrl: (channelId) => `${API_BASE_URL}/api/proxy/best/${channelId}`,
  getStreamUrl: (url, country = '') => `${API_BASE_URL}/api/proxy/stream?url=${encodeURIComponent(url)}&country=${country}`,
  getM3uUrl: (url) => `${API_BASE_URL}/api/proxy/m3u?url=${encodeURIComponent(url)}`,
  checkStream: (url) => api.get(`/api/proxy/check?url=${encodeURIComponent(url)}`),
  resolve: (channelId) => api.get(`/api/proxy/resolve/${channelId}`),
}

// ── Favoris ───────────────────────────────────────────────────────────────────
export const favoritesAPI = {
  getAll: (profileId) => api.get('/api/favorites', { params: { profileId } }),
  add: (channelId, profileId) => api.post(`/api/favorites/${channelId}`, {}, { params: { profileId } }),
  remove: (channelId, profileId) => api.delete(`/api/favorites/${channelId}`, { params: { profileId } }),
  reorder: (favorites, profileId) => api.put('/api/favorites/reorder', { favorites, profileId }),
}

// ── Profils ───────────────────────────────────────────────────────────────────
export const profilesAPI = {
  getAll: () => api.get('/api/profiles'),
  create: (data) => api.post('/api/profiles', data),
  update: (id, data) => api.put(`/api/profiles/${id}`, data),
  delete: (id) => api.delete(`/api/profiles/${id}`),
  activate: (id, pin) => api.post(`/api/profiles/${id}/activate`, { pin }),
  setPin: (id, pin) => api.put(`/api/profiles/${id}/pin`, { pin }),
  addHistory: (id, data) => api.post(`/api/profiles/${id}/history`, data),
}

// ── EPG ───────────────────────────────────────────────────────────────────────
export const epgAPI = {
  getCurrent: (channelId) => api.get(`/api/epg/${channelId}/now`),
  getUpcoming: (channelId, hours = 24) => api.get(`/api/epg/${channelId}/upcoming`, { params: { hours } }),
  getFull: (channelId) => api.get(`/api/epg/${channelId}`),
  getGrid: (params = {}) => api.get('/api/epg/grid/now', { params }),
}

// ── Playlists ─────────────────────────────────────────────────────────────────
export const playlistsAPI = {
  getAll: () => api.get('/api/playlists'),
  create: (data) => api.post('/api/playlists', data),
  update: (index, data) => api.put(`/api/playlists/${index}`, data),
  delete: (index) => api.delete(`/api/playlists/${index}`),
  getChannels: (index) => api.get(`/api/playlists/${index}/channels`),
}

// ── Abonnements ───────────────────────────────────────────────────────────────
export const subscriptionsAPI = {
  getPlans: () => api.get('/api/subscriptions/plans'),
  getStatus: () => api.get('/api/subscriptions/status'),
  checkout: (plan) => api.post('/api/subscriptions/checkout', { plan }),
  cancel: () => api.delete('/api/subscriptions'),
}

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get('/api/admin/stats'),
  getUsers: (params = {}) => api.get('/api/admin/users', { params }),
  updateUser: (id, data) => api.put(`/api/admin/users/${id}`, data),
  getChannels: (params = {}) => api.get('/api/admin/channels', { params }),
  updateChannel: (id, data) => api.put(`/api/admin/channels/${id}`, data),
  syncChannels: () => api.post('/api/admin/channels/sync'),
}
