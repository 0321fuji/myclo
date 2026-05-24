import { prisma } from "./prisma";

export interface UserProfileData {
  gender: "male" | "female" | "other" | null;
  ageGroup: AgeGroup | null;
  height: number | null;
  bodyType: BodyType | null;
  personalColor: PersonalColor | null;
  preferredStyles: string[];
  dislikedStyles: string[];
  inspirations: string | null;
  occupation: Occupation | null;
  scenes: Scene[];
  avoid: string | null;
}

export type AgeGroup = "10s" | "20s_early" | "20s_late" | "30s_early" | "30s_late" | "40s" | "50s+";
export type BodyType = "straight" | "wave" | "natural" | "unknown";
export type PersonalColor = "spring" | "summer" | "autumn" | "winter" | "unknown";
export type Occupation = "office" | "creative" | "student" | "freelance" | "other";
export type Scene = "office" | "date" | "casual" | "formal" | "sport" | "party";

export const GENDER_LABELS: Record<string, string> = {
  male: "男性",
  female: "女性",
  other: "その他",
};

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  "10s": "10代",
  "20s_early": "20代前半",
  "20s_late": "20代後半",
  "30s_early": "30代前半",
  "30s_late": "30代後半",
  "40s": "40代",
  "50s+": "50代以上",
};

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  straight: "ストレート",
  wave: "ウェーブ",
  natural: "ナチュラル",
  unknown: "わからない",
};

// 骨格タイプごとの似合うコーデ特徴（AIへのヒント）
export const BODY_TYPE_HINTS: Record<BodyType, string> = {
  straight:
    "肉付きにメリハリがある体型。Iラインや直線的なシルエット、ハリのある素材（コットン・デニム）、ベーシックなVネックが似合う。フリル・ダボつき・厚手ニットは苦手。",
  wave:
    "華奢で上半身に厚みが少ない体型。Xライン、ハイウエスト、柔らかい素材（シフォン・サテン）、装飾のある服が似合う。重い素材・直線的すぎる服は苦手。",
  natural:
    "骨や関節がしっかり見える体型。ゆったりオーバーサイズ、リネン・コーデュロイ・厚手ニットなどラフ素材、ロング丈が似合う。タイト・ハリのある素材は骨格が目立つので苦手。",
  unknown: "",
};

export const PERSONAL_COLOR_LABELS: Record<PersonalColor, string> = {
  spring: "イエベ春",
  summer: "ブルベ夏",
  autumn: "イエベ秋",
  winter: "ブルベ冬",
  unknown: "わからない",
};

export const PERSONAL_COLOR_HINTS: Record<PersonalColor, string> = {
  spring:
    "明るく鮮やかな暖色（コーラル、ピーチ、サニーイエロー、若草色）が映える。黒は重く見えがちで、アイボリーやキャメルが好相性。",
  summer:
    "柔らかく涼やかな寒色（ラベンダー、ローズ、スカイブルー、グレー）が映える。鮮やかな原色や黄味の強い色は浮きやすい。",
  autumn:
    "深みのある暖色（テラコッタ、マスタード、カーキ、ブラウン）が映える。ブラックよりダークブラウンやネイビーが肌になじむ。",
  winter:
    "コントラストの強い寒色（純白、ブラック、ワインレッド、ロイヤルブルー）が映える。くすんだ色やベージュ系は顔がぼやけて見えがち。",
  unknown: "",
};

export const OCCUPATION_LABELS: Record<Occupation, string> = {
  office: "会社員（オフィス）",
  creative: "クリエイティブ職",
  student: "学生",
  freelance: "フリーランス",
  other: "その他",
};

export const SCENE_LABELS: Record<Scene, string> = {
  office: "オフィス",
  date: "デート",
  casual: "休日カジュアル",
  formal: "フォーマル",
  sport: "スポーツ",
  party: "パーティー",
};

export const STYLE_OPTIONS = [
  "カジュアル",
  "モード",
  "クラシック",
  "ストリート",
  "フェミニン",
  "ガーリー",
  "エレガント",
  "ナチュラル",
  "ミニマル",
  "韓国",
  "古着",
  "スポーティ",
];

/**
 * AIに渡すユーザープロフィールのプロンプトスニペットを生成
 * 未設定の項目はスキップする
 */
export function buildProfilePromptSnippet(profile: UserProfileData | null): string {
  if (!profile) return "";

  const lines: string[] = ["【ユーザープロフィール】"];

  const basic: string[] = [];
  if (profile.gender) basic.push(GENDER_LABELS[profile.gender]);
  if (profile.ageGroup) basic.push(AGE_GROUP_LABELS[profile.ageGroup]);
  if (profile.height) basic.push(`身長${profile.height}cm`);
  if (basic.length) lines.push(`- 基本: ${basic.join(" / ")}`);

  if (profile.bodyType && profile.bodyType !== "unknown") {
    const hint = BODY_TYPE_HINTS[profile.bodyType];
    lines.push(`- 骨格: ${BODY_TYPE_LABELS[profile.bodyType]} → ${hint}`);
  }

  if (profile.personalColor && profile.personalColor !== "unknown") {
    const hint = PERSONAL_COLOR_HINTS[profile.personalColor];
    lines.push(`- パーソナルカラー: ${PERSONAL_COLOR_LABELS[profile.personalColor]} → ${hint}`);
  }

  if (profile.preferredStyles.length > 0) {
    lines.push(`- 好きなテイスト: ${profile.preferredStyles.join("、")}`);
  }
  if (profile.dislikedStyles.length > 0) {
    lines.push(`- 苦手なテイスト: ${profile.dislikedStyles.join("、")}`);
  }
  if (profile.inspirations) {
    lines.push(`- 憧れ・参考: ${profile.inspirations}`);
  }
  if (profile.occupation) {
    lines.push(`- 職業: ${OCCUPATION_LABELS[profile.occupation]}`);
  }
  if (profile.scenes.length > 0) {
    const sceneLabels = profile.scenes
      .map((s) => SCENE_LABELS[s])
      .filter(Boolean)
      .join("、");
    if (sceneLabels) lines.push(`- 主な着用シーン: ${sceneLabels}`);
  }
  if (profile.avoid) {
    lines.push(`- 避けたいこと: ${profile.avoid}`);
  }

  if (lines.length === 1) return ""; // タイトルだけならスキップ

  lines.push(
    "",
    "上記の特徴を最大限活かして、「この人だからこそ似合う」一歩踏み込んだ提案をしてください。無難な提案ではなく、本人が気づいていない魅力を引き出す選択を。"
  );

  return lines.join("\n");
}

/**
 * サーバー側でプロフィールを取得（API routeから使用）
 */
export async function getProfileForUser(userId: string): Promise<UserProfileData | null> {
  const p = await prisma.userProfile.findUnique({ where: { userId } });
  if (!p) return null;
  return {
    gender: p.gender as UserProfileData["gender"],
    ageGroup: p.ageGroup as UserProfileData["ageGroup"],
    height: p.height,
    bodyType: p.bodyType as UserProfileData["bodyType"],
    personalColor: p.personalColor as UserProfileData["personalColor"],
    preferredStyles: JSON.parse(p.preferredStyles || "[]"),
    dislikedStyles: JSON.parse(p.dislikedStyles || "[]"),
    inspirations: p.inspirations,
    occupation: p.occupation as UserProfileData["occupation"],
    scenes: JSON.parse(p.scenes || "[]"),
    avoid: p.avoid,
  };
}

/**
 * プロフィールの完成度を計算（0-100）
 */
export function calculateCompletion(profile: UserProfileData | null): number {
  if (!profile) return 0;
  const fields = [
    profile.gender,
    profile.ageGroup,
    profile.height,
    profile.bodyType,
    profile.personalColor,
    profile.preferredStyles.length > 0 ? "x" : null,
    profile.dislikedStyles.length > 0 ? "x" : null,
    profile.inspirations,
    profile.occupation,
    profile.scenes.length > 0 ? "x" : null,
    profile.avoid,
  ];
  const filled = fields.filter((f) => f !== null && f !== "" && f !== "unknown").length;
  return Math.round((filled / fields.length) * 100);
}
