# リスク項目管理ページ

## 概要
リスク項目管理ページは、AIが使用するリスク抽出項目の管理を行います。ワークスペース固有のカスタムリスクを作成・編集することで、業界特有のリスクや企業固有の観点を反映できます。

## ページ構成

### タブ構造
```typescript
enum RiskTab {
  CUSTOM = "custom",    // カスタムリスク（編集可能）
  DEFAULT = "default"   // デフォルトリスク（参照のみ）
}
```

### リスク管理機能
1. **CRUD操作**: カスタムリスクの作成・読取・更新・削除
2. **プロンプト編集**: AI判定基準の調整
3. **プレビュー機能**: 変更前の確認

## カスタムリスク作成

### フォーム設計
```typescript
interface RiskForm {
  title: string;       // リスク名（必須）
  prompt: string;      // AI用プロンプト（必須）
  description: string; // 説明文（必須）
}

const validateRiskForm = (form: RiskForm): ValidationResult => {
  const errors: ValidationErrors = {};
  
  if (!form.title || form.title.length < 2) {
    errors.title = "リスク名は2文字以上で入力してください";
  }
  
  if (!form.prompt || form.prompt.length < 10) {
    errors.prompt = "プロンプトは10文字以上で入力してください";
  }
  
  return { isValid: Object.keys(errors).length === 0, errors };
};
```

### プロンプトエンジニアリングガイド
```typescript
const promptTemplate = `
【推奨プロンプト構成】
1. リスクの定義を明確に記述
2. 判断基準を具体的に列挙
3. 該当/非該当の例を提示

例：
「以下の観点で${riskTitle}を評価してください：
- 基準1: ...
- 基準2: ...
該当例：...
非該当例：...」
`;
```

## リスク編集モーダル

### UI実装
```tsx
<Modal
  title={editingRisk ? "リスク編集" : "新規リスク作成"}
  open={isModalOpen}
  onOk={handleSubmit}
  onCancel={handleCancel}
  width={600}
>
  <Form layout="vertical">
    <Form.Item label="リスク名" required>
      <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
    </Form.Item>
    <Form.Item label="AIプロンプト" required>
      <TextArea 
        rows={6} 
        value={form.prompt}
        placeholder={promptTemplate}
      />
    </Form.Item>
  </Form>
</Modal>
```

## データ同期
```typescript
// SWRのmutateによる即座の反映
const handleCreate = async (form: RiskForm) => {
  await createRisk({
    ...form,
    workspaceId: currentWorkspaceId
  });
  
  // キャッシュ更新
  mutate('/api/risks');
  message.success('リスクを作成しました');
};
```

## ビジネス価値
- **カスタマイズ**: 業界特有のリスクに対応
- **精度向上**: プロンプト調整によるAI精度向上
- **標準化**: 組織内でのリスク評価基準統一