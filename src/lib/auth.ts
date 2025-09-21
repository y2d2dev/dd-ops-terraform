import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

/**
 * JWTトークンを生成
 */
export function generateToken(payload: any): string {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined')
  }
  
  return jwt.sign(payload, jwtSecret, { 
    expiresIn: '7d' // 7日間有効
  })
}

/**
 * JWTトークンを検証
 */
export function verifyToken(token: string): any {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined')
  }
  
  return jwt.verify(token, jwtSecret)
}

/**
 * サーバーサイドで現在のユーザー情報を取得
 * このファイルではなくAPI routeで直接cookies()を使用してください
 */
export function getCurrentUserFromToken(token: string): any | null {
  try {
    if (!token) {
      return null
    }
    
    const decoded = verifyToken(token)
    return decoded
  } catch (error) {
    console.error('getCurrentUserFromToken error:', error)
    return null
  }
}

/**
 * クライアントサイドで認証状態をチェック
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') {
    return false // サーバーサイドでは常にfalse
  }
  
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  if (!token) {
    return false
  }
  
  try {
    const decoded = jwt.decode(token) as any
    if (!decoded || !decoded.exp) {
      return false
    }
    
    // トークンの有効期限をチェック
    return decoded.exp * 1000 > Date.now()
  } catch (error) {
    return false
  }
}

/**
 * ログアウト処理
 */
export async function logout(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      // ログアウトAPIを呼び出す
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // ログインページにリダイレクト
        window.location.href = '/login'
      } else {
        console.error('ログアウトに失敗しました')
      }
    } catch (error) {
      console.error('ログアウトエラー:', error)
    }
  }
}