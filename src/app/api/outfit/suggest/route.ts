import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildProfilePromptSnippet } from "@/lib/profile";
import { getProfileForUser } from "@/lib/profile-server";
import type { ClothingItemData, StyleType, OutfitSuggestion } from "@/lib/types";
import { STYLE_LABELS } from "@/lib/types";

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

function toClothingItemData(item: {
  id: string;
  name: string;
  category: string;
  silhouette: string | null;
  colors: string;
  materials: string;
  tags: string;
  style: string;
  imageUrl: string | null;
  imageBgRemovedUrl: string | null;
  wornCount: number;
  lastWornAt: Date | null;
  createdAt: Date;
}): ClothingItemData {
  return {
    ...item,
    category: item.category as ClothingItemData["category"],
    silhouette: item.silhouette as ClothingItemData["silhouette"],
    style: item.style as ClothingItemData["style"],
    colors: JSON.parse(item.colors),
    materials: JSON.parse(item.materials || "[]"),
    tags: JSON.parse(item.tags),
    lastWornAt: item.lastWornAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

// 提案にバリエーションを出すための"今日のテーマ"プール
const VIBE_PROMPTS = [
  "色のリズムを意識して、配色に遊びを入れる",
  "素材感のコントラスト（つやとマット、軽と重）を効かせる",
  "シルエットでメリハリを作る（タイト×ワイド、長×短など）",
  "あえての『外し』を1点入れて、こなれ感を出す",
  "1色を主役にして、他は引き立て役にする",
  "ベーシック同士のシンプルな組み合わせで、抜け感を演出する",
  "色のトーンを統一して、まとまり感を作る",
  "差し色を1点だけ取り入れる",
  "縦のラインを意識して、スタイルアップ効果を狙う",
  "前回と違う雰囲気で、新鮮さを出す",
  "コーデの主役を1点決めて、そこから組み立てる",
  "リラックス感のある組み合わせで、力の抜けたお洒落に",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 季節を気温から判定
function getSeasonHint(maxTemp: number, minTemp: number): string {
  const avg = (maxTemp + minTemp) / 2;
  if (avg >= 25) return "夏（暑い）。通気性の良い素材（リネン/麻、コットン）が快適。レザーやウールは避ける。";
  if (avg >= 18) return "春・初秋（過ごしやすい）。コットンやポリエステルが万能。";
  if (avg >= 10) return "晩秋・初冬（肌寒い）。デニム、コーデュロイ、軽めのウールが活躍。";
  return "冬（寒い）。ウール、レザー、厚手素材で防寒。アウターは必須。";
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const { style, maxTemp, minTemp } = (await request.json()) as {
    style: StyleType;
    maxTemp: number;
    minTemp: number;
  };

  // ユーザープロフィールを取得
  const profile = session?.user?.id
    ? await getProfileForUser(session.user.id)
    : null;
  const profileSnippet = buildProfilePromptSnippet(profile);

  const allItems = await prisma.clothingItem.findMany({
    where: session?.user?.id ? { userId: session.user.id } : undefined,
    orderBy: { wornCount: "asc" },
  });

  if (allItems.length < 2) {
    return NextResponse.json(
      { error: "クローゼットに服が少なすぎます。2着以上登録してください。" },
      { status: 400 }
    );
  }

  const items = allItems.map(toClothingItemData);

  if (!process.env.OPENAI_API_KEY) {
    const shuffled = shuffle(items);
    const tops = shuffled.find((i) => i.category === "tops" || i.category === "dress");
    const bottoms = shuffled.find((i) => i.category === "bottoms");
    const selected = [tops, bottoms].filter(Boolean) as ClothingItemData[];

    return NextResponse.json({
      items: selected,
      style,
      description: `${STYLE_LABELS[style]}スタイルのコーデ`,
      reason: "シンプルで着回しやすい組み合わせです。",
    } as OutfitSuggestion);
  }

  const needsOuterwear = minTemp < 10;
  const seasonHint = getSeasonHint(maxTemp, minTemp);
  const todaysVibe = pickRandom(VIBE_PROMPTS);

  // アイテム順をシャッフル → "最初のものを選ぶバイアス"を回避
  const shuffledItems = shuffle(items);

  const itemsText = shuffledItems
    .map((item) => {
      const matStr = item.materials.length > 0 ? `・素材:${item.materials.join("/")}` : "";
      return `- ID:${item.id} 名前:${item.name} カテゴリ:${item.category} 色:${item.colors.join("/")} シルエット:${item.silhouette} スタイル:${item.style} 着用回数:${item.wornCount}${matStr}`;
    })
    .join("\n");

  const ai = getOpenAI()!;
  const response = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 1.0, // 多様性を出すため明示的に上げる
    presence_penalty: 0.6, // 同じアイテムを繰り返し選ぶのを抑制
    frequency_penalty: 0.3,
    messages: [
      {
        role: "system",
        content: `あなたは経験豊富なファッションコーディネーターです。ユーザーのクローゼットから、毎回新鮮で多様なコーデを提案します。

【重要な原則】
1. **多様性を最優先**：同じ服ばかり選ばない。前回と違うアプローチで組み立てる
2. **季節と気温に合わせる**：素材は気温に大きく影響する（ウール=寒い時/リネン=暑い時 など）
3. **着用回数の少ない服を優先**：眠っている服を発掘する
4. **カテゴリは1点ずつ**：以下の構成ルールを厳守する

【コーデの構成ルール（厳守）】
- トップス: 1点（ワンピースを使う場合は0点）
- ボトムス: 1点（ワンピースを使う場合は0点）
- ワンピース: トップス+ボトムスの代わりに1点
- アウター: 0〜1点（寒い日は必須）
- シューズ: 0〜1点
- バッグ: 0〜1点
- アクセサリー: 0〜2点

→ 同じカテゴリから複数選ぶのは絶対NG（トップス2点、ボトムス2点などは不可）

【避けること】
- ありきたりな「無難なコーデ」だけを提案
- 同じカテゴリの服を複数選ぶ
- 季節外れの素材（夏にウール、冬にリネン）

必ずJSONのみ返してください（マークダウン不要）。`,
      },
      {
        role: "user",
        content: `${profileSnippet ? profileSnippet + "\n\n" : ""}# 今日の条件
気温: 最高${maxTemp}℃ / 最低${minTemp}℃
${seasonHint}
${needsOuterwear ? "→ アウターが必要な気温です。" : "→ アウターは基本不要です。"}
希望スタイル: ${STYLE_LABELS[style]}

# 今日のテーマ（このアプローチで考えてください）
"${todaysVibe}"

# クローゼットの服一覧（順序はランダム）
${itemsText}

# あなたへの依頼
上記から${STYLE_LABELS[style]}スタイルのコーデを1つ提案してください。
- トップス・ボトムス（またはワンピース）を必ず含める
- ${needsOuterwear ? "アウターも必須" : "アウターは状況に応じて"}
- 「今日のテーマ」を体現するような選択にする
- 着用回数が少ない服を優先的に使う

以下のJSON形式で返してください:
{
  "itemIds": ["選んだ服のIDを配列で"],
  "description": "コーデの一言タイトル（10〜20文字、テーマが伝わるように）",
  "reason": "なぜこの組み合わせかの説明（2〜3文。素材や色のロジック、テーマの反映、着回し提案を含めて）"
}`,
      },
    ],
    max_tokens: 500,
  });

  const content = response.choices[0].message.content || "{}";
  const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();

  try {
    const data = JSON.parse(cleaned);
    const rawSelected = (data.itemIds as string[])
      .map((id: string) => items.find((item) => item.id === id))
      .filter((item): item is ClothingItemData => item !== undefined);

    // カテゴリ重複を除去：各カテゴリは1点（アクセサリーのみ最大2点）
    // 重複した場合は着用回数が少ない方を優先する
    const sortedByWornAsc = [...rawSelected].sort((a, b) => a.wornCount - b.wornCount);
    const seenByCategory = new Map<string, number>();
    const dedupedSelected: ClothingItemData[] = [];
    for (const item of sortedByWornAsc) {
      const limit = item.category === "accessories" ? 2 : 1;
      const count = seenByCategory.get(item.category) || 0;
      if (count < limit) {
        dedupedSelected.push(item);
        seenByCategory.set(item.category, count + 1);
      } else {
        console.warn(`[outfit/suggest] dropped duplicate category item: ${item.name} (${item.category})`);
      }
    }

    return NextResponse.json({
      items: dedupedSelected,
      style,
      description: data.description,
      reason: data.reason,
    } as OutfitSuggestion);
  } catch {
    const shuffled = shuffle(items).slice(0, 3);
    return NextResponse.json({
      items: shuffled,
      style,
      description: `${STYLE_LABELS[style]}スタイルのコーデ`,
      reason: "クローゼットの中からセレクトしました。",
    } as OutfitSuggestion);
  }
}
