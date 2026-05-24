"use client";

import { useState } from "react";
import { findColorVariant } from "@/lib/colors";
import type { ClothingItemData, Category } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

const CATEGORIES: (Category | "all")[] = [
  "all",
  "tops",
  "bottoms",
  "outerwear",
  "dress",
  "shoes",
  "accessories",
  "bag",
];

interface Props {
  items: ClothingItemData[];
}

export default function ColorDistribution({ items }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");

  const filtered =
    activeCategory === "all"
      ? items
      : items.filter((i) => i.category === activeCategory);

  // 色名 -> 出現回数（1アイテムに複数色ある場合は各色をカウント）
  const colorCounts = new Map<string, number>();
  for (const item of filtered) {
    for (const color of item.colors) {
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  }

  const total = Array.from(colorCounts.values()).reduce((a, b) => a + b, 0);

  const sorted = Array.from(colorCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  // 三原色の偏りを判定（簡易インサイト）
  const tally = {
    blue: 0,    // ネイビー、ブルー、サックスブルー、デニム等
    brown: 0,   // ブラウン、ベージュ、キャメル、モカ等
    gray: 0,    // グレー、ブラック、チャコール等
    color: 0,   // それ以外（カラー軸）
  };
  for (const [name, count] of colorCounts) {
    const lower = name.toLowerCase();
    if (lower.includes("ブルー") || lower.includes("ネイビー") || lower.includes("デニム") || lower.includes("サックス") || lower.includes("ターコイズ") || lower.includes("水色")) {
      tally.blue += count;
    } else if (lower.includes("ブラウン") || lower.includes("ベージュ") || lower.includes("キャメル") || lower.includes("モカ") || lower.includes("クリーム") || lower.includes("チョコレート")) {
      tally.brown += count;
    } else if (lower.includes("グレー") || lower.includes("ブラック") || lower.includes("チャコール") || lower.includes("ホワイト") || lower.includes("アイボリー") || lower.includes("オフホワイト")) {
      tally.gray += count;
    } else {
      tally.color += count;
    }
  }
  const insightTotal = tally.blue + tally.brown + tally.gray + tally.color;
  const insights: string[] = [];
  if (insightTotal > 0) {
    const grayPct = (tally.gray / insightTotal) * 100;
    const brownPct = (tally.brown / insightTotal) * 100;
    const bluePct = (tally.blue / insightTotal) * 100;
    if (grayPct > 60) insights.push("グレー・黒・白に偏り。ブラウンかネイビーを足すと幅が広がります");
    if (brownPct < 10 && insightTotal > 5) insights.push("ブラウン軸が手薄。1点足すと「色気・余裕感」が出ます");
    if (bluePct < 10 && insightTotal > 5) insights.push("ネイビー軸が手薄。爽やかさや若々しさを足せます");
    if (tally.color > insightTotal * 0.4) insights.push("カラーアイテム多め。コーデを組む時は1〜2軸に絞ると失敗しません");
  }

  return (
    <div>
      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-none px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
              activeCategory === cat
                ? "bg-stone-800 text-white"
                : "bg-stone-100 text-stone-500"
            }`}
          >
            {cat === "all" ? "すべて" : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="text-stone-400 text-xs text-center py-6">
          色情報のあるアイテムがありません
        </p>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="h-3 rounded-full overflow-hidden flex bg-stone-100 mb-3">
            {sorted.map(([name, count]) => {
              const variant = findColorVariant(name);
              const pct = (count / total) * 100;
              return (
                <div
                  key={name}
                  className={`h-full ${variant?.bg || "bg-stone-400"}`}
                  style={{ width: `${pct}%` }}
                  title={`${name}: ${count}点 (${pct.toFixed(0)}%)`}
                />
              );
            })}
          </div>

          {/* List */}
          <div className="space-y-1.5">
            {sorted.map(([name, count]) => {
              const variant = findColorVariant(name);
              const pct = (count / total) * 100;
              return (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <div
                    className={`w-3 h-3 rounded-full ${variant?.bg || "bg-stone-400"} border ${variant?.border || "border-stone-200"} flex-none`}
                  />
                  <span className="text-stone-700 flex-1 truncate">{name}</span>
                  <span className="text-stone-500 tabular-nums">{count}点</span>
                  <span className="text-stone-400 tabular-nums w-10 text-right">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Insights */}
          {insights.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {insights.map((text, i) => (
                <div
                  key={i}
                  className="text-[11px] text-rose-600 bg-rose-50 rounded-lg px-2.5 py-1.5 leading-relaxed"
                >
                  💡 {text}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
