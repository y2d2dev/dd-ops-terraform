interface FileItem {
  name: string
  publicUrl: string
  uploadedAt: string
}

interface GroupedFile {
  baseName: string
  pdfFile?: FileItem
  jsonFile?: FileItem
  isCompleted: boolean
  isSplitContract?: boolean  // 分割された契約書かどうか
  originalBaseName?: string  // 分割元のbaseName（分割された契約書の場合）
}

/**
 * Check if filename represents a split contract
 * Pattern: {basename}-{number}.json-{number}.json (actual pattern from API)
 * @param filename - Full filename
 * @returns True if filename matches split contract pattern
 */
export function isSplitContractFile(filename: string): boolean {
  // 実際のパターンに合わせて修正: basename-1.json-1.json のような形式
  const splitPattern = /-\d+\.json-\d+\.json$/i
  return splitPattern.test(filename)
}

/**
 * Extract original base name from split contract filename
 * @param filename - Split contract filename (e.g., "みずほ銀行_平成29年6月6日借入-1.json-1.json")
 * @returns Original base name (e.g., "みずほ銀行_平成29年6月6日借入")
 */
export function extractOriginalBaseName(filename: string): string {
  if (isSplitContractFile(filename)) {
    // -数字.json-数字.json の部分を削除して元のbaseNameを取得
    const match = filename.match(/^(.+)-\d+\.json-\d+\.json$/i)
    return match ? match[1] : filename
  }
  return filename.replace(/\.(pdf|json)$/i, '')
}

/**
 * Extract base name from filename
 * @param filename - Full filename
 * @returns Base name before the first dash or extension
 */
export function extractBaseName(filename: string): string {
  // 分割された契約書の場合は、ファイル名全体（拡張子なし）をbaseNameとする
  if (isSplitContractFile(filename)) {
    return filename // 拡張子も含めてbaseNameとする（一意性のため）
  }

  // 通常のファイルの場合は既存ロジック
  const nameWithoutExt = filename.replace(/\.(pdf|json)$/i, '')
  const lastDashIndex = nameWithoutExt.lastIndexOf('-')
  if (lastDashIndex !== -1) {
    return nameWithoutExt.substring(0, lastDashIndex)
  }

  return nameWithoutExt
}

/**
 * Check if file should be excluded from display
 * @param filename - File name to check
 * @returns True if file should be excluded
 */
function shouldExcludeFile(filename: string): boolean {
  // plain_text.txt または _titles を含むファイルは除外
  return filename.includes('_plain_text.txt') || filename.includes('_titles')
}

/**
 * Group files by base name (extracted from filename)
 * @param files - Array of file items
 * @returns Array of grouped files with split contract filtering
 */
export function groupFilesByBaseName(files: FileItem[]): GroupedFile[] {
  // plain_text.txtやtitlesを含むファイルを除外
  const filteredFiles = files.filter(file => !shouldExcludeFile(file.name))
  
  const grouped: { [key: string]: { pdfFile?: FileItem; jsonFile?: FileItem; isSplitContract?: boolean; originalBaseName?: string } } = {}

  // 分割された契約書の元ファイル名を特定
  const splitContractOriginalBaseNames = new Set<string>()
  filteredFiles.forEach(file => {
    if (isSplitContractFile(file.name)) {
      const originalBaseName = extractOriginalBaseName(file.name)
      splitContractOriginalBaseNames.add(originalBaseName)
    }
  })

  // 元PDFファイルのマッピングを作成
  const originalPdfFiles = new Map<string, FileItem>()
  filteredFiles.forEach(file => {
    if (file.name.toLowerCase().endsWith('.pdf') && !isSplitContractFile(file.name)) {
      const baseName = extractBaseName(file.name)
      originalPdfFiles.set(baseName, file)
    }
  })

  filteredFiles.forEach(file => {
    const baseName = extractBaseName(file.name)
    const isSplit = isSplitContractFile(file.name)
    const originalBaseName = isSplit ? extractOriginalBaseName(file.name) : undefined

    if (!grouped[baseName]) {
      grouped[baseName] = {
        isSplitContract: isSplit,
        originalBaseName: originalBaseName
      }
    }

    if (file.name.toLowerCase().endsWith('.pdf')) {
      grouped[baseName].pdfFile = file
    } else if (file.name.toLowerCase().endsWith('.json')) {
      grouped[baseName].jsonFile = file
    }
  })

  // 分割された契約書がある場合、元のファイルを除外
  const filteredGrouped = Object.entries(grouped).filter(([baseName, files]) => {
    // 分割された契約書がある場合、その元ファイルは表示しない
    if (splitContractOriginalBaseNames.has(baseName)) {
      return false
    }
    return true
  })

  return filteredGrouped.map(([baseName, files]) => {
    let pdfFile = files.pdfFile
    
    // 分割された契約書の場合、対応する元PDFファイルを使用
    if (files.isSplitContract && files.originalBaseName) {
      const originalPdf = originalPdfFiles.get(files.originalBaseName)
      if (originalPdf) {
        pdfFile = originalPdf
      }
    }

    return {
      baseName,
      pdfFile: pdfFile,
      jsonFile: files.jsonFile,
      isCompleted: !!(pdfFile && files.jsonFile),
      isSplitContract: files.isSplitContract,
      originalBaseName: files.originalBaseName
    }
  })
}