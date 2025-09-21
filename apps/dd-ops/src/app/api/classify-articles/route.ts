import { NextRequest, NextResponse } from 'next/server'
import { classifyArticleWithGemini, ArticleClassificationRequest, classifyMultipleArticlesWithGemini } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'

export interface Article {
  article_number: string
  title: string
  content: string
}

export interface ClassifyArticlesRequest {
  articles: Article[]
  targetCompany: string
  projectId?: number
}

/**
 * 条文ごとにリスク分類を行うAPI
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ClassifyArticlesRequest

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

    // ワークスペースのリスクを取得（デフォルト + ワークスペース固有）
    const risks = await prisma.risk.findMany({
      where: {
        OR: [
          { workspaceId: null }, // デフォルトリスク
          { workspaceId: workspaceId } // ワークスペース固有リスク
        ]
      },
      orderBy: [
        { workspaceId: 'asc' }, // nullが先（デフォルト）
        { id: 'asc' }
      ]
    })

    // 一括処理で全ての条文を処理
    const articleRequests: ArticleClassificationRequest[] = body.articles.map(article => ({
      prompt: '',
      articleNumber: article.article_number,
      articleTitle: article.title,
      articleContent: article.content,
      currentPage: 1,
      risks: risks,
      targetCompany: body.targetCompany
    }))

    // 一括処理関数を呼び出し
    logger.info({ endpoint: 'classify-articles', articlesCount: body.articles.length, risksCount: risks.length, projectId: body.projectId }, 'Calling classifyMultipleArticlesWithGemini')
    const startedAt = Date.now()
    const allClassifications = await classifyMultipleArticlesWithGemini(
      articleRequests,
      workspaceId || undefined
    )
    logger.info({ endpoint: 'classify-articles', durationMs: Date.now() - startedAt, outputCount: allClassifications.length }, 'classifyMultipleArticlesWithGemini finished')

    return NextResponse.json({
      success: true,
      classifications: allClassifications,
      processedArticles: body.articles.length
    })

  } catch (error) {
    console.error('Articles classification error:', error)
    return NextResponse.json(
      {
        error: 'Classification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}