# リスク抽出の事前処理実装

## 概要

プロジェクトページ（`/project/[id]`）でのリスク抽出処理を事前に非同期実行し、編集ページ（`/edit`）でのパフォーマンスを向上させる機能を実装しました。

## 実装内容

### 1. カスタムフック: `useRiskExtractionCache`

**ファイル**: `src/hooks/useRiskExtractionCache.ts`

**機能**:
- p-queueを使用した並列処理制御（同時実行数: 3件）
- sessionStorageによるキャッシュ機能（24時間有効）
- エラーハンドリングと再試行機能
- バックグラウンド処理による非同期リスク抽出

**主要な特徴**:
```typescript
// 同時実行制御
const queue = new PQueue({ 
  concurrency: 3,
  interval: 1000,
  intervalCap: 3
})

// sessionStorageキャッシュ
const cacheKey = `risk_extraction_cache_${projectId}`
sessionStorage.setItem(cacheKey, JSON.stringify(cacheData))
```

### 2. プロジェクトページの統合

**ファイル**: `src/app/project/[id]/page.tsx`

**変更点**:
- `useRiskExtractionCache`フックの統合
- 自動的なバックグラウンド処理の開始
- 未処理契約書の検出と処理

**統合コード**:
```typescript
const {
  processingState,
  getCachedResult,
  retryFailedContracts,
  totalCachedCount,
  hasFailedContracts
} = useRiskExtractionCache(
  projectId,
  project?.workspace.id || 0,
  contractsData?.data || [],
  groupedFiles,
  project?.targetCompany
)
```

### 3. 編集ページの最適化

**ファイル**: `src/app/edit/page.tsx`

**変更点**:
- sessionStorageからのキャッシュデータ読み込み機能
- キャッシュ優先のロジック実装
- リアルタイム処理のフォールバック

**キャッシュ取得ロジック**:
```typescript
const getCachedRiskData = useCallback(() => {
  if (!contractId || typeof window === 'undefined') return null
  
  const cacheKey = `risk_extraction_cache_${projectId}`
  const savedCache = sessionStorage.getItem(cacheKey)
  
  if (savedCache) {
    try {
      const parsedCache = JSON.parse(savedCache)
      const contractIdNum = parseInt(contractId)
      const cacheData = parsedCache[contractIdNum.toString()]
      
      if (cacheData && cacheData.result.success) {
        return cacheData.result.classifications || []
      }
    } catch (error) {
      console.warn('Failed to read cache:', error)
    }
  }
  
  return null
}, [contractId, projectId])
```

## 処理フロー

### プロジェクトページでの事前処理

1. **初期化**: プロジェクトページロード時にフックが初期化
2. **対象検出**: 未処理の契約書を自動検出
3. **OCRデータ取得**: 各契約書のJSONファイルからarticlesを取得
4. **API呼び出し**: `/api/classify-full-context`でリスク抽出実行
5. **キャッシュ保存**: 結果をメモリとsessionStorageに保存

### 編集ページでの最適化処理

1. **キャッシュ確認**: contractIdに基づくキャッシュデータの確認
2. **優先使用**: キャッシュがあればそれを即座に表示
3. **フォールバック**: キャッシュがない場合のみリアルタイム処理実行

## 技術仕様

### キュー制御
- **同時実行数**: 3件
- **間隔制御**: 1秒間に最大3リクエスト
- **エラーハンドリング**: 失敗した契約書をマークして再試行可能

### キャッシュ管理
- **保存先**: sessionStorage (メモリ + ブラウザストレージ)
- **キー形式**: `risk_extraction_cache_${projectId}`
- **有効期限**: 24時間
- **データ形式**: `{ [contractId]: { result, timestamp, contractId } }`

### API使用
- **エンドポイント**: `/api/classify-full-context`
- **レート制限**: p-queueによる制御
- **パラメータ**: articles, targetCompany, projectId

## パフォーマンス改善

### Before (従来)
- 編集ページ表示時にリアルタイムでAPI呼び出し
- 処理時間: 5-10秒程度
- ユーザー待機時間: 長い

### After (改善後)
- プロジェクトページでバックグラウンド事前処理
- 編集ページ表示時間: 即座（キャッシュ使用時）
- ユーザー体験: 大幅改善

## エラーハンドリング

### 処理失敗時
- 失敗した契約書IDを記録
- 再試行機能の提供
- エラーログの出力

### キャッシュ破損時
- gracefulなフォールバック
- リアルタイム処理への自動切り替え
- コンソール警告の出力

## 今後の拡張可能性

1. **進行状況表示**: UI上での処理状況表示
2. **手動制御**: ユーザーによる処理開始/停止
3. **キャッシュ管理**: 古いキャッシュの自動削除
4. **統計情報**: 処理成功率や平均時間の表示

## 注意事項

- ページリロード時は再度バックグラウンド処理が実行される
- 大量の契約書がある場合はAPI呼び出し頻度に注意
- キャッシュサイズがブラウザの制限を超える可能性を考慮