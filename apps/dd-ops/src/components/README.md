# コンポーネント構成ドキュメント

## 概要
DD-OPSプロジェクトのReactコンポーネント構成と各ディレクトリの役割について説明します。

## ディレクトリ構成

```
src/components/
└── layout/                # レイアウト関連コンポーネント
    └── AppLayout.tsx      # メインアプリケーションレイアウト
```

## 各コンポーネントの役割

### `/layout/AppLayout.tsx`
アプリケーション全体のレイアウトを管理するメインコンポーネント
- サイドバーナビゲーション
- ヘッダー（サイドバー折りたたみボタン）
- コンテンツエリア
- プロジェクト一覧の動的表示

#### 主な機能
- サイドバーの折りたたみ/展開
- ページ遷移に応じたメニュー選択状態の更新
- プロジェクト一覧のAPI取得と表示
- レスポンシブデザイン対応
- overflow: hiddenでスクロール制御

#### 使用コンポーネント
- Ant Design: Layout, Menu, Button
- Next.js: Link, usePathname
- アイコン: HomeOutlined, UserOutlined, PlusOutlined, TagsOutlined, TagOutlined

## スタイリング方針
- Styled Componentsは最小限に使用
- 主にAnt Designの標準スタイルを活用
- overflow: hiddenでスクロール制御を統一
- 日本語UIで統一