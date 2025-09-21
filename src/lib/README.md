# ライブラリ構成ドキュメント

## 概要
DD-OPSプロジェクトの共通ライブラリとユーティリティの構成について説明します。

## ディレクトリ構成

```
src/lib/
├── auth.ts              # 認証関連（パスワードハッシュ化・検証）
├── prisma.ts            # Prismaクライアント設定
└── swr/                 # SWR関連ライブラリ
    └── fetchers.ts      # データ取得用fetcher関数群
```

## 各ライブラリの役割

### `/auth.ts`
パスワード認証関連の機能
- `hashPassword()`: bcryptjsを使ったパスワードハッシュ化
- `verifyPassword()`: パスワード検証

### `/prisma.ts`
Prismaデータベースクライアント
- シングルトンパターンでのPrismaクライアント管理
- 開発環境でのホットリロード対応

### `/swr/fetchers.ts`
SWRで使用する共通fetcher関数群
- `fetcher`: 内部API用の基本fetcher
- `externalFetcher`: 外部API用のenhancedエラーハンドリング
- `fetcherWithHeaders`: カスタムヘッダー対応
- `postFetcher`: POST リクエスト用

## 使用方法

### SWR fetchers
```typescript
import useSWR from 'swr'
import { fetcher, externalFetcher } from '@/lib/swr/fetchers'

// 内部API
const { data, error, isLoading } = useSWR('/api/projects', fetcher)

// 外部API
const { data } = useSWR('https://external-api.com/data', externalFetcher)
```

### 認証機能
```typescript
import { hashPassword, verifyPassword } from '@/lib/auth'

const hashed = await hashPassword('password123')
const isValid = await verifyPassword('password123', hashed)
```

## 設計方針
- **再利用性**: 全コンポーネントで共通利用可能
- **型安全性**: TypeScriptでの型定義
- **エラーハンドリング**: 統一されたエラー処理
- **パフォーマンス**: SWRのキャッシュ機能活用