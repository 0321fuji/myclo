import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    // 1. Cloudinaryの画像をfetchしてBase64に変換
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error(`画像取得失敗: ${imageRes.status}`);
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
    const imageBase64 = imageBuffer.toString("base64");
    const mimeType = imageRes.headers.get("content-type") || "image/jpeg";

    // 2. Geminiに「背景を消して」と依頼
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            {
              text: "Remove the background completely from this image. Keep only the clothing item / fashion item. The background must be pure white (#FFFFFF). Do not change the item itself - preserve its colors, shape, and details exactly. Output a clean product photo style image.",
            },
          ],
        },
      ],
    });

    // 3. レスポンスから画像データを取り出す
    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(
      (p) => p.inlineData?.data
    );
    if (!imagePart?.inlineData?.data) {
      throw new Error("Geminiから画像が返ってきませんでした");
    }

    // 4. Cloudinaryに再アップロード
    const outputBuffer = Buffer.from(imagePart.inlineData.data, "base64");
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: "myclo/bg-removed", resource_type: "image" },
          (error, result) => {
            if (error || !result) reject(error);
            else resolve(result as { secure_url: string });
          }
        )
        .end(outputBuffer);
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/clothing/remove-bg] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
