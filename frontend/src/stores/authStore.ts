import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'admin' | 'researcher' | 'user'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  firebaseUid?: string
  photoURL?: string | null
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  setToken: (token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  // Role checking helpers
  isAdmin: () => boolean
  isResearcher: () => boolean
  canAccessAdminFeatures: () => boolean
  canAccessResearcherFeatures: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
        }),
      setToken: (token) => set({ token }),
      logout: () => {
        // Sign out of Firebase (fire-and-forget)
        import('@/lib/firebase').then(m => m.firebaseLogout()).catch(() => {})
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
      // Role checking helpers
      isAdmin: () => get().user?.role === 'admin',
      isResearcher: () => get().user?.role === 'researcher',
      canAccessAdminFeatures: () => get().user?.role === 'admin',
      canAccessResearcherFeatures: () => {
        const role = get().user?.role
        return role === 'admin' || role === 'researcher'
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
