# リスク編集ページ ドメイン知識ドキュメント

## 概要
リスク編集ページ（`/edit`）は、dd-opsの中核機能を提供する最も複雑なページです。OCRされた契約書データと原本PDFを並べて表示し、AIによる自動リスク抽出と手動編集を組み合わせた高度なリスク分析機能を実現しています。

## ビジネス価値

### 法務DDの効率化
- **時間短縮**: 手動レビューの10分の1以下の時間で完了
- **精度向上**: AIと人間のハイブリッドアプローチ
- **標準化**: 一貫した基準でのリスク評価

### ユーザー体験の革新
- **視覚的対比**: PDF原本とOCRデータの同時確認
- **インタラクティブ編集**: ドラッグ選択による直感的操作
- **リアルタイム反映**: 編集内容の即座反映

## アーキテクチャ設計

### 3カラムレイアウト
```typescript
interface ThreeColumnLayout {
  left: PDFViewer;        // 原本PDF表示
  center: OCRDataView;    // OCRテキストデータ
  right: RiskPanel;       // 抽出リスク一覧
}
```

### パネル制御システム
```typescript
// Allotmentライブラリによる可変パネル
const panelSizes = {
  pdf: { min: 200, default: "33%" },
  ocr: { min: 200, default: "34%" },
  risk: { min: 300, default: "33%" }
};
```

## 状態管理設計

### URL同期状態（nuqs）
```typescript
// URLにリスク情報を保存（ブラウザバック対応）
const [risks, setRisks] = useQueryState('risks', {
  defaultValue: [],
  parse: (value) => JSON.parse(decodeURIComponent(value)),
  serialize: (value) => encodeURIComponent(JSON.stringify(value))
});
```

### ローカル状態管理
```typescript
interface EditPageState {
  // AI抽出状態
  isExtracting: boolean;
  hasExtracted: boolean;
  
  // 保存状態
  isSaving: boolean;
  saveError: string | null;
  
  // UI状態
  collapsedPanels: Set<PanelType>;
  activeRiskId: string | null;
  
  // データマッピング
  riskTypeMap: Map<string, RiskType>;
}
```

## リスク抽出フロー

### 自動抽出プロセス
1. ページロード → 保存済みリスク確認
2. 未保存の場合 → AI抽出実行
3. Gemini API → 条文単位分析
4. 結果をURLに保存
5. 保存済みの場合 → AI抽出スキップ

### 手動リスク追加
```typescript
const handleManualRiskAdd = async (selection: TextSelection) => {
  // 1. 選択テキスト取得
  const selectedText = getSelectedText();
  
  // 2. 条文番号抽出
  const articleInfo = await extractArticleInfo(selectedText);
  
  // 3. リスク作成
  const newRisk: ContractRisk = {
    id: generateId(),
    text: selectedText,
    articleInfo,
    type: selectedRiskType,
    reason: userProvidedReason,
    pageNumber: currentPage,
    positionStart: selection.start,
    positionEnd: selection.end
  };
  
  // 4. 状態更新
  setRisks([...risks, newRisk]);
};
```

## インライン編集機能

### 編集可能フィールド
- `articleInfo`: 条文番号
- `reason`: リスク理由  
- `specificClause`: 該当条項

### 編集UXパターン
1. **クリックで編集開始**: テキストフィールドに変換
2. **Enterで保存**: 変更を確定
3. **Escapeでキャンセル**: 元の値に戻す
4. **フォーカスアウトで自動保存**: ユーザビリティ向上

## 保存制限メカニズム

### 編集可能性の判定
```typescript
const isEditable = !contract.isSave && !disableAiExtraction;

// UIレベルの制限
<Button disabled={!isEditable}>AI再抽出</Button>
<DeleteButton disabled={!isEditable} />
```

### 保存プロセス
```typescript
const handleSave = async () => {
  try {
    // 1. リスクデータ保存
    await saveRisks(contractId, risks);
    
    // 2. 契約書ステータス更新
    await updateContract(contractId, { isSave: true });
    
    // 3. 成功通知
    message.success('保存しました');
    
    // 4. 3秒後にリダイレクト
    setTimeout(() => {
      router.push(`/project/${projectId}`);
    }, 3000);
  } catch (error) {
    message.error('保存に失敗しました');
  }
};
```

## 主要コンポーネント

### `/components/RiskPanel.tsx`
- 抽出されたリスクの一覧表示と操作
- リスクカード表示（条文番号、リスクタイプ、該当条文）
- インライン編集可能な条文表示
- DB保存ボタン（スティッキー表示）

### `/hooks/useEditLogic.ts`
- 複雑な編集状態管理の分離
- インライン編集（リスクID、フィールド、値の管理）
- 手動リスク追加（モーダル管理、テキスト選択）
- 条文情報自動抽出（API連携）

## 今後の改善計画

### UI/UX改善
1. **ドラッグ&ドロップ**: リスクの並び替え
2. **一括編集**: 複数リスクの同時編集
3. **検索機能**: リスク内容の検索
4. **フィルタリング**: リスクタイプ別表示

### 機能拡張
1. **コメント機能**: リスクへのメモ追加
2. **履歴管理**: 編集履歴の保存
3. **比較機能**: 複数バージョンの比較
4. **エクスポート**: Excel/PDF形式での出力