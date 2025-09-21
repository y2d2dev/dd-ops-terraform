import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

// Force Node.js runtime for JWT compatibility
export const runtime = 'nodejs'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

/**
 * Generate upload token for external upload app
 * @param request - NextRequest with projectId and workspaceId
 * @returns JWT token with project and workspace information
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, workspaceId } = await request.json()
    
    if (!projectId || !workspaceId) {
      return NextResponse.json(
        { error: 'projectId and workspaceId are required' },
        { status: 400 }
      )
    }

    // JWTトークンを生成（30分の有効期限）
    const tokenData = {
      projectId: projectId,
      workspaceId: workspaceId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 60), // 30分後に期限切れ
    }

    const token = jwt.sign(tokenData, JWT_SECRET)
    
    return NextResponse.json({ 
      token,
      projectId,
      workspaceId,
      expiresAt: tokenData.exp
    })
  } catch (error) {
    console.error('Token generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload token' },
      { status: 500 }
    )
  }
}