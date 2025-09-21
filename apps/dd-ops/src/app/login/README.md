# ログインページ

## 概要
ログインページは、dd-opsのセキュリティゲートとして機能し、ユーザーのアイデンティティ確認とアクセス制御を担当します。法務DDの機密性を考慮し、多層防御のセキュリティ設計を採用しています。

## セキュリティ機能

### 認証方式
- メールアドレス + パスワード認証
- JWTトークンによるセッション管理
- HTTPOnlyクッキーでのトークン保存

### IP制限
- ワークスペース単位のIP制限
- アクセス拒否時の適切なエラー表示
- 法務DDの機密性を考慮した追加セキュリティ層

## UI/UX設計

### フォームレイアウト
```tsx
<Card style={{ maxWidth: 400, margin: '100px auto' }}>
  <Form layout="vertical">
    <Form.Item label="メールアドレス" required>
      <Input type="email" />
    </Form.Item>
    <Form.Item label="パスワード" required>
      <Input.Password />
    </Form.Item>
    <Button type="primary" block>ログイン</Button>
  </Form>
</Card>
```

### エラー表示パターン
```typescript
enum LoginError {
  INVALID_CREDENTIALS = "メールアドレスまたはパスワードが正しくありません",
  IP_RESTRICTED = "お使いのIPアドレスからはアクセスできません", 
  SERVER_ERROR = "サーバーエラーが発生しました"
}
```

## リダイレクトロジック

### サブドメイン判定
```typescript
const getRedirectPath = (): string => {
  const hostname = window.location.hostname;
  
  // Y2D2管理者向け
  if (hostname.includes('y2d2')) {
    return '/administrator';
  }
  
  // 通常ユーザー
  return '/';
};
```

### リダイレクト元の保持
```typescript
// ログイン前のページを記憶
const returnUrl = searchParams.get('returnUrl') || '/';
router.push(returnUrl);
```

## セキュリティ考慮事項

### パスワード入力
- マスキング表示
- 表示切替オプション
- オートコンプリート無効化

### ブルートフォース対策（将来実装）
```typescript
interface LoginAttempt {
  email: string;
  ipAddress: string;
  timestamp: Date;
  success: boolean;
}

const rateLimiter = {
  maxAttempts: 5,
  windowMinutes: 15,
  lockoutMinutes: 30
};
```