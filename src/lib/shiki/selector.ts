import type { KnowledgeModule } from "./types";

/**
 * トークン予算（おおまかな日本語文字数を1トークン想定）
 * - 全体システムプロンプトのうち、ナレッジモジュールに使う予算
 * - 哲学・トレンド・プロフィール・服一覧の残り分を考慮して2500程度
 */
const TOKEN_BUDGET = 2500;

/**
 * 雑にトークン数を見積もる（日本語は1文字≒1トークンとして計算）
 */
function estimateTokens(text: string): number {
  return text.length;
}

/**
 * 質問に応じて使うべきナレッジモジュールを選ぶ
 *
 * Phase 1：alwaysLoad → triggersキーワードマッチ の単純ロジック
 * Phase 2 で AI判定に切り替える際もこの関数のシグネチャを保つ
 *
 * @param userMessage  ユーザーの最新メッセージ
 * @param allModules   全モジュール
 * @param coordinatorId 現在のコーディネーターID
 * @returns 採用するモジュール群（優先度順）
 */
export function selectKnowledgeModules(
  userMessage: string,
  allModules: KnowledgeModule[],
  coordinatorId: string
): KnowledgeModule[] {
  // 1. このコーディネーターが使えるモジュールに絞る
  const usableModules = allModules.filter(
    (m) => !m.coordinatorIds || m.coordinatorIds.length === 0 || m.coordinatorIds.includes(coordinatorId)
  );

  // 2. 常時読込モジュールを採用（優先度降順）
  const alwaysModules = [...usableModules]
    .filter((m) => m.alwaysLoad)
    .sort((a, b) => b.priority - a.priority);

  // 3. トリガーマッチした条件付きモジュールを採用（優先度降順）
  const lowerMsg = userMessage.toLowerCase();
  const conditionalCandidates = [...usableModules]
    .filter((m) => !m.alwaysLoad)
    .filter((m) =>
      m.triggers.some((t) => lowerMsg.includes(t.toLowerCase()))
    )
    .sort((a, b) => b.priority - a.priority);

  // 4. トークン予算内に収まる範囲で採用
  const result: KnowledgeModule[] = [];
  let tokenUsed = 0;

  for (const m of [...alwaysModules, ...conditionalCandidates]) {
    const cost = estimateTokens(m.content);
    if (tokenUsed + cost > TOKEN_BUDGET && !m.alwaysLoad) continue;
    result.push(m);
    tokenUsed += cost;
  }

  return result;
}

/**
 * 採用したモジュール群をシステムプロンプト用の文字列に整形
 */
export function formatModulesForPrompt(modules: KnowledgeModule[]): string {
  if (modules.length === 0) return "";

  const sections = modules
    .map((m) => `## ${m.title}\n${m.content.trim()}`)
    .join("\n\n---\n\n");

  return `# 参照するナレッジ（このトピックに関する知見）

${sections}`;
}
