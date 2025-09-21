# 契約書管理API ドメイン知識ドキュメント

## 概要
契約書管理APIは、法務デューデリジェンスにおける契約書のライフサイクル全体を管理します。OCRデータと原本PDFのペア管理、リスク情報の紐付け、報告書生成状態の追跡などを実現します。

## 契約書のライフサイクル

### 1. アップロード段階
- 外部アップロードアプリからファイル受信
- OCR処理（GCP Document AI）
- PDF原本とJSONデータのペア保存

### 2. 分析段階
- AI自動リスク抽出
- 手動リスク追加・編集
- リスクの位置情報管理

### 3. 保存段階
- `isSave: true`設定で編集ロック
- 監査証跡の確保
- 変更不可状態での永続化

### 4. 報告書生成段階
- リスクサマリーの作成
- `reportGeneratedAt`タイムスタンプ記録
- エクスポート用データ整形

## 主要API詳細

### `/api/contracts` - 契約書CRUD

#### ビジネスルール
- **一意性**: `projectId` + `fileName`の組み合わせで一意
- **Upsert動作**: 同一ファイル名は更新、新規は作成
- **必須情報**: プロジェクトID、ファイル名

#### データモデル
```typescript
interface Contract {
  id: number;
  projectId: number;
  fileName: string;        // OCRファイル名
  baseName?: string;       // 原本ファイル名
  title?: string;          // 契約書タイトル
  party?: string;          // 契約当事者（JSON形式）
  startDate?: Date;        // 契約開始日
  endDate?: Date;          // 契約終了日
  isSave: boolean;         // 保存状態フラグ
  reportGeneratedAt?: Date; // 報告書生成日時
}
```

### `/api/contracts/[id]/risks` - リスク管理

#### リスク保存戦略
- **全置換方式**: 既存リスクを全削除後、新規作成
- **トランザクション保証**: 原子性を確保
- **理由**: 部分更新の複雑性を回避、整合性重視

#### リスクデータ構造
```typescript
interface ContractRisk {
  id: number;
  contractId: number;
  text: string;            // リスク該当テキスト
  type: string;            // リスクタイプ
  reason: string;          // リスク理由
  articleInfo?: string;    // 条文番号
  articleTitle?: string;   // 条文タイトル
  articleOverview?: string; // 条文概要
  specificClause?: string; // 該当条項
  pageNumber?: number;     // ページ番号
  positionStart?: number;  // 開始位置
  positionEnd?: number;    // 終了位置
}
```

### `/api/contracts/report-generated` - 報告書生成管理

#### 使用シナリオ
1. ユーザーが報告書生成ボタンをクリック
2. 選択された契約書群のIDを送信
3. 一括でタイムスタンプ更新
4. UIで生成済みステータス表示

#### 実装詳細
```typescript
// 一括更新の実装
await prisma.contract.updateMany({
  where: { id: { in: contractIds } },
  data: { reportGeneratedAt: new Date() }
});
```

## 編集制限メカニズム

### `isSave`フラグの役割
- **true設定後**: 一切の編集操作を禁止
- **対象制限**:
  - AI再抽出不可
  - リスク削除不可
  - テキスト編集不可
  - メタデータ変更不可

### 実装方法
```typescript
// APIレベルでの制限
if (contract.isSave) {
  return res.status(403).json({ 
    error: "保存済み契約書は編集できません" 
  });
}

// UIレベルでの制限
disableAiExtraction = contract.isSave;
```

## データ整合性保証

### トランザクション処理
- 契約書削除時：関連リスクも同時削除
- リスク保存時：全削除→全作成を原子的実行
- プロジェクト削除時：契約書カスケード削除

### 外部キー制約
```sql
-- Prismaスキーマでの定義
ContractRisk.contractId -> Contract.id (CASCADE DELETE)
Contract.projectId -> Project.id (CASCADE DELETE)
```

## パフォーマンス考慮

### N+1問題の回避
```typescript
// includeによる関連データの事前取得
const contracts = await prisma.contract.findMany({
  include: {
    project: true,
    contractRisks: true,
    _count: { select: { contractRisks: true } }
  }
});
```

### インデックス戦略
- `projectId`と`fileName`の複合インデックス
- `contractId`のインデックス（リスク検索用）

## ビジネス価値

### コンプライアンス対応
- 編集履歴の完全性保証
- 監査証跡の確保
- データ改ざん防止

### 効率化
- 一括処理による作業時間短縮
- 自動化による人的ミス削減
- 標準化されたデータ管理

## エラーハンドリング

### 400 Bad Request
- 必須パラメータ不足
- データ型不正
- ビジネスルール違反

### 403 Forbidden
- 保存済み契約書への編集試行
- 権限外のアクセス

### 404 Not Found
- 存在しない契約書ID
- 削除済みリソースへのアクセス

### 409 Conflict
- 同一ファイル名での重複作成試行
- 同時編集による競合

## セキュリティ考慮事項

### アクセス制御
- プロジェクトメンバーのみアクセス可能
- ワークスペース境界の厳格な管理

### データ保護
- 契約書内容の暗号化（検討中）
- アクセスログの記録
- 定期的なバックアップ

## 今後の拡張可能性

### 機能追加案
- バージョン管理機能
- 差分比較機能
- コメント・注釈機能
- ワークフロー管理

### インテグレーション
- 外部契約管理システムとの連携
- 電子署名サービス統合
- 文書管理システム連携