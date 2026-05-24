"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Filter, ImageOff, LayoutGrid, List, ChevronRight } from "lucide-react";
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

type ViewMode = "grid" | "list";

export default function ClosetPage() {
  const [items, setItems] = useState<ClothingItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // 表示モードをlocalStorageで永続化
  useEffect(() => {
    const saved = localStorage.getItem("closet-view-mode");
    if (saved === "grid" || saved === "list") setViewMode(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("closet-view-mode", viewMode);
  }, [viewMode]);

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
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-black tracking-widest text-rose-400 mb-0.5">MYCLO</p>
            <h1 className="text-2xl font-bold text-stone-800">クローゼット</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-stone-400">{items.length}着登録中</p>
              <span className="text-stone-200">·</span>
              {/* View Toggle */}
              <div className="flex bg-stone-100 rounded-full p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                    viewMode === "grid" ? "bg-white text-stone-700 shadow-sm" : "text-stone-400"
                  }`}
                  aria-label="グリッド表示"
                >
                  <LayoutGrid size={12} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                    viewMode === "list" ? "bg-white text-stone-700 shadow-sm" : "text-stone-400"
                  }`}
                  aria-label="リスト表示"
                >
                  <List size={12} />
                </button>
              </div>
            </div>
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

      {/* Items */}
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
        ) : viewMode === "grid" ? (
          // ===== GRID VIEW =====
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((item) => {
              const imageSrc = item.imageBgRemovedUrl || item.imageUrl;
              return (
                <Link href={`/closet/${item.id}`} key={item.id} className="relative group block">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-stone-50 relative">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 448px) 50vw, 224px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-stone-100 to-stone-50">
                        <ImageOff size={28} className="text-stone-300" />
                        <span className="text-[10px] text-stone-400 font-medium px-2 text-center">
                          写真未登録
                        </span>
                      </div>
                    )}
                    {imageSrc && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    )}
                    <div className={`absolute bottom-0 left-0 right-0 px-3 py-2 ${imageSrc ? "" : "bg-white/60 backdrop-blur-sm"}`}>
                      <p className={`text-xs font-semibold truncate ${imageSrc ? "text-white" : "text-stone-700"}`}>{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] ${imageSrc ? "text-white/70" : "text-stone-500"}`}>
                          {CATEGORY_LABELS[item.category]}
                        </span>
                        <span className={`text-[10px] ${imageSrc ? "text-white/50" : "text-stone-400"}`}>·</span>
                        <span className={`text-[10px] ${imageSrc ? "text-white/70" : "text-stone-500"}`}>
                          {STYLE_LABELS[item.style]}
                        </span>
                      </div>
                    </div>
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
                    {item.wornCount > 0 && (
                      <div className="absolute top-2 right-2 bg-rose-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        ×{item.wornCount}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
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
                </Link>
              );
            })}
          </div>
        ) : (
          // ===== LIST VIEW =====
          <div className="space-y-2">
            {filtered.map((item) => {
              const imageSrc = item.imageBgRemovedUrl || item.imageUrl;
              return (
                <Link
                  href={`/closet/${item.id}`}
                  key={item.id}
                  className="flex items-center gap-3 bg-white rounded-2xl p-2.5 border border-stone-100 active:scale-[0.98] transition-all"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-50 relative flex-none">
                    {imageSrc ? (
                      <Image
                        src={imageSrc}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-50">
                        <ImageOff size={18} className="text-stone-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-stone-800 truncate">{item.name}</p>
                      {item.wornCount > 0 && (
                        <span className="flex-none bg-rose-50 text-rose-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          ×{item.wornCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-stone-500">
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      <span className="text-[10px] text-stone-300">·</span>
                      <span className="text-[11px] text-stone-500">
                        {STYLE_LABELS[item.style]}
                      </span>
                      {item.colors.length > 0 && (
                        <>
                          <span className="text-[10px] text-stone-300">·</span>
                          <span className="text-[11px] text-stone-500 truncate">
                            {item.colors.slice(0, 2).join("・")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Delete + Chevron */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-none transition-all ${
                      deleteConfirm === item.id
                        ? "bg-red-500 text-white"
                        : "bg-stone-50 text-stone-400"
                    }`}
                  >
                    {deleteConfirm === item.id ? (
                      <span className="text-[9px] font-bold">削除</span>
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                  <ChevronRight size={16} className="text-stone-300 flex-none" />
                </Link>
              );
            })}
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
