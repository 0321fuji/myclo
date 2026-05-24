/**
 * シキ・メソッド ナレッジモジュールの集約
 *
 * 新しいモジュールを追加する手順：
 * 1. src/lib/shiki/{category}/XXX.ts を作成（既存ファイルをコピー）
 * 2. ここに import 追加
 * 3. ALL_KNOWLEDGE_MODULES に追加
 *
 * 以降、LEO（とゆくゆく他コーディネーター）が自動でナレッジを使えるようになる。
 */

import type { KnowledgeModule } from "./types";
import { WIDE_PANTS } from "./techniques/wide-pants";
import { AUTUMN_WEEK } from "./seasonal/autumn-week";
import { BROWN_AXIS } from "./color/brown-axis";

export const ALL_KNOWLEDGE_MODULES: KnowledgeModule[] = [
  WIDE_PANTS,
  AUTUMN_WEEK,
  BROWN_AXIS,
  // 👇 ここに追加していく
];

export { selectKnowledgeModules, formatModulesForPrompt } from "./selector";
export type { KnowledgeModule } from "./types";
