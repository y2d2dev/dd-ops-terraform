# ユーザー登録ページ

## 概要
ユーザー登録ページは、新規ユーザーのオンボーディングを担当し、ワークスペース選択と初期プロジェクト作成を自動化します。

## 登録フロー

### 1. ワークスペース取得
```typescript
useEffect(() => {
  const fetchWorkspaces = async () => {
    const response = await fetch('/api/workspace');
    const data = await response.json();
    
    // IP制限でフィルタリング済み
    setWorkspaces(data.workspaces);
    setHasAccessibleWorkspaces(data.workspaces.length > 0);
  };
  
  fetchWorkspaces();
}, []);
```

### 2. フォームバリデーション
```typescript
interface RegistrationForm {
  email: string;
  password: string;
  confirmPassword: string;
  workspaceId: number;
}

const validateForm = (form: RegistrationForm): ValidationResult => {
  const errors: ValidationErrors = {};
  
  // メール形式チェック
  if (!isValidEmail(form.email)) {
    errors.email = "有効なメールアドレスを入力してください";
  }
  
  // パスワード強度チェック
  if (form.password.length < 8) {
    errors.password = "パスワードは8文字以上にしてください";
  }
  
  // パスワード一致チェック
  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "パスワードが一致しません";
  }
  
  return { isValid: Object.keys(errors).length === 0, errors };
};
```

### 3. 登録処理
```typescript
const handleRegister = async (form: RegistrationForm) => {
  try {
    // トランザクション処理
    const result = await registerUser({
      email: form.email,
      password: form.password,
      workspaceId: form.workspaceId
    });
    
    // 成功通知
    notification.success({
      message: '登録完了',
      description: 'アカウントが作成されました'
    });
    
    // 自動ログイン
    await autoLogin(form.email, form.password);
    router.push('/');
    
  } catch (error) {
    handleRegistrationError(error);
  }
};
```

## ワークスペース選択UI

### ラジオボタン実装
```tsx
<Radio.Group value={workspaceId} onChange={e => setWorkspaceId(e.target.value)}>
  <Space direction="vertical">
    {workspaces.map(workspace => (
      <Radio key={workspace.id} value={workspace.id}>
        {workspace.name}
      </Radio>
    ))}
  </Space>
</Radio.Group>
```

### アクセス制限メッセージ
```tsx
{!hasAccessibleWorkspaces && (
  <Alert
    type="warning"
    message="アクセス可能なワークスペースがありません"
    description="管理者に連絡してアクセス権限を付与してもらってください"
  />
)}
```

## ビジネスルール
- 新規ユーザーは必ずワークスペースに所属
- 登録時に「初期プロジェクト」が自動作成
- パスワードはbcryptでハッシュ化
- 登録後は自動ログイン処理