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
      materials: [],
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
必ずJSONのみ返してください（マークダウン不要）。

## カテゴリ判定の超重要ルール
画像をよく見て、以下のいずれに該当するかを慎重に判断する：
- **tops（上半身に着る服）**：シャツ、ブラウス、Tシャツ、ニット、セーター、カットソー、スウェット、パーカー、カーディガン
  - 特徴：袖がある、襟やネックライン、丈は腰までが基本
- **bottoms（下半身に履く服）**：パンツ、ジーンズ、スラックス、チノパン、スカート、ショーツ
  - 特徴：脚を入れる筒が2つ（パンツ）またはウエストから垂れる布（スカート）
- **outerwear（羽織るもの）**：ジャケット、コート、ブルゾン、ダウン
- **dress（ワンピース）**：上下が一体になったもの
- **shoes（履物）**：スニーカー、革靴、ブーツ、サンダル
- **accessories（小物）**：ピアス、ネックレス、時計、ベルト、メガネ、帽子、マフラー
- **bag（鞄）**：バッグ、リュック、トート

⚠️ **シャツやブラウスを bottoms と誤判定しないように注意**：襟があって袖があるなら必ず tops。

JSON出力:
{
  "name": "アイテム名（例：白いオーバーサイズTシャツ）",
  "brand": "視認できるロゴからブランド名（明確にわかる場合のみ。判別できなければ空文字）",
  "productName": "判別できる商品名（タグ等が見えればその記載。なければ空文字）",
  "category": "tops | bottoms | outerwear | shoes | accessories | dress | bag のいずれか（上記ルールに厳密に従う）",
  "silhouette": "tight | wide | long | short | oversized | regular のいずれか",
  "colors": ["以下のカラーリストから1〜3個。微妙な色みも判別すること。**ホワイト/アイボリー/オフホワイト/ブラック/チャコール/グレー/ライトグレー/ダークグレー/ベージュ/サンドベージュ/クリーム/ブラウン/ライトブラウン/ダークブラウン/キャメル/モカ/チョコレート/グリーン/ハーブグリーン/ミント/ダークグリーン/カーキ/オリーブ/ブルー/ネイビー/サックスブルー/クリーンブルー/デニム/ターコイズ/水色/パープル/ラベンダー/ヴァイオレット/イエロー/バターイエロー/マスタード/シトラスイエロー/ピンク/ライトピンク/モーヴピンク/コーラル/レッド/ワインレッド/バーガンディ/オレンジ/テラコッタ/ピーチ/シルバー/ゴールド/メタリックシルバー/その他**"],
  "materials": ["コットン・ウール / 毛・リネン / 麻・ポリエステル・ナイロン・レザー・デニム・コーデュロイ・スエード の中から、画像から推測できる素材を選ぶ（自信がなければ空配列[]でOK、複数素材の場合は複数選ぶ）"],
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
      materials: [],
      tags: ["シンプル"],
      style: "casual",
    });
  }
}
