// 分類データの型定義
export interface Classification {
  id: string
  text: string
  type: string
  reason: string
  pageNumber: number
  position: { start: number; end: number }
  articleInfo?: string
  articleTitle?: string
  articleOverview?: string
  specificClause?: string
}

// OCRデータの型定義
export interface Article {
  article_number?: string
  table_number?: string
  title: string
  content: string
}

export interface ContractInfo {
  title: string
  party: string
  start_date: string | null
  end_date: string | null
  conclusion_date: string | null
}

export interface ContractParseResult {
  articles: Article[]
}

export interface OcrData {
  success: boolean
  info?: ContractInfo
  result: ContractParseResult
  original_result?: {
    success: boolean
    data: {
      pages_result: Array<{
        entities: any[]
        model?: string
        document_annotation?: any
        usage_info?: {
          pages_processed: number
          doc_size_bytes: number
        }
      }>
      processingTime?: number
    }
    documentAI?: {
      success: boolean
      plainText?: string
      processingTime?: number
    }
  }
  storage_info?: {
    original_file_path: string
    result_saved_at: string
    result_path: string
    bucket: string
    folder_path: string
    enhancement_version: string
  }
  processing_metadata?: {
    file_name: string
    file_size: number
    segments_processed: number
    segmentation_enabled: boolean
    segmentation_grid: {
      rows: number
      cols: number
    }
    processed_at: string
  }
}

// 分類タイプの定義
export interface RiskType {
  value: string
  label: string
  color: string
}

export const CLASSIFICATION_TYPES: RiskType[] = [
  { value: '1', label: '更新（契約期間に関するものを含む）', color: 'blue' },
  { value: '2', label: '中途解約（期間内解約に関する条項を含む）', color: 'orange' },
  { value: '3', label: '通知・届出・承諾事由（COC条項の有無を含む）', color: 'green' },
  { value: '4', label: '期限の利益喪失', color: 'red' },
  { value: '5', label: '禁止事由', color: 'purple' },
  { value: '6', label: '解除事由（暴排条項を除く）', color: 'volcano' },
  { value: '7', label: '契約が当然に終了する事由', color: 'magenta' },
  { value: '8', label: '損害賠償条項（賠償額の合意・上限条項）', color: 'red' },
  { value: '9', label: '競業避止義務', color: 'cyan' },
  { value: '10', label: '独占的な取引義務', color: 'lime' },
  { value: '11', label: '品質保証条項（表明保証条項を含む）', color: 'gold' },
  { value: '12', label: '第三者の債務を連帯して保証する条項', color: 'geekblue' }
]