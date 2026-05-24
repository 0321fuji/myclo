import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    const result = await cloudinary.uploader.upload(url, {
      folder: "myclo",
      resource_type: "image",
    });
    return NextResponse.json({ url: result.secure_url });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/upload/from-url] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
