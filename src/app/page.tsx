"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, Check, Shuffle, RefreshCw } from "lucide-react";
import type { WeatherData, OutfitSuggestion, StyleType } from "@/lib/types";
import { STYLE_LABELS, STYLE_EMOJIS } from "@/lib/types";
import Image from "next/image";

const STYLES: StyleType[] = ["casual", "business", "mode", "traditional", "sport"];

export default function HomePage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [outfit, setOutfit] = useState<OutfitSuggestion | null>(null);
  const [activeStyle, setActiveStyle] = useState<StyleType>("casual");
  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [wornSuccess, setWornSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async (): Promise<WeatherData | null> => {
    setWeatherLoading(true);
    try {
      let lat = "35.6762";
      let lon = "139.6503";
      const savedLocation =
        typeof window !== "undefined" ? localStorage.getItem("location") : null;
      if (savedLocation) {
        const loc = JSON.parse(savedLocation);
        lat = loc.lat;
        lon = loc.lon;
      }
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      const data: WeatherData = await res.json();
      setWeather(data);
      return data;
    } catch {
      const fallback: WeatherData = {
        temperature: 20,
        maxTemp: 25,
        minTemp: 15,
        weatherCode: 1,
        description: "晴れ",
        icon: "☀️",
        isToday: true,
      };
      setWeather(fallback);
      return fallback;
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const fetchOutfit = useCallback(
    async (style: StyleType, weatherData?: WeatherData | null) => {
      const w = weatherData ?? weather;
      if (!w) return;
      setLoading(true);
      setError(null);
      setIsFavorite(false);
      setWornSuccess(false);
      try {
        const res = await fetch("/api/outfit/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ style, maxTemp: w.maxTemp, minTemp: w.minTemp }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error);
        } else {
          setOutfit(data);
        }
      } catch {
        setError("コーデ提案の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [weather]
  );

  useEffect(() => {
    fetchWeather().then((w) => {
      if (w) fetchOutfit(activeStyle, w);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStyleChange = (style: StyleType) => {
    setActiveStyle(style);
    fetchOutfit(style);
  };

  const handleWorn = async () => {
    if (!outfit) return;
    setWornSuccess(true);
    for (const item of outfit.items) {
      await fetch(`/api/clothing/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wornCount: item.wornCount + 1,
          lastWornAt: new Date().toISOString(),
        }),
      });
    }
    setTimeout(() => {
      setWornSuccess(false);
      fetchOutfit(activeStyle);
    }, 2000);
  };

  const tempAdvice = (max: number, min: number) => {
    if (min < 5) return "かなり寒いので、しっかりアウターを着込みましょう！";
    if (min < 10) return "朝晩は冷え込むので、羽織るものがあると安心です！";
    if (max > 30) return "かなり暑くなります。涼しい素材のコーデがおすすめ！";
    if (max > 25) return "暑くなりそうです。軽めのコーデを心がけましょう！";
    return "過ごしやすい気温です。おしゃれを楽しめそうです！";
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-rose-50 to-stone-50 px-5 pt-12 pb-6">
        <p className="text-[10px] font-black tracking-widest text-rose-400 mb-0.5">MYCLO</p>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-stone-400 font-medium uppercase tracking-widest">
            {weatherLoading ? "Loading..." : weather?.isToday ? "Today" : "Tomorrow"}
          </p>
        </div>
        <h1 className="text-2xl font-bold text-stone-800 mb-4">今日のコーデ</h1>

        {weather && !weatherLoading ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{weather.icon}</span>
                <div>
                  <p className="text-2xl font-bold text-stone-800">{weather.temperature}°C</p>
                  <p className="text-xs text-stone-400">{weather.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-red-400">↑ {weather.maxTemp}°</p>
                <p className="text-sm font-semibold text-blue-400">↓ {weather.minTemp}°</p>
              </div>
            </div>
            <p className="text-xs text-stone-500 bg-stone-50 rounded-xl px-3 py-2 leading-relaxed">
              {tempAdvice(weather.maxTemp, weather.minTemp)}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 shadow-sm animate-pulse h-24" />
        )}
      </div>

      {/* Style Tabs */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STYLES.map((style) => (
            <button
              key={style}
              onClick={() => handleStyleChange(style)}
              className={`flex-none flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeStyle === style
                  ? "bg-rose-400 text-white shadow-sm"
                  : "bg-white text-stone-500 border border-stone-100"
              }`}
            >
              <span>{STYLE_EMOJIS[style]}</span>
              {STYLE_LABELS[style]}
            </button>
          ))}
        </div>
      </div>

      {/* Outfit Card */}
      <div className="px-5">
        {loading ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col items-center gap-4 py-8">
              <RefreshCw size={32} className="text-rose-300 animate-spin" />
              <p className="text-stone-400 text-sm">AIがコーデを考えています...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
            <p className="text-5xl mb-3">👗</p>
            <p className="text-stone-600 font-semibold mb-1">コーデを提案できません</p>
            <p className="text-stone-400 text-sm mb-5">{error}</p>
            <a
              href="/closet/add"
              className="inline-block bg-rose-400 text-white px-6 py-2.5 rounded-full text-sm font-medium"
            >
              服を登録する →
            </a>
          </div>
        ) : outfit ? (
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <p className="text-sm font-bold text-stone-800 mb-1">{outfit.description}</p>
              <p className="text-xs text-stone-400 leading-relaxed">{outfit.reason}</p>
            </div>

            <div className="px-4 pb-4">
              <div
                className={`grid gap-3 ${
                  outfit.items.length <= 2 ? "grid-cols-2" : "grid-cols-3"
                }`}
              >
                {outfit.items.map((item) => {
                  const src = item.imageBgRemovedUrl || item.imageUrl;
                  return (
                  <div
                    key={item.id}
                    className="aspect-square rounded-2xl overflow-hidden bg-stone-50 relative"
                  >
                    {src ? (
                      <Image
                        src={src}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 448px) 50vw, 224px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-50">
                        <span className="text-[10px] text-stone-400 px-2 text-center font-medium">
                          {item.name}
                        </span>
                      </div>
                    )}
                    {src && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5">
                        <p className="text-white text-[10px] font-medium truncate">{item.name}</p>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className={`flex items-center justify-center w-12 h-12 rounded-2xl border-2 transition-all ${
                  isFavorite
                    ? "bg-rose-400 border-rose-400 text-white"
                    : "bg-white border-stone-100 text-stone-300"
                }`}
              >
                <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
              </button>

              <button
                onClick={handleWorn}
                disabled={wornSuccess}
                className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl font-semibold text-sm transition-all ${
                  wornSuccess ? "bg-emerald-400 text-white" : "bg-stone-800 text-white"
                }`}
              >
                <Check size={18} />
                {wornSuccess ? "今日の服に決定！" : "これにする"}
              </button>

              <button
                onClick={() => fetchOutfit(activeStyle)}
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-stone-50 border-2 border-stone-100 text-stone-400 hover:bg-stone-100 transition-all"
              >
                <Shuffle size={20} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
