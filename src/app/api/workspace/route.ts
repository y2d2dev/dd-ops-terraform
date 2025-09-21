import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientIP, isIPAllowed } from '@/utils/ip'

export const dynamic = 'force-dynamic'
/**
 * Get all workspaces
 * @param request - NextRequest object
 * @returns JSON response with workspaces list
 */
export async function GET(request: NextRequest) {
  try {
    // クライアントのIPアドレスを取得
    const clientIP = getClientIP(request)
    
    // 全てのワークスペースを取得（IP制限情報も含む）
    const allWorkspaces = await prisma.workSpace.findMany({
      select: {
        id: true,
        name: true,
        accessable_ips: true,
        _count: {
          select: {
            projects: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // クライアントIPが許可されているワークスペースのみをフィルタリング
    const filteredWorkspaces = allWorkspaces.filter(workspace => {
      // accessable_ipsが空の場合は、そのワークスペースは誰もアクセスできない
      if (!workspace.accessable_ips || workspace.accessable_ips.length === 0) {
        return false
      }
      
      // IPアドレスが許可リストに含まれているかチェック
      return isIPAllowed(clientIP, workspace.accessable_ips)
    })

    // フロントエンドに返す際はaccessable_ipsは除外
    const workspacesForClient = filteredWorkspaces.map(({ accessable_ips, ...workspace }) => workspace)

    return NextResponse.json(
      { workspaces: workspacesForClient },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get workspaces error:', error)
    return NextResponse.json(
      { error: 'ワークスペース一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

