/**
 * カラーパレット定義（2段階：グループ → バリエーション）
 *
 * UX設計：
 * - グループをタップすると、その下にバリエーションが展開される
 * - バリエーションを選ぶと colors 配列に追加される
 * - グループの色名（例: "ブルー"）も汎用選択肢として variants 先頭に入っている
 *
 * 2026 SSトレンドカラーには trend: true を付与（バッジ表示用）
 */

export interface ColorVariant {
  name: string; // DB保存される識別子
  bg: string; // Tailwind class
  border: string; // Tailwind class
  trend?: boolean; // 2026 SSトレンドカラー
}

export interface ColorGroup {
  groupName: string; // 表示名「ブルー系」
  groupKey: string; // 一意キー
  swatchBg: string; // グループのアイコン色
  swatchBorder: string;
  variants: ColorVariant[];
}

export const COLOR_GROUPS: ColorGroup[] = [
  {
    groupName: "白系",
    groupKey: "white",
    swatchBg: "bg-white",
    swatchBorder: "border-stone-200",
    variants: [
      { name: "ホワイト", bg: "bg-white", border: "border-stone-200" },
      { name: "アイボリー", bg: "bg-stone-50", border: "border-stone-200" },
      { name: "オフホワイト", bg: "bg-amber-50", border: "border-amber-100" },
    ],
  },
  {
    groupName: "黒系",
    groupKey: "black",
    swatchBg: "bg-stone-900",
    swatchBorder: "border-stone-900",
    variants: [
      { name: "ブラック", bg: "bg-stone-900", border: "border-stone-900" },
      { name: "チャコール", bg: "bg-stone-700", border: "border-stone-700" },
    ],
  },
  {
    groupName: "グレー系",
    groupKey: "gray",
    swatchBg: "bg-stone-400",
    swatchBorder: "border-stone-400",
    variants: [
      { name: "グレー", bg: "bg-stone-400", border: "border-stone-400" },
      { name: "ライトグレー", bg: "bg-stone-200", border: "border-stone-300" },
      { name: "ダークグレー", bg: "bg-stone-600", border: "border-stone-600" },
    ],
  },
  {
    groupName: "ベージュ系",
    groupKey: "beige",
    swatchBg: "bg-amber-100",
    swatchBorder: "border-amber-200",
    variants: [
      { name: "ベージュ", bg: "bg-amber-100", border: "border-amber-200" },
      { name: "サンドベージュ", bg: "bg-amber-200", border: "border-amber-300", trend: true },
      { name: "クリーム", bg: "bg-yellow-50", border: "border-yellow-100" },
    ],
  },
  {
    groupName: "ブラウン系",
    groupKey: "brown",
    swatchBg: "bg-amber-800",
    swatchBorder: "border-amber-800",
    variants: [
      { name: "ブラウン", bg: "bg-amber-800", border: "border-amber-800" },
      { name: "ライトブラウン", bg: "bg-amber-600", border: "border-amber-600" },
      { name: "ダークブラウン", bg: "bg-amber-950", border: "border-amber-950" },
      { name: "キャメル", bg: "bg-yellow-700", border: "border-yellow-700" },
      { name: "モカ", bg: "bg-stone-500", border: "border-stone-500", trend: true },
      { name: "チョコレート", bg: "bg-yellow-900", border: "border-yellow-900", trend: true },
    ],
  },
  {
    groupName: "グリーン系",
    groupKey: "green",
    swatchBg: "bg-green-500",
    swatchBorder: "border-green-500",
    variants: [
      { name: "グリーン", bg: "bg-green-500", border: "border-green-500" },
      { name: "ハーブグリーン", bg: "bg-emerald-600", border: "border-emerald-600", trend: true },
      { name: "ミント", bg: "bg-emerald-200", border: "border-emerald-300", trend: true },
      { name: "ダークグリーン", bg: "bg-green-800", border: "border-green-800" },
      { name: "カーキ", bg: "bg-stone-500", border: "border-stone-500" },
      { name: "オリーブ", bg: "bg-yellow-800", border: "border-yellow-800" },
    ],
  },
  {
    groupName: "ブルー系",
    groupKey: "blue",
    swatchBg: "bg-blue-500",
    swatchBorder: "border-blue-500",
    variants: [
      { name: "ブルー", bg: "bg-blue-500", border: "border-blue-500" },
      { name: "ネイビー", bg: "bg-blue-900", border: "border-blue-900" },
      { name: "サックスブルー", bg: "bg-sky-300", border: "border-sky-300" },
      { name: "クリーンブルー", bg: "bg-blue-600", border: "border-blue-600", trend: true },
      { name: "デニム", bg: "bg-blue-700", border: "border-blue-700" },
      { name: "ターコイズ", bg: "bg-teal-400", border: "border-teal-400" },
      { name: "水色", bg: "bg-sky-200", border: "border-sky-300", trend: true },
    ],
  },
  {
    groupName: "パープル系",
    groupKey: "purple",
    swatchBg: "bg-purple-500",
    swatchBorder: "border-purple-500",
    variants: [
      { name: "パープル", bg: "bg-purple-500", border: "border-purple-500" },
      { name: "ラベンダー", bg: "bg-purple-200", border: "border-purple-300" },
      { name: "ヴァイオレット", bg: "bg-violet-600", border: "border-violet-600" },
    ],
  },
  {
    groupName: "イエロー系",
    groupKey: "yellow",
    swatchBg: "bg-yellow-400",
    swatchBorder: "border-yellow-400",
    variants: [
      { name: "イエロー", bg: "bg-yellow-400", border: "border-yellow-400" },
      { name: "バターイエロー", bg: "bg-yellow-200", border: "border-yellow-300", trend: true },
      { name: "マスタード", bg: "bg-yellow-600", border: "border-yellow-600" },
      { name: "シトラスイエロー", bg: "bg-lime-400", border: "border-lime-400", trend: true },
    ],
  },
  {
    groupName: "ピンク系",
    groupKey: "pink",
    swatchBg: "bg-pink-400",
    swatchBorder: "border-pink-400",
    variants: [
      { name: "ピンク", bg: "bg-pink-400", border: "border-pink-400" },
      { name: "ライトピンク", bg: "bg-pink-200", border: "border-pink-300", trend: true },
      { name: "モーヴピンク", bg: "bg-pink-300", border: "border-pink-400", trend: true },
      { name: "コーラル", bg: "bg-rose-400", border: "border-rose-400" },
    ],
  },
  {
    groupName: "レッド系",
    groupKey: "red",
    swatchBg: "bg-red-500",
    swatchBorder: "border-red-500",
    variants: [
      { name: "レッド", bg: "bg-red-500", border: "border-red-500" },
      { name: "ワインレッド", bg: "bg-red-900", border: "border-red-900" },
      { name: "バーガンディ", bg: "bg-rose-900", border: "border-rose-900" },
    ],
  },
  {
    groupName: "オレンジ系",
    groupKey: "orange",
    swatchBg: "bg-orange-400",
    swatchBorder: "border-orange-400",
    variants: [
      { name: "オレンジ", bg: "bg-orange-400", border: "border-orange-400" },
      { name: "テラコッタ", bg: "bg-orange-700", border: "border-orange-700" },
      { name: "ピーチ", bg: "bg-orange-200", border: "border-orange-300" },
    ],
  },
  {
    groupName: "メタリック",
    groupKey: "metallic",
    swatchBg: "bg-slate-300",
    swatchBorder: "border-slate-300",
    variants: [
      { name: "シルバー", bg: "bg-slate-300", border: "border-slate-300" },
      { name: "ゴールド", bg: "bg-yellow-600", border: "border-yellow-600" },
      { name: "メタリックシルバー", bg: "bg-slate-400", border: "border-slate-400", trend: true },
    ],
  },
  {
    groupName: "その他",
    groupKey: "other",
    swatchBg: "bg-gradient-to-br from-rose-300 via-blue-300 to-green-300",
    swatchBorder: "border-stone-200",
    variants: [
      { name: "その他", bg: "bg-gradient-to-br from-rose-300 via-blue-300 to-green-300", border: "border-stone-200" },
    ],
  },
];

/** すべてのvariantをフラットに取得 */
export const ALL_COLOR_VARIANTS: ColorVariant[] = COLOR_GROUPS.flatMap(
  (g) => g.variants
);

/** 色名から variant を引く */
export function findColorVariant(name: string): ColorVariant | undefined {
  return ALL_COLOR_VARIANTS.find((v) => v.name === name);
}

/** 色名から属するグループキーを取得 */
export function findColorGroupKey(name: string): string | undefined {
  for (const g of COLOR_GROUPS) {
    if (g.variants.some((v) => v.name === name)) return g.groupKey;
  }
  return undefined;
}
