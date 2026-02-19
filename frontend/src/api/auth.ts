import { api } from './axios'
import type { TokenResponse, User, LoginForm, RegisterForm, ChangePasswordForm } from '@/types'

export const authApi = {
    login: (data: LoginForm) =>
        api.post<TokenResponse>('/auth/login', data).then((r) => r.data),

    register: (data: Omit<RegisterForm, 'confirm_password'>) =>
        api.post<User>('/auth/register', data).then((r) => r.data),

    refresh: (refresh_token: string) =>
        api.post<TokenResponse>('/auth/refresh', { refresh_token }).then((r) => r.data),

    me: () =>
        api.get<User>('/auth/me').then((r) => r.data),

    changePassword: (data: Omit<ChangePasswordForm, 'confirm_new_password'>) =>
        api.post('/auth/change-password', data).then((r) => r.data),
}