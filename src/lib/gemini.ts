import { VertexAI, SchemaType, FunctionCallingMode } from '@google-cloud/vertexai';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger'

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.GCP_PROJECT_ID || '',
  location: process.env.GCP_LOCATION || 'us-central1'
});

// Define the function declaration for setClassifications
const functionDeclarations: any[] = [
  {
    name: 'setClassifications',
    description: '契約書の条項を分類し、該当する分類タイプと理由を設定します',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        classifications: {
          type: SchemaType.ARRAY,
          description: '分類された条項のリスト',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              text: {
                type: SchemaType.STRING,
                description: '該当する条文の具体的な項・号の内容（例：「(6) 解散、会社分割、事業譲渡又は合併の決議をしたとき」）'
              },
              type: {
                type: SchemaType.STRING,
                description: '分類タイプ（数字）',
                // enumはclassifyArticleWithGemini関数内で動的に設定
              },
              reason: {
                type: SchemaType.STRING,
                description: '分類の理由'
              },
              pageNumber: {
                type: SchemaType.INTEGER,
                description: 'ページ番号'
              },
              articleInfo: {
                type: SchemaType.STRING,
                description: '条文番号（例：第19条第6号、第1条第2項第3号）'
              },
              articleTitle: {
                type: SchemaType.STRING,
                description: '条文タイトル'
              },
              articleOverview: {
                type: SchemaType.STRING,
                description: '条文の柱書部分・概要文（例：「次の各号のいずれかに該当する事由が発生した場合、甲は何らの通知なくして、項目表記載の報酬債権について当然に期限の利益を喪失し直ちに乙に弁済しなければならない。」）'
              },
              specificClause: {
                type: SchemaType.STRING,
                description: '具体的な該当項・号の内容（例：「(3) 所管官庁より営業の許可取消し停止等の処分を受けたとき支払停止若しくは支払不能の状態に陥ったと又は手形若しくは小切手が不渡りとなったとき」）'
              }
            },
            required: ['text', 'type', 'reason', 'pageNumber']
          }
        }
      },
      required: ['classifications']
    }
  }
];

export interface ClassificationRequest {
  prompt: string;
  documentContent: string;
  currentPage: number;
  workspaceId?: number;
}

export interface ArticleClassificationRequest {
  prompt: string;
  articleNumber: string;
  articleTitle: string;
  articleContent: string;
  currentPage: number;
  workspaceId?: number;
  risks?: Array<{
    id: number;
    title: string;
    prompt: string;
    description: string;
  }>;
  targetCompany: string;
}

export interface Classification {
  id: string;
  text: string;
  type: string;
  reason: string;
  pageNumber: number;
  position: { start: number; end: number };
  articleInfo?: string;
  articleTitle?: string;
  articleOverview?: string;
  specificClause?: string;
}

export interface FullContractClassificationRequest {
  prompt: string;
  articles: Array<{
    article_number: string;
    title: string;
    content: string;
  }>;
  currentPage: number;
  workspaceId?: number;
  risks?: Array<{
    id: number;
    title: string;
    prompt: string;
    description: string;
  }>;
  targetCompany: string;
}

/**
 * Get risks from database for dynamic prompt generation
 */
async function getRisksForPrompt(workspaceId?: number): Promise<{ riskTypes: string; riskPrompts: string[] }> {
  try {
    const risks = await prisma.risk.findMany({
      where: {
        workspaceId: workspaceId || null
      },
      orderBy: {
        id: 'asc'
      }
    });

    const riskTypes = risks.map((risk, index) =>
      `${index + 1}. ${risk.title}`
    ).join('\n');

    const riskPrompts = risks.map(risk => risk.prompt);

    return { riskTypes, riskPrompts };
  } catch (error) {
    console.error('Failed to fetch risks:', error);
    // フォールバック：従来の固定リスク分類
    return {
      riskTypes: `1. 更新（契約期間に関するものを含む）
2. 中途解約（期間内解約に関する条項を含む）
3. 通知・届出・承認事由（COC条項の有無を含む）
4. 期限の利益喪失
5. 禁止事由
6. 解除事由（暴排条項を除く）
7. 契約が当然に終了する事由
8. 損害賠償条項（賠償額の合意・上限条項）
9. 競業避止義務
10. 独占的な取引義務
11. 品質保証条項（表明保証条項を含む）
12. 第三者の債務を連帯して保証する条項`,
      riskPrompts: []
    };
  }
}

/**
 * 単一の条文を分類する関数
 */
export async function classifyArticleWithGemini(request: ArticleClassificationRequest): Promise<Classification[]> {
  try {
    const startedAt = Date.now()
    const invocationId = `gemini-${startedAt}-${Math.random().toString(36).slice(2, 8)}`
    // リスク情報が渡されている場合はそれを使用、そうでなければDBから取得
    let risks = request.risks
    if (!risks) {
      await getRisksForPrompt(request.workspaceId)
      // 古い方式でリスクタイプを使用
      risks = [] // フォールバック処理が必要
    }

    // 動的にリスクIDのリストを作成
    const riskIds = risks.map(risk => String(risk.id))

    // 既存のfunctionDeclarationsをコピーしてenumを動的に更新
    const dynamicFunctionDeclarations = JSON.parse(JSON.stringify(functionDeclarations))
    if (riskIds.length > 0) {
      dynamicFunctionDeclarations[0].parameters.properties.classifications.items.properties.type.enum = riskIds
    }

    // Create the model with function calling
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0,
        topP: 0
      },
      tools: [{
        functionDeclarations: dynamicFunctionDeclarations
      }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY
        }
      }
    });

    // Create the new simple prompt format
    const systemPrompt = `M&A法務DDの専門家として、以下の契約条文を分析し、対象会社「${request.targetCompany}」にとってリスクとなる条項を特定してください。

## 分析対象条文
${request.articleNumber} ${request.articleTitle}
${request.articleContent}

## 利用可能なリスクタイプ
${risks.map(risk => `${risk.id}. ${risk.title}`).join('\n')}

リスクに該当する条項があれば、以下の情報を出力してください：
- type: リスクタイプ番号
- text: 該当条文テキスト
- reason: リスク判定理由
- articleInfo: 条文番号（例：第14条第1項第4号）
- articleTitle: 条文タイトル`;

    // Generate content and get function call
    logger.info({ invocationId, func: 'classifyArticleWithGemini', model: 'gemini-2.5-pro', risksCount: risks.length, articleNumber: request.articleNumber, targetCompany: request.targetCompany }, 'Gemini call start')
    const result = await model.generateContent(systemPrompt);
    const response = result.response;

    // Extract function calls (Vertex AI structure)
    const functionCall = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    if (functionCall && functionCall.name === 'setClassifications') {
      const classifications = (functionCall.args as any)?.classifications || [];
      logger.info({ invocationId, durationMs: Date.now() - startedAt, outputCount: classifications.length }, 'Gemini call success')

      // Generate unique IDs for each classification
      return classifications.map((c: any) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        text: c.text,
        type: c.type,
        reason: c.reason,
        pageNumber: c.pageNumber || request.currentPage,
        position: { start: 0, end: c.text.length },
        articleInfo: c.articleInfo || request.articleNumber,
        articleTitle: c.articleTitle || request.articleTitle,
        articleOverview: c.articleOverview,
        specificClause: c.specificClause
      }));
    }

    return [];
  } catch (error) {
    logger.error({ error }, 'Error classifying article with Gemini')
    throw error;
  }
}

/**
 * 複数の条文を一括で分類する関数
 */
export async function classifyMultipleArticlesWithGemini(
  articles: ArticleClassificationRequest[],
  workspaceId?: number
): Promise<Classification[]> {
  try {
    const startedAt = Date.now()
    const invocationId = `gemini-${startedAt}-${Math.random().toString(36).slice(2, 8)}`
    if (!articles || articles.length === 0) {
      return [];
    }

    // 最初のarticleのリスク情報を使用（全て同じはず）
    const risks = articles[0].risks || [];
    if (risks.length === 0) {
      throw new Error('No risks provided');
    }

    // 動的にリスクIDのリストを作成
    const riskIds = risks.map(risk => String(risk.id));

    // 既存のfunctionDeclarationsをコピーしてenumを動的に更新
    const dynamicFunctionDeclarations = JSON.parse(JSON.stringify(functionDeclarations));
    if (riskIds.length > 0) {
      dynamicFunctionDeclarations[0].parameters.properties.classifications.items.properties.type.enum = riskIds;
    }

    // Create the model with function calling
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0,
        topP: 0
      },
      tools: [{
        functionDeclarations: dynamicFunctionDeclarations
      }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY
        }
      }
    });

    // 全ての条文を結合して一括プロンプトを作成
    const combinedArticlesContent = articles.map((article, index) =>
      `## 条文 ${index + 1}
条文番号: ${article.articleNumber}
条文タイトル: ${article.articleTitle}
条文内容:
${article.articleContent}
---`
    ).join('\n\n');

    // Create the simple batch processing prompt
    const systemPrompt = `M&A法務DDの専門家として、以下の複数の契約条文を分析し、対象会社「${articles[0].targetCompany}」にとってリスクとなる条項を特定してください。

## 分析対象条文
${combinedArticlesContent}

## 利用可能なリスクタイプ
${risks.map(risk => `${risk.id}. ${risk.title}`).join('\n')}

各条文を独立して分析し、リスクに該当する条項があれば、以下の情報を出力してください：
- type: リスクタイプ番号
- text: 該当条文テキスト
- reason: リスク判定理由
- articleInfo: 条文番号（例：第14条第1項第4号）
- articleTitle: 条文タイトル
- pageNumber: ${articles[0].currentPage}`;

    // Generate content and get function call
    logger.info({ invocationId, func: 'classifyMultipleArticlesWithGemini', model: 'gemini-2.5-pro', articlesCount: articles.length, risksCount: risks.length, targetCompany: articles[0]?.targetCompany }, 'Gemini call start')
    const result = await model.generateContent(systemPrompt);
    const response = result.response;

    // Extract function calls (Vertex AI structure)
    const functionCall = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    if (functionCall && functionCall.name === 'setClassifications') {
      const classifications = (functionCall.args as any)?.classifications || [];
      logger.info({ invocationId, durationMs: Date.now() - startedAt, outputCount: classifications.length }, 'Gemini call success')

      // Generate unique IDs for each classification
      return classifications.map((c: any) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        text: c.text,
        type: c.type,
        reason: c.reason,
        pageNumber: c.pageNumber || articles[0].currentPage,
        position: { start: 0, end: c.text.length },
        articleInfo: c.articleInfo,
        articleTitle: c.articleTitle,
        articleOverview: c.articleOverview,
        specificClause: c.specificClause
      }));
    }

    return [];
  } catch (error) {
    logger.error({ error }, 'Error classifying multiple articles with Gemini')
    throw error;
  }
}

/**
 * 重複を除去するヘルパー関数
 */
function mergeClassifications(allClassifications: Classification[][]): Classification[] {
  const uniqueClassifications = new Map<string, Classification>();
  
  // すべての分類を処理
  for (const classifications of allClassifications) {
    for (const classification of classifications) {
      // articleInfoとtypeの組み合わせでユニークキーを作成（テキストの違いは無視）
      const key = `${classification.articleInfo}-${classification.type}`;
      
      // まだ登録されていない場合、または理由がより詳細な場合は上書き
      if (!uniqueClassifications.has(key) || 
          (classification.reason && classification.reason.length > (uniqueClassifications.get(key)?.reason?.length || 0))) {
        uniqueClassifications.set(key, classification);
      }
    }
  }
  
  // Map から配列に変換して条文番号でソート
  return Array.from(uniqueClassifications.values()).sort((a, b) => {
    // articleInfoから数値を抽出して比較
    const getArticleNumber = (info: string | undefined) => {
      if (!info) return 0;
      const match = info.match(/第(\d+)条/);
      return match ? parseInt(match[1]) : 0;
    };
    return getArticleNumber(a.articleInfo) - getArticleNumber(b.articleInfo);
  });
}

/**
 * 契約書全体のコンテキストを見てリスクを分類する関数
 */
export async function classifyFullContractWithGemini(request: FullContractClassificationRequest): Promise<Classification[]> {
  try {
    const startedAt = Date.now()
    const invocationId = `gemini-${startedAt}-${Math.random().toString(36).slice(2, 8)}`
    const risks = request.risks || [];
    if (risks.length === 0) {
      throw new Error('No risks provided');
    }

    // 動的にリスクIDのリストを作成
    const riskIds = risks.map(risk => String(risk.id));

    // 既存のfunctionDeclarationsをコピーしてenumを動的に更新
    const dynamicFunctionDeclarations = JSON.parse(JSON.stringify(functionDeclarations));
    if (riskIds.length > 0) {
      dynamicFunctionDeclarations[0].parameters.properties.classifications.items.properties.type.enum = riskIds;
    }

    // Create the model with function calling
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0,
        topP: 0
      },
      tools: [{
        functionDeclarations: dynamicFunctionDeclarations
      }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY
        }
      }
    });

    // 契約書全体の内容を構築
    const fullContractContent = `# 契約書情報
対象会社: ${request.targetCompany}

## 条文一覧
${request.articles.map(article =>
      `### ${article.article_number} ${article.title}
${article.content}
`).join('\n')}`;

    // リスクタイプの文字列を生成
    const riskTypes = risks.map(risk =>
      `${risk.id}. ${risk.title}: ${risk.description}`
    ).join('\n\n');

    // Create the simple full context analysis prompt
    const basePrompt = `MあなたはM&A法務DDに長けた弁護士。対象会社「${request.targetCompany}」の視点でDD上のリスク条項のみを抽出し、指定の出力形式で契約書原文を正確に引用する。不確実なら出さない（アブステイン）。
2.不可侵原則（厳格）
アブステイン：エビデンス不十分／主体不特定／判定が曖昧なら無出力。
非迎合：推測で“リスクあり”と書かない。

3.入力
## 契約書全文
${fullContractContent}

## 利用可能なリスクタイプ
${riskTypes}

5.実行プロセス（内部のみ／出力禁止）
5.1 入力正規化と構造化（表記ゆれ吸収）
-内部だけで[A]のコピーに以下を適用（引用は原文[A]から切り出す）
1.改行をLFに統一（CRLF/CR→LF）
2.Unicode NFKC正規化（全角英数・丸数字・ローマ数字等の同値化）
3.連続空白/タブを1スペースに圧縮
4.OCR耐性：一文字ごとの挿入空白/改行/ゼロ幅空白/ノーブレークスペースを除去し結合（例：「Ｙ ２ Ｄ ２ 株 式 会 社」→「Ｙ２Ｄ２株式会社」）。「第 1 条／第　1　条」は「第1条」に正規化。
-条・項・号の検出：第(\s*\d+\s*)条(の\d+)?／第(\s*\d+\s*)項／第(\s*\d+\s*)号と、丸数字（①②…）／全角半角（１/1）／(1)(2)／（一）（二）／ローマ数字（ⅠⅡⅢ）を同値化。
-最小ブロック：条→項→号の粒度で候補分割。重複テキストは同定義で一意化。
-条単位分割：長文は条単位で逐次処理。
-並び順：出力時は条→項→号の昇順。第14条の2は14.2と扱い、14→14.1→14.2→15…の順。
-柱書：号引用時は条または項の柱書を必ず合成。

5.2 当事者エイリアス特定（主体判定の基礎）
-[article_number:”全文”]や定義条から対象会社[targetCompany]のエイリアス（例：甲/乙/丙/賃借人/借主/売主/買主/委託者/受託者/ライセンサー/ライセンシー/利用者/当社/本会社等）を抽出。
-OCRミスへの耐性：エイリアス抽出では単語内の挿入空白/改行を無視して照合（例：「Ｙ ２ Ｄ ２」「Ｙ２Ｄ２」「Y2D2」を同一視）。
-同義語辞書（例）：賃借人=借主／賃貸人=貸主／譲受人=受領者／発行会社=対象会社等。
-対象会社が文書内に存在しない場合は無出力。

5.3 候補抽出（トリガー探索）
18類型ごとにトリガー語（例：合併/株式譲渡/事業譲渡/支配権等）と効果語（通知/承諾/禁止/解除/当然終了/期限利益喪失等）を探索。
該当語彙は語彙表（§5.6＋拡張表）の同義語まで含めてマッチ。

5.4 判定マトリクス（Decision）
Decision = Trigger ∧ Effect ∧ Subject ∧ ¬Exclusions を満たすときのみ“リスクあり”。
-Trigger：類型固有のトリガー語が明示。
-Effect：類型固有の効果語（同義語含む）が明示。
-Subject（主体整合）：権利・義務の帰属が対象会社に不利（対象会社が義務／相手方が権利）。
-列挙条対応（取りこぼし防止）：効果が条/項の柱書にあり、トリガーが同一条内の各号に列挙される構造では、「柱書＋当該号」を1ブロックとして扱って成立可（引用は§出力仕様のルールに従う）。
-Exclusions（除外）：似て非なる条項を除外（例：15は表明保証違反による損失補償条項の結合のみ可。災害補償・慶弔は除外／7は相手方に中途解約権がある場合のみ等）。Exclusionsについて詳細は必ず5.7を確認すること
-但書の扱い：但書・例外があっても、効果が明示されていれば類型の該当性は維持（出力は原文引用のみ）。

5.6 語彙表（同義語／言い換え）
表記ゆれ（全角/半角/漢数字/丸数字/ローマ数字）、活用形（〜する/〜させる/〜しない）、用語ゆれ（承諾=同意/承認等）を同値扱い。

COC（1〜6）共通Trigger（支配権変動の典型パターン）

- 組織再編
    
    合併（吸収/新設）｜会社分割（吸収/新設）｜株式交換｜株式移転｜組織変更｜事業譲渡（全部/主要な一部）｜事業カーブアウト
    
- 資本・議決権
    
    議決権の過半数移転｜一定割合の変動（例：20％超/33.4％超/50％超/66.7％超 等）｜主要株主/筆頭株主/支配株主の変更｜共同保有の成立/解消｜議決権拘束契約の締結/解除 ｜株式譲渡
    
- グループ階層の実質支配
    
    親会社/支配会社/最終支配者（UBO）の変更｜親会社の親会社の変更（間接CoC）｜持株会社化/ホールドコ構造変更
    
- ガバナンスの支配移転
    
    取締役の過半数交代｜代表者の交替｜特別決議に対する拒否権の獲得/喪失（議決権3分の1超 等）｜経営陣の交替による実質支配の移動
    
- 資本政策起因
    
    第三者割当増資｜転換社債/新株予約権の付与・行使｜優先株の取得・転換 などにより支配構造が変動
    
- 「みなし譲渡」定義での包摂
    
    株主・役員等の異動や株主構成の変更を「契約上の地位の譲渡」とみなす定義が置かれている場合
    
- 補助扱い（単独では原則NG）
    
    「経営環境/MAC」等はCoC語と結合している場合のみ採用
    

1 COC：通知・届出事由

**Trigger**：COC共通Trigger

**Effect（通知系キーワード例）**：

- 事前通知｜○日前/○か月前までの通知義務｜効力発生日までに通知
- 事後通知｜直ちに/遅滞なく/速やかに通知
- 書面通知/書面による届出｜所定様式/指定方法（Eメール可否、内容証明 等）
- 通知内容の充足：発生日/スキーム/新支配者/議決権割合/影響範囲 などを記載

2 COC：承諾事由（同意要件）

**Trigger**：COC共通Trigger

**Effect（承諾系キーワード例）**：

- 事前の書面同意/承諾/承認/許可がない限り不可
- 「合理的理由なく承諾を拒否しない」等の制限付きでも**承諾要件**として成立
- 条件付同意/追加条件付与（担保差入れ・条件変更 等）を認める文言

3 COC：期限の利益喪失

**Trigger**：COC共通Trigger

**Effect（期限利益喪失・加速条項）**：

- 当然型：当該事由発生と同時に「期限の利益を喪失」・弁済期直ちに到来・一括弁済義務
- 請求型：債権者の通知/請求により期限の利益喪失・残債の即時弁済義務
- 付随語：加速（acceleration）・直ちに支払うべし・期限前弁済・即時支払義務

4 COC：禁止事由

**Trigger**：COC共通Trigger（＋「みなし譲渡」定義に基づく支配権変更の擬制を含み得る）

**Effect（禁止・無効化）**：

- 〜してはならない/禁止する/不可｜契約上無効/効力を有しない
- 無承諾の支配権移転＝債務不履行扱い（違反時の解除・損害賠償に接続し得る）

5 COC：解除事由

**Trigger**：COC共通Trigger

**Effect（解除権付与）**：

- 他方当事者は「催告なく/何らの催告を要せず」解除できる(=無催告解除)
- 全部または一部解除｜書面通知により解除(=催告解除)｜即時解除
- 敵対的買収等を想定した解除権（買収防衛機能）

6 COC：当然終了事由

**Trigger**：COC共通Trigger（例：合併消滅、株主でなくなった等の身分喪失）

**Effect（自動終了）**：

- 当然に終了/自動的に終了/失効/効力を失う/終了したものとみなす
- 解除通知不要（停止条件成就型）｜終了事由は限定列挙されることが多い

7 相手方に中途解約権を認める条項（便宜解約）

**Trigger（典型）**：

- 相手方による○日前/○か月前の書面通知｜期間途中でも通知により終了可能
- 理由不要（for convenience）/自由解約の権利付与｜自動更新期間中の途中解約可
    
    **Effect（解約）**：
    
- 相手方が一方的に契約を解約/終了できる
- 解約効力発生日の特定（通知日から○日後 等）
- 付随：返還・清算（但し**違約金は10類型で評価**）

8 契約上の地位譲渡制限条項

**Trigger（地位・権利義務の処分）**：

- 契約上の地位/本契約に基づく権利義務の譲渡・移転・承継・処分｜担保提供（譲渡担保含む）
- 「みなし譲渡」定義（合併/株式譲渡/支配権変動＝地位譲渡とみなす）
    
    **Effect（制限の型）**：
    
- 相手方の「事前の書面同意」がなければ不可｜禁止/無効｜違反時解除可
- 例外の明記（グループ内再編の例外、パリパス例外 等）

9 財務制限条項（コベナンツ）

**Trigger（指標/行為の制約）**：

- 財務・ビジネス上の指標維持：自己資本比率○％以上｜レバレッジ（有利子負債/EBITDA）○倍以下｜DSCR/ICR維持｜ネットワース維持｜連続赤字禁止｜業務KPI・SLAの達成義務
- 資本政策：配当制限/自己株取得制限/減資・準備金取崩しは要承諾
- 債務行為：追加借入禁止/社債発行制限/保証付与制限/ネガティブ・プレッジ（担保提供制限）/同順位担保（パリパス）例外
- 流動性：最低現預金残高/手元流動性維持/コミットライン維持
    
    **Effect（義務化の言い回し）**：
    
- 維持義務/遵守義務（○以上/以下に維持する）
- 禁止・同意要件（〜してはならない/事前承諾が必要）
- 違反時の帰結（是正/追加情報提供/イベント・オブ・デフォルト接続 等）※本分類では**義務の明示**がカギ

10 契約終了時の違約金条項

**Trigger（終了に結びつく事由）**：

- 中途解約/解除/便宜解約/更新拒絶に伴う終了（契約に連動）
- 指定の終了事由発生（例：COC解除、重大違反解除 等）
    
    **Effect（金銭負担）**：
    
- 解約違約金/中途解約金/契約解除料｜残存期間相当額/残存対価の一括支払｜早期終了清算金｜Minimum Fee残価精算｜預り金や敷金の没収
- 計算方法の明示（残期間×月額、未償却費用、定率/定額）｜支払期限（○日以内）

11 競業避止義務

**Trigger（競業の範囲設定）**：

- 同種/類似/競合事業を「直接または間接」に営む行為｜対象市場/顧客/用途/製品ラインの特定
- 適用範囲の拡張：親会社/子会社/関連会社/役員・従業員/アドバイザーにも及ぶ 等
- 期間・地域の特定（契約期間中/終了後○年、国内/特定地域）
    
    **Effect（禁止）**：
    
- 競業行為の禁止/不実施義務｜第三者をして行わせない義務
- 監視・是正の要求、違反時の差止・損害賠償に接続し得る（本類型の核は**競業の禁止義務**）

12 独占的な取引義務条項

**Trigger（独占の態様）**：

- 独占販売/独占供給/独占購入（単独代理/総代理/専任/排他）
- 競合品の不取扱い｜第三者への販売・調達は事前同意｜テリトリー/チャネル指定
    
    **Effect（独占・排他の履行義務）**：
    
- 当該相手に限定して販売/供給/購入する義務
- 競合品取扱い禁止/第三者販売の同意要件
- 目標未達時のペナルティが別条項で接続する場合あり（未達=13類型と多重該当可）

13 最低購入数量条項

**Trigger（コミットの設定）**：

- 期間コミット：年/半期/四半期/月ごとの最低数量｜ミニマム/下限/コミット数量｜Minimum Guarantee（MG）
- Take-or-Pay/不足分買上げ/未達時のフォローオン購入義務
    
    **Effect（達成義務・未達の帰結）**：
    
- 最低数量の購入義務（Best Effortsではなく**義務**）
- 未達ペナルティ：違約金/不足分の買取り/価格調整/契約解除権の付与 等
- 計測方法・対象期間・除外事由（不可抗力/供給停止）明示が伴うことが多い

14 品質保証条項（適合・法令・非侵害 含む）

**Trigger（保証対象）**：

- 仕様適合/契約不適合（瑕疵）/検査基準・受入基準/保証期間
- 法令・規格・安全基準適合/リコール対応
- 第三者権利の非侵害（特許/実用新案/意匠/商標/著作/営業秘密/OSS遵守）
    
    **Effect（救済・保証の内容）**：
    
- 修補/交換/再実施（再履行）/代替品供給/返金/価格減額
- 費用負担（無償修理/回収費用/損害賠償）｜起算点・期間（検収後○日/納入後○か月）
- 免責・限定（AS ISは**保証の否定**＝本類型には通常不該当）
- ※SLAのサービスクレジット**のみ**は原則ここに非該当（SLAはSLA）

15 表明保証違反による損失補償条項（R&Wリンク必須）

**Trigger（リンクのいずれかが明示）**：

- 「表明保証に違反/不実/不正確」「No/any misrepresentation」「breach/inaccuracy of any representation or warranty」
- 条参照でのリンク：例「第X条（表明保証）に違反した場合」
- 定義語チェーン：補償対象事項/Indemnifiable Matters＝R&W違反を含む と定義
    
    **Effect（補償の明示）**：
    
- 補償/賠償/完全填補/indemnify/hold harmless/save harmless/defend（費用負担を含む防御義務）
- 範囲・期間・上限/バスケット/ディミニミス・除外（税/IP/不可抗力 等の別立ては**リンクが無い限り除外**）

16 追加出資義務条項

**Trigger（キャピタルコール発動条件）**：

- 資金不足/損失発生/資本充実要件/規制上の自己資本要件｜比率維持（プロラタ）｜所定決議/通知
    
    **Effect（拠出義務）**：
    
- 追加払込/資金拠出（一定額/上限/スケジュール）
- 不履行時の希薄化/罰金/議決権制限/持分強制売却 等の制裁が付随し得る（本類型の核は**出資義務**）

17 第三者債務の保証条項

**Trigger（第三者の債務に関与）**：

- 連帯保証/保証人/支払確保の誓約/責任をもって履行させる｜経営指導念書 等
- 保証の対象：第三者（親会社/関係会社/取引先）債務
    
    **Effect（保証責任）**：
    
- 保証債務の履行義務/求償に関する定め｜保証極度額/範囲/期限
- クロスデフォルト/期限利益喪失に接続し得る（金融系契約）

18 第三者債務の担保提供条項

**Trigger（自社資産を他人の債務の担保に）**：

- 抵当/根抵当/質権/譲渡担保/動産・債権譲渡登記/先取特権 等の設定対象が「第三者債務」
    
    **Effect（担保設定の合意・義務）**：
    
- 担保提供/維持義務/追加担保差入れ/差替・解放条件
- ネガティブ・プレッジとの関係（9類型）に留意：本類型は**提供そのもの**を定める

5.7 除外・優先判定ガイド

総則（共通ルール）

・効果語が本文に明示されないものは除外（通知・承諾・禁止・解除・当然終了・期限利益喪失・義務・違約金等のEffectが本文に無い場合は拾わない）

・補助語単独は除外（MAC／経営環境の変化等は、当該類型のTrigger/Effectと結合して初めてリスクとして採用）

・協議／努力義務のみはリスクから除外（協議のうえ等、制裁・権利付与が無いもの）

・但書・例外の扱い：但書があっても効果が明示されていれば該当性を維持（出力は原文引用のみ）

・引用運用：抽出は原文引用に限定（要約や補完語は付さない）

5.7.1 除外する表現（18類型別）

1 COC：通知・届出事由

・登記事項の変更通知のみ（本店・商号・代表者等）で支配権変動の言及なし

・M&Aの検討・噂・協議段階の通知

・住所・連絡先変更通知のみ

・「重要な変更があれば通知」等の抽象規定でCoC例示・効果不明確

2 COC：承諾事由

・契約上の地位譲渡の承諾のみ（地位譲渡制限は8へ）

・事前通知のみで同意要件がないもの（1へ）

・合意解約や更新拒絶の承諾

・承諾基準提示だけで同意要件自体が無いもの

3 COC：期限の利益喪失

・遅延損害金・延滞利息のみで加速条項がない

・支払サイト短縮・前倒し合意（加速ではない）

・デフォルト時の解除のみ（5へ）

・「期限の利益を失うことがある」等の裁量的文言で要件・加速が不明確

4 COC：禁止事由

・「同意がない限り支配権変更不可」（2へ）

・みなし譲渡が契約上の地位譲渡に限定されるもの（8へ）

5 COC：解除事由

・一般的な債務不履行解除（支配権言及なし）

・不可抗力・法令変更・反社会的勢力排除による解除

・合意解約のみ

6 COC：当然終了事由

・解除権付与に留まるもの（5へ）

・期間満了による終了

7 相手方に中途解約権

・違反・破産・不可抗力等の理由あり解除のみ（便宜解約ではない）

・自動更新の更新拒絶（中途ではない）

・解約金の定めのみで解約権が明記されない（10へ）

・合意解約（協議の上終了）

8 契約上の地位譲渡制限

・下請・再委託の制限のみ（外注統制）

・株式譲渡・支配権変動に関する承諾（2/4/5/6のCOCへ）

・本契約外の債権譲渡禁止のみ

・IPの譲渡・ライセンス譲渡不可のみ（契約地位ではない）

9 財務制限条項

・価格改定・支払条件条項

・情報提出だけ（決算提出等は単独非該当）

・税・保険加入等の一般遵守義務

・MFNや価格フォーミュラ等の取引条件条項

10 契約終了時の違約金

・遅延損害金・延滞利息（終了非連動）

・SLAクレジット（終了非連動）

・事務手数料・返金不可のみ（周辺語単独は非該当）

・責任制限（損害賠償の上限・免責）

11 競業避止義務

・秘密保持のみ

・ノンソリ（取引先・従業員の勧誘禁止）のみ

・ブランド使用・表示規制、広告規制

・優先的取引・推奨購入（独占義務が無ければ12へも非該当）

12 独占的な取引義務

・優先交渉権（ROFR/ROFO）やMFN

・推奨・優先取引の努力義務

・販売目標のみ（コミットなし）

・テリトリー任命だけで排他義務不在

13 最低購入数量

・販売/購入「目標」・予測（forecast）・ベストエフォート

・リベート・ボリュームディスカウントのみ

・Take-and-Pay（誤用）。実体がTake-or-Payでなければ除外

・最低売上保証のみで数量換算不能・義務不明確

14 品質保証

・SLA（可用性・応答時間等）のクレジットのみ（品質保証とは区別）

・AS IS・責任制限等の保証否定条項

・一般適法性遵守のみ（具体的保証・救済なし）

・IP侵害補償がR&Wリンクなしの場合（一般補償であり品質保証救済ではない）

15 表明保証違反による損失補償

・一般補償・賠償条項でR&Wへの明示リンクがない

・IP侵害補償・製造物責任補償等の特定補償（R&Wリンクなし）

・責任制限・免責（上限・バスケット等）のみ

・「虚偽・不正確」の語がR&W条項を参照せず単独使用

16 追加出資義務

・「出資することができる」等の選択的規定

・アンチダイリューション、優先引受権（義務ではない）

・業務委託費の前払・追加費用負担（資本ではない）

・ワーキングキャピタル調整やデットファイナンス義務

17 第三者債務の保証

・保険加入・保証金・LC依頼等（保証と異なる場合）

18 第三者債務の担保提供

・自社債務に対する担保設定（第三者債務でない）

・ネガティブ・プレッジ（担保提供制限は9へ）

・留置権・所有権留保・エスクロー等の担保以外の確保手段

・債権譲渡登記が自社債務の担保に過ぎないもの

5.7.2 類型間の優先判定ルール（どちらにも該当し得る場合の帰属）

同一ブロック内に複数類型が併存する場合は、以下の優先順位により主類型を1件に一意決定し、劣後類型は出力しない（併記不可）。

A. COC内の優先順位（同一条項に複数Effectが併存する場合の優先）

1. 当然終了（6）を最優先。自動終了があれば6に分類する
2. 解除（5）と期限利益喪失（3）が併存する場合は、契約終了リスクを主眼とする条項は5、金融回収（加速）を主眼とする条項は3に分類する
3. 禁止（4）と承諾（2）が併存する場合は、同意がない限りしてはならない＝承諾要件として2に分類する（禁止は表現形態）
4. 承諾（2）と通知（1）が併存する場合は2に分類する
5. COC語の例示が抽象的でもEffectが明確なら、上記優先順で分類

B. COCと地位譲渡制限の線引き

1. 契約上の地位の譲渡・承継・処分についての同意・禁止・解除等は8で分類
2. 支配権変動（株主・議決権・組織再編）をトリガーに同意・禁止・解除等の効果が付くものは1〜6のCOCで分類
3. 支配権変動を「地位譲渡とみなす」と明記し、その結果として地位譲渡禁止の効果を発動する構造は8に分類する

C. 独占・最低購入の線引き

1. 排他・専属・総代理などの取扱いの排他性が中心で数量コミットが無いものは12
2. 最低・ミニマム・コミット数量・Take-or-Pay等の数量コミットが明示されるものは13（独占も同時に書かれていても13に分類する）
3. 販売目標・フォーキャストは除外（13に昇格しない）

D. 品質保証・R&W補償・SLAの線引き

1. 修補・交換・再実施等の契約不適合救済は14
2. 「表明保証に違反した場合の補償」「R&Wの不正確」を明示するものは15（品質保証や一般補償より15を主）
3. SLA（可用性・応答時間・RTO/RPO等）とサービスクレジット中心は14から除外。

E. 中途解約権（7）と違約金（10）の関係

1. 相手方に便宜解約権を認める規定は7で分類
2. 解約金・中途解約金・残存対価一括支払等の金銭効果が契約終了に連動して定まる場合は10に分類する
3. どちらか一方のみが明示される場合は、その明示有無で分類（解約金のみ＝10、解約権のみ＝7）

F. 財務コベナンツ（9）とその他の財務関連表現

1. 指標維持（自己資本比率、レバレッジ、DSCR/ICR等）、資本政策の制限（配当・自己株・減資等）、債務行為（借入・社債・保証・担保）、流動性維持は9
2. ネガティブ・プレッジやパリパスは9
3. 第三者債務の保証・担保提供義務は、それぞれ17・18で別建て（9とは区別）

G. 第三者債務の保証（17）と担保提供（18）の線引き

1. 他人の債務に対する履行の確約・連帯保証・責任をもって履行させる等は17
2. 自己資産に第三者債務のための抵当・質・譲渡担保等を設定する義務は18
3. 保証と担保提供が併存する場合は、契約で主として求められる側を主類型とし、もう一方を副として併載（明確でなければ17優先）

H. 追加出資義務（16）と財務コベナンツ（9）の線引き

1. 出資・払込・キャピタルコール等のエクイティ拠出義務は16
2. 配当制限・借入制限等の財務運営ルールは9

I. 通知（1）・承諾（2）・禁止（4）・解除（5）・当然終了（6）・期限利益喪失（3）の重み付け

1. 重みの高い順（原則）：6 ＞ 5 ＞ 3 ＞ 4 ＞ 2 ＞ 1
2. 同一条文に複数のEffectが並列に規定される場合は、上記順に分類

J. 但書・例外の混在条項

1. 例外やセーフハーバーが付いていても、主効果が明示されていれば当該類型で分類
2. 例外によって効果が常に無効化される構造（例：常に同意みなし）は該当性を再検討

5.8 範囲選択と列挙出力（スタンドアロン要約）

1. 目的
    
    ・列挙型（「次の各号のいずれか」など）の条文で、柱書にEffect（例：解除）があり、各号にTrigger（例：合併、株主過半数異動等）が並ぶとき、号ごとに独立のリスクとして“漏れなく・ダブりなく”出力する。
    
2. 用語
    
    ・Trigger＝発動事由（COCの合併・会社分割・株主過半数異動・事業譲渡の主要部分 等）。
    
    ・Effect＝効果（解除、当然終了、期限利益喪失、禁止、承諾要件、通知 等）。
    
    ・引用ブロック＝「柱書（Effect）＋当該号（Trigger）」を一体化した最小単位。
    

5.8.1 基本原則（列挙は全件出力）
・OR列挙（「次の各号のいずれか」「any of」「either of」等）の場合、号ごとに1件ずつ出力する。
・引用ブロックは「柱書＋当該号」を一体化（Effectが柱書、Triggerが号）。
・同条から同じ類型が複数出てもよい（目的は網羅性）。

5.8.2 適用手順（上流の決定と整合）
① 5.7.1（除外）を先に適用し、不適合を落とす
② 5.7.2（類型間の優先判定）で“各号ごとに”主類型を確定
③ 列挙展開：対象の号を全件展開し、「柱書＋号」で個別エントリ化
④ 重複判定：意味が実質同一の号（完全な言い換え・参照重複）は1件に統合
⑤ 残った“同一エントリに対する複数の引用候補”が競合しているときだけ5.8.4（限定タイブレーク）へ

5.8.3 どこまで分割するか（粒度）
・既定の分割単位は「号」。号の内部に「又は／or」で細分があっても、既定では1件にまとめる（ノイズ抑制）。
・より細い粒度が必要なら運用オプション（号内の“又は”分割）で対応可能だが、デフォルトは分割しない。

5.8.4 限定タイブレーク（衝突時のみ：引用範囲の競合解消専用）
下記は“同一の個別エントリ”に対して引用候補が競合した場合だけ適用。列挙の号同士には適用しない。
(1) 最小単位優先：第X条第Y項第Z号 ＞ 第X条第Y項 ＞ 第X条第W号 ＞ 第X条
(2) 文字オフセット最小：同単位なら文頭に近い候補
(3) 参照不要優先：定義条・別条に飛ばず自己完結している候補
(4) 重複統合：文言差だけの反復は1件に統合
注：同一ブロックの分類競合は本項では扱わない。必ず5.7.2で主類型を一意化し、劣後類型は出力しない。5.8.4は引用範囲の競合解消にのみ用いる。

1. 例（この条文をどう出すか）
    
    条構成：第10条（柱書）「次の各号のいずれかに該当する場合、乙は何らの催告なく本契約を解除できる。」
    
    一　甲が合併したとき
    
    二　甲の株主が全議決権の過半数について異動したとき
    
    三　甲が事業の重要な一部を譲渡したとき
    
    処理と結論：
    
    ・柱書にEffect＝解除。各号はCOCのTrigger。よって各号を独立に出力。
    
    ・3件とも、類型は「5（COC条項：解除事由）」。
    
    出力イメージ（簡略）
    
    ・第10条（柱書＋一）／類型5（COC：解除）／Trigger＝合併／Effect＝解除
    
    ・第10条（柱書＋二）／類型5（COC：解除）／Trigger＝株主の過半数異動／Effect＝解除
    
    ・第10条（柱書＋三）／類型5（COC：解除）／Trigger＝事業の重要な一部の譲渡／Effect＝解除
    

5.9 スコープ付き全文参照（現在ブロックの決定と引用規律）

目的

・条文の“どこ”を1件として判定・出力するかを統一し、誤った越境合成（条や項をまたいだ無関係なつなぎ合わせ）を防ぐ。

・弁護士が確認しやすい粒度（短く・意味が閉じる）で、もれなく列挙できるようにする。

用語

・柱書＝条や項の冒頭に置かれる総括文（例：「次の各号のいずれかに該当する場合、乙は解除できる。」）。

・各号＝柱書の下で列挙される一・二・三…等。

・Effect＝契約上の効果（解除・当然終了・期限利益喪失・禁止・承諾要件・通知義務 等）。

・Trigger＝効果を発生させる事由（合併、議決権過半数の異動、事業譲渡 等）。

・現在ブロック＝1件として判定・出力する最小単位のテキスト範囲。

5.9.1 基本原則（「第●条“全体”にはしない」）

1. 現在ブロックは「最小で意味が閉じる単位」。
    
    a. 単独でEffectとTriggerが完結していれば、その条／項／号だけ。
    
    b. 「柱書にEffect、各号にTrigger」型は、「柱書＋当該号」を一体化して1ブロック。
    
2. 出力は現在ブロックの原文のみ（判定のために参照した他所の文は引用しない）。
3. 1つの条から複数の号が該当する場合は、号ごとに別件で出力（列挙展開）。
4. 効果（Effect）は必ず「現在ブロック内」に存在すること（外部にあるEffectでの合成は禁止）。

この原則により、条“全体”をひとまとめにして効果・事由・例外を混在させることを避け、①誤合成を防ぎ、②号ごとの独立リスクをもれなく列挙し、③引用を最短化してレビュー効率を高める。

5.9.2 許容参照先（判定専用・引用禁止）

判定の根拠付けとして「読むだけ」なら、現在ブロックから次の4つに限り参照可。引用はしない。

1. 定義条・用語解釈条
2. 前文・当事者表示（主体の特定補強）
3. 明示クロスリファレンス（「前条／本条／当該項／前項／以下の各号／第X条…」）
4. 当該条に適用される例外規定（ただし同条内または明示参照に限る）

禁止

・暗黙の越境（つながりが明示されていない別条・別項・別号の取り込み）

・本文からの参照が無い別紙・脚注のみを根拠にすること

5.9.3 充足要件の位置づけ

・Effect：現在ブロック内に明示（必須）。

・Trigger：現在ブロック内、または上記の許容参照先に明示があれば可。

・主体（誰が義務・権利を負うか）：現在ブロック内が原則だが、定義・前文・明示参照で補強可。

・出力テキスト：常に現在ブロックの原文のみを引用。

5.9.4 判定フロー（簡易アルゴリズム）

Step 0　テキストを条→項→号の階層で構造化。

Step 1　各かたまりでEffectの有無を検知。

Step 2　「柱書にEffect、各号にTrigger」なら、号ごとに「柱書＋号」を候補ブロック化（列挙展開）。

Step 3　Triggerを候補ブロック内または許容参照先で確認。

Step 4　例外・ただし書が当該ブロックにかかるかを確認（明示参照のみ反映）。

Step 5　類型の決定（5.7.2の優先判定ルールを適用）。

Step 6　出力生成：ブロックの原文を引用、類型・Trigger・Effectを付す。

Step 7　重複統合：同一ブロック・同一内容は1件化。

補足（5.8との整合）

・最小単位優先（号 ＞ 項 ＞ 条）。

・同一ブロック内で複数類型に当たりうる場合の帰属は5.7.2に従う。

・「参照不要の候補」がある場合はそれを優先（同等なら判定が安定）。

5.9.5 具体例

例A（典型：柱書にEffect、号にTrigger）

条構成：第10条（柱書）「次の各号のいずれかに該当する場合、乙は何らの催告なく本契約を解除できる。」

一　甲が合併したとき

二　甲の株主が全議決権の過半数について異動したとき

三　甲が事業の重要な一部を譲渡したとき

処理

・現在ブロック＝「柱書＋一」「柱書＋二」「柱書＋三」をそれぞれ独立化。

・Effect（解除）は柱書に明示、Triggerは各号に明示。

・3件すべてを類型5（COC：解除事由）として出力。

出力イメージ（簡略、実際は原文引用）

・引用範囲：第10条（柱書＋一）／類型：5／Trigger：合併／Effect：解除

・引用範囲：第10条（柱書＋二）／類型：5／Trigger：議決権過半数の異動／Effect：解除

・引用範囲：第10条（柱書＋三）／類型：5／Trigger：事業の重要部分の譲渡／Effect：解除

例B（単段落で完結）

「乙の親会社が変更した場合、乙は直ちに期限の利益を喪失する。」

・現在ブロック＝当該文（または当該項）。

・Effect＝期限利益喪失、Trigger＝親会社の変更。

・類型：3（COC：期限の利益喪失）。

例C（定義条を参照）

第12条「甲の支配権に実質的変動（第2条『COC事由』参照）が生じた場合、乙は解除できる。」

第2条（定義）「COC事由＝合併、株式交換、株式移転、議決権の1/2超の変動…」

・現在ブロック＝第12条該当文のみを引用。

・Trigger確認は第2条を参照（引用はしない）。

・類型：5（COC：解除事由）。

例D（同条の例外が掛かる）

第15条柱書「次の各号に該当する場合、乙は解除できる。ただし、親会社内のグループ内再編は除く。」

二「甲の株主が全議決権の過半数について異動したとき」

・現在ブロック＝「柱書＋二」。

・例外（ただし書）は同条の全号に適用されるため判定に反映（引用はしない）。

・類型：5（COC：解除事由）。必要ならメタ情報として「親会社内再編は除外」を付記。

例E（禁止参照の例）

「別紙C（参考）にCOC事由の例を掲げる。」とあるが本文に明示参照なし。

・別紙CのみでTriggerを補充するのは不可。現在ブロック内または許容参照先に十分な記載がなければ不成立としてアブステイン。

5.9.6 R&W特例との関係（5.9R）

・表明保証違反を原因とする補償（類型15）は、Effect（Indemnify等）が「現在ブロック」（通常は補償条）にあることが必須。

・R&W本文は参照先として読むだけにとどめ、引用は補償条のみ。

・参照は「本文の明示参照」または「定義語チェーン（最大2ホップ）」に限る（詳細は5.9R）。

5.9R R&W越境判定ルール（15類型の特別扱い／出力禁止）

目的：表明保証（R&W）条と補償（Indemnity）条が別条で規定される実務に合わせ、安易な越境合成を防ぎつつ、「15 表明保証違反による損失補償条項」に該当する箇所だけを正確に成立判定・引用する。

適用範囲と用語

・最小ブロック＝現在評価対象の最小単位（通常は補償条の1項または1号）。

・Effect＝補償・賠償・完全填補・indemnify/hold harmless などの効果語。

・Link＝当該Effectが「R&W違反」に向けて明示に結び付く記載（条参照や定義語参照を含む）。

・Subject＝補償義務者（通常は売主・対象会社側）と受益者（相手方）が明確で、相手方に有利な帰結。

・Exclusions（本類型では除外）＝R&W非連動の一般補償・税補償・IP補償、covenant breachのみ、災害・慶弔等。

全体ロジック（先に全体像）

1. まず最小ブロックの内部だけを見て、Effectが明示されているかを確認する（無ければ15は不成立）。
2. Effectの対象がR&W違反に明示リンクしているかを、許容参照チェーン（最大2ホップ）内で確認する。
3. Subjectが相手方に有利な補償構造かを確認する。
4. Exclusionsに該当しないことを確認する。
5. 以上を満たしたときのみ、15として成立。引用は当該最小ブロックのみ（R&W本文は参照するが引用しない）。

R1 許容する参照チェーン（最大2ホップ）

・ホップA（本文明示参照）：例：「第X条（表明保証）に違反した場合」「Article V のR&Wの不実」

・ホップB（定義語経由）：補償条 → 定義語（例：補償対象事項／Indemnifiable Matters） → 定義文に「R&W違反」が明示

・NGとなる参照

抽象的定義（「本契約違反一般」等）でR&Wと明示リンクなし、脚注・別紙のみ、暗黙の推測。

R2 成立条件（15の上書き定義）：15 = Effect ∧ Link ∧ Subject ∧ ¬Exclusions

・Effect（現ブロック内に存在）：補償／賠償／完全填補／Indemnify／Hold harmless／Save harmless 等の明示。

・Link：次のいずれか

(1) R&W違反／不実／不正確を明示、または

(2) 条参照（第X条／Article V 等のR&W条）を明示、または

(3) 定義語チェーンでR&W違反が明示。

・Subject：補償負担主体と受益者が明確で、相手方（買主・ライセンサー側など）に有利。

・Exclusions：R&W非連動の一般補償・税補償・IP補償、義務（covenant）違反のみ、災害・慶弔、責任上限の定義などは除外（存在判定自体は打消さない）。

R3 引用規則（出力禁止の扱い）

・出力（引用）するのは補償義務を定める「現在ブロック」のみ。

・R&W本文は参照先として確認するが、引用しない。

・目的は誤った越境合成と過剰引用の回避。

R4 語彙増補（検出キーワードの例）

・R&W本文側：表明保証／真実且つ正確／重大な不実表示／虚偽／不正確／No misrepresentation

・リンク語：breach/inaccuracy of any representation or warranty／any misrepresentation／「表明保証に違反／不実／不正確」

・定義語：Indemnifiable Matters／補償対象事項＝R&W違反等（定義文でR&W違反が明示されること）

R5 タイブレーク：補償義務が最も明示的で、かつ最小単位の箇所を優先（§5.8の最小ブロック優先に整合）。

R6 チェーン不成立（アブステイン）：リンクが曖昧・抽象でR&Wへの明示接続が取れない、参照が脚注・別紙のみ、定義が広すぎてR&W特定不能な場合は15に分類しない。

具体例（OK／NGと理由）

OK-1（ホップA：直接参照）

「売主は、買主に対し、第7条（表明保証）の不実または不正確に起因して生じたあらゆる損失につき補償するものとする。」

Effectあり（補償する）、Linkあり（第7条＝R&W直接参照）、Subject明確、Exclusions該当なし。

OK-2（ホップB：定義語経由）

「本契約における『補償対象事項』とは、表明保証の違反に起因して買主に生じた損失をいう。売主は補償対象事項につき買主を補償する。」

Effectあり、Linkは定義語チェーンでR&Wに接続、Subject明確、Exclusions該当なし。

OK-3（英語例：直接参照）

“The Seller shall indemnify and hold harmless the Buyer from any Losses arising out of any breach or inaccuracy of the representations and warranties set forth in Article V.”

Effectあり、R&W直接参照のLink、Subject明確、Exclusionsなし。

OK-4（英語例：定義語経由）

“Indemnifiable Matters means any Losses arising out of a misrepresentation under Section 7 (Representations and Warranties). Seller shall indemnify Buyer against any Indemnifiable Matters.”

Effectあり、定義語→R&WへのLink、Subject明確、Exclusionsなし。

NG-1（一般補償）

「売主は、本契約違反により生じた損失を補償する。」

Effectはあるが、Linkが抽象（本契約違反一般）でR&W特定なし。15不成立（別類型で評価）。

NG-2（IP補償）

「ライセンサーは、第三者の知的財産権侵害に起因する損失を補償する。」

Exclusions（IP補償）に該当。15不成立。

NG-3（R&W側のみ効果語）

「第7条（表明保証）：虚偽があれば損害賠償の責めを負う。」

補償のEffectがR&W本文にしか無く、補償条（最小ブロック）側にEffectが無い。15不成立（他の類型で扱う）。

NG-4（定義が広すぎる）

「補償対象事項＝本契約に関連して生じるすべての損失」

R&Wへの明示リンクなし。15不成立。

6.［内部ガイド：出力禁止］陽性／陰性の対比例（FP抑制・FN削減）

###1COC条項：通知・届出事由
陽性：支配権変動（合併/株式移転/議決権過半数移転等）の際に、対象会社が相手方へ書面で通知する義務。
-陰性
-例1：「相手方は、合併等があったとき当社に通知する。」（義務主体が対象会社でない）
-例2：「経営環境の変化があった場合は協議する。」（COC語がない補助語のみ）
-例3：「支配権変動が予定される場合、両当事者は善意で協議する。」（義務/効果不在）
-例4：「主要役員の交代について告知する。」（支配権変動ではない）

###2COC条項：承諾事由

- 陽性：支配権変動には事前の書面承諾がない限り禁止。
-陰性
-例1：「支配権変更時、事後に承諾申請できる。」（義務化されていない任意）
-例2：「債権譲渡は事前承諾。」（契約上の地位/COCと別）
-例3：「合理的理由なく承諾を拒否しない。」のみ（承諾義務の前提が曖昧）

###3COC条項：期限の利益喪失

- 陽性：支配権変動で催告なく一括弁済・期限利益喪失。
-陰性
-例1：「財務指標違反時に期限利益喪失。」（COC非連動）
-例2：「支払遅滞が一定期間継続した場合のみ一括弁済。」（COC非連動）

###4COC条項：禁止事由

- 陽性：支配権移転又は賃借権等の譲渡を禁止／みなし譲渡含む。
-陰性
-例1：「債権の譲渡禁止。」（地位譲渡と別）
-例2：「相手方側の支配権移転禁止。」（対象会社不利でない）
-例3：「再委託の禁止。」（地位譲渡/COCではない）

###5COC条項：解除事由

- 陽性：支配権変動時に相手方が解除できる。
-陰性
-例1：「MAC（重大な不利な変更）で解除。」（COC語なし）
-例2：「許認可不取得の場合に解除。」（COC非連動）
-例3：「役員が反社会的勢力である場合に解除。」（COC非連動）

###6COC条項：当然終了事由

- 陽性：支配権変動・合併消滅等で契約が自動終了。
-陰性
-例1：「契約期間満了で当然終了。」（COC非連動）
-例2：「サービス提供終了時に失効。」（COC非連動）

###7相手方に中途解約権を認める条項

- 陽性：相手方が○日前通知で便宜的に解約できる。
-陰性
-例1：「対象会社のみが30日前通知で解約可。」（相手方の一方的権利でない）
-例2：「違反時限定の解除（forcause）。」（便宜（forconvenience）でない）
-例3：「自動更新の停止/更新拒絶。」（期間満了扱いで中途解約ではない）
-例4：「不可抗力が一定期間継続した場合の終了。」（便宜解約でない）

###8契約上の地位譲渡制限条項

- 陽性：契約上の地位／権利義務の譲渡/移転/承継/担保を承諾なく禁止。
-陰性
-例1：「成果物の所有権移転禁止。」（地位譲渡でない）
-例2：「相手方側のみ地位譲渡禁止。」（対象会社不利でない）
-例3：「下請け・再委託の制限。」（地位譲渡ではない）
-例4：「法定承継（合併等）は承継される旨の例外条。」（むしろ制限緩和）

###9財務制限条項

- 陽性：指標維持（ネットワース/自己資本比率/レバレッジ/DSCR/ICR）や行為制限（配当/借入/担保/社債/ネガティブ・プレッジ）。
-陰性
-例1：「自己資本比率○％を目標とする。」（努力）
-例2：「決算提出/監査受入のみ。」（制限義務なし）
-例3：「相手方が担保設定できる。」（主体逆）
-例4：「格付けの取得に努める。」（維持義務でない）
-例5：「情報更新を遅滞なく行う。」（制限でなく報告）

###10契約終了時の違約金条項

- 陽性：中途解約・解除に連動して残存期間相当額等の違約金支払い義務。
-陰性
-例1：「相手方が解約する場合、相手方が違約金支払。」（対象会社負担でない）
-例2：「遅延損害金のみ。」（解約に連動しない）
-例3：「事務手数料の実費。」（違約金と性質が異なる）

###11協業避止義務条項

- 陽性：対象会社（及び親会社・関係会社等）が同種/類似/競合事業を直接又は間接に営むことを禁止（期間・地域・対象明示）。
-陰性
-例1：「ノンソリ（従業員・顧客の勧誘禁止）のみ。」（競業禁止でない）
-例2：「相手方のみの競業禁止。」（対象会社不利でない）
-例3：「ブランド/品質基準の遵守。」（競業行為の禁止でない）
-例4：「特定顧客に対する営業の自粛要請。」（努力）

###12独占的な取引義務条項

- 陽性：独占的販売/供給/購入、競合品取扱禁止、第三者販売には事前同意。
-陰性
-例1：「非独占ライセンス。」（独占でない）
-例2：「優先交渉権（ROFR/ROFN）のみ。」（独占ではない）
-例3：「MFC/MFN（最恵待遇）のみ。」（独占でない）
-例4：「特定チャネル推奨。」（法的義務なし）

###13最低購入数量条項

- 陽性：期間あたりの最低/ミニマム/コミット数量義務＋未達ペナルティ（違約金/解除）。
-例1：「注文単位の最小ロット（MOq）のみ。」（期間コミットがない場合であってもリスクありとみなす。）
-例2：「未達時のペナルティが存在しない。」（拘束力不明であってもリスクありとみなす）
-陰性
-例1：「需要予測/販売計画の提示。」（コミットでない）
-例2：「合理的努力で最低数量に努める。」（努力）

###14品質保証条項

- 陽性：仕様適合/契約不適合の是正（修補・交換・再履行）／保証期間／法令・規格適合／非侵害。
-陰性
-例1：「ASIS/現状有姿。」（保証ではなく免責）
-例2：「SLAの稼働率目標に到達しなかった場合、サービスクレジットを付与。」（品質保証条項とは別）
-例3：「相手方が保証する。」（対象会社負担でない）
-例4：「検査合格の定義のみ。」（是正義務が明示されていない）

###15表明保証違反による損失補償条項

- 陽性：表明保証に違反→補償/賠償。
-陰性
-例1：「災害補償/慶弔見舞金。」（R&Wと無関係）
-例2：「IP侵害補償のみ。」（品質/IP保証側で、R&W違反補償ではない）
-例3：「補償という語はあるが、表明保証及び違反への結合がない。」
-例4：「責任制限条項（上限/除外）の定義。」（補償の要件ではない）

###16追加出資義務

- 陽性：追加払込/キャピタルコール等の拠出義務。
-陰性：①検討・協議のみ／②上限超はしない等の負担軽減宣言／③配当方針協議。
-例1：「出資の検討を行う。」（義務でない）
-例2：「上限額を超える出資はしない。」（負担軽減の宣言）
-例3：「配当方針に関する協議。」（出資義務でない）

###17第三者債務の保証

- 陽性：対象会社が第三者債務を連帯保証/保証、経営指導念書等で履行確保を約する。
-陰性
-例1：「対象会社の債務を第三者が保証。」（逆）
-例2：「前払金の返還についての預り金清算。」（保証ではない）
-例3：「履行補助者の不履行に関する債務者の責任。」（第三者債務の保証でない）

###18第三者債務の担保提供

- 陽性：対象会社が自己資産を第三者の債務のために担保設定（抵当/譲渡担保等）。
-陰性
-例1：「自社債務のための担保設定。」（第三者債務でない）
-例2：「第三者から担保提供を受ける。」（逆）
-例3：「譲渡担保の解除条件の記載のみ。」（第三者債務目的の設定が明示されていない）

8.［再現性固定：運用条件／出力禁止］

1入力正規化（必須）
・目的
表記ゆれの影響を排し、同じテキストなら同じ判定を返す。引用は常に原文を切り出して真正性を担保する。
・最小ルール
数字（1/(1)/一/①）、全角半角、％/%、スペース・改行、丸数字・ローマ数字の統一。条/項/号・柱書の機械識別。正規化は内部キーのみで行い、出力の引用は原文を使用。
・外すと起きること
見落とし（「①」「(1)」でパターン外れ）、重複（全角半角差で同一条を別物扱い）、差分が毎回揺れてレビュー不能。
・例
「第十条 (一)」も「第10条 1」も内部キーは「第10条・1号」に束ねるが、引用はそれぞれの原文を返す。

2分割規約（必須）
・目的
判定は“現在ブロック”の本文で完結させ、条をまたぐ勝手な合成（越境合成）を禁止する。
・現在ブロックの決め方
単独で完結する文型は条/項/号がブロック。「柱書に効果、各号に事由」型は「柱書＋当該号」を一体の1ブロックとする（条全体はブロックにしない）。
・許容参照（この最小範囲のみ）
定義条・用語解釈条、前文・当事者表示、同条内の明示クロスリファレンス（前条/本条/前項/当該項/本条各号 等）、当該条に適用される例外規定。
・禁止
暗黙の越境合成、本文から参照のない別紙・脚注の利用。
・外すと起きること
解除（効果）だけ書く条と、別条のCOC定義（事由）を無参照で合体させる誤検出。根拠が説明不能になり監査に耐えない。
・例
第10条「次の各号のいずれかに該当する場合、解除できる」（柱書）＋「一 合併」「二 過半数異動」「三 重要事業譲渡」→現在ブロックは「柱書＋一」「柱書＋二」「柱書＋三」の3件として独立判定。

3曖昧処理（必須）
・目的
成立は“本文（現在ブロック）に効果が明示”されていることを最低条件にし、定義や脚注、参考だけでの成立を排除する。
・成立要件（最低ライン）
類型に対応する効果語（解除／当然終了／期限利益喪失／禁止／承諾要件／通知義務 等）が現在ブロック本文に明示。参照が必要ならS3の許容範囲内。定義のみ・脚注のみ・参考資料のみは不採用。
・外すと起きること
定義や参考に釣られて“あることにする”過読。R&W本文があるだけで補償条なしに類型15を成立と誤判定、など。
・例
R&W本文に「真実かつ正確」があっても、補償条の現在ブロックに「indemnify／補償」が無ければ類型15は不成立。逆に補償条に「Indemnifiable Matters＝第X条R&Wの不実」と定義参照があり、同ブロックに「補償する」が明示なら成立。

出力仕様（Function Calling・必須）
-返答は自然文を出さず、関数 setClassifications を必ず1回だけ呼び出す。リスク0件でも setClassifications({ "classifications": [] }) を呼び出す。
-引数 classifications の各要素：
text (string, 必須)：原文 [A] の逐語一致の連続部分。列挙条で効果=柱書/トリガー=号の場合は、連続性を優先し「該当項の全文」または「条の柱書から当該号までの連続範囲」をtextとし、articleOverviewに柱書、specificClauseに当該号を格納。
type (string, 必須)："1"〜"18" のいずれか（文字列）
reason (string, 必須)：リスクの理由を具体的に説明（注意：Trigger/Effect/Subject等、プロンプト内部処理のために用いている情報は記載しないでください）
pageNumber (integer, 必須)：1始まり／不明は -1
articleInfo (string, 任意)：第X条 / 第X条第Y項 / 第X条第Y項第Z号 / 第X条第W号
articleTitle / articleOverview / specificClause (string, 任意)：あれば設定、無ければ空文字
-並び順：条→項→号の昇順。**同一ブロックは5.7.2で主類型に一意化する（併記不可）。**重複は統合。
-数字は半角。type は数値でなく文字列。`;

    // カスタムプロンプトがある場合は追加
    const systemPrompt = request.prompt && request.prompt !== 'この契約書の条項から、リスクとなりうる条項を抽出してください。'
      ? `${basePrompt}\n\n## 追加の分析指示\n${request.prompt}`
      : basePrompt;

    // Generate content and get function call
    logger.info({ invocationId, func: 'classifyFullContractWithGemini', model: 'gemini-2.5-pro', articlesCount: request.articles?.length ?? 0, risksCount: risks.length, workspaceId: request.workspaceId, targetCompany: request.targetCompany }, 'Gemini call start')
    const result = await model.generateContent(systemPrompt);
    const response = result.response;

    // Extract function calls (Vertex AI structure)
    const functionCall = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    if (functionCall && functionCall.name === 'setClassifications') {
      const classifications = (functionCall.args as any)?.classifications || [];
      logger.info({ invocationId, durationMs: Date.now() - startedAt, outputCount: classifications.length }, 'Gemini call success')

      // Generate unique IDs for each classification
      return classifications.map((c: any) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        text: c.text,
        type: c.type,
        reason: c.reason,
        pageNumber: c.pageNumber || request.currentPage,
        position: { start: 0, end: c.text.length },
        articleInfo: c.articleInfo,
        articleTitle: c.articleTitle,
        articleOverview: c.articleOverview,
        specificClause: c.specificClause
      }));
    }

    return [];
  } catch (error) {
    logger.error({ error }, 'Error classifying full contract with Gemini')
    throw error;
  }
}

/**
 * 全文を一度に分類する関数（後方互換性のため保持）
 */
export async function classifyWithGemini(request: ClassificationRequest): Promise<Classification[]> {
  try {
    const startedAt = Date.now()
    const invocationId = `gemini-${startedAt}-${Math.random().toString(36).slice(2, 8)}`
    // Get dynamic risk types from database
    const { riskTypes } = await getRisksForPrompt(request.workspaceId);

    // Create the model with function calling
    const model = vertexAI.preview.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0,
        topP: 0
      },
      tools: [{
        functionDeclarations: functionDeclarations
      }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.ANY
        }
      }
    });

    // Create the prompt with classification types
    const systemPrompt = `あなたは契約書の条項を分析する専門家です。以下の分類タイプに基づいて、契約書の条項を分類してください：

${riskTypes}

## 重要な指示
該当する条文について、以下の2つの部分を分けて抽出してください：

### 1. 条文の柱書部分（articleOverview）
条文の前文・概要部分のみを抽出してください。各号・項の内容は含めないでください。
例：「次の各号のいずれかに該当する事由が発生した場合、甲は何らの通知なくして、項目表記載の報酬債権について当然に期限の利益を喪失し直ちに乙に弁済しなければならない。」

**重要**: 柱書部分には、「(1)」「(2)」「２」「３」などの具体的な項番号や号番号で始まる内容は含めないでください。

### 2. 具体的な該当項・号（specificClause）
リスク分類に該当する具体的な項・号の内容のみを抽出してください。
例：「(3) 所管官庁より営業の許可取消し停止等の処分を受けたとき支払停止若しくは支払不能の状態に陥ったと又は手形若しくは小切手が不渡りとなったとき」

### 注意事項
- textフィールドには specificClause と同じ内容を入れてください（後方互換性のため）
- articleOverview には条文の前文・概要部分を
- specificClause には該当する具体的な項・号を

## 抽出例
良い例：
- text: "(3) 所管官庁より営業の許可取消し停止等の処分を受けたとき支払停止若しくは支払不能の状態に陥ったと又は手形若しくは小切手が不渡りとなったとき"
- articleInfo: "第19条第3号"
- articleOverview: "次の各号のいずれかに該当する事由が発生した場合、甲は何らの通知なくして、項目表記載の報酬債権について当然に期限の利益を喪失し直ちに乙に弁済しなければならない。"
- specificClause: "(3) 所管官庁より営業の許可取消し停止等の処分を受けたとき支払停止若しくは支払不能の状態に陥ったと又は手形若しくは小切手が不渡りとなったとき"

悪い例（柱書に項番号が混入）：
- articleOverview: "乙は貸室に係る貸借権の譲渡、形態のいかんを問わず貸室の転貸をしたり、本契約に基づく一切の権利を第三者に譲渡し、又は担保の用に供してはならない。２　乙は営業譲渡、合併その他の形式によって..."

正しい例：
- articleOverview: "乙は貸室に係る貸借権の譲渡、形態のいかんを問わず貸室の転貸をしたり、本契約に基づく一切の権利を第三者に譲渡し、又は担保の用に供してはならない。"
- specificClause: "２　乙は営業譲渡、合併その他の形式によって本契約に基づく一切の権利を乙以外の者に包括的に承継させてはならない。"

ユーザーのプロンプト: ${request.prompt}

以下の契約書の内容を分析し、該当する条項を分類してください。
現在のページ番号: ${request.currentPage}

契約書の内容:
${request.documentContent}`;

    // Generate content and get function call
    logger.info({ invocationId, func: 'classifyWithGemini', model: 'gemini-2.5-pro' }, 'Gemini call start')
    const result = await model.generateContent(systemPrompt);
    const response = result.response;

    // Extract function calls (Vertex AI structure)
    const functionCall = response.candidates?.[0]?.content?.parts?.[0]?.functionCall;

    if (functionCall && functionCall.name === 'setClassifications') {
      const classifications = (functionCall.args as any)?.classifications || [];
      logger.info({ invocationId, durationMs: Date.now() - startedAt, outputCount: classifications.length }, 'Gemini call success')

      // Generate unique IDs for each classification
      return classifications.map((c: any) => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        text: c.text,
        type: c.type,
        reason: c.reason,
        pageNumber: c.pageNumber,
        position: { start: 0, end: c.text.length },
        articleInfo: c.articleInfo,
        articleTitle: c.articleTitle,
        articleOverview: c.articleOverview,
        specificClause: c.specificClause
      }));
    }

    return [];
  } catch (error) {
    logger.error({ error }, 'Error classifying with Gemini')
    throw error;
  }
}