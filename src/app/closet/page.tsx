"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Filter } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { ClothingItemData, Category } from "@/lib/types";
import { CATEGORY_LABELS, STYLE_LABELS } from "@/lib/types";

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

export default function ClosetPage() {
  const [items, setItems] = useState<ClothingItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clothing");
      const data = await res.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    await fetch(`/api/clothing/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirm(null);
  };

  const filtered =
    activeCategory === "all" ? items : items.filter((i) => i.category === activeCategory);

  const categoryCount = (cat: Category | "all") =>
    cat === "all" ? items.length : items.filter((i) => i.category === cat).length;

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-stone-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-black tracking-widest text-rose-400 mb-0.5">MYCLO</p>
            <h1 className="text-2xl font-bold text-stone-800">クローゼット</h1>
            <p className="text-xs text-stone-400 mt-0.5">{items.length}着登録中</p>
          </div>
          <Link
            href="/closet/add"
            className="flex items-center gap-1.5 bg-rose-400 text-white px-4 py-2.5 rounded-full text-sm font-semibold shadow-sm"
          >
            <Plus size={16} />
            追加
          </Link>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-none flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat
                  ? "bg-stone-800 text-white"
                  : "bg-stone-50 text-stone-500"
              }`}
            >
              {cat === "all" ? "すべて" : CATEGORY_LABELS[cat]}
              <span
                className={`text-[10px] ${
                  activeCategory === cat ? "text-stone-300" : "text-stone-400"
                }`}
              >
                {categoryCount(cat)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-5xl mb-4">👚</p>
            <p className="text-stone-600 font-semibold mb-1">
              {activeCategory === "all" ? "まだ服が登録されていません" : "このカテゴリに服がありません"}
            </p>
            <p className="text-stone-400 text-sm mb-6">
              写真を撮って服を登録しましょう
            </p>
            <Link
              href="/closet/add"
              className="bg-rose-400 text-white px-6 py-3 rounded-full text-sm font-semibold"
            >
              最初の服を追加する
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item) => (
              <div key={item.id} className="relative group">
                <div className="aspect-square rounded-2xl overflow-hidden bg-stone-50 relative">
                  <Image
                    src={item.imageBgRemovedUrl || item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 448px) 50vw, 224px"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
                    <p className="text-white text-xs font-semibold truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-white/70">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <span className="text-[10px] text-white/50">·</span>
                      <span className="text-[10px] text-white/70">
                        {STYLE_LABELS[item.style]}
                      </span>
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    {item.colors.slice(0, 3).map((color, i) => (
                      <span
                        key={i}
                        className="text-[9px] bg-white/80 backdrop-blur-sm text-stone-600 px-1.5 py-0.5 rounded-full"
                      >
                        {color}
                      </span>
                    ))}
                  </div>

                  {/* Worn count badge */}
                  {item.wornCount > 0 && (
                    <div className="absolute top-2 right-2 bg-rose-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      ×{item.wornCount}
                    </div>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(item.id)}
                  className={`absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shadow-md transition-all ${
                    deleteConfirm === item.id
                      ? "bg-red-500 text-white scale-110"
                      : "bg-white text-stone-400 border border-stone-100"
                  }`}
                >
                  {deleteConfirm === item.id ? (
                    <span className="text-[9px] font-bold">削除</span>
                  ) : (
                    <Trash2 size={12} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter count */}
      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-stone-400 pb-2">
          <Filter size={12} />
          {filtered.length}着表示中
        </div>
      )}
    </div>
  );
}
