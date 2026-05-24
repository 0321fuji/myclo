# Knowledge Module Pattern

> AIアシスタントに専門知識を段階的・継続的に注入するための、汎用設計パターン

## 概要

LLMベースのAIアシスタント（ChatGPT、Claude、Geminiなど）に、専門知識を**継続的に・破綻なくスケールさせる**ための設計パターン。

### こんな悩みを解決する

- ✅ システムプロンプトが肥大化してコストが膨らむ
- ✅ 知識を追加しても、AIが取捨選択できず混乱する
- ✅ RAGはやりすぎ・オーバースペックに感じる
- ✅ 知識追加のたびにコードを大きく書き換えたくない
- ✅ 将来 AI判定 / RAG に移行したい時に備えたい

### こんなプロジェクトに向く

| 適用先 | 例 |
|--------|------|
| **専門分野のアドバイザー** | ファッションスタイリスト、栄養士、トレーナー |
| **製品サポート / FAQ Bot** | プラン別の機能説明、トラブルシューティング |
| **教育アシスタント** | 教科別・トピック別のチューター |
| **創作支援AI** | ジャンル別の作法、世界観設定 |
| **法務・税務相談** | 規程別・ケース別の判断材料 |
| **ロールプレイAI** | キャラクター別の個性・知識ベース |

### 向かないケース

- ❌ 知識量が 100万件規模 → RAGの方が適切
- ❌ 知識が完全に静的で 5〜10項目以下 → 単一プロンプトで十分
- ❌ ユーザーが自由にナレッジを編集する必要がある → CMS + DB が必要

---

## なぜRAGや単一プロンプトじゃないのか

### 3つのアプローチ比較

| | **単一プロンプト** | **Knowledge Module（本パターン）** | **RAG** |
|---|---|---|---|
| 知識の形 | 1つの長い文字列 | 構造化モジュール（メタデータ付き） | 任意のテキストの embedding |
| 選択方法 | 選択なし。全部投入 | ルール or AI判定（明示的） | ベクトル類似度（暗黙的） |
| コスト | プロンプト肥大化 | ほぼゼロ（ローカル処理） | embedding API + 検索 |
| スケール | 〜数十件 | 〜数百件 | 100万件規模 |
| キュレーション | 不要 | **必須**（ここが価値） | 不要 |
| 再現性 | 完全に決定的 | 決定的 | 結果が安定しない |
| 実装難易度 | 低 | 中 | 高 |

### Knowledge Module が「ちょうどいい」スイートスポット

- 数十〜数百件の専門知識
- 人間がキュレーションする価値がある
- AIに「ブレずに」答えてほしい
- 段階的に育てたい

---

## アーキテクチャの4要素

```
[ユーザーの質問]
        ↓
┌─────────────────┐
│ ① Module定義      │ KnowledgeModule の型・スキーマ
│   (Schema)        │
└─────────────────┘
        ↓
┌─────────────────┐
│ ② Module保管      │ ディレクトリ構造、index集約
│   (Storage)       │
└─────────────────┘
        ↓
┌─────────────────┐
│ ③ Selector        │ どのモジュールを使うか決定
│   (Selection)     │ Phase 1: キーワード／Phase 2: AI／Phase 3: RAG
└─────────────────┘
        ↓
┌─────────────────┐
│ ④ Injection       │ システムプロンプトに組み込む
│   (Composition)   │
└─────────────────┘
        ↓
[LLMで回答生成]
```

各要素を順に解説。

---

## ① Module 定義（スキーマ）

### TypeScript 例

```typescript
export interface KnowledgeModule {
  /** 一意ID（例：tech-wide-pants） */
  id: string;

  /** 表示名 */
  title: string;

  /** カテゴリ（プロジェクト固有の分類軸） */
  category: ModuleCategory;

  /** 常時読込か（trueなら無条件で注入） */
  alwaysLoad: boolean;

  /** Phase 1: このキーワードが質問に含まれていたら採用される */
  triggers: string[];

  /**
   * Phase 2: AIが「いつ呼ぶか」判定する自然文の説明
   * Phase 1 では使われないが、将来移行時のために必ず埋める
   */
  description: string;

  /** 同時マッチ時の優先度（1〜10） */
  priority: number;

  /** 本文（markdown推奨） */
  content: string;

  /** 適用範囲を絞りたい場合に使う（オプション） */
  applicableContexts?: string[];

  /** 由来メモ */
  source?: string;
}
```

### 設計判断のポイント

| フィールド | 設計理由 |
|-----------|----------|
| `id` | 後でログ集計・参照する時に必要 |
| `triggers` | Phase 1 ですぐ動かすため。「同義語の網羅」が品質を決める |
| `description` | Phase 2/3 に移行する時の準備。今書いておけば後で楽 |
| `priority` | トークン予算オーバー時の自動取捨選択に使う |
| `alwaysLoad` | コア哲学など、常に必要な土台知識のための逃げ道 |

---

## ② Module 保管（ファイル構造）

### 推奨ディレクトリ構造

```
src/lib/{domain}/
├── README.md                       # ナレッジ追加手順書
├── types.ts                        # スキーマ定義
├── selector.ts                     # 選択ロジック
├── index.ts                        # 全モジュール集約
│
├── {category-a}/                   # カテゴリ別サブディレクトリ
│   ├── module-1.ts
│   ├── module-2.ts
│   └── ...
│
├── {category-b}/
│   └── ...
│
└── ...
```

### カテゴリ設計の指針

- **ジャンル / トピック軸** で分ける（哲学・技法・シーン・配色 など）
- **粒度** はファイル1つあたり 200〜1000文字を目安に
- **重複OK**：同じ知識が複数モジュールに出てきても、AIは混乱しない（むしろ強化される）

### index.ts のパターン

```typescript
import { MODULE_A } from "./category-a/module-a";
import { MODULE_B } from "./category-a/module-b";
import { MODULE_C } from "./category-b/module-c";

export const ALL_MODULES: KnowledgeModule[] = [
  MODULE_A,
  MODULE_B,
  MODULE_C,
];

export { selectModules, formatForPrompt } from "./selector";
export type { KnowledgeModule } from "./types";
```

---

## ③ Selector（選択ロジック）

### Phase 1: キーワードトリガー

```typescript
export function selectModules(
  userMessage: string,
  allModules: KnowledgeModule[]
): KnowledgeModule[] {
  const TOKEN_BUDGET = 2500;
  const result: KnowledgeModule[] = [];
  let used = 0;

  // 1. 常時読込
  const always = allModules
    .filter(m => m.alwaysLoad)
    .sort((a, b) => b.priority - a.priority);

  // 2. キーワードマッチ
  const lower = userMessage.toLowerCase();
  const conditional = allModules
    .filter(m => !m.alwaysLoad)
    .filter(m => m.triggers.some(t => lower.includes(t.toLowerCase())))
    .sort((a, b) => b.priority - a.priority);

  // 3. トークン予算内で採用
  for (const m of [...always, ...conditional]) {
    const cost = m.content.length;
    if (used + cost > TOKEN_BUDGET && !m.alwaysLoad) continue;
    result.push(m);
    used += cost;
  }

  return result;
}
```

**メリット**：
- 実装最速、テスト容易、コストゼロ
- 「このキーワード → このモジュール」と挙動が完全予測可能

**デメリット**：
- 言い換えに弱い（trigger漏れに気づきにくい）
- 暗黙的な文脈（「フォーマルな場で恥ずかしくない感じ」など）を拾えない

### Phase 2: AI判定（≒ Claude Skills）

```typescript
// 第1ステップ：軽量モデルにモジュール選択させる
const moduleIndex = allModules.map(m => ({
  id: m.id,
  description: m.description,
}));

const selectionResponse = await ai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content: "ユーザーの質問内容から、参照すべきナレッジモジュールのIDを最大3つ選んでください。",
    },
    {
      role: "user",
      content: `利用可能モジュール:\n${JSON.stringify(moduleIndex)}\n\nユーザー質問: ${userMessage}`,
    },
  ],
  response_format: { type: "json_object" },
});

const ids = JSON.parse(selectionResponse.choices[0].message.content || "{}").ids;
const selected = allModules.filter(m => ids.includes(m.id));

// 第2ステップ：本回答を生成
const reply = await ai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    { role: "system", content: buildSystemPrompt(selected) },
    { role: "user", content: userMessage },
  ],
});
```

**メリット**：
- 文脈で判断できる（言い換えやニュアンス対応）
- description だけで管理できる

**デメリット**：
- AI呼び出しが2回になりレイテンシ +1秒程度
- 軽微なコスト増（gpt-4o-miniなら微々たる額）

### Phase 3: RAG

100モジュール超え or ユーザー自由入力のナレッジが必要になったら検討。

```
Module の content を embedding化 → ベクトルDB（Supabase pgvector, Pinecone）に保存
質問を embedding化 → 類似度検索 → 上位 N 件を採用
```

---

## ④ Injection（プロンプト組込）

```typescript
function buildSystemPrompt(
  basePrompt: string,
  selectedModules: KnowledgeModule[],
  userContext: UserContext
): string {
  const knowledge = selectedModules
    .map(m => `## ${m.title}\n${m.content.trim()}`)
    .join("\n\n---\n\n");

  return `${basePrompt}

# 参照するナレッジ
${knowledge}

# ユーザー情報
${formatUserContext(userContext)}
`;
}
```

---

## トリガー設計のベストプラクティス

### 同義語を網羅する

```typescript
// ❌ 不十分
triggers: ["ワイドパンツ"]

// ✅ 良い
triggers: [
  "ワイドパンツ",
  "ワイド",
  "太いパンツ",
  "極太",
  "ボリュームパンツ",
  "バギー",
]
```

### 短すぎるキーワードを避ける

```typescript
// ❌ 「靴」だと「革靴」「靴下」両方マッチする
triggers: ["靴"]

// ✅ より具体的に
triggers: ["靴の選び方", "シューズ", "革靴", "スニーカー"]
```

### 優先度の設計指針

| Priority | 用途 |
|----------|------|
| 9〜10 | 哲学・基本原則・常時参照 |
| 6〜8 | 主要技法・頻出シーン |
| 3〜5 | 補助知識・周辺トピック |
| 1〜2 | アーカイブ・参考程度 |

---

## トークン予算管理

### なぜ必要か

- LLMのコンテキストウィンドウは有限（GPT-4o: 128k tokens）
- だが**長いプロンプトは応答品質を下げる**（"Lost in the middle" 現象）
- 経験則：システムプロンプトは 5,000〜8,000 tokens 以内に収めると質が保たれる

### 推奨予算配分（システムプロンプト全体 = 8,000 tokens 想定）

```
- 基本ペルソナ / 役割定義      : 1,500
- ユーザープロファイル          : 500
- 外部コンテキスト（トレンド等）: 500
- ナレッジモジュール（動的）     : 2,500  ← この予算で本パターンを設計
- 動的データ（履歴・所持品等）   : 3,000
```

予算オーバー時：**`priority` の低いモジュールから自動除外**するロジックを必ず入れる。

---

## 失敗パターンと対策

### ❌ パターン1：トリガーが広すぎて誤発動

**症状**：「服」というトリガーで、服に関するあらゆる質問にマッチしてしまう

**対策**：
- キーワードを具体化
- AND条件を導入する場合はカスタムロジック
- Phase 2（AI判定）への移行を検討

### ❌ パターン2：モジュール間の矛盾

**症状**：モジュールAは「Xすべき」、モジュールBは「Xすべきでない」と言っている

**対策**：
- ナレッジ追加時のレビュープロセス
- 同じトピックの記述は1モジュールに集約する設計判断
- 「より新しい/優先度高い方を信頼せよ」と systemPrompt で指示

### ❌ パターン3：ナレッジの陳腐化

**症状**：時間が経って古い情報が残っている

**対策**：
- `source` フィールドに由来と日付を必ず記載
- 定期的なナレッジ棚卸し（半年に1回）
- 動画・記事の更新があったらモジュールも更新

### ❌ パターン4：使われないモジュール

**症状**：作ったけどトリガーが弱くて一度も読まれない

**対策**：
- ログでモジュール利用率を集計
- ユーザー質問のサンプルを集めてトリガー逆引き調整
- 利用率0が3ヶ月続いたら削除も検討

---

## 段階的移行ロードマップ

```
[Stage 0]
単一プロンプトで運用
↓ ナレッジが10件超え、コスト/品質に課題
[Stage 1] 本パターン Phase 1（キーワードトリガー）導入
↓ ナレッジが50件超え、トリガー設計が辛くなる
[Stage 2] Phase 2（AI判定）に移行 ※description を活用
↓ ナレッジが300件超え、ユーザー自由入力も必要
[Stage 3] RAG（ベクトル検索）に移行
```

**重要**：Stage 1 から description を書いておけば、Stage 2 への移行はコード数行の変更で完了する。

---

## 適用事例テンプレート

### 例1: パーソナル○○アドバイザー

```
src/lib/{domain}/
├── philosophy/         # 基本哲学
├── techniques/         # 具体的な技法
├── seasonal/           # 時期別ノウハウ
├── scenes/             # シーン別対応
└── ...
```

### 例2: 製品サポートBot

```
src/lib/support-kb/
├── core/               # 共通基礎情報
├── features/           # 機能別の使い方
├── plans/              # プラン別の制約
├── troubleshooting/    # トラブル別の対処
└── billing/            # 課金関連
```

### 例3: 教育チューター

```
src/lib/curriculum/
├── basics/             # 基礎知識
├── topics/             # トピック別解説
├── exercises/          # 演習パターン
└── study-tips/         # 学習法
```

### 例4: ロールプレイAI

```
src/lib/character/
├── persona/            # キャラ設定
├── world/              # 世界観
├── lore/               # 過去の出来事
├── relationships/      # 他キャラとの関係
└── tropes/             # 行動パターン
```

---

## 実装チェックリスト

導入時に以下を確認すると良い：

- [ ] `KnowledgeModule` インターフェースが定義されている
- [ ] `id`, `triggers`, `description`, `content`, `priority` を必須フィールドにしている
- [ ] selector がトークン予算を強制している
- [ ] 常時読込（alwaysLoad）の概念がある
- [ ] index.ts で全モジュールを集約している
- [ ] カテゴリ別のディレクトリ構造になっている
- [ ] 各モジュールのメタデータ（source, notes）を記録している
- [ ] ログ出力で「どのモジュールが選ばれたか」を確認できる
- [ ] README.md にナレッジ追加手順を書いている
- [ ] description を未来のPhase 2に向けて埋めている

---

## まとめ

このパターンの核心は：

> **「コードではなくコンテンツでAIを賢くする」**

- 1モジュール追加 = ファイル1つ作成 + import1行追加
- それだけで AI の専門性がスケールする
- Phase 2/3 への移行も同じスキーマで連続的に進化できる

**Knowledge Module は、Claude Skills 的な「文脈エンジニアリング」を実装する最もシンプルな形** と言えます。

---

## リファレンス実装

このプロジェクト（MYCLO）の `src/lib/shiki/` 配下が参考実装です：

- `types.ts` — スキーマ定義
- `selector.ts` — Phase 1 セレクタ
- `index.ts` — モジュール集約
- `color/`, `seasonal/`, `techniques/` — カテゴリ別モジュール群
- `README.md` — ナレッジ追加手順

ご自由に他プロジェクトへ流用してください。
