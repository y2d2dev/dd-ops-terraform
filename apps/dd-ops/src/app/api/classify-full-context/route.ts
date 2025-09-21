import { NextRequest, NextResponse } from 'next/server'
import { classifyFullContractWithGemini } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'

export interface Article {
  article_number: string
  title: string
  content: string
}

export interface ClassifyFullContextRequest {
  articles: Article[]
  targetCompany: string
  projectId?: number
  prompt?: string
  userPrompt?: string
  selectedRiskIds?: number[]
}

/**
 * 契約書全体のコンテキストを見てリスク分類を行うAPI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ClassifyFullContextRequest

    if (!body.articles || !Array.isArray(body.articles) || body.articles.length === 0) {
      return NextResponse.json(
        { error: 'articles array is required' },
        { status: 400 }
      )
    }

    if (!body.targetCompany) {
      return NextResponse.json(
        { error: 'targetCompany is required' },
        { status: 400 }
      )
    }

    // プロジェクトIDからワークスペースIDを取得
    let workspaceId: number | null = null
    if (body.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: body.projectId },
        select: { workspaceId: true }
      })
      workspaceId = project?.workspaceId || null
    }

    // カスタム実行（selectedRiskIds 指定時）はそのID群のみ、
    // それ以外（デフォルト実行）はデフォルトリスク（workspaceId = null）のみ
    let risks
    if (Array.isArray(body.selectedRiskIds) && body.selectedRiskIds.length > 0) {
      const ids = body.selectedRiskIds
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
      risks = await prisma.risk.findMany({
        where: { id: { in: ids } },
        orderBy: { id: 'asc' }
      })
    } else {
      risks = await prisma.risk.findMany({
        where: { workspaceId: null },
        orderBy: { id: 'asc' }
      })
    }

    // 契約書全体のコンテキストでリスク分類を実行
    logger.info({
      endpoint: 'classify-full-context',
      projectId: body.projectId,
      articlesCount: body.articles.length,
      risksCount: risks.length,
      selectedRiskIds: body.selectedRiskIds,
      targetCompany: body.targetCompany
    }, 'Calling classifyFullContractWithGemini')
    const startedAt = Date.now()
    const classifications = await classifyFullContractWithGemini({
      prompt: body.userPrompt || body.prompt || '',
      articles: body.articles,
      currentPage: 1,
      risks: risks,
      targetCompany: body.targetCompany,
      workspaceId: workspaceId || undefined
    })
    logger.info({
      endpoint: 'classify-full-context',
      durationMs: Date.now() - startedAt,
      outputCount: classifications.length
    }, 'classifyFullContractWithGemini finished')

    return NextResponse.json({
      success: true,
      classifications: classifications,
      processedArticles: body.articles.length
    })

  } catch (error) {
    logger.error({ error }, 'Full context classification error')
    return NextResponse.json(
      {
        error: 'Classification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}