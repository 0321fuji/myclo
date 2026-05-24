# Knowledge Module Pattern × Support AI

> 本ドキュメントは [Knowledge Module Pattern](./knowledge-modules-pattern.md) を **サポートAI / FAQ Bot / カスタマーサクセス AI** 領域に適用するためのガイド。エンジニアに対して既存アーキテクチャと比較しながら導入を検討するための実務向け資料。

---

## 想定読者

- 自社で AIチャットボット / サポートAI を開発・運用している
- 現状の課題感：プロンプト肥大化、ナレッジ更新の負担、回答品質のブレ
- RAG は使っているが「これじゃない感」がある or オーバースペックに感じる

---

## サポートAIで「よくある詰まり」と本パターンの対応

| 詰まりポイント | 既存アプローチの問題 | Knowledge Module ならどう解決するか |
|--------------|--------------------|-----------------------------------|
| **プラン別の機能差を答えさせたい** | 単一プロンプトに全プランの情報を詰め込み、AIが取り違える | プラン別モジュールに分離、ユーザーのプラン情報をトリガーに |
| **製品の機能数が多くて全部入りきらない** | RAGでチャンク化したらコンテキスト崩壊 | 機能別モジュールを質問内容で自動選択 |
| **専門オペレーター向けの判断材料** | 全部のSOPをプロンプトに入れて遅い | エスカレーション条件・判断基準ごとにモジュール化 |
| **時期限定キャンペーン情報** | ハードコードして毎回コード変更 | キャンペーン用モジュールを期間限定で `alwaysLoad: true` に |
| **ナレッジ追加にエンジニアが必要** | ドキュメント更新→デプロイ→人手の手間 | モジュール = ファイル1つ。CSチームが追加可能な構造に |
| **回答ブレ・幻覚** | RAG検索精度が不安定 | 明示的なキュレーションで決定的な回答 |

---

## 既存アーキテクチャ別の組み込み方

### パターンA：単一プロンプトAI → Module化

```
[Before] system prompt: 50,000 tokens（全機能・全プラン情報の塊）
   ↓
[After]
  - philosophy/: コアトーン、回答方針（常時読込）
  - features/: 機能別モジュール（条件読込）
  - plans/: プラン別モジュール（ユーザー情報から自動選択）
  - troubleshooting/: トラブル種別モジュール
```

**効果**：
- プロンプトサイズが 50k → 8k に縮小（コスト 1/6）
- 応答品質向上（"Lost in the middle"回避）

### パターンB：RAG運用中 → ハイブリッド化

**RAGと完全に競合しない**。むしろ補完関係：

```
[ハイブリッド構成]

ユーザー質問
   ↓
┌──────────────────────────────────────────┐
│ ① Knowledge Module Selector              │
│   ・構造化された判断ロジック・ポリシー       │
│   ・プラン別/機能別の決定的な情報            │
│   ・トリガーで確実に呼び出される             │
└──────────────────────────────────────────┘
                +
┌──────────────────────────────────────────┐
│ ② RAG（ベクトル検索）                       │
│   ・自由記述ヘルプ記事                       │
│   ・過去の問い合わせログ                      │
│   ・更新頻度が高い情報                       │
└──────────────────────────────────────────┘
   ↓
両方の結果を統合してプロンプトに注入
```

**棲み分けの目安**：
- **Module向け**：判断ロジック、ポリシー、ルールベースの情報、頻度の高いFAQ
- **RAG向け**：詳細マニュアル、過去ログ、ユーザー投稿、低頻度の長文情報

### パターンC：Fine-tuning運用中 → 部分的に置換

Fine-tuningは品質高いがコスト・サイクルタイムが重い。**変化頻度の高い部分だけ Module 化** すると改善早い：

- 不変的な振る舞い（トーン、出力フォーマット）→ Fine-tuning
- 頻繁に更新される情報（機能、ポリシー、価格）→ Knowledge Module

---

## 具体的な適用例（カスタマーサポート文脈）

### 例1: SaaSプロダクトのチャットボット

```
src/lib/support-kb/
├── core/
│   ├── tone-and-style.ts          # 回答トーン
│   ├── escalation-policy.ts       # エスカレーション条件
│   └── refund-policy.ts           # 返金規定
├── features/
│   ├── billing.ts                 # 課金機能
│   ├── team-management.ts         # チーム管理
│   ├── api-access.ts              # API
│   └── integrations/              # 連携別
│       ├── slack.ts
│       └── salesforce.ts
├── plans/
│   ├── free.ts                    # 無料プラン制約
│   ├── starter.ts                 # スターター
│   ├── business.ts                # ビジネス
│   └── enterprise.ts              # エンタープライズ
├── troubleshooting/
│   ├── login-issues.ts
│   ├── api-errors.ts
│   └── data-sync.ts
└── campaigns/
    └── 2026-spring-promo.ts       # 期間限定情報
```

**ポイント**：
- ユーザーセッションから取得した **plan** をトリガーに `plans/{plan}.ts` を強制ロード
- 質問内容から `features/` `troubleshooting/` をマッチ
- 期間限定の campaigns は `alwaysLoad: true` を期間中だけ true に

### 例2: ECサイトのCSサポートBot

```
src/lib/cs-kb/
├── policies/
│   ├── shipping.ts
│   ├── returns.ts
│   └── warranty.ts
├── product-categories/
│   ├── electronics.ts
│   ├── apparel.ts
│   └── food.ts
├── order-status/
│   ├── pending.ts                 # 注文受付後
│   ├── shipped.ts                 # 発送済
│   └── delivered.ts               # 配達完了
└── seasonal/
    ├── holidays.ts                # 年末年始対応
    └── black-friday.ts
```

### 例3: 社内向けITサポートBot

```
src/lib/internal-it/
├── onboarding/                    # 新入社員向け
├── devices/                       # PC/モニタ等
├── access-management/             # 権限申請
├── security-policies/             # セキュリティポリシー
└── department-specific/           # 部署別ルール
    ├── engineering.ts
    ├── sales.ts
    └── hr.ts
```

---

## エンジニア向けFAQ（よく聞かれる項目）

### Q1: RAGじゃダメなんですか？

**A**: RAGと併用がベスト。RAGは「全文検索の高度版」、Knowledge Moduleは「構造化された判断材料の提供」と捉えると棲み分け明確。

- RAG単独だと、ポリシー判断やプラン別ロジックが揺れる
- Knowledge Module単独だと、自由記述記事の網羅は限界
- **両方使う**のが企業向けサポートAIの正解

### Q2: 既存の長いシステムプロンプトからの移行コストは？

**A**: 段階的に行えるので低リスク。

1. 既存プロンプトを論理的なブロックに分割
2. 各ブロックを Module 化（最初は `alwaysLoad: true` で）
3. 1つずつ `alwaysLoad: false` に変更し、適切な triggers を設定
4. ABテストで品質確認
5. 順次置き換え

完全移行まで段階を踏めるので**ビッグバン書き換えは不要**。

### Q3: モジュールのテストってどうします？

**A**: 通常のユニットテスト + プロンプトテスト：

```typescript
// ユニットテスト：セレクタが正しいモジュールを返すか
describe("selectModules", () => {
  it("billing trigger picks billing module", () => {
    const selected = selectModules("料金プラン教えて", ALL_MODULES);
    expect(selected.map(m => m.id)).toContain("plan-pricing");
  });
});

// プロンプトテスト：LLMが期待した回答を返すか
describe("Support AI integration", () => {
  it("enterprise plan question mentions SLA", async () => {
    const reply = await callSupportAI({
      userPlan: "enterprise",
      question: "サポート対応時間は？"
    });
    expect(reply).toContain("SLA");
  });
});
```

### Q4: 観測性（オブザーバビリティ）はどう確保する？

**A**: 各リクエストで以下をログに出す：

```typescript
console.log({
  userId,
  question,
  selectedModuleIds: selected.map(m => m.id),
  tokenUsed: estimateTokens(selected),
  latency,
  cost,
});
```

これにより：
- どのモジュールがよく使われるか集計可能
- 使われないモジュールは要見直し
- 「このタイプの質問にこのモジュールが効いてない」が可視化

### Q5: バージョニング・ロールバックは？

**A**: モジュール = TypeScriptファイル なので、Gitで完全に管理。

- 通常のPRレビューフロー
- 変更履歴は `git log`
- ロールバックは revert
- Feature flag と組み合わせれば段階的ロールアウトも可能

### Q6: 非エンジニア（PM、CS担当）が編集できますか？

**A**: 2つのアプローチ：

**アプローチA：Git運用に取り込む**
- CS担当に GitHub アカウントを発行
- マークダウン形式の content だけ編集
- レビュー後にマージ

**アプローチB：管理画面を作る**
- モジュールを DB に移行
- 管理UIから編集（CMS的）
- スキーマだけ保ったまま

最初は A、規模が大きくなったら B が現実的。

### Q7: 多言語対応は？

**A**: モジュールに `locale` フィールドを追加：

```typescript
{
  id: "billing-info",
  locale: "ja",   // or "en", "zh", etc.
  ...
}
```

セレクタで `user.locale` を見て該当言語のモジュールだけフィルタ。同じトピックの多言語版を `id` で揃えると管理しやすい。

---

## 提案時のトーキングポイント

エンジニアチーム / マネージャーに説明する時の論点：

### 課題提起

- 「ユーザーの質問の文脈次第で、回答品質が安定しない」
- 「プロダクト変更のたびに、AIの応答も検証が必要で重い」
- 「RAGだけだと、判断ロジックや排他的条件の表現が難しい」

### 解決アプローチ

- 「判断材料を構造化したモジュールに分けて、必要な時だけ注入する」
- 「RAGの代替ではなく、補完として使う」
- 「Phase 1 はキーワードトリガー、Phase 2 で AI判定にスムーズ移行できる」

### ROI観点

| 観点 | 想定インパクト |
|------|--------------|
| トークンコスト | プロンプト縮小で **30-70% 削減** |
| レスポンス品質 | "Lost in the middle"回避で **CSAT向上** |
| 開発サイクル | コード変更不要、コンテンツ追加だけ → **更新リードタイム短縮** |
| 障害耐性 | 決定的なロジック分離で **誤回答率低下** |

### 段階的導入提案

```
Week 1-2: PoC（1つのモジュール群で実証）
Week 3-4: 既存ナレッジの分類・モジュール化
Month 2-3: 段階的に既存システムを置換
Month 4+: AI判定（Phase 2）に進化検討
```

---

## 共有する時の注意

このパターン自体は誰でも自由に使える設計思想。ただし：

- **本リポジトリの LEO / シキ・メソッド部分はファッション領域固有**なので、シェア時は除外
- 共有するのは `docs/knowledge-modules-pattern.md` と `docs/knowledge-modules-for-support-ai.md` の2本
- 参考実装は `src/lib/shiki/` のディレクトリ構造とサンプルコード（型・セレクタ）まで

---

## まとめ

サポートAIに本パターンを適用する価値：

1. **コスト削減** — プロンプト肥大化を回避
2. **品質安定** — 必要な情報だけ集中させる
3. **更新容易性** — エンジニア依存を下げる
4. **段階的進化** — Phase 1 → 2 → 3 で連続的にスケール
5. **RAGとの相補性** — 既存投資を捨てずに補完できる

「次世代の Support AI 設計の基盤」として、ぜひ社内で議論の起点にしてみてください。

---

## リファレンス

- [Knowledge Module Pattern（汎用設計）](./knowledge-modules-pattern.md)
- [Anthropic Skills - Claude Skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)（類似のコンセプト）
- 本リポジトリの参考実装：`src/lib/shiki/`
