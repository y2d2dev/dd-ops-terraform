import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import logger from '@/lib/logger'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!)

/**
 * Extract article information from selected text using Gemini
 */
export async function POST(request: NextRequest) {
  try {
    const startedAt = Date.now()
    const invocationId = `gemini-${startedAt}-${Math.random().toString(36).slice(2, 8)}`
    const body = await request.json()
    const { selectedText, currentArticle, previousArticle, text } = body

    // 後方互換性のため、古い形式（text）もサポート
    if (text && !selectedText) {
      // 古い形式の処理
      const targetText = text
      if (!targetText || typeof targetText !== 'string') {
        return NextResponse.json(
          { error: 'テキストが提供されていません' },
          { status: 400 }
        )
      }
      // 簡単な正規表現による抽出
      const directPattern = /第\d+条(?:第\d+[項号])?(?:第\d+[号])?/
      const match = targetText.match(directPattern)
      return NextResponse.json(
        { articleInfo: match ? match[0] : '' },
        { status: 200 }
      )
    }

    if (!selectedText || !currentArticle) {
      return NextResponse.json(
        { error: '選択テキストまたは条文情報が提供されていません' },
        { status: 400 }
      )
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 100,
      }
    })

    const prompt = `
あなたは契約書の条文解析の専門家です。以下の情報を元に、選択されたテキストの具体的な条文番号（第○条第○項第○号）を特定してください。

条文情報:
- 条文番号: ${currentArticle.number}
- 条文タイトル: ${currentArticle.title}
- 条文内容: ${currentArticle.content}

${previousArticle ? `
前の条文（参考）:
- 条文番号: ${previousArticle.number}
- 条文タイトル: ${previousArticle.title}
- 条文内容: ${previousArticle.content.substring(0, 500)}...
` : ''}

選択されたテキスト:
${selectedText}

抽出ルール:
1. 選択されたテキストがある${currentArticle.number}内の具体的な項・号を特定する
2. 項や号がない場合は条のみを返す
3. 条文番号のみを返す（説明文は含めない）

この選択テキストの正確な条文番号を回答してください:`

    logger.info({
      invocationId,
      func: 'extractArticleInfo',
      model: 'gemini-1.5-flash',
      selectedTextLength: selectedText.length,
      currentArticle: currentArticle.number,
      previousArticle: previousArticle?.number || null
    }, 'Gemini call start')

    // まず選択テキスト自体に条文番号があるかチェック
    const directPattern = /第\d+条(?:第\d+[項号])?(?:第\d+[号])?/g
    const directMatches = selectedText.match(directPattern)
    if (directMatches && directMatches.length > 0) {
      logger.info({
        invocationId,
        durationMs: Date.now() - startedAt,
        extractedInfo: directMatches[0],
        method: 'direct_pattern_match'
      }, 'Article info extraction success')
      return NextResponse.json(
        { articleInfo: directMatches[0] },
        { status: 200 }
      )
    }

    // 直接抽出で見つからない場合はGeminiに依頼
    const result = await model.generateContent(prompt)
    const response = await result.response
    const articleInfo = response.text().trim()

    // Geminiの回答から条文番号を抽出
    const articlePattern = /第\d+条(?:第\d+[項号])?(?:第\d+[号])?/
    const match = articleInfo.match(articlePattern)
    const extractedInfo = match ? match[0] : ''

    logger.info({
      invocationId,
      durationMs: Date.now() - startedAt,
      extractedInfo: extractedInfo,
      geminiResponse: articleInfo,
      method: 'gemini_extraction'
    }, 'Article info extraction success')

    return NextResponse.json(
      { articleInfo: extractedInfo },
      { status: 200 }
    )
  } catch (error) {
    logger.error({ error }, 'Article info extraction error')
    return NextResponse.json(
      { error: '条文番号の抽出に失敗しました', articleInfo: '' },
      { status: 500 }
    )
  }
}