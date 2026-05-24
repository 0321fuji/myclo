"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Sparkles } from "lucide-react";
import type {
  UserProfileData,
  AgeGroup,
  BodyType,
  PersonalColor,
  Occupation,
  Scene,
} from "@/lib/profile";
import {
  GENDER_LABELS,
  AGE_GROUP_LABELS,
  BODY_TYPE_LABELS,
  BODY_TYPE_HINTS,
  PERSONAL_COLOR_LABELS,
  PERSONAL_COLOR_HINTS,
  OCCUPATION_LABELS,
  SCENE_LABELS,
  STYLE_OPTIONS,
  calculateCompletion,
} from "@/lib/profile";

const EMPTY_PROFILE: UserProfileData = {
  gender: null,
  ageGroup: null,
  height: null,
  bodyType: null,
  personalColor: null,
  preferredStyles: [],
  dislikedStyles: [],
  inspirations: null,
  occupation: null,
  scenes: [],
  avoid: null,
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfileData>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data) setProfile({ ...EMPTY_PROFILE, ...data });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = <K extends keyof UserProfileData>(key: K, value: UserProfileData[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  const toggleArray = (key: "preferredStyles" | "dislikedStyles" | "scenes", value: string) => {
    setProfile((p) => {
      const arr = p[key] as string[];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...p, [key]: next };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSavedMsg("プロフィールを保存しました");
        setTimeout(() => setSavedMsg(null), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-stone-400">読み込み中...</div>;
  }

  const completion = calculateCompletion(profile);

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
        <div className="flex-1">
          <h1 className="text-lg font-bold text-stone-800">プロフィール</h1>
          <p className="text-[10px] text-stone-400">入力するほど提案がパーソナルになります</p>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-gradient-to-r from-rose-50 to-amber-50 px-5 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={14} className="text-rose-400" />
            <span className="text-xs font-semibold text-stone-700">完成度 {completion}%</span>
          </div>
          <span className="text-[10px] text-stone-500">埋めるほど精度UP</span>
        </div>
        <div className="h-1.5 bg-white rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-400 to-amber-400 transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* ===== Basic ===== */}
        <Section title="基本情報">
          <Field label="性別">
            <div className="flex flex-wrap gap-2">
              {(["male", "female", "other"] as const).map((g) => (
                <Chip
                  key={g}
                  selected={profile.gender === g}
                  onClick={() => update("gender", profile.gender === g ? null : g)}
                >
                  {GENDER_LABELS[g]}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="年齢層">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(AGE_GROUP_LABELS) as AgeGroup[]).map((a) => (
                <Chip
                  key={a}
                  selected={profile.ageGroup === a}
                  onClick={() => update("ageGroup", profile.ageGroup === a ? null : a)}
                >
                  {AGE_GROUP_LABELS[a]}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="身長（cm）">
            <input
              type="number"
              value={profile.height ?? ""}
              onChange={(e) => update("height", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="例：162"
              className="w-32 bg-stone-50 rounded-xl px-4 py-2.5 text-sm text-stone-800 border border-stone-100 focus:outline-none focus:border-rose-300"
            />
          </Field>
        </Section>

        {/* ===== Body type ===== */}
        <Section title="骨格タイプ" hint="わからない場合は飛ばしてOK">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BODY_TYPE_LABELS) as BodyType[]).map((b) => (
              <Chip
                key={b}
                selected={profile.bodyType === b}
                onClick={() => update("bodyType", profile.bodyType === b ? null : b)}
              >
                {BODY_TYPE_LABELS[b]}
              </Chip>
            ))}
          </div>
          {profile.bodyType && profile.bodyType !== "unknown" && (
            <p className="mt-2 text-[11px] text-stone-500 bg-stone-50 rounded-xl px-3 py-2 leading-relaxed">
              {BODY_TYPE_HINTS[profile.bodyType]}
            </p>
          )}
        </Section>

        {/* ===== Personal color ===== */}
        <Section title="パーソナルカラー" hint="わからない場合は飛ばしてOK">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PERSONAL_COLOR_LABELS) as PersonalColor[]).map((c) => (
              <Chip
                key={c}
                selected={profile.personalColor === c}
                onClick={() => update("personalColor", profile.personalColor === c ? null : c)}
              >
                {PERSONAL_COLOR_LABELS[c]}
              </Chip>
            ))}
          </div>
          {profile.personalColor && profile.personalColor !== "unknown" && (
            <p className="mt-2 text-[11px] text-stone-500 bg-stone-50 rounded-xl px-3 py-2 leading-relaxed">
              {PERSONAL_COLOR_HINTS[profile.personalColor]}
            </p>
          )}
        </Section>

        {/* ===== Taste ===== */}
        <Section title="好きなテイスト" hint="複数選択可">
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((s) => (
              <Chip
                key={s}
                selected={profile.preferredStyles.includes(s)}
                onClick={() => toggleArray("preferredStyles", s)}
                color="rose"
              >
                {s}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="苦手なテイスト" hint="複数選択可">
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((s) => (
              <Chip
                key={s}
                selected={profile.dislikedStyles.includes(s)}
                onClick={() => toggleArray("dislikedStyles", s)}
                color="stone"
              >
                {s}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="憧れ・参考" hint="好きなブランドや有名人など">
          <textarea
            value={profile.inspirations ?? ""}
            onChange={(e) => update("inspirations", e.target.value || null)}
            placeholder="例：セリーヌ、ザラ、メゾンマルジェラ／木村文乃さん"
            rows={2}
            className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder-stone-300 border border-stone-100 focus:outline-none focus:border-rose-300 resize-none"
          />
        </Section>

        {/* ===== Lifestyle ===== */}
        <Section title="職業">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(OCCUPATION_LABELS) as Occupation[]).map((o) => (
              <Chip
                key={o}
                selected={profile.occupation === o}
                onClick={() => update("occupation", profile.occupation === o ? null : o)}
              >
                {OCCUPATION_LABELS[o]}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="よく着る場面" hint="複数選択可">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SCENE_LABELS) as Scene[]).map((s) => (
              <Chip
                key={s}
                selected={profile.scenes.includes(s)}
                onClick={() => toggleArray("scenes", s)}
              >
                {SCENE_LABELS[s]}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="避けたいこと" hint="自由記述">
          <textarea
            value={profile.avoid ?? ""}
            onChange={(e) => update("avoid", e.target.value || null)}
            placeholder="例：露出が多い服、原色、寒色のみのコーデ"
            rows={2}
            className="w-full bg-stone-50 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder-stone-300 border border-stone-100 focus:outline-none focus:border-rose-300 resize-none"
          />
        </Section>

        {/* Save */}
        {savedMsg && (
          <div className="text-xs text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2 text-center">
            ✓ {savedMsg}
          </div>
        )}
        <button
          onClick={save}
          disabled={saving}
          className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-semibold text-base transition-all ${
            saving ? "bg-stone-100 text-stone-300" : "bg-rose-400 text-white shadow-md"
          }`}
        >
          {saving ? "保存中..." : (<><Check size={18} /> 保存する</>)}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{title}</h2>
        {hint && <span className="text-[10px] text-stone-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] text-stone-500 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
  color = "stone",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: "stone" | "rose";
}) {
  const baseClass = "px-3 py-1.5 rounded-full text-xs font-medium transition-all";
  if (selected) {
    if (color === "rose") {
      return (
        <button onClick={onClick} className={`${baseClass} bg-rose-400 text-white shadow-sm`}>
          {children}
        </button>
      );
    }
    return (
      <button onClick={onClick} className={`${baseClass} bg-stone-800 text-white shadow-sm`}>
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`${baseClass} bg-stone-50 text-stone-500 border border-stone-100`}
    >
      {children}
    </button>
  );
}
