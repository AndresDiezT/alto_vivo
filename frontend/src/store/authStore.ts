import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
    user: User | null
    accessToken: string | null
    refreshToken: string | null

    // Actions
    setTokens: (access: string, refresh: string) => void
    setUser: (user: User) => void
    login: (user: User, access: string, refresh: string) => void
    logout: () => void
    isAuthenticated: () => boolean
    isOwner: (ownerId: number) => boolean
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,

            setTokens: (access, refresh) =>
                set({ accessToken: access, refreshToken: refresh }),

            setUser: (user) => set({ user }),

            login: (user, access, refresh) =>
                set({ user, accessToken: access, refreshToken: refresh }),

            logout: () =>
                set({ user: null, accessToken: null, refreshToken: null }),

            isAuthenticated: () => !!get().accessToken && !!get().user,

            isOwner: (ownerId) => get().user?.id === ownerId,
        }),
        {
            name: 'altovivo-auth',
            // Solo persistir tokens, el usuario se recarga desde /auth/me al iniciar
            partialize: (state) => ({
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                user: state.user,
            }),
        }
    )
)