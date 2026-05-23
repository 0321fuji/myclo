import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
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
  tags: string;
  style: string;
  imageUrl: string;
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
    tags: JSON.parse(item.tags),
    lastWornAt: item.lastWornAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const { style, maxTemp, minTemp } = await request.json() as {
    style: StyleType;
    maxTemp: number;
    minTemp: number;
  };

  const allItems = await prisma.clothingItem.findMany({
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
    const shuffled = [...items].sort(() => Math.random() - 0.5);
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
  const itemsText = (items as ClothingItemData[]).map((item: ClothingItemData) =>
    `- ID:${item.id} 名前:${item.name} カテゴリ:${item.category} 色:${item.colors.join("/")} シルエット:${item.silhouette} スタイル:${item.style} 着用回数:${item.wornCount}`
  ).join("\n");

  const ai = getOpenAI()!;
  const response = await ai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `あなたはファッションコーディネーターです。ユーザーのクローゼットの服を組み合わせて、スタイル別コーデを提案します。
着用回数が少ない服を優先的に使い、マンネリを防いでください。
必ずJSONのみ返してください（マークダウン不要）。`,
      },
      {
        role: "user",
        content: `今日の気温: 最高${maxTemp}℃ / 最低${minTemp}℃
${needsOuterwear ? "アウターが必要な気温です。" : "アウターは不要かもしれません。"}
希望スタイル: ${STYLE_LABELS[style]}

クローゼットの服一覧:
${itemsText}

上記から${STYLE_LABELS[style]}スタイルのコーデを1つ提案してください。
トップス・ボトムス（またはワンピース）を必ず含め、${needsOuterwear ? "アウターも含めてください。" : ""}

以下のJSON形式で返してください:
{
  "itemIds": ["選んだ服のIDを配列で"],
  "description": "コーデの説明（例：大人のモノトーンカジュアル）",
  "reason": "この組み合わせを選んだ理由（あまり着ていない服へのひと言も）"
}`,
      },
    ],
    max_tokens: 500,
  });

  const content = response.choices[0].message.content || "{}";
  const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();

  try {
    const data = JSON.parse(cleaned);
    const selectedItems = (data.itemIds as string[])
      .map((id: string) => (items as ClothingItemData[]).find((item: ClothingItemData) => item.id === id))
      .filter((item): item is ClothingItemData => item !== undefined);

    return NextResponse.json({
      items: selectedItems,
      style,
      description: data.description,
      reason: data.reason,
    } as OutfitSuggestion);
  } catch {
    const shuffled = [...items].sort(() => Math.random() - 0.5).slice(0, 3);
    return NextResponse.json({
      items: shuffled,
      style,
      description: `${STYLE_LABELS[style]}スタイルのコーデ`,
      reason: "クローゼットの中からセレクトしました。",
    } as OutfitSuggestion);
  }
}
