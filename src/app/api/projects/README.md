# プロジェクト管理API

## 概要
プロジェクトAPI群は、法務DD案件の管理を担当します。M&A案件やDD案件を単位として、契約書群とメンバーの関連付け、進捗管理を実現します。

## `/api/projects` - プロジェクト一覧・作成

### ビジネス価値
- **案件管理**: M&A/DD案件の構造化管理
- **チーム編成**: プロジェクトベースのメンバー管理
- **進捗可視化**: 契約書分析の進捗把握

### データ構造
```typescript
interface Project {
  id: number;
  workspaceId: number;
  name: string;               // 案件名（例：「A社買収DD」）
  description?: string;       // 案件詳細
  targetCompany: string;      // 対象会社名（買収対象）
  createdAt: Date;
  updatedAt: Date;
}
```

### 主要機能
- **GET**: プロジェクト一覧取得（統計情報含む）
- **POST**: 新規プロジェクト作成（自動メンバー追加）

## `/api/projects/[id]` - プロジェクト詳細

### 操作
- **GET**: プロジェクト詳細取得
- **DELETE**: プロジェクト削除（関連データも削除）
- **PATCH**: プロジェクト更新

### 関連データ取得
```typescript
include: {
  workspace: true,           // ワークスペース情報
  contracts: {              // 契約書一覧
    include: {
      _count: {
        select: { contractRisks: true }  // リスク数
      }
    }
  },
  projectUsers: {           // メンバー情報
    include: { user: true }
  }
}
```

## ビジネスルール
- プロジェクト作成時、作成者が自動的にメンバーに追加
- targetCompanyは契約書のtargetCompanyと照合
- プロジェクト削除時、関連契約書・リスクも削除