# 作っているもの
- 法務デューデリジェンスをAIを用いて効率化するアプリを作成しています
- ファイルをアップロードすると、そのファイルがOCRされてGCPに保存されます
- このアプリでは、そのOCRされたJSONと元ODFファイルを見比べながら、GeminiのFuctionClallingを用いて、リスクを抽出します

## プロジェクトルール
- **ドキュメント**（JSDocやDocstring）は**英語**で書く
- **コード内のコメント**（説明や背景）は**日本語**で書く
- 日本語を書く際は不要なスペースを含めない
  - ◯ "Claude Code入門"
  - × "Claude Code 入門"

## 開発方針
- TypeScriptプロジェクトです
- スタイルはStyledComponets、デザインコンポーネントはantdを使用してください
- あなたが書いたコードについて、そのディレクトリに構成やっていることを日本語でドキュメントとして随時残してください
- pnpm を使用してください
- フロント実装の際は、スクロールは全てoverflow: hiden でscrool をしているようにしてください。
- useEffectはなるべく使わない。データ取得はSWRを使用するか、必要最小限に留める

## 各機能の仕様

### リスク編集・保存仕様
- **一度DBに保存したリスクは編集不可**
  - DBに保存（`isSave: true`）した契約書のリスクは以下の制限がかかる：
    - AI再抽出不可
    - リスク削除不可
    - テキスト編集不可
    - 再保存不可
  - 保存済みの契約書を開く場合は `disableAiExtraction=true` パラメータが付与される
  - DBに保存後は3秒後に自動的にプロジェクト詳細ページに戻る

### アップロードトークン連携
外部アップロードアプリとの連携にJWTトークンを使用しています。

#### 仕様
- **トークン生成API**: `/api/upload-token`
  - プロジェクトIDとワークスペースIDを受け取りJWTトークンを生成
  - 有効期限: 30分
  - 必要パラメータ: `projectId`, `workspaceId`
  - レスポンス: `{ token, projectId, workspaceId, expiresAt }`

- **トークン検証API**: `/api/verify-token`（外部アプリ側に実装）
  - 外部アプリでトークン検証を処理
  - JWTトークンの署名と有効期限を検証
  - 必要パラメータ: `token`
  - レスポンス: `{ valid, projectId, workspaceId, expiresAt }`

#### 外部アプリとの連携フロー
1. プロジェクト詳細ページで「ファイルアップロード」または「編集」ボタンクリック
2. dd-opsアプリが`/api/upload-token`でJWTトークンを生成
3. `${NEXT_PUBLIC_UPLOAD_APP_URL}/upload?token=...`に遷移
4. 外部アプリが`useUploadToken`フックでトークンを取得
5. 外部アプリが自身の`/api/verify-token`でトークンを検証
6. 検証成功時、外部アプリでファイルアップロード機能を利用可能

#### 重要な注意事項
- 両アプリで同じ`JWT_SECRET`を使用する必要があります
- トークン検証APIは外部アプリ側に実装されています（CORSエラー回避のため）
- dd-opsアプリはトークン生成のみ、外部アプリはトークン検証を担当

#### 環境変数
- `NEXT_PUBLIC_UPLOAD_APP_URL`: 外部アップロードアプリのベースURL（デフォルト: http://localhost:3001）
- `JWT_SECRET`: JWTトークンの署名に使用する秘密鍵

## マイグレーション実行ルール

### 本番環境（Dockerfile）
Dockerfileでは自動的にマイグレーションが実行されます：
```bash
# DATABASE MIGRATION START
pnpm prisma migrate deploy || {
  echo "Migration failed with pnpm, trying npx..."
  npx prisma migrate deploy
}
# DATABASE MIGRATION END
```

### ローカル開発環境
マイグレーションファイルを作成する場合：
```bash
# マイグレーションファイルの作成（実行はしない）
npx prisma migrate dev --name <マイグレーション名> --create-only

# マイグレーションファイルを編集後、実行
npx prisma migrate dev
```

## データベース変更履歴

### 2024年 報告書作成日時の追加
- **変更日**: 2024年（実装日）
- **表**: Contract
- **追加カラム**: `reportGeneratedAt` (DateTime?)
- **目的**: 報告書が作成された日時を記録し、ステータス表示に使用
- **マイグレーション**: 
  ```bash
  pnpm prisma migrate dev --name add_report_generated_at_to_contract
  ```


### 2025年7月22日 Contract 表のpromisor/promisee削除
- **変更日**: 2025年7月22日
- **表**: Contract
- **削除カラム**: `promisor` (Text?), `promisee` (Text?)
- **理由**: partyカラムに統合済みのため不要なカラムを削除
- **マイグレーション**: 
  ```bash
  npx prisma migrate dev --name remove_promisor_promisee_from_contract
  ```

  npx prisma studio --port 5556