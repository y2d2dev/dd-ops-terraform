import { NextRequest, NextResponse } from 'next/server'
import { classifyWithGemini, ClassificationRequest } from '@/lib/gemini'
import logger from '@/lib/logger'

/**
 * Gemini FunctionCallingを使用したリスク分類API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ClassificationRequest

    if (!body.documentContent || !body.prompt) {
      return NextResponse.json(
        { error: 'documentContent and prompt are required' },
        { status: 400 }
      )
    }

    // Gemini FunctionCallingでリスク抽出
    logger.info({ endpoint: 'classify', hasPrompt: !!body.prompt }, 'Calling classifyWithGemini')
    const startedAt = Date.now()
    const classifications = await classifyWithGemini(body)
    logger.info({ endpoint: 'classify', durationMs: Date.now() - startedAt, outputCount: classifications.length }, 'classifyWithGemini finished')

    return NextResponse.json({
      success: true,
      classifications
    })

  } catch (error) {
    console.error('Classification error:', error)
    return NextResponse.json(
      {
        error: 'Classification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}