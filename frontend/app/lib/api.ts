const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function apiCall(
  endpoint: string,
  options: RequestInit = {}
) {
  const url = `${API_BASE_URL}${endpoint}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(typeof options.headers === 'object' && options.headers !== null 
      ? Object.fromEntries(
          Array.isArray(options.headers)
            ? options.headers
            : Object.entries(options.headers)
        )
      : {}),
  }

  // Add auth token if available
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API error' }))
    throw new Error(error.message || 'API request failed')
  }

  return response.json()
}

export async function get(endpoint: string) {
  return apiCall(endpoint, { method: 'GET' })
}

export async function post(endpoint: string, data?: unknown) {
  return apiCall(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function put(endpoint: string, data?: unknown) {
  return apiCall(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function patch(endpoint: string, data?: unknown) {
  return apiCall(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export async function del(endpoint: string) {
  return apiCall(endpoint, { method: 'DELETE' })
}
