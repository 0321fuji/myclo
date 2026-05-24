import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ClothingItemData } from "@/lib/types";

function toClothingItemData(item: {
  id: string;
  userId: string;
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

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.clothingItem.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items.map(toClothingItemData));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/clothing] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const item = await prisma.clothingItem.create({
      data: {
        userId: session.user.id,
        name: body.name,
        category: body.category,
        silhouette: body.silhouette || null,
        colors: JSON.stringify(body.colors || []),
        tags: JSON.stringify(body.tags || []),
        style: body.style || "casual",
        imageUrl: body.imageUrl,
        imageBgRemovedUrl: body.imageBgRemovedUrl || null,
      },
    });

    return NextResponse.json(toClothingItemData(item), { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/clothing] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
