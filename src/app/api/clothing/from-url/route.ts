import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { v2 as cloudinary } from "cloudinary";

// Vercel関数のタイムアウトを延長（hobby planの最大60秒）
// fetch + Cloudinary転送 + GPT-4o vision で合計15〜25秒かかる
export const maxDuration = 60;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

/**
 * HTMLから <meta> タグの content を抽出
 */
function extractMeta(html: string, property: string): string | null {
  // og:xxx や twitter:xxx を property/name どちらでも引っかかるように
  const patterns = [
    new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) return decodeHtml(m[1]);
  }
  return null;
}

/**
 * <title> タグの内容
 */
function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? decodeHtml(m[1].trim()) : null;
}

/**
 * 商品ページから素材・色情報が書かれていそうな部分テキストを抽出
 * （スクリプト・スタイルを除外して可視テキストを200文字程度に絞る）
 */
function extractRelevantText(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 「素材」「カラー」「色」などのキーワード周辺を抜粋
  const keywords = ["素材", "コットン", "ウール", "ポリエステル", "リネン", "ナイロン", "レザー", "デニム", "カラー", "色", "Material", "Color"];
  const snippets: string[] = [];
  for (const kw of keywords) {
    const idx = cleaned.indexOf(kw);
    if (idx >= 0) {
      snippets.push(cleaned.substring(Math.max(0, idx - 30), idx + 100));
    }
  }
  if (snippets.length === 0) {
    // 何も見つからなければ最初の500文字
    return cleaned.substring(0, 500);
  }
  return snippets.join(" ... ").substring(0, 1500);
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL が必要です" }, { status: 400 });
    }

    // 1. 商品ページをfetch（一般的なブラウザを装う）
    let html: string;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "ja,en;q=0.9",
          // 一部のサイトはこれがないとブロックする
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
        },
        signal: AbortSignal.timeout(25000), // 25秒
        redirect: "follow",
      });
      if (!res.ok) {
        return NextResponse.json(
          {
            error:
              res.status === 403
                ? "このサイトはBotアクセスをブロックしています。別のサイトのURLか、写真アップロードをお試しください"
                : res.status === 404
                ? "商品ページが見つかりませんでした"
                : `ページの取得に失敗しました (${res.status})`,
          },
          { status: 400 }
        );
      }
      html = await res.text();
    } catch (e) {
      const isTimeout = e instanceof Error && e.name === "TimeoutError";
      console.error("[from-url] fetch failed:", e);
      return NextResponse.json(
        {
          error: isTimeout
            ? "ページの取得がタイムアウトしました。サイトが重いか、Botアクセスをブロックしている可能性があります"
            : "ページにアクセスできませんでした。URLが正しいかご確認ください",
        },
        { status: 400 }
      );
    }

    // 2. メタ情報を抽出
    const ogImage = extractMeta(html, "og:image") || extractMeta(html, "twitter:image");
    const ogTitle = extractMeta(html, "og:title") || extractTitle(html);
    const ogDescription =
      extractMeta(html, "og:description") || extractMeta(html, "description");
    const pageText = extractRelevantText(html);

    if (!ogImage) {
      return NextResponse.json(
        { error: "商品画像が見つかりませんでした" },
        { status: 400 }
      );
    }

    // 3. og:image を Cloudinary にアップロード（外部URL依存を避けるため自前保存）
    let uploadedImageUrl: string;
    try {
      const uploadResult = await cloudinary.uploader.upload(ogImage, {
        folder: "myclo",
        resource_type: "image",
      });
      uploadedImageUrl = uploadResult.secure_url;
    } catch (e) {
      console.error("[from-url] cloudinary upload failed:", e);
      return NextResponse.json(
        { error: "画像のアップロードに失敗しました" },
        { status: 500 }
      );
    }

    // 4. AIで構造化データ抽出
    if (!process.env.OPENAI_API_KEY) {
      // AIなしのフォールバック
      return NextResponse.json({
        imageUrl: uploadedImageUrl,
        name: ogTitle || "服アイテム",
        category: "tops",
        silhouette: "regular",
        colors: [],
        materials: [],
        tags: [],
        style: "casual",
      });
    }

    const ai = getOpenAI()!;
    const aiResponse = await ai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: uploadedImageUrl, detail: "low" } },
            {
              type: "text",
              text: `この商品の画像と以下のテキスト情報を組み合わせて、服のタグ情報をJSONで返してください。
必ずJSONのみ返してください（マークダウン不要）。

【商品名（OGタイトル）】
${ogTitle || "不明"}

【商品説明】
${ogDescription || "不明"}

【ページ抜粋（素材・色情報の手がかり）】
${pageText.substring(0, 1000)}

出力JSON:
{
  "name": "アイテム名（簡潔に、例：白いオーバーサイズTシャツ）",
  "category": "tops | bottoms | outerwear | shoes | accessories | dress | bag のいずれか",
  "silhouette": "tight | wide | long | short | oversized | regular のいずれか",
  "colors": ["ホワイト・ブラック・グレー・ブラウン・ベージュ・グリーン・ブルー・パープル・イエロー・ピンク・レッド・オレンジ・シルバー・ゴールド・その他 から1〜3個"],
  "materials": ["コットン・ウール / 毛・リネン / 麻・ポリエステル・ナイロン・レザー・デニム・コーデュロイ・スエード から該当するものを選ぶ（テキストに明記されていれば優先採用、画像から推測も可、複数可、わからなければ空配列）"],
  "tags": ["特徴タグ1", "特徴タグ2", "特徴タグ3（例：定番、シンプル、トレンド、フォーマル など）"],
  "style": "casual | business | mode | traditional | sport のいずれか"
}`,
            },
          ],
        },
      ],
      max_tokens: 600,
    });

    const content = aiResponse.choices[0].message.content || "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();

    try {
      const data = JSON.parse(cleaned);
      return NextResponse.json({
        imageUrl: uploadedImageUrl,
        ...data,
      });
    } catch {
      return NextResponse.json({
        imageUrl: uploadedImageUrl,
        name: ogTitle || "服アイテム",
        category: "tops",
        silhouette: "regular",
        colors: [],
        materials: [],
        tags: [],
        style: "casual",
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/clothing/from-url] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
