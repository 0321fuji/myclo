import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

export async function POST(request: NextRequest) {
  const { imageUrl } = await request.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      name: "服アイテム",
      category: "tops",
      silhouette: "regular",
      colors: ["ブラック"],
      tags: ["シンプル"],
      style: "casual",
    });
  }

  const baseUrl = request.nextUrl.origin;
  const fullImageUrl = imageUrl.startsWith("http") ? imageUrl : `${baseUrl}${imageUrl}`;

  const ai = getOpenAI()!;
  const response = await ai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: fullImageUrl, detail: "low" },
          },
          {
            type: "text",
            text: `この服の画像を分析して、以下の情報をJSON形式で返してください。
必ずJSONのみ返してください（マークダウン不要）:
{
  "name": "アイテム名（例：白いオーバーサイズTシャツ）",
  "category": "tops | bottoms | outerwear | shoes | accessories | dress | bag のいずれか",
  "silhouette": "tight | wide | long | short | oversized | regular のいずれか",
  "colors": ["ホワイト・ブラック・グレー・ブラウン・ベージュ・グリーン・ブルー・パープル・イエロー・ピンク・レッド・オレンジ・シルバー・ゴールド・その他 の中から1〜3個選ぶ"],
  "tags": ["特徴タグ1", "特徴タグ2", "特徴タグ3"],
  "style": "casual | business | mode | traditional | sport のいずれか（最も合うもの）"
}`,
          },
        ],
      },
    ],
    max_tokens: 500,
  });

  const content = response.choices[0].message.content || "{}";
  const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();

  try {
    const data = JSON.parse(cleaned);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      name: "服アイテム",
      category: "tops",
      silhouette: "regular",
      colors: ["ブラック"],
      tags: ["シンプル"],
      style: "casual",
    });
  }
}
