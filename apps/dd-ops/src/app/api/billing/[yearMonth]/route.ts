import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Get billing data for specific year-month
 * @param request - NextRequest object
 * @param params - Route parameters
 * @returns JSON response with billing data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { yearMonth: string } }
) {
  try {
    const { yearMonth } = params
    
    // URLパラメータからuserIdとworkspaceIdを取得
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const workspaceId = searchParams.get('workspaceId')
    
    // バリデーション
    if (!yearMonth) {
      return NextResponse.json(
        { error: '年月が指定されていません' },
        { status: 400 }
      )
    }

    // 年月フォーマットの検証 (YYYY-MM)
    const yearMonthRegex = /^\d{4}-\d{2}$/
    if (!yearMonthRegex.test(yearMonth)) {
      return NextResponse.json(
        { error: '年月のフォーマットが正しくありません (YYYY-MM)' },
        { status: 400 }
      )
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'ワークスペースIDが指定されていません' },
        { status: 400 }
      )
    }

    // 実際のDB処理（既存のコード）
    // 月の最初と最後の日付を作成
    const startOfMonth = new Date(`${yearMonth}-01T00:00:00.000Z`)
    const endOfMonth = new Date(startOfMonth)
    endOfMonth.setMonth(endOfMonth.getMonth() + 1)

    // 1. Projectデータを取得（createdAt, deletedAt条件付き）
    const projects = await prisma.project.findMany({
      where: {
        workspaceId: parseInt(workspaceId),
        // yearMonthよりも前に作成されたプロジェクトのみ
        createdAt: {
          lt: endOfMonth
        },
        // 削除されていないプロジェクトのみ
        OR: [
          { deletedAt: null },
          {
            // 削除日がyearMonth月に含まれているプロジェクトのみ
            deletedAt: {
              gte: startOfMonth,
              lt: endOfMonth
            }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        },
        ocrPageCounts: {
          where: {
            createdAt: {
              gte: startOfMonth,
              lt: endOfMonth
            }
          }
        }
      }
    })

    // 2. 料金計算の準備
    const activeProjectCount = projects.filter(project => project.deletedAt === null).length
    
    // 超過ページ単価を取得
    const getPageOverageRate = (projectCount: number): number => {
      if (projectCount === 1) return 990
      if (projectCount === 2) return 970
      if (projectCount === 3) return 930
      if (projectCount === 4) return 870
      if (projectCount === 5) return 790
      return 690 // 6以上
    }

    const pageOverageRate = getPageOverageRate(projects.length)

    // 3. 各プロジェクトの料金計算とデータ整形
    let ocrPagePrice = 0
    let excessPrice = 0

    const projectsWithOcrCount = projects.map(project => {
      // 当月のOCRページ数を集計
      const monthlyPageCount = project.ocrPageCounts.reduce((sum, count) => sum + count.pageCount, 0)
      
      // ページ料金計算
      if (monthlyPageCount > 0) {
        ocrPagePrice += 80000 // 基本80,000円
        
        if (monthlyPageCount > 200) {
          const excess = monthlyPageCount - 200
          excessPrice += excess * pageOverageRate
        }
      }

      return {
        id: project.id,
        name: project.name,
        description: project.description || '',
        targetCompany: project.targetCompany || '',
        user: {
          id: project.user?.id || 0,
          name: project.user?.email?.split('@')[0] || '',
          email: project.user?.email || ''
        },
        ocrPageCount: project.ocrPageCounts.map(count => ({
          id: count.id,
          pageCount: count.pageCount,
          createdAt: count.createdAt.toISOString()
        })),
        isActive: project.deletedAt === null,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.createdAt.toISOString() // updatedAtがない場合はcreatedAtを使用
      }
    })

    // 4. 料金計算
    const projectBasePrice = projects.length * 70000

    const response = {
      projects: projectsWithOcrCount,
      activeProjectCount,
      amount: {
        projectBasePrice,
        ocrPagePrice,
        excessPrice
      },
      message: `${yearMonth}の請求データを取得しました`
    }
    
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Billing API error:', error)
    return NextResponse.json(
      { error: '請求データの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * Export dynamic configuration to enable dynamic route handling
 */
export const dynamic = 'force-dynamic'