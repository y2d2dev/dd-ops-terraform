# プロジェクト詳細ページ

## 概要
プロジェクト詳細ページは、法務DD案件の中央管理ハブとして機能します。契約書の状態管理、リスク抽出進捗の可視化、報告書生成までの一連のワークフローを提供します。

## ページ構成

### プロジェクトヘッダー
- プロジェクト名・対象会社名の表示
- 案件概要・作成日時の確認
- プロジェクト削除機能

### 契約書管理セクション
- **ファイルアップロード**: 外部アプリとのJWT連携
- **契約書一覧**: 処理状態の可視化
- **一括操作**: 報告書生成用の選択

## 契約書ステータス管理

### ステータス定義
```typescript
enum ContractStatus {
  UNPROCESSED = "未着手",      // JSONファイルなし
  PROCESSING = "処理中",       // PDFのみ存在
  COMPLETED = "完了",         // PDF+JSON存在
  REPORT_GENERATED = "報告書作成済み"  // reportGeneratedAt != null
}
```

### ステータス判定ロジック
```typescript
const getContractStatus = (file: File, contract?: Contract): ContractStatus => {
  if (contract?.reportGeneratedAt) return ContractStatus.REPORT_GENERATED;
  if (file.isPdf && file.hasJsonPair) return ContractStatus.COMPLETED;
  if (file.isPdf && !file.hasJsonPair) return ContractStatus.PROCESSING;
  return ContractStatus.UNPROCESSED;
};
```

## ファイルとコントラクトのマッピング

### マッピングアルゴリズム
```typescript
// PDFファイル名をキーとした契約書検索
const contractMap = contracts.reduce((acc, contract) => {
  const pdfName = contract.baseName || 
    contract.fileName.replace('.json', '.pdf');
  acc[pdfName] = contract;
  return acc;
}, {});
```

### データ整合性チェック
- JSONファイルからの`targetCompany`抽出
- プロジェクトの`targetCompany`との照合
- 不一致時の警告表示

## 外部連携フロー

### アップロードフロー
1. ユーザーがファイルアップロードをクリック
2. JWTトークン生成要求
3. 外部アプリへリダイレクト
4. ファイル処理完了後、自動同期

### 編集フロー
```typescript
const handleEdit = async (contract: Contract) => {
  const params = new URLSearchParams({
    fileName: contract.fileName,
    projectId: projectId.toString(),
    disableAiExtraction: contract.isSave.toString()
  });
  router.push(`/edit?${params}`);
};
```

## 報告書生成機能

### 生成条件
1. 1つ以上の契約書が「完了」状態
2. ユーザーによる明示的な選択
3. 選択された契約書のリスクが存在

### 生成プロセス
```typescript
const handleReportGeneration = async (selectedContracts: number[]) => {
  // 1. タイムスタンプ更新
  await updateReportGeneratedAt(selectedContracts);
  
  // 2. レポート生成処理（将来実装）
  const report = await generateReport({
    contractIds: selectedContracts,
    projectId,
    format: 'pdf'
  });
  
  // 3. ダウンロード処理
  downloadReport(report);
};
```

## 主要コンポーネント

### `/components/ContractList.tsx`
- プロジェクト内の契約書とファイルの統合表示
- ファイルと契約書のマッピング（PDFファイル名ベース）
- ステータス表示・一括選択機能・警告表示

### `/components/ProjectHeader.tsx`
- プロジェクト基本情報の表示
- アクションボタン配置（アップロード・報告書生成・削除）

### `/components/ReportModal.tsx`
- 報告書生成の確認・設定ダイアログ
- 選択された契約書の確認
- 生成オプション設定（将来実装）

## エラーハンドリング

### データ取得エラー
```typescript
if (projectError || contractsError) {
  return <Alert type="error" message="データの取得に失敗しました" />;
}
```

### 権限エラー
- 404: プロジェクトが存在しない
- 403: アクセス権限がない

## パフォーマンス最適化

### SWRキャッシング
- 頻繁にアクセスされるプロジェクトデータ
- 契約書一覧の効率的取得

### 遅延ローディング
- 大量の契約書リスト表示
- 画像・PDFプレビューの段階的読み込み