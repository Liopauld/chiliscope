import axios from 'axios';
import * as storage from '../utils/storage';
import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Constants from 'expo-constants';

// Dynamically get the dev machine's IP from Expo manifest
const getApiBaseUrl = (): string => {
  // If explicitly set via env var, use that
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Try to get the host from Expo's dev server (works in Expo Go)
  const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
  
  if (debuggerHost) {
    // debuggerHost is like "192.168.1.42:8081" - extract the IP
    const host = debuggerHost.split(':')[0];
    return `http://${host}:8000/api/v1`;
  }
  
  // Fallback for production or when host detection fails
  return 'http://localhost:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// Log the API URL for debugging
console.log('API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 90000, // 90 seconds — Render free tier can take 50-60s to cold-start
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    console.log('Request:', config.method?.toUpperCase(), config.url);
    const token = await storage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- 401 Auto-logout ---
let _onUnauthorized: (() => Promise<void>) | null = null;
export function onUnauthorized(cb: () => Promise<void>) {
  _onUnauthorized = cb;
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error('API Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);

      // Auto-logout on 401 (skip auth endpoints to avoid loops)
      if (error.response.status === 401 && _onUnauthorized) {
        const url = error.config?.url || '';
        if (!url.includes('/auth/')) {
          // Only auto-logout if the token has truly expired,
          // not for admin-only endpoints or race conditions.
          // Check if there is a stored token first — if not, trigger logout.
          const token = await storage.getItem('authToken');
          if (!token) {
            console.log('401 detected with no stored token — auto-logging out');
            await _onUnauthorized();
          }
          // Otherwise, let the caller handle the 401 error
          // (e.g. show "access denied" instead of force-logging out)
        }
      }
    } else if (error.request) {
      console.error('No response received - is backend running?');
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', {
      username: email,
      password: password,
    });
    return response.data;
  },

  /** Exchange a Firebase ID token for a local JWT (primary auth path) */
  firebaseLogin: async (idToken: string, fullName?: string, userType?: string) => {
    const response = await api.post('/auth/firebase-login', {
      id_token: idToken,
      full_name: fullName,
      user_type: userType,
    });
    return response.data;
  },

  register: async (email: string, password: string, fullName: string, userType: string = 'user') => {
    const response = await api.post('/auth/register', { 
      email, 
      password,
      confirm_password: password,
      full_name: fullName,
      user_type: userType,
    });
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/users/me');
    return response.data;
  },
};

// Predictions API

/**
 * Preprocess an image before upload:
 * 1. Normalizes orientation (fixes EXIF rotation issues from mobile cameras)
 * 2. Resizes to max 1280px (reduces upload size, matches web camera quality)
 * 3. Converts to JPEG format
 *
 * This ensures the backend receives the same quality/orientation as web uploads.
 */
async function preprocessImage(imageUri: string): Promise<string> {
  try {
    const result = await manipulateAsync(
      imageUri,
      [{ resize: { width: 1280 } }],
      { format: SaveFormat.JPEG, compress: 0.92 }
    );
    return result.uri;
  } catch (err) {
    console.warn('Image preprocessing failed, using original:', err);
    return imageUri;
  }
}

/**
 * Upload an image to a backend endpoint using the native file upload API.
 * Bypasses Axios/XHR polyfill for reliable file uploads on React Native.
 */
async function uploadImageNative(endpoint: string, imageUri: string): Promise<any> {
  // Preprocess: normalize orientation + resize + JPEG
  const processedUri = await preprocessImage(imageUri);

  const token = await storage.getItem('authToken');

  const response = await uploadAsync(
    `${API_BASE_URL}${endpoint}`,
    processedUri,
    {
      fieldName: 'file',
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.MULTIPART,
      mimeType: 'image/jpeg',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  console.log('Upload response:', response.status, endpoint);

  if (response.status >= 200 && response.status < 300) {
    return JSON.parse(response.body);
  }

  // Handle errors
  let errorData: any = {};
  try {
    errorData = JSON.parse(response.body);
  } catch { /* body not JSON */ }

  // Trigger auto-logout on 401
  if (response.status === 401 && _onUnauthorized) {
    console.log('401 detected on native upload — auto-logging out');
    await _onUnauthorized();
  }

  const error: any = new Error(errorData.detail || `Request failed with status ${response.status}`);
  error.response = { data: errorData, status: response.status };
  throw error;
}

export const predictionsApi = {
  // Quick classify using Roboflow (mobile uses v6 — no 'Others' class)
  classifyImage: async (imageUri: string) => {
    return uploadImageNative('/predictions/classify-image?model_version=6', imageUri);
  },

  // Legacy analyze (for sample-based analysis)
  analyzeImage: async (imageUri: string) => {
    return uploadImageNative('/predictions/classify-image?model_version=6', imageUri);
  },

  // Check Roboflow configuration status
  getRoboflowStatus: async () => {
    const response = await api.get('/predictions/roboflow-status');
    return response.data;
  },

  // Segment chili image
  segmentChili: async (imageUri: string) => {
    return uploadImageNative('/predictions/segment-image', imageUri);
  },

  // Segment flower image
  segmentFlower: async (imageUri: string) => {
    return uploadImageNative('/predictions/segment-flower', imageUri);
  },

  getHistory: async (page = 1, limit = 20) => {
    const response = await api.get('/predictions/history', {
      params: { page, limit },
    });
    return response.data;
  },

  getHistoryDetail: async (analysisId: string) => {
    const response = await api.get(`/predictions/history/${analysisId}`);
    return response.data;
  },

  // Refine SHU prediction with a flower image (Step 2)
  refineWithFlower: async (analysisId: string, flowerImageUri: string) => {
    const processedUri = await preprocessImage(flowerImageUri);
    const token = await storage.getItem('authToken');
    const response = await uploadAsync(
      `${API_BASE_URL}/predictions/refine-with-flower?analysis_id=${analysisId}`,
      processedUri,
      {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: FileSystemUploadType.MULTIPART,
        mimeType: 'image/jpeg',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    if (response.status >= 200 && response.status < 300) {
      return JSON.parse(response.body);
    }
    let errorData: any = {};
    try { errorData = JSON.parse(response.body); } catch { /* not JSON */ }
    const error: any = new Error(errorData.detail || `Refinement failed with status ${response.status}`);
    error.response = { data: errorData, status: response.status };
    throw error;
  },
};

// ML Model Comparison API
export const mlApi = {
  getModelComparison: async () => {
    const response = await api.get('/ml/model-comparison');
    return response.data;
  },

  getDecisionTreeRules: async () => {
    const response = await api.get('/ml/decision-tree-rules');
    return response.data;
  },

  predictShu: async (features: {
    variety: string;
    pod_length_mm?: number;
    pod_width_mm?: number;
    estimated_weight_g?: number;
    flower_stress_score?: number;
  }) => {
    const response = await api.post('/ml/predict-shu', features);
    return response.data;
  },
};

// Analytics API
export const analyticsApi = {
  getDashboard: async () => {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  },
};

// Prices / Market API (matches web frontend)
export const pricesApi = {
  getMarketOverview: async () => {
    const response = await api.get('/prices/market-overview');
    return response.data;
  },

  getCurrent: async (location = 'metro_manila') => {
    const response = await api.get('/prices/current', { params: { location } });
    return response.data;
  },

  getHistory: async (params?: { chili_type?: string; location?: string; limit?: number }) => {
    const response = await api.get('/prices', { params });
    return response.data;
  },

  getAnalytics: async (chiliType: string, location = 'metro_manila') => {
    const response = await api.get(`/prices/analytics/${chiliType}`, { params: { location } });
    return response.data;
  },

  seed: async () => {
    const response = await api.post('/prices/seed');
    return response.data;
  },

  predict: async (chiliType: string, days: number = 7) => {
    const response = await api.get(`/prices/predict/${chiliType}`, { params: { days } });
    return response.data;
  },

  getModelInfo: async () => {
    const response = await api.get('/prices/predict/model-info');
    return response.data;
  },
};

// Users API (admin)
export const usersApi = {
  getAll: async (skip = 0, limit = 100) => {
    const response = await api.get('/users', { params: { skip, limit } });
    return response.data;
  },

  getMyStats: async () => {
    const response = await api.get('/users/me/stats');
    return response.data;
  },

  deactivate: async (userId: string, reason: string, reasonCategory: string, isTemporary = false, durationDays?: number) => {
    const response = await api.put(`/users/${userId}/deactivate`, {
      reason,
      reason_category: reasonCategory,
      is_temporary: isTemporary,
      duration_days: durationDays,
    });
    return response.data;
  },

  reactivate: async (userId: string, note?: string) => {
    const response = await api.put(`/users/${userId}/reactivate`, { note });
    return response.data;
  },
};

// Chat API (Gemini-powered ChiliBot)
export const chatApi = {
  ask: async (message: string, history: { role: string; text: string }[] = []) => {
    const response = await api.post('/chat/ask', { message, history });
    return response.data;
  },
};

// Forum API
export const forumApi = {
  listPosts: async (page = 1, limit = 20, category?: string, search?: string) => {
    const params: Record<string, any> = { page, limit };
    if (category) params.category = category;
    if (search) params.search = search;
    const response = await api.get('/forum/posts', { params });
    return response.data;
  },

  getPost: async (postId: string) => {
    const response = await api.get(`/forum/posts/${postId}`);
    return response.data;
  },

  createPost: async (data: { title: string; content: string; category?: string; tags?: string[]; images?: string[] }) => {
    const response = await api.post('/forum/posts', data);
    return response.data;
  },

  updatePost: async (postId: string, data: { title?: string; content?: string; category?: string; tags?: string[] }) => {
    const response = await api.put(`/forum/posts/${postId}`, data);
    return response.data;
  },

  deletePost: async (postId: string) => {
    const response = await api.delete(`/forum/posts/${postId}`);
    return response.data;
  },

  listComments: async (postId: string) => {
    const response = await api.get(`/forum/posts/${postId}/comments`);
    return response.data;
  },

  createComment: async (postId: string, content: string, parentId?: string) => {
    const response = await api.post(`/forum/posts/${postId}/comments`, { content, parent_id: parentId });
    return response.data;
  },

  deleteComment: async (commentId: string) => {
    const response = await api.delete(`/forum/comments/${commentId}`);
    return response.data;
  },

  reactToPost: async (postId: string, reactionType: string) => {
    const response = await api.post(`/forum/posts/${postId}/react`, { reaction_type: reactionType });
    return response.data;
  },

  reactToComment: async (commentId: string, reactionType: string) => {
    const response = await api.post(`/forum/comments/${commentId}/react`, { reaction_type: reactionType });
    return response.data;
  },

  uploadImage: async (formData: FormData) => {
    const response = await api.post('/forum/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// Notifications API
export const notificationsApi = {
  list: async (page = 1, limit = 20) => {
    const response = await api.get('/forum/notifications', { params: { page, limit } });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/forum/notifications/unread-count');
    return response.data;
  },

  markRead: async (notificationId: string) => {
    const response = await api.put(`/forum/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await api.put('/forum/notifications/read-all');
    return response.data;
  },

  registerDevice: async (token: string) => {
    const response = await api.post('/forum/notifications/register-device', { token });
    return response.data;
  },

  unregisterDevice: async (token: string) => {
    const response = await api.delete('/forum/notifications/unregister-device', { data: { token } });
    return response.data;
  },
};

// Samples API
export const samplesApi = {
  list: async (page = 1, limit = 10) => {
    const response = await api.get('/samples', { params: { page, limit } });
    return response.data;
  },
  get: async (id: string) => {
    const response = await api.get(`/samples/${id}`);
    return response.data;
  },
  update: async (id: string, data: Record<string, any>) => {
    const response = await api.put(`/samples/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/samples/${id}`);
    return response.data;
  },
  getPublicFeed: async (page = 1, limit = 20) => {
    const response = await api.get('/samples/public/feed', { params: { page, page_size: limit } });
    return response.data;
  },
};

// Hotspots API
export const hotspotsApi = {
  list: async () => {
    const response = await api.get('/hotspots');
    return response.data;
  },
};

// Content API
export const contentApi = {
  getContent: async () => {
    const response = await api.get('/content/content');
    return response.data;
  },
};

export default api;
