import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // レスポンスを作成
  const response = NextResponse.json(
    { message: 'ログアウトしました' },
    { status: 200 }
  )

  // クッキーを削除（過去の日付を設定）
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // 即座に期限切れにする
    path: '/'
  })

  return response
}