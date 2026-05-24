import { NextRequest, NextResponse } from "next/server";
import { removeBackgroundAndUpload } from "@/lib/bg-removal";

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }
    const url = await removeBackgroundAndUpload(imageUrl);
    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/clothing/remove-bg] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
