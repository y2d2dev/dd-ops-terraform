# 管理者ページ

## 概要 
Y2D2サブドメイン限定のワークスペース管理ページです。全ワークスペースの管理、IP制限設定、CloudArmor連携機能を提供します。

## アクセス制御
```typescript
// Y2D2サブドメイン限定
const isY2d2Admin = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.includes('y2d2');
};

if (!isY2d2Admin()) {
  return <Alert type="error" message="アクセス権限がありません" />;
}
```

## ワークスペース管理

### 作成機能
```typescript
interface WorkspaceForm {
  name: string;
  accessableIps?: string[];
}

const createWorkspace = async (form: WorkspaceForm) => {
  const response = await fetch('/api/admin/workspaces', {
    method: 'POST',
    body: JSON.stringify(form)
  });
  
  if (response.ok) {
    message.success('ワークスペースを作成しました');
    fetchWorkspaces(); // リスト更新
  }
};
```

### IP制限管理

#### IP入力UI
```tsx
const IpRestrictionEditor = ({ ips, onChange }) => {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {ips.map((ip, index) => (
        <Input
          key={index}
          value={ip}
          onChange={e => updateIp(index, e.target.value)}
          suffix={
            <CloseOutlined onClick={() => removeIp(index)} />
          }
          placeholder="xxx.xxx.xxx.xxx"
        />
      ))}
      <Button onClick={addIp} icon={<PlusOutlined />}>
        IPアドレスを追加
      </Button>
    </Space>
  );
};
```

#### CloudArmor連携
```typescript
const generateCloudArmorRule = (ips: string[]): string => {
  if (ips.length === 0) return "allow all";
  
  const conditions = ips.map(ip => `origin.ip == '${ip}'`).join(' || ');
  return `origin.ip == '0.0.0.0/0' && !(${conditions})`;
};

// コピー機能
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  message.success('クリップボードにコピーしました');
};
```

## 検索・フィルタリング

### 実装
```typescript
const filteredWorkspaces = useMemo(() => {
  return workspaces.filter(ws => 
    ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ws.id.toString().includes(searchTerm)
  );
}, [workspaces, searchTerm]);
```

### UI
```tsx
<Input.Search
  placeholder="ワークスペース名またはIDで検索"
  value={searchTerm}
  onChange={e => setSearchTerm(e.target.value)}
  style={{ marginBottom: 16 }}
/>
```

## 主要機能
- **ワークスペース一覧**: 全ワークスペースの管理
- **IP制限設定**: セキュリティポリシーの管理
- **CloudArmor連携**: CDN設定用ルール生成
- **検索・フィルタ**: 効率的なワークスペース検索