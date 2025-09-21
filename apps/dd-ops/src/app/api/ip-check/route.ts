import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isIPAllowed } from '@/utils/ip'
import logger from '@/lib/logger'

/**
 * IP制限チェックAPI
 * MiddlewareからIP制限をチェックするために使用
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { ip } = await request.json()

    if (!ip) {
      return NextResponse.json(
        { error: 'IPアドレスが指定されていません' },
        { status: 400 }
      )
    }

    // 全ワークスペースのIP制限をチェック
    const workspaces = await prisma.workSpace.findMany({
      select: {
        id: true,
        name: true,
        accessable_ips: true
      }
    })

    // 少なくとも1つのワークスペースでIP制限がある場合のみチェック
    const hasIPRestrictions = workspaces.some(workspace =>
      workspace.accessable_ips && workspace.accessable_ips.length > 0
    )

    if (!hasIPRestrictions) {
      // IP制限がない場合は許可
      return NextResponse.json({ allowed: true })
    }

    // 全ワークスペースのIPリストを統合してチェック
    const allAllowedIPs = workspaces.flatMap(workspace =>
      workspace.accessable_ips || []
    )

    const allowed = isIPAllowed(ip, allAllowedIPs)

    return NextResponse.json({
      allowed,
      hasRestrictions: hasIPRestrictions,
      checkedIP: ip
    })

  } catch (error) {
    logger.error({ error }, 'IP制限チェックAPIでエラーが発生')

    // エラーが発生した場合は安全側に倒して許可しない
    return NextResponse.json(
      { error: 'IP制限チェック中にエラーが発生しました', allowed: false },
      { status: 500 }
    )
  }
}