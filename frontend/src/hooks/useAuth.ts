import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { LoginForm, RegisterForm, User } from '@/types'
import { api } from '@/api/axios'

export function useCurrentUser() {
    const { accessToken, setUser } = useAuthStore()

    return useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const user = await authApi.me()
            setUser(user)
            return user
        },
        enabled: !!accessToken,
        staleTime: 1000 * 60 * 5, // 5 min
        retry: false,
    })
}

export function useLogin() {
    const { login } = useAuthStore()
    const navigate = useNavigate()
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (data: LoginForm) => authApi.login(data),
        onSuccess: async (tokens) => {
            const user = await api.get<User>('/auth/me', {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
            }).then(r => r.data)

            login(user, tokens.access_token, tokens.refresh_token)
            qc.setQueryData(['me'], user)
            navigate('/dashboard')
        },
    })
}

export function useRegister() {
    const navigate = useNavigate()

    return useMutation({
        mutationFn: (data: Omit<RegisterForm, 'confirm_password'>) => authApi.register(data),
        onSuccess: () => {
            navigate('/login', { state: { registered: true } })
        },
    })
}

export function useLogout() {
    const { logout } = useAuthStore()
    const navigate = useNavigate()
    const qc = useQueryClient()

    return () => {
        logout()
        qc.clear()
        navigate('/login')
    }
}