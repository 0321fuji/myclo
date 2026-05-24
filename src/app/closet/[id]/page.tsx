"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeft,
  Camera,
  Upload,
  Sparkles,
  Check,
  ImageOff,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Category, Silhouette, StyleType, ClothingItemData } from "@/lib/types";
import { CATEGORY_LABELS, STYLE_LABELS } from "@/lib/types";

const CATEGORIES: Category[] = ["tops", "bottoms", "outerwear", "dress", "shoes", "accessories", "bag"];
const SILHOUETTES: Silhouette[] = ["tight", "wide", "long", "short", "oversized", "regular"];
const SILHOUETTE_LABELS: Record<Silhouette, string> = {
  tight: "タイト",
  wide: "ワイド",
  long: "ロング",
  short: "ショート",
  oversized: "オーバーサイズ",
  regular: "レギュラー",
};
const STYLES: StyleType[] = ["casual", "business", "mode", "traditional", "sport"];

const PRESET_COLORS = [
  { name: "ホワイト", bg: "bg-white", border: "border-stone-200" },
  { name: "ブラック", bg: "bg-stone-900", border: "border-stone-900" },
  { name: "グレー", bg: "bg-stone-400", border: "border-stone-400" },
  { name: "ブラウン", bg: "bg-amber-800", border: "border-amber-800" },
  { name: "ベージュ", bg: "bg-amber-100", border: "border-amber-200" },
  { name: "グリーン", bg: "bg-green-500", border: "border-green-500" },
  { name: "ブルー", bg: "bg-blue-500", border: "border-blue-500" },
  { name: "パープル", bg: "bg-purple-500", border: "border-purple-500" },
  { name: "イエロー", bg: "bg-yellow-400", border: "border-yellow-400" },
  { name: "ピンク", bg: "bg-pink-400", border: "border-pink-400" },
  { name: "レッド", bg: "bg-red-500", border: "border-red-500" },
  { name: "オレンジ", bg: "bg-orange-400", border: "border-orange-400" },
  { name: "シルバー", bg: "bg-slate-300", border: "border-slate-300" },
  { name: "ゴールド", bg: "bg-yellow-600", border: "border-yellow-600" },
  { name: "その他", bg: "bg-gradient-to-br from-rose-300 via-blue-300 to-green-300", border: "border-stone-200" },
];

export default function ClothingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [item, setItem] = useState<ClothingItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 編集中のフィールド
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("tops");
  const [silhouette, setSilhouette] = useState<Silhouette>("regular");
  const [colors, setColors] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [style, setStyle] = useState<StyleType>("casual");

  // 初回読み込み
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/clothing/${id}`);
        if (!res.ok) throw new Error("読み込み失敗");
        const data: ClothingItemData = await res.json();
        setItem(data);
        setName(data.name);
        setCategory(data.category);
        setSilhouette(data.silhouette || "regular");
        setColors(data.colors);
        setTags(data.tags);
        setStyle(data.style);
      } catch (e) {
        setError(e instanceof Error ? e.message : "エラー");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleAddImage = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`アップロード失敗 (${res.status})`);
      const data = await res.json();
      if (!data.url) throw new Error("画像URLが取得できませんでした");

      // PATCHで画像URLを保存
      const patchRes = await fetch(`/api/clothing/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: data.url }),
      });
      if (!patchRes.ok) throw new Error("画像の保存に失敗");
      const updated = await patchRes.json();
      setItem({
        ...updated,
        colors: JSON.parse(updated.colors),
        tags: JSON.parse(updated.tags),
      });
      setSavedMsg("写真を追加しました");
      setTimeout(() => setSavedMsg(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラー");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/clothing/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, silhouette, style, colors, tags }),
      });
      if (!res.ok) throw new Error("保存に失敗");
      const updated = await res.json();
      setItem({
        ...updated,
        colors: JSON.parse(updated.colors),
        tags: JSON.parse(updated.tags),
      });
      setEditing(false);
      setSavedMsg("保存しました");
      setTimeout(() => setSavedMsg(null), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラー");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("このアイテムを削除しますか？")) return;
    await fetch(`/api/clothing/${id}`, { method: "DELETE" });
    router.push("/closet");
  };

  const toggleColor = (colorName: string) => {
    setColors((prev) =>
      prev.includes(colorName) ? prev.filter((c) => c !== colorName) : [...prev, colorName]
    );
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) {
      setTags([...tags, v]);
      setTagInput("");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-stone-400">読み込み中...</div>
    );
  }

  if (!item) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500">アイテムが見つかりません</p>
        <button onClick={() => router.push("/closet")} className="mt-4 text-rose-500 text-sm">
          クローゼットに戻る
        </button>
      </div>
    );
  }

  const imageSrc = item.imageBgRemovedUrl || item.imageUrl;

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-stone-100 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-50"
        >
          <ChevronLeft size={20} className="text-stone-600" />
        </button>
        <h1 className="text-lg font-bold text-stone-800 flex-1 truncate">{item.name}</h1>
        <button
          onClick={() => setEditing(!editing)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-50 text-stone-500"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={handleDelete}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-50 text-stone-500"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Image / Add image */}
        <div>
          {imageSrc ? (
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden bg-stone-50 relative">
                <Image
                  src={imageSrc}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="448px"
                  unoptimized={!!item.imageBgRemovedUrl}
                />
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                    <Sparkles size={28} className="text-rose-300 animate-pulse" />
                    <p className="text-white text-sm font-medium">アップロード中...</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute top-2 right-2 bg-white text-stone-500 text-xs px-2 py-1 rounded-full shadow"
              >
                変更
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-stone-100 to-stone-50 flex flex-col items-center justify-center gap-3">
                <ImageOff size={36} className="text-stone-300" />
                <p className="text-sm text-stone-400 font-medium">写真未登録</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                  className="h-12 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center gap-2 bg-stone-50"
                >
                  <Camera size={16} className="text-stone-400" />
                  <span className="text-xs text-stone-500 font-medium">撮影</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-12 rounded-2xl border-2 border-dashed border-stone-200 flex items-center justify-center gap-2 bg-stone-50"
                >
                  <Upload size={16} className="text-stone-400" />
                  <span className="text-xs text-stone-500 font-medium">写真を追加</span>
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleAddImage(e.target.files[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleAddImage(e.target.files[0])}
          />
        </div>

        {/* 成功・エラー表示 */}
        {savedMsg && (
          <div className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2 text-center">
            ✓ {savedMsg}
          </div>
        )}
        {error && (
          <div className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 text-center">
            ⚠️ {error}
          </div>
        )}

        {/* 詳細情報（表示 or 編集） */}
        {!editing ? (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                アイテム名
              </p>
              <p className="text-stone-800">{item.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  カテゴリ
                </p>
                <p className="text-sm text-stone-700">{CATEGORY_LABELS[item.category]}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  スタイル
                </p>
                <p className="text-sm text-stone-700">{STYLE_LABELS[item.style]}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  シルエット
                </p>
                <p className="text-sm text-stone-700">
                  {item.silhouette ? SILHOUETTE_LABELS[item.silhouette] : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
                  着用回数
                </p>
                <p className="text-sm text-stone-700">{item.wornCount}回</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                カラー
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.colors.length > 0 ? (
                  item.colors.map((c) => (
                    <span key={c} className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-stone-400">—</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                タグ
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.length > 0 ? (
                  item.tags.map((t) => (
                    <span key={t} className="text-xs bg-rose-50 text-rose-500 px-2.5 py-1 rounded-full">
                      #{t}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-stone-400">—</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          // 編集モード
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">
                アイテム名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm text-stone-800 border border-stone-100 focus:outline-none focus:border-rose-300"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">
                カテゴリ
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      category === cat
                        ? "bg-stone-800 text-white"
                        : "bg-stone-50 text-stone-500 border border-stone-100"
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">
                シルエット
              </label>
              <div className="flex flex-wrap gap-2">
                {SILHOUETTES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSilhouette(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      silhouette === s
                        ? "bg-stone-800 text-white"
                        : "bg-stone-50 text-stone-500 border border-stone-100"
                    }`}
                  >
                    {SILHOUETTE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">
                スタイル
              </label>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      style === s
                        ? "bg-rose-400 text-white"
                        : "bg-stone-50 text-stone-500 border border-stone-100"
                    }`}
                  >
                    {STYLE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">
                カラー
              </label>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((color) => {
                  const selected = colors.includes(color.name);
                  return (
                    <button
                      key={color.name}
                      onClick={() => toggleColor(color.name)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all ${
                        selected ? "border-rose-400 bg-rose-50" : "border-transparent bg-stone-50"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full ${color.bg} border ${color.border}`} />
                      <span className={`text-[10px] font-medium ${selected ? "text-rose-500" : "text-stone-500"}`}>
                        {color.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">
                タグ
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 bg-rose-50 text-rose-500 text-xs px-2.5 py-1 rounded-full">
                    #{t}
                    <button onClick={() => setTags(tags.filter((x) => x !== t))} className="text-rose-300">
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="タグを追加"
                  className="flex-1 bg-stone-50 rounded-xl px-3 py-2.5 text-sm border border-stone-100 focus:outline-none focus:border-rose-300"
                />
                <button onClick={addTag} className="bg-stone-100 text-stone-600 px-3 rounded-xl text-sm font-medium">
                  追加
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 h-12 rounded-2xl bg-stone-100 text-stone-600 font-medium"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!name.trim() || saving}
                className={`flex-1 h-12 rounded-2xl font-semibold ${
                  !name.trim() || saving
                    ? "bg-stone-100 text-stone-300"
                    : "bg-rose-400 text-white shadow-md"
                }`}
              >
                {saving ? "保存中..." : (<><Check size={18} className="inline" /> 保存</>)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
