# ディレクトリ構成ドキュメント

## 概要
DD-OPSプロジェクトのソースコード構成と各ディレクトリの役割について説明します。

## ディレクトリ構成

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   └── auth/          # 認証関連API
│   │       ├── login/     # ログインAPI
│   │       └── register/  # ユーザー登録API
│   ├── login/             # ログインページ
│   ├── register/          # ユーザー登録ページ
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # ホームページ
├── lib/                   # ユーティリティライブラリ
│   ├── auth.ts           # 認証機能（パスワードハッシュ化等）
│   └── prisma.ts         # Prismaクライアント設定
└── providers/             # Reactプロバイダー
    └── AntdProvider.tsx   # Ant Designテーマ設定
```

## 各ディレクトリの役割

### `/app`
Next.js 13のApp Routerを使用したページ・APIルート管理
- ファイルベースルーティング
- レイアウト・ページ・API定義

### `/app/api/auth`
認証関連のAPIエンドポイント
- `login/route.ts`: ユーザーログイン処理
- `register/route.ts`: ユーザー登録処理

### `/lib`
アプリケーション全体で使用する共通ライブラリ
- `auth.ts`: bcryptjsを使ったパスワードハッシュ化・検証
- `prisma.ts`: データベースクライアントのシングルトン設定

### `/providers`
React Contextプロバイダー管理
- `AntdProvider.tsx`: Ant Designのテーマ・国際化設定

## 技術スタック
- **UI**: Ant Design + Styled Components
- **データベース**: Prisma + PostgreSQL
- **認証**: bcryptjs
- **フレームワーク**: Next.js 14 (App Router)


## LocalのDB内容確認
pnpm prisma studio --port 5556