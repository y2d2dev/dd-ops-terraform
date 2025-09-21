import { NextRequest } from 'next/server';

/**
 * Get client IP address from request headers
 * Checks various headers in order of precedence for accurate IP detection
 * @param request - NextRequest object
 * @returns Client IP address as string
 */
export function getClientIP(request: NextRequest): string {
  // ヘッダーから順番にIPアドレスを取得を試行
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-forには複数のIPが含まれる可能性があるため、最初のIPを取得
    const ip = forwarded.split(',')[0].trim();
    // ローカルIPでない場合は実際のクライアントIP
    if (!isLocalIP(ip)) {
      return ip;
    }
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP && !isLocalIP(realIP)) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP && !isLocalIP(cfConnectingIP)) {
    return cfConnectingIP;
  }

  // 追加のヘッダーをチェック
  const clientIP = request.headers.get('x-client-ip');
  if (clientIP && !isLocalIP(clientIP)) {
    return clientIP;
  }

  const trueClientIP = request.headers.get('true-client-ip');
  if (trueClientIP && !isLocalIP(trueClientIP)) {
    return trueClientIP;
  }

  // フォールバック: リモートアドレス
  return request.ip || '127.0.0.1';
}

/**
 * Check if IP address is a local/private IP
 * ローカル・プライベートIPかどうかをチェック
 * @param ip - IP address to check
 * @returns true if local IP, false otherwise
 */
function isLocalIP(ip: string): boolean {
  if (!ip) return true;
  
  // IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return true;
  
  // IPv4 private ranges
  const privateRanges = [
    /^127\./, // 127.0.0.0/8 (localhost)
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./ // 192.168.0.0/16
  ];
  
  return privateRanges.some(range => range.test(ip));
}

/**
 * Check if client IP is in allowed IP list
 * @param clientIP - Client IP address
 * @param allowedIPs - Array of allowed IP addresses
 * @returns true if IP is allowed, false otherwise
 */
export function isIPAllowed(clientIP: string, allowedIPs: string[]): boolean {
  if (!allowedIPs || allowedIPs.length === 0) {
    // 許可IPリストが空の場合は全てのIPを許可
    return true;
  }

  const trimmedClientIP = clientIP.trim()
  return allowedIPs.some(allowedIP => allowedIP.trim() === trimmedClientIP);
}