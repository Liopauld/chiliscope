import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { getFirebaseIdToken } from '@/lib/firebase'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 90000, // 90 seconds — Render free tier can take 50-60s to cold-start
})

// Request interceptor — attach Firebase ID token
api.interceptors.request.use(
  async (config) => {
    // Try to get a fresh Firebase ID token first
    try {
      const firebaseToken = await getFirebaseIdToken()
      if (firebaseToken) {
        config.headers.Authorization = `Bearer ${firebaseToken}`
        // Keep the Zustand store in sync so other parts of the app see it
        useAuthStore.getState().setToken(firebaseToken)
        return config
      }
    } catch {
      // Firebase not available or user not signed in — fall through
    }

    // Fallback: use the token from the Zustand store (backward compat)
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login for 401 errors on protected endpoints
    // Don't redirect if already on auth pages (login/register)
    const isAuthEndpoint = error.config?.url?.includes('/auth/')
    const isAlreadyOnLogin = window.location.pathname === '/login' || window.location.pathname === '/register'
    
    if (error.response?.status === 401 && !isAuthEndpoint && !isAlreadyOnLogin) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', {
      username: email,
      password: password,
    })
    return response.data
  },
  
  register: async (data: { email: string; password: string; name: string; user_type?: string }) => {
    const response = await api.post('/auth/register', {
      email: data.email,
      password: data.password,
      confirm_password: data.password,
      full_name: data.name,
      user_type: data.user_type || 'user'
    })
    return response.data
  },

  /** Send Firebase ID token to backend to sync/create user profile */
  firebaseLogin: async (idToken: string, fullName?: string, userType?: string) => {
    const response = await api.post('/auth/firebase-login', {
      id_token: idToken,
      full_name: fullName,
      user_type: userType || 'user',
    })
    return response.data
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
  
  refreshToken: async () => {
    const response = await api.post('/auth/refresh')
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const response = await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    })
    return response.data
  },
}

// Samples API
export const samplesApi = {
  list: async (page = 1, limit = 10) => {
    const response = await api.get('/samples', { params: { page, limit } })
    return response.data
  },
  
  get: async (id: string) => {
    const response = await api.get(`/samples/${id}`)
    return response.data
  },
  
  create: async (data: Record<string, unknown>) => {
    const response = await api.post('/samples', data)
    return response.data
  },
  
  update: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/samples/${id}`, data)
    return response.data
  },
  
  delete: async (id: string) => {
    const response = await api.delete(`/samples/${id}`)
    return response.data
  },

  getPublicFeed: async (page = 1, limit = 20, variety?: string) => {
    const params: Record<string, unknown> = { page, page_size: limit }
    if (variety) params.variety = variety
    const response = await api.get('/samples/public/feed', { params })
    return response.data
  },
}

// Images API
export const imagesApi = {
  upload: async (file: File, sampleId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (sampleId) {
      formData.append('sample_id', sampleId)
    }
    
    const response = await api.post('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  
  uploadBatch: async (files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    
    const response = await api.post('/images/upload/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

// Predictions API
export const predictionsApi = {
  analyze: async (sampleId: string) => {
    const response = await api.post(`/predictions/analyze/${sampleId}`)
    return response.data
  },
  
  // Quick classify using Roboflow
  classifyImage: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/predictions/classify-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  
  // Alias for backward compatibility
  analyzeImage: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post('/predictions/classify-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  // Check Roboflow configuration status  
  getRoboflowStatus: async () => {
    const response = await api.get('/predictions/roboflow-status')
    return response.data
  },

  // Segment a chili image using the segmentation model
  segmentImage: async (file: File, analysisId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    const params = analysisId ? `?analysis_id=${encodeURIComponent(analysisId)}` : ''
    const response = await api.post(`/predictions/segment-image${params}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  // Segment a flower image using the flower segmentation model
  segmentFlower: async (file: File, analysisId?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    const params = analysisId ? `?analysis_id=${encodeURIComponent(analysisId)}` : ''
    const response = await api.post(`/predictions/segment-flower${params}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  
  getHistory: async (page = 1, limit = 10) => {
    const response = await api.get('/predictions/history', {
      params: { page, limit },
    })
    return response.data
  },

  getHistoryDetail: async (analysisId: string) => {
    const response = await api.get(`/predictions/history/${analysisId}`)
    return response.data
  },

  // Refine chili SHU with flower stress scan (Step 2)
  refineWithFlower: async (analysisId: string, flowerFile: File) => {
    const formData = new FormData()
    formData.append('file', flowerFile)
    const response = await api.post(`/predictions/refine-with-flower?analysis_id=${encodeURIComponent(analysisId)}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

// Recommendations API
export const recommendationsApi = {
  generate: async (sampleId: string) => {
    const response = await api.post(`/recommendations/generate/${sampleId}`)
    return response.data
  },
  
  getCulinaryGuide: async (heatLevel: string) => {
    const response = await api.get(`/recommendations/culinary/${heatLevel}`)
    return response.data
  },
}

// Users API (admin)
export const usersApi = {
  list: async (skip = 0, limit = 50, user_type?: string) => {
    const params: Record<string, unknown> = { skip, limit }
    if (user_type) params.user_type = user_type
    const response = await api.get('/users', { params })
    return response.data
  },
  getUser: async (userId: string) => {
    const response = await api.get(`/users/${userId}`)
    return response.data
  },
  updateProfile: async (data: { full_name?: string; profile_image?: string }) => {
    const response = await api.put('/users/me', data)
    return response.data
  },
  deactivate: async (userId: string, data: {
    reason: string
    reason_category: string
    is_temporary?: boolean
    duration_days?: number
  }) => {
    const response = await api.put(`/users/${userId}/deactivate`, data)
    return response.data
  },
  reactivate: async (userId: string, note?: string) => {
    const response = await api.put(`/users/${userId}/reactivate`, { note })
    return response.data
  },
}

// Models API
export const modelsApi = {
  list: async () => {
    const response = await api.get('/models')
    return response.data
  },
  getActive: async () => {
    const response = await api.get('/models/active')
    return response.data
  },
}

// Chat / AI API
export const chatApi = {
  interpretAnalytics: async (payload: {
    stats: Record<string, number>
    varietyDistribution: Record<string, number>
    heatDistribution: Record<string, number>
    usersByType: Record<string, number>
  }): Promise<{ overview: string; variety: string; heat: string; users: string; recommendations: string }> => {
    const response = await api.post('/chat/interpret-analytics', payload)
    return response.data
  },
}

// Analytics API
export const analyticsApi = {
  getDashboard: async () => {
    const response = await api.get('/analytics/dashboard')
    return response.data
  },
  
  getTrends: async (days = 30) => {
    const response = await api.get('/analytics/trends', { params: { days } })
    return response.data
  },
}

// ML Models API
export const mlApi = {
  getModelComparison: async () => {
    const response = await api.get('/ml/model-comparison')
    return response.data
  },
  getModelMetadata: async (modelName: string) => {
    const response = await api.get(`/ml/model-metadata/${modelName}`)
    return response.data
  },
  getDecisionTreeRules: async () => {
    const response = await api.get('/ml/decision-tree-rules')
    return response.data
  },
  predictShu: async (params: Record<string, unknown>) => {
    const response = await api.post('/ml/predict-shu', params)
    return response.data
  },
  compareShuModels: async (params: Record<string, unknown>) => {
    const response = await api.post('/ml/predict-shu/compare', params)
    return response.data
  },
}

// Prices / Market API
export const pricesApi = {
  getMarketOverview: async () => {
    const response = await api.get('/prices/market-overview')
    return response.data
  },

  getCurrent: async (location = 'metro_manila') => {
    const response = await api.get('/prices/current', { params: { location } })
    return response.data
  },

  getHistory: async (params?: { chili_type?: string; location?: string; limit?: number }) => {
    const response = await api.get('/prices', { params })
    return response.data
  },

  getAnalytics: async (chiliType: string, location = 'metro_manila') => {
    const response = await api.get(`/prices/analytics/${chiliType}`, { params: { location } })
    return response.data
  },

  seed: async () => {
    const response = await api.post('/prices/seed')
    return response.data
  },

  predict: async (chiliType: string, days: number = 7) => {
    const response = await api.get(`/prices/predict/${chiliType}`, { params: { days } })
    return response.data
  },

  getModelInfo: async () => {
    const response = await api.get('/prices/predict/model-info')
    return response.data
  },
}

// Forum API
export const forumApi = {
  listPosts: async (page = 1, limit = 20, category?: string, search?: string) => {
    const params: Record<string, unknown> = { page, limit }
    if (category) params.category = category
    if (search) params.search = search
    const response = await api.get('/forum/posts', { params })
    return response.data
  },

  getPost: async (postId: string) => {
    const response = await api.get(`/forum/posts/${postId}`)
    return response.data
  },

  createPost: async (data: { title: string; content: string; category?: string; tags?: string[]; images?: string[] }) => {
    const response = await api.post('/forum/posts', data)
    return response.data
  },

  updatePost: async (postId: string, data: { title?: string; content?: string; category?: string }) => {
    const response = await api.put(`/forum/posts/${postId}`, data)
    return response.data
  },

  deletePost: async (postId: string) => {
    const response = await api.delete(`/forum/posts/${postId}`)
    return response.data
  },

  listComments: async (postId: string) => {
    const response = await api.get(`/forum/posts/${postId}/comments`)
    return response.data
  },

  createComment: async (postId: string, data: { content: string; parent_id?: string }) => {
    const response = await api.post(`/forum/posts/${postId}/comments`, data)
    return response.data
  },

  deleteComment: async (commentId: string) => {
    const response = await api.delete(`/forum/comments/${commentId}`)
    return response.data
  },

  reactToPost: async (postId: string, reactionType: string) => {
    const response = await api.post(`/forum/posts/${postId}/react`, { reaction_type: reactionType })
    return response.data
  },

  uploadImage: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/forum/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  reactToComment: async (commentId: string, reactionType: string) => {
    const response = await api.post(`/forum/comments/${commentId}/react`, { reaction_type: reactionType })
    return response.data
  },
}

// Notifications API
export const notificationsApi = {
  list: async (page = 1, limit = 20) => {
    const response = await api.get('/forum/notifications', { params: { page, limit } })
    return response.data
  },

  getUnreadCount: async () => {
    const response = await api.get('/forum/notifications/unread-count')
    return response.data
  },

  markRead: async (notificationId: string) => {
    const response = await api.put(`/forum/notifications/${notificationId}/read`)
    return response.data
  },

  markAllRead: async () => {
    const response = await api.put('/forum/notifications/read-all')
    return response.data
  },

  registerDevice: async (token: string) => {
    const response = await api.post('/forum/notifications/register-device', { token })
    return response.data
  },

  unregisterDevice: async (token: string) => {
    const response = await api.delete('/forum/notifications/unregister-device', { data: { token } })
    return response.data
  },
}

export default api
