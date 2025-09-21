import { NextResponse } from 'next/server'
import logger from '@/lib/logger'

/**
 * Health check endpoint for basic service status
 * 
 * @returns Response with basic service status
 */
export async function GET() {
  // ビルド時のエラーを避けるため、基本的なヘルスチェックのみ実装
  logger.debug({ route: '/api/health' }, 'Health check')
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'dd-ops',
    version: process.env.npm_package_version || '0.1.0'
  })
}