"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, Sparkles, ChevronLeft, Check } from "lucide-react";
import Image from "next/image";
import type { Category, Silhouette, StyleType } from "@/lib/types";
import { CATEGORY_LABELS, STYLE_LABELS } from "@/lib/types";

interface TagSuggestion {
  name: string;
  category: Category;
  silhouette: Silhouette;
  colors: string[];
  tags: string[];
  style: StyleType;
}

const CATEGORIES: Category[] = ["tops", "bottoms", "outerwear", "dress", "shoes", "accessories", "bag"];

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

export default function AddClothingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("tops");
  const [silhouette, setSilhouette] = useState<Silhouette>("regular");
  const [colors, setColors] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [style, setStyle] = useState<StyleType>("casual");
  const [aiSuggested, setAiSuggested] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    setImageFile(file);
    setUploadError(null);
    setSaveError(null);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    // Upload image
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`アップロード失敗 (${res.status})`);
      const data = await res.json();
      if (!data.url) throw new Error("画像URLが取得できませんでした");
      setUploadedUrl(data.url);

      // Auto-analyze (tags only - bg removal happens in background after save)
      setAnalyzing(true);
      const tagRes = await fetch("/api/clothing/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: data.url }),
      });
      const suggestion: TagSuggestion = await tagRes.json();
      setName(suggestion.name || "");
      setCategory(suggestion.category || "tops");
      setSilhouette(suggestion.silhouette || "regular");
      setColors(suggestion.colors || []);
      setTags(suggestion.tags || []);
      setStyle(suggestion.style || "casual");
      setAiSuggested(true);
    } catch (e) {
      console.error(e);
      setUploadError(e instanceof Error ? e.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  }, []);

  const handleSave = async () => {
    if (!uploadedUrl || !name) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/clothing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          silhouette,
          colors,
          tags,
          style,
          imageUrl: uploadedUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `保存失敗 (${res.status})`);
      }
      setSaved(true);
      setTimeout(() => router.push("/closet"), 1000);
    } catch (e) {
      console.error(e);
      setSaveError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const toggleColor = (colorName: string) => {
    setColors(prev =>
      prev.includes(colorName) ? prev.filter(c => c !== colorName) : [...prev, colorName]
    );
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) {
      setTags([...tags, v]);
      setTagInput("");
    }
  };

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
        <h1 className="text-lg font-bold text-stone-800">服を追加</h1>
      </div>

      <div className="p-5 space-y-5">
        {/* Image Upload */}
        <div>
          {imagePreview ? (
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden bg-stone-50 relative">
                <Image src={imagePreview} alt="preview" fill className="object-cover" sizes="448px" />
                {(uploading || analyzing) && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                    <Sparkles size={28} className="text-rose-300 animate-pulse" />
                    <p className="text-white text-sm font-medium">
                      {uploading ? "アップロード中..." : "AIが分析中..."}
                    </p>
                  </div>
                )}
              </div>
              {aiSuggested && !analyzing && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-500 font-medium">
                  <Sparkles size={12} />
                  AIが自動でタグを設定しました。内容を確認してください。
                </div>
              )}
              {uploadError && (
                <div className="mt-2 text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
                  ⚠️ {uploadError}
                </div>
              )}
              <button
                onClick={() => {
                  setImagePreview(null);
                  setImageFile(null);
                  setUploadedUrl(null);
                  setAiSuggested(false);
                }}
                className="absolute top-2 right-2 bg-white text-stone-500 text-xs px-2 py-1 rounded-full shadow"
              >
                変更
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 bg-stone-50"
              >
                <Camera size={28} className="text-stone-300" />
                <span className="text-xs text-stone-400 font-medium">カメラで撮影</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 bg-stone-50"
              >
                <Upload size={28} className="text-stone-300" />
                <span className="text-xs text-stone-400 font-medium">写真を選択</span>
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
        </div>

        {imageFile && (
          <>
            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">
                アイテム名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：白いオーバーサイズTシャツ"
                className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder-stone-300 border border-stone-100 focus:outline-none focus:border-rose-300"
              />
            </div>

            {/* Category */}
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

            {/* Silhouette */}
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

            {/* Style */}
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

            {/* Colors */}
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

            {/* Tags */}
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">
                タグ
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 bg-rose-50 text-rose-500 text-xs px-2.5 py-1 rounded-full"
                  >
                    #{t}
                    <button
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="text-rose-300 hover:text-rose-500"
                    >
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
                  placeholder="例：春夏、定番、お気に入り"
                  className="flex-1 bg-stone-50 rounded-xl px-3 py-2.5 text-sm text-stone-800 placeholder-stone-300 border border-stone-100 focus:outline-none focus:border-rose-300"
                />
                <button
                  onClick={addTag}
                  className="bg-stone-100 text-stone-600 px-3 rounded-xl text-sm font-medium"
                >
                  追加
                </button>
              </div>
            </div>

            {/* Save Error */}
            {saveError && (
              <div className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">
                ⚠️ {saveError}
              </div>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={!name || !uploadedUrl || saving || saved || analyzing || uploading}
              className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-base transition-all ${
                saved
                  ? "bg-emerald-400 text-white"
                  : !name || saving || analyzing || uploading
                  ? "bg-stone-100 text-stone-300"
                  : "bg-rose-400 text-white shadow-md"
              }`}
            >
              {saved ? (
                <>
                  <Check size={20} />
                  クローゼットに追加しました！
                </>
              ) : saving ? (
                "保存中..."
              ) : (
                "クローゼットに追加する"
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
