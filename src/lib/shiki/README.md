# シキ・メソッド ナレッジモジュール

LEO（およびゆくゆく他のコーディネーター）に注入される、シキユウスケ氏のファッション哲学・技法ナレッジを格納します。

NotebookLM等で動画から抽出した内容を、構造化された "モジュール" として追加していくことで、AI への文脈注入を最小コストでスケールさせます。

## アーキテクチャ概要

- **コア哲学**：coordinator の systemPrompt に常駐（LEO の "人格" の一部）
- **ナレッジモジュール**：トピックごとの個別ナレッジ。質問内容に応じて自動注入

```
ユーザー質問
    ↓
selectKnowledgeModules() がトリガーキーワードに基づいて関連モジュールを選択
    ↓
formatModulesForPrompt() がシステムプロンプトに組み込める形に整形
    ↓
GPT-4o-mini に投入
```

## モジュール追加手順

### 1. 動画からナレッジを抽出（NotebookLM 推奨）

例えば「ワイドパンツの動画」をNotebookLMに食わせて：

```
Q: 「ワイドパンツについて言ってることをまとめて」
```

得られた要約を保存。

### 2. 新規モジュールファイル作成

`src/lib/shiki/{category}/XXX.ts` を作成。カテゴリは以下から選択：

- `philosophy/` — 哲学・原則
- `techniques/` — 個別技法（ワイドパンツ、ジャケット等）
- `seasonal/` — シーズン別（秋着回し、SSコーデ等）
- `scenes/` — シーン別（デート、オフィス等）
- `color/` — 配色詳細
- `item/` — アイテム別（レザー、デニム等）

既存ファイル（`techniques/wide-pants.ts`等）をコピーして書き換えるのが楽です。

### 3. 必須フィールドを埋める

```typescript
import type { KnowledgeModule } from "../types";

export const MY_MODULE: KnowledgeModule = {
  id: "tech-jacket-styling",           // 一意ID
  title: "ジャケットの着崩し方",         // 表示名
  category: "technique",
  alwaysLoad: false,                   // 条件付きならfalse
  
  // 質問にこのキーワードが入っていたら採用される（部分一致・大小無視）
  triggers: ["ジャケット", "テーラード", "テーラリング"],
  
  // 将来AI判定で使う説明（今は書くだけでOK）
  description:
    "ユーザーがジャケットの着崩し方や、テーラードを軽快に見せる方法を相談している時に参照する。",
  
  // 同時マッチした時の優先順位（1〜10）
  priority: 7,
  
  // 由来メモ
  source: "https://youtu.be/xxxxx",
  
  // ナレッジ本体（マークダウン）
  content: `
### Tシャツインタックの基本
- ...

### スウェットとの組み合わせ
- ...
  `,
};
```

### 4. index.ts に登録

```typescript
// src/lib/shiki/index.ts
import { MY_MODULE } from "./techniques/jacket-styling";

export const ALL_KNOWLEDGE_MODULES: KnowledgeModule[] = [
  WIDE_PANTS,
  AUTUMN_WEEK,
  MY_MODULE, // 👈 追加
];
```

これだけで、ユーザーが「ジャケットに何合わせる？」と聞いたら自動的にこのナレッジが注入されます。

## トリガー設計のコツ

- 同じ意味の表現は全部列挙する（「ジャケット」「テーラード」「ブレザー」等）
- 大小文字は気にしなくてよい（自動で正規化される）
- 短すぎるトリガーは意図しないマッチを起こす（例：「靴」→「革靴」「靴下」両方マッチ）
- 迷ったら **priority** で調整。10 が最優先

## トークン予算

`selector.ts` の `TOKEN_BUDGET = 2500` がモジュール本文の総量上限。
3つ4つ同時マッチしてもこれを超えないように調整される（優先度が低いものから外れる）。

## Phase 2 への準備

将来 AI判定で選ぶようになった時のために、必ず **`description`** を埋めること。

```
Phase 1（今）: triggers をルールマッチで判定
Phase 2:      description をAIに読ませて「どれを呼ぶ？」を判定
```

`description` がしっかり書かれていれば、Phase 2 への移行はコードの数行変更で完了します。

## カテゴリの目安

| カテゴリ | 使い時 |
|---------|---------|
| `philosophy` | 「色合わせ」「シルエット」など、横断的な原則 |
| `technique` | 個別アイテム/手法（ワイドパンツ、レイヤード等） |
| `seasonal` | 季節ごとの着回し（秋1週間、SS定番等） |
| `scene` | TPO別（デート、オフィス、結婚式等） |
| `color` | 配色の深い話（アズーロ・エ・マローネ詳細など） |
| `item` | アイテム別深堀り（レザー全般、デニム全般等） |
