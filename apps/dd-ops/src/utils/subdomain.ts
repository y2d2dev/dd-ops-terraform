/**
 * サブドメイン関連のユーティリティ関数
 */

/**
 * Check if current subdomain is y2d2
 * @param hostname - The hostname to check
 * @returns true if the subdomain is y2d2
 */
export function isY2d2Subdomain(hostname: string): boolean {
  // ポート番号を除去
  const hostnameWithoutPort = hostname.split(':')[0]
  
  // 開発環境でのy2d2.localhost対応
  if (hostnameWithoutPort === 'y2d2.localhost') {
    return true
  }
  
  // localhost単体や127.0.0.1は除外
  if (hostnameWithoutPort === 'localhost' || hostnameWithoutPort.startsWith('127.0.0.1')) {
    return false
  }
  
  // y2d2.example.comのようなサブドメインをチェック
  return hostnameWithoutPort.startsWith('y2d2.')
}

/**
 * Get subdomain from hostname
 * @param hostname - The hostname to extract subdomain from
 * @returns The subdomain part or null if no subdomain
 */
export function getSubdomain(hostname: string): string | null {
  const parts = hostname.split('.')
  if (parts.length < 2) return null
  
  // localhostは除外
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
    return null
  }
  
  return parts[0]
}