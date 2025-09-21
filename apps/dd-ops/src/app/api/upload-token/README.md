# 外部連携API - アップロードトークン

## 概要
dd-opsは、ファイルアップロード機能を外部アプリケーションに委譲し、JWTトークンによる安全な連携を実現しています。

## `/api/upload-token` - JWTトークン生成

### ビジネス価値
- **責任分離**: アップロード処理の専門化
- **セキュリティ**: 短期間有効なトークンによる認証
- **スケーラビリティ**: マイクロサービス化の基盤

### トークン構造
```typescript
interface UploadToken {
  projectId: number;      // 対象プロジェクト
  workspaceId: number;    // 所属ワークスペース
  iat: number;           // 発行時刻
  exp: number;           // 有効期限（30分後）
}
```

### 利用フロー
1. ユーザーが「ファイルアップロード」をクリック
2. dd-opsがトークンを生成
3. `${UPLOAD_APP_URL}/upload?token=xxx`にリダイレクト
4. Upload Appがトークンを検証
5. 検証成功でアップロード画面表示

### セキュリティ設計
- **署名アルゴリズム**: HS256
- **共有シークレット**: JWT_SECRET環境変数
- **有効期限**: 30分（ワンタイム利用想定）

## 環境設定
```bash
NEXT_PUBLIC_UPLOAD_APP_URL=http://localhost:3001
JWT_SECRET=shared-secret-key
```