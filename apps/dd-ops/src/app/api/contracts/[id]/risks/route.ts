import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Get all risks for a specific contract
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id)

    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: '無効な契約書IDです' },
        { status: 400 }
      )
    }

    // 契約書の存在確認
    const contract = await prisma.contract.findUnique({
      where: { id: contractId }
    })

    if (!contract) {
      return NextResponse.json(
        { error: '契約書が見つかりません' },
        { status: 404 }
      )
    }

    // リスク取得（articleInfo順でソートするため、まずは全て取得）
    const risks = await prisma.contractRisk.findMany({
      where: { contractId: contractId }
    })

    // articleInfo（条文番号）でソート
    const sortedRisks = risks.sort((a, b) => {
      const parseArticleInfo = (articleInfo: string | null): number => {
        if (!articleInfo) return 999999 // articleInfoがない場合は最後に

        // "第9条"、"第17条第1項第1号" のような形式から数値を抽出
        const match = articleInfo.match(/第(\d+)条/)
        return match ? parseInt(match[1]) : 999999
      }

      const aNum = parseArticleInfo(a.articleInfo)
      const bNum = parseArticleInfo(b.articleInfo)

      if (aNum !== bNum) {
        return aNum - bNum // 条文番号の昇順
      }

      // 同じ条文の場合は項・号でソート
      const parseSubSection = (articleInfo: string | null): [number, number] => {
        if (!articleInfo) return [999, 999]

        const itemMatch = articleInfo.match(/第(\d+)項/)
        const subMatch = articleInfo.match(/第(\d+)号/)

        return [
          itemMatch ? parseInt(itemMatch[1]) : 0,
          subMatch ? parseInt(subMatch[1]) : 0
        ]
      }

      const [aItem, aSubItem] = parseSubSection(a.articleInfo)
      const [bItem, bSubItem] = parseSubSection(b.articleInfo)

      if (aItem !== bItem) return aItem - bItem
      return aSubItem - bSubItem
    })

    return NextResponse.json(
      { risks: sortedRisks },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contract risks fetch error:', error)
    return NextResponse.json(
      { error: 'リスクの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * Create or update risks for a specific contract
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id)
    const body = await request.json()
    const { risks } = body

    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: '無効な契約書IDです' },
        { status: 400 }
      )
    }

    if (!risks || !Array.isArray(risks)) {
      return NextResponse.json(
        { error: 'リスクデータが正しくありません' },
        { status: 400 }
      )
    }

    // 契約書の存在確認
    const contract = await prisma.contract.findUnique({
      where: { id: contractId }
    })

    if (!contract) {
      return NextResponse.json(
        { error: '契約書が見つかりません' },
        { status: 404 }
      )
    }

    // トランザクションで既存のリスクを削除して新しいリスクを作成
    const result = await prisma.$transaction(async (tx) => {
      // 既存のリスクを削除
      await tx.contractRisk.deleteMany({
        where: { contractId: contractId }
      })

      // 新しいリスクを作成
      const createdRisks = await Promise.all(
        risks.map((risk: any) => {
          return tx.contractRisk.create({
            data: {
              contractId: contractId,
              text: risk.text || '',
              type: risk.type || '',
              reason: risk.reason || null,
              articleInfo: risk.articleInfo || null,
              articleTitle: risk.articleTitle || null,
              articleOverview: risk.articleOverview || null,
              specificClause: risk.specificClause || null,
              pageNumber: risk.pageNumber || 1,
              positionStart: risk.position?.start || 0,
              positionEnd: risk.position?.end || 0,
              isSave: true
            }
          })
        })
      )

      // 同一プロジェクト・同一baseNameに紐づく未保存（isSave=false）の古い抽出結果をクリーンアップ
      // 直前に作成した契約の baseName と projectId に基づいて削除
      if (contract.baseName) {
        await tx.contractRisk.deleteMany({
          where: {
            isSave: false,
            contract: {
              projectId: contract.projectId,
              baseName: contract.baseName
            }
          }
        })
      }

      return createdRisks
    })

    return NextResponse.json(
      { message: 'リスクが正常に保存されました', data: result },
      { status: 201 }
    )
  } catch (error) {
    console.error('Contract risks save error:', error)
    return NextResponse.json(
      { error: 'リスクの保存に失敗しました' },
      { status: 500 }
    )
  }
}