export type Category = "tops" | "bottoms" | "outerwear" | "shoes" | "accessories" | "dress" | "bag";
export type Silhouette = "tight" | "wide" | "long" | "short" | "oversized" | "regular";
export type StyleType = "casual" | "business" | "mode" | "traditional" | "sport";

export interface ClothingItemData {
  id: string;
  name: string;
  category: Category;
  silhouette: Silhouette | null;
  colors: string[];
  tags: string[];
  style: StyleType;
  imageUrl: string;
  imageBgRemovedUrl: string | null;
  wornCount: number;
  lastWornAt: string | null;
  createdAt: string;
}

export interface WeatherData {
  temperature: number;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  description: string;
  icon: string;
  isToday: boolean;
}

export interface OutfitSuggestion {
  id?: string;
  items: ClothingItemData[];
  style: StyleType;
  description: string;
  reason: string;
  isFavorite?: boolean;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  tops: "トップス",
  bottoms: "ボトムス",
  outerwear: "アウター",
  shoes: "シューズ",
  accessories: "アクセサリー",
  dress: "ワンピース",
  bag: "バッグ",
};

export const STYLE_LABELS: Record<StyleType, string> = {
  casual: "カジュアル",
  business: "ビジネス",
  mode: "モード",
  traditional: "トラッド",
  sport: "スポーツ",
};

export const STYLE_EMOJIS: Record<StyleType, string> = {
  casual: "👕",
  business: "👔",
  mode: "🖤",
  traditional: "🎩",
  sport: "⚡",
};

export const WEATHER_CODE_MAP: Record<number, { description: string; icon: string }> = {
  0: { description: "快晴", icon: "☀️" },
  1: { description: "晴れ", icon: "🌤️" },
  2: { description: "くもり", icon: "⛅" },
  3: { description: "曇天", icon: "☁️" },
  45: { description: "霧", icon: "🌫️" },
  48: { description: "霧氷", icon: "🌫️" },
  51: { description: "霧雨（弱）", icon: "🌦️" },
  53: { description: "霧雨", icon: "🌦️" },
  55: { description: "霧雨（強）", icon: "🌧️" },
  61: { description: "雨（弱）", icon: "🌧️" },
  63: { description: "雨", icon: "🌧️" },
  65: { description: "大雨", icon: "⛈️" },
  71: { description: "雪（弱）", icon: "🌨️" },
  73: { description: "雪", icon: "❄️" },
  75: { description: "大雪", icon: "❄️" },
  80: { description: "にわか雨（弱）", icon: "🌦️" },
  81: { description: "にわか雨", icon: "🌧️" },
  82: { description: "にわか雨（強）", icon: "⛈️" },
  95: { description: "雷雨", icon: "⛈️" },
};
