"use client";

import { useState, useEffect } from "react";
import { MapPin, Key, Check, Info, User, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import type { UserProfileData } from "@/lib/profile";
import { calculateCompletion } from "@/lib/profile";

const PRESET_LOCATIONS = [
  { name: "東京", lat: "35.6762", lon: "139.6503" },
  { name: "大阪", lat: "34.6937", lon: "135.5023" },
  { name: "名古屋", lat: "35.1815", lon: "136.9066" },
  { name: "福岡", lat: "33.5904", lon: "130.4017" },
  { name: "札幌", lat: "43.0642", lon: "141.3469" },
  { name: "仙台", lat: "38.2682", lon: "140.8694" },
  { name: "広島", lat: "34.3853", lon: "132.4553" },
  { name: "那覇", lat: "26.2124", lon: "127.6809" },
];

export default function SettingsPage() {
  const [selectedCity, setSelectedCity] = useState("東京");
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<UserProfileData | null>(null);

  useEffect(() => {
    const savedLocation = localStorage.getItem("location");
    if (savedLocation) {
      const loc = JSON.parse(savedLocation);
      const city = PRESET_LOCATIONS.find((c) => c.lat === loc.lat);
      if (city) setSelectedCity(city.name);
    }
    const savedKey = localStorage.getItem("openai_key");
    if (savedKey) setApiKey(savedKey);

    // プロフィール完成度の取得
    fetch("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setProfile(data))
      .catch(() => {});
  }, []);

  const profileCompletion = calculateCompletion(profile);

  const handleSave = () => {
    const city = PRESET_LOCATIONS.find((c) => c.name === selectedCity);
    if (city) {
      localStorage.setItem("location", JSON.stringify({ lat: city.lat, lon: city.lon }));
    }
    if (apiKey) {
      localStorage.setItem("openai_key", apiKey);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="pb-28">
      <div className="bg-white px-5 pt-12 pb-4 border-b border-stone-100">
        <p className="text-[10px] font-black tracking-widest text-rose-400 mb-0.5">MYCLO</p>
        <h1 className="text-2xl font-bold text-stone-800">設定</h1>
        <p className="text-xs text-stone-400 mt-0.5">アプリのカスタマイズ</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Profile */}
        <Link
          href="/settings/profile"
          className="block bg-white rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-100 to-amber-100 rounded-xl flex items-center justify-center">
              <User size={18} className="text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-stone-800">あなたのプロフィール</p>
                {profileCompletion < 50 && (
                  <span className="text-[9px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded-full font-bold">
                    NEW
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Sparkles size={11} className="text-rose-400" />
                <p className="text-[11px] text-stone-500">
                  {profileCompletion === 0
                    ? "設定するとAI提案が一気にパーソナル化"
                    : `完成度 ${profileCompletion}% - 提案精度が向上します`}
                </p>
              </div>
              {profileCompletion > 0 && (
                <div className="mt-2 h-1 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-400 to-amber-400"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              )}
            </div>
            <ChevronRight size={18} className="text-stone-300 flex-none" />
          </div>
        </Link>

        {/* Location */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <MapPin size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-800">地域設定</p>
              <p className="text-xs text-stone-400">天気予報に使用します</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {PRESET_LOCATIONS.map((city) => (
              <button
                key={city.name}
                onClick={() => setSelectedCity(city.name)}
                className={`py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCity === city.name
                    ? "bg-blue-400 text-white"
                    : "bg-stone-50 text-stone-500"
                }`}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>

        {/* OpenAI API Key */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-rose-50 rounded-xl flex items-center justify-center">
              <Key size={16} className="text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-800">OpenAI APIキー</p>
              <p className="text-xs text-stone-400">AI機能を使うために必要です</p>
            </div>
          </div>

          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder-stone-300 border border-stone-100 focus:outline-none focus:border-rose-300 font-mono"
          />

          <div className="flex items-start gap-1.5 mt-3 text-xs text-stone-400">
            <Info size={12} className="mt-0.5 flex-none" />
            <p>APIキーはブラウザのローカルストレージにのみ保存され、外部に送信されません。</p>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">MYCLOについて</p>
          <div className="space-y-2 text-sm text-stone-600">
            <div className="flex justify-between">
              <span className="text-stone-400">バージョン</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">天気データ</span>
              <span className="font-medium">Open-Meteo（無料）</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">AI エンジン</span>
              <span className="font-medium">OpenAI GPT-4o</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-base transition-all ${
            saved ? "bg-emerald-400 text-white" : "bg-rose-400 text-white shadow-md"
          }`}
        >
          {saved ? (
            <>
              <Check size={20} />
              保存しました！
            </>
          ) : (
            "設定を保存する"
          )}
        </button>
      </div>
    </div>
  );
}
