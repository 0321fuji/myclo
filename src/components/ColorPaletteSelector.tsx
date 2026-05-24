"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { COLOR_GROUPS, findColorGroupKey } from "@/lib/colors";

interface Props {
  selected: string[];
  onChange: (next: string[]) => void;
}

export default function ColorPaletteSelector({ selected, onChange }: Props) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // 既に選択されてる色のグループキーを集計
  const selectedGroupKeys = new Set<string>();
  selected.forEach((name) => {
    const key = findColorGroupKey(name);
    if (key) selectedGroupKeys.add(key);
  });

  // 初回マウント時：選択済みの色があれば最初のグループを開いておく
  useEffect(() => {
    if (selected.length > 0 && !expandedGroup) {
      const firstKey = findColorGroupKey(selected[0]);
      if (firstKey) setExpandedGroup(firstKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleColor = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((c) => c !== name)
        : [...selected, name]
    );
  };

  return (
    <div className="space-y-2">
      {/* グループ一覧 */}
      <div className="grid grid-cols-5 gap-2">
        {COLOR_GROUPS.map((group) => {
          const isExpanded = expandedGroup === group.groupKey;
          const hasSelected = selectedGroupKeys.has(group.groupKey);
          const selectedInGroupCount = group.variants.filter((v) =>
            selected.includes(v.name)
          ).length;

          return (
            <button
              key={group.groupKey}
              onClick={() =>
                setExpandedGroup(isExpanded ? null : group.groupKey)
              }
              className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all relative ${
                isExpanded
                  ? "border-stone-800 bg-stone-50"
                  : hasSelected
                  ? "border-rose-300 bg-rose-50"
                  : "border-transparent bg-stone-50"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full ${group.swatchBg} border ${group.swatchBorder}`}
              />
              <span
                className={`text-[10px] font-medium ${
                  isExpanded ? "text-stone-800" : hasSelected ? "text-rose-600" : "text-stone-500"
                }`}
              >
                {group.groupName}
              </span>
              {/* 選択数バッジ */}
              {selectedInGroupCount > 0 && (
                <span className="absolute top-1 right-1 bg-rose-400 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {selectedInGroupCount}
                </span>
              )}
              {/* 展開インジケーター */}
              <ChevronDown
                size={10}
                className={`text-stone-400 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* 展開されたグループのバリエーション */}
      {expandedGroup && (
        <div className="bg-stone-50 rounded-2xl p-3 border border-stone-100">
          <div className="flex items-baseline gap-2 mb-2">
            <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
              {COLOR_GROUPS.find((g) => g.groupKey === expandedGroup)?.groupName}
              のバリエーション
            </p>
            <span className="text-[10px] text-stone-400">複数選択可</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {COLOR_GROUPS.find((g) => g.groupKey === expandedGroup)?.variants.map(
              (v) => {
                const isSel = selected.includes(v.name);
                return (
                  <button
                    key={v.name}
                    onClick={() => toggleColor(v.name)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border-2 ${
                      isSel
                        ? "border-rose-400 bg-white text-rose-600"
                        : "border-transparent bg-white text-stone-600"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full ${v.bg} border ${v.border}`}
                    />
                    {v.name}
                    {v.trend && (
                      <span className="flex items-center gap-0.5 bg-rose-50 text-rose-500 text-[9px] font-bold px-1 py-0.5 rounded-full">
                        <Sparkles size={8} />
                        2026
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}

      {/* 選択中の色リスト */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selected.map((name) => (
            <span
              key={name}
              className="flex items-center gap-1 bg-rose-50 text-rose-600 text-[11px] font-medium px-2 py-1 rounded-full"
            >
              {name}
              <button
                onClick={() => toggleColor(name)}
                className="text-rose-400 hover:text-rose-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
