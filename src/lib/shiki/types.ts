/**
 * シキ・メソッド ナレッジモジュールの型定義
 *
 * LEO（およびゆくゆく他のコーディネーター）に動的に注入される、
 * トピック別の知識ユニット。
 *
 * 設計：
 * - 各モジュールは「トリガー（キーワード）」と「本文」を持つ
 * - 質問にキーワードがマッチしたらシステムプロンプトに自動注入
 * - description はゆくゆくAI判定（Phase 2）で使うフィールド（今は未使用でもOK）
 */

export type ModuleCategory =
  | "philosophy" // 哲学・原則
  | "technique" // 個別技法（ワイドパンツ等）
  | "seasonal" // シーズン別（秋1週間着回し等）
  | "scene" // シーン別（デート、オフィス等）
  | "color" // 配色詳細
  | "item"; // アイテム別（レザー、デニム等）

export interface KnowledgeModule {
  /** 一意ID（例：tech-wide-pants） */
  id: string;

  /** UIや管理画面で見える表示名 */
  title: string;

  /** カテゴリ */
  category: ModuleCategory;

  /** 常時読込（true なら無条件で注入される） */
  alwaysLoad: boolean;

  /** Phase 1：このキーワードが質問に含まれていたら採用される（部分一致・大小無視） */
  triggers: string[];

  /** Phase 2（将来）：AIが「いつ呼ぶか」判定する自然文の説明 */
  description: string;

  /** 同時マッチ時の優先順位（1〜10、高いほど優先） */
  priority: number;

  /** 注入される本文（マークダウン推奨） */
  content: string;

  /** 適用対象のコーディネーターID。空または未指定なら全コーディネーター対象 */
  coordinatorIds?: string[];

  /** 由来動画のURL等（管理メモ） */
  source?: string;

  /** 内部メモ */
  notes?: string;
}
