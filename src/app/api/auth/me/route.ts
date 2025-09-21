import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getClientIP, isIPAllowed } from '@/utils/ip'

export const dynamic = 'force-dynamic'

/**
 * Get current user information with workspace details
 * TODO: Implement proper authentication to get current user from session/token
 * @param request - NextRequest object
 * @returns JSON response with current user information
 */
export async function GET(request: NextRequest) {
  try {
    // JWTトークンから認証情報を取得
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    const userId = decoded.userId

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projectUsers: {
          include: {
            project: {
              include: {
                workspace: {
                  select: {
                    id: true,
                    name: true,
                    accessable_ips: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // ユーザーが所属するワークスペースを取得（最初のプロジェクトのワークスペース）
    const userWorkspace = currentUser.projectUsers.length > 0
      ? currentUser.projectUsers[0].project.workspace
      : null

    // ワークスペースのIP制限をチェック
    if (userWorkspace) {
      const clientIP = getClientIP(request)

      if (!isIPAllowed(clientIP, userWorkspace.accessable_ips)) {
        console.error(`IP制限による/meアクセス拒否: IP=${clientIP}, ユーザー=${currentUser.email}, ワークスペース=${userWorkspace.name}`)
        return NextResponse.json(
          { error: 'このIPアドレスからのアクセスは許可されていません' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      {
        user: {
          id: currentUser.id,
          email: currentUser.email
        },
        workspace: userWorkspace
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get current user error:', error)

    // JWTトークンエラーの場合は401を返す
    if (error instanceof Error && error.message.includes('jwt')) {
      return NextResponse.json(
        { error: '認証エラー' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}