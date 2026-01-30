const API_BASE = import.meta.env.VITE_API_BASE ?? ''
const FALLBACK_BASE = 'http://localhost:8080'

function resolveBase() {
  if (API_BASE) {
    return API_BASE
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return FALLBACK_BASE
  }
  return ''
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = resolveBase()
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `请求失败: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  if (!text) {
    return undefined as T
  }

  return JSON.parse(text) as T
}
