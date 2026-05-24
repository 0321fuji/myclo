"use client";

import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import { COORDINATORS } from "@/lib/coordinators";

export default function CoordinatorListPage() {
  return (
    <div className="pb-28">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={18} className="text-rose-400" />
          <h1 className="text-lg font-bold text-stone-800">コーディネーターに相談</h1>
        </div>
        <p className="text-xs text-stone-500">
          4人の個性派スタイリストが、あなたの服でコーデを提案します
        </p>
      </div>

      <div className="p-5 space-y-3">
        {COORDINATORS.map((c) => (
          <Link
            key={c.id}
            href={`/coordinator/${c.id}`}
            className="block bg-white rounded-2xl p-4 border border-stone-100 hover:border-rose-200 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div
                className={`w-16 h-16 rounded-2xl ${c.bgColor} flex items-center justify-center text-3xl flex-shrink-0`}
              >
                {c.emoji}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">
                  {c.category}
                </div>
                <div className="flex items-baseline gap-2 mb-0.5">
                  <h2 className="font-bold text-stone-800">{c.name}</h2>
                  <span className="text-[10px] text-stone-400 tracking-wider">
                    {c.nameEn}・{c.age}
                  </span>
                </div>
                <p className={`text-xs font-medium ${c.accentColor} line-clamp-1`}>
                  {c.tagline}
                </p>
              </div>

              <ChevronRight size={20} className="text-stone-300 flex-shrink-0" />
            </div>
          </Link>
        ))}

        {/* Hint card */}
        <div className="mt-6 bg-rose-50 rounded-2xl p-4">
          <p className="text-xs text-rose-600 leading-relaxed">
            💡 それぞれ得意なテイストや口調が違います。気分や場面に合わせて、相談相手を選んでみてください。
          </p>
        </div>
      </div>
    </div>
  );
}
