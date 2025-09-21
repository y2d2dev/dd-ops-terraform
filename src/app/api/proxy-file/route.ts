import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * ファイルプロキシAPI - CORSエラーを回避してファイルを取得
 */
async function handleProxyRequest(request: NextRequest) {
  try {
    let fileUrl = request.nextUrl.searchParams.get('url')

    // POSTリクエストの場合、bodyからURLを取得
    if (request.method === 'POST') {
      try {
        const body = await request.json()
        fileUrl = body.url
      } catch (e) {
        // bodyのパースに失敗した場合は、クエリパラメータを使用
      }
    }

    console.log('proxy-file called with:', {
      method: request.method,
      url: fileUrl,
      referer: request.headers.get('referer'),
      timestamp: new Date().toISOString()
    })
    
    // スタックトレースを出力
    console.trace('proxy-file call stack')

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    // ファイルサーバーからファイルを取得
    const response = await fetch(fileUrl, {
      headers: {
        'User-Agent': 'dd-ops-proxy/1.0.0'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    if (contentType.includes('text/html')) {
      const text = await response.text()
      console.warn('URLが無効または期限切れの可能性あり。返却HTML:', text.slice(0, 200))
    
      return NextResponse.json(
        { error: 'URLが無効または期限切れです。', detail: text },
        { status: 400 }
      )
    }
    
    const data = await response.arrayBuffer()

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // 1時間キャッシュ
      }
    })

  } catch (error) {
    console.error('Proxy file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return handleProxyRequest(request)
}

export async function POST(request: NextRequest) {
  return handleProxyRequest(request)
}