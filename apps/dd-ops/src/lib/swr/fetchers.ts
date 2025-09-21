/**
 * Default fetcher for internal API endpoints
 * @param url - URL to fetch from
 * @returns Promise with JSON response
 */
export const fetcher = async (url: string) => {
  const response = await fetch(url)
  
  // 403 (Forbidden) - IP制限によるアクセス拒否の場合はログインページにリダイレクト
  if (response.status === 403) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login?error=ip_restricted'
    }
    throw new Error(`Access forbidden. IP restriction. Status: ${response.status}`)
  }
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Fetcher for external API endpoints with enhanced error handling
 * @param url - URL to fetch from
 * @returns Promise with JSON response
 */
export const externalFetcher = async (url: string) => {
  const response = await fetch(url)
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`External API error: ${response.status} - ${errorText}`)
  }
  
  return response.json()
}

/**
 * Fetcher with custom headers
 * @param url - URL to fetch from
 * @param headers - Custom headers object
 * @returns Promise with JSON response
 */
export const fetcherWithHeaders = (headers: Record<string, string>) => 
  async (url: string) => {
    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }

/**
 * POST fetcher for form submissions
 * @param url - URL to post to
 * @param data - Data to send in request body
 * @returns Promise with JSON response
 */
export const postFetcher = async (url: string, data: any) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Authentication-aware fetcher that redirects to login on auth errors
 * @param url - URL to fetch from
 * @returns Promise with JSON response
 */
export const authFetcher = async (url: string) => {
  const response = await fetch(url)
  
  // 401 (Unauthorized) or 404 (Not Found) for auth endpoints should redirect to login
  if (response.status === 401 || (response.status === 404 && url.includes('/auth/me'))) {
    // サーバーサイドでは window が存在しないのでチェック
    if (typeof window !== 'undefined') {
      // 無効なトークンを削除
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      window.location.href = '/login'
    }
    throw new Error(`Authentication required. Redirecting to login. Status: ${response.status}`)
  }
  
  // 403 (Forbidden) - IP制限によるアクセス拒否の場合もログインページにリダイレクト
  if (response.status === 403) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login?error=ip_restricted'
    }
    throw new Error(`Access forbidden. IP restriction. Status: ${response.status}`)
  }
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

/**
 * External files fetcher for Google Cloud Function
 * @param url - Base URL for the external API
 * @param params - Object with projectId and workspaceId
 * @returns Promise with JSON response
 */
export const externalFilesFetcher = async (url: string, params: { projectId: string; workspaceId: number }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`External files API error: ${response.status} - ${errorText}`)
  }
  
  return response.json()
}

/**
 * 署名付きURLを取得するためのフェッチャー
 * @param url - Base URL for the external API
 * @param params - Object with projectId, workspaceId, and fileName
 * @returns Promise with JSON response
 */
export const signedUrlFetcher = async (url: string, params: { projectId: string; workspaceId: number; fileName: string }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })

  console.log('response', response);
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Signed URL API error: ${response.status} - ${errorText}`)
  }
  
  return response.json()
}

/**
 * 請求情報を取得するためのフェッチャー
 * @param url - Base URL for the external API
 * @param params - Object with workspaceId, userId, and yearMonth
 * @returns Promise with JSON response
 */
export const billingFetcher = async (url: string, params: { workspaceId: number, userId: number, yearMonth: string }) => {
  const queryParams = new URLSearchParams({
    workspaceId: params.workspaceId.toString(),
    userId: params.userId.toString()
  })
  
  const fullUrl = `${url}/${params.yearMonth}?${queryParams.toString()}`
  
  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}