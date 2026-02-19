import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL no está definida");
}

export const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
})

// ── Request: inyectar access token ─────────────────────────────────────────
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ── Response: refrescar token si expira (401) ──────────────────────────────
let isRefreshing = false
let failedQueue: Array<{
    resolve: (value: string) => void
    reject: (reason: AxiosError) => void
}> = []

const processQueue = (error: AxiosError | null, token: string | null) => {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error)
        else prom.resolve(token!)
    })
    failedQueue = []
}

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as typeof error.config & { _retry?: boolean }

        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error)
        }

        const refreshToken = useAuthStore.getState().refreshToken

        // Sin refresh token → logout inmediato
        if (!refreshToken) {
            useAuthStore.getState().logout()
            return Promise.reject(error)
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject })
            }).then((token) => {
                originalRequest!.headers!.Authorization = `Bearer ${token}`
                return api(originalRequest!)
            })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'}/auth/refresh`,
                { refresh_token: refreshToken }
            )

            const { access_token, refresh_token } = data
            useAuthStore.getState().setTokens(access_token, refresh_token)

            processQueue(null, access_token)
            originalRequest!.headers!.Authorization = `Bearer ${access_token}`
            return api(originalRequest!)
        } catch (err) {
            processQueue(err as AxiosError, null)
            useAuthStore.getState().logout()
            return Promise.reject(err)
        } finally {
            isRefreshing = false
        }
    }
)