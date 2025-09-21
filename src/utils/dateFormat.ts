/**
 * Format date string to Japanese format
 * @param dateString - Date string in ISO format (e.g., "2022-04-20")
 * @returns Formatted date string (e.g., "2022年4月20日")
 */
export function formatDateToJapanese(dateString: string | null | undefined): string {
  if (!dateString) return ''
  
  try {
    // 日付文字列をパース
    const date = new Date(dateString)
    
    // 無効な日付の場合は元の文字列を返す
    if (isNaN(date.getTime())) {
      return dateString
    }
    
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    return `${year}年${month}月${day}日`
  } catch {
    // エラーの場合は元の文字列を返す
    return dateString
  }
}

/**
 * Format date to Japanese format with null check
 * @param date - Date object or string
 * @returns Formatted date string
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  if (typeof date === 'string') {
    return formatDateToJapanese(date)
  }
  
  try {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    return `${year}年${month}月${day}日`
  } catch {
    return ''
  }
}