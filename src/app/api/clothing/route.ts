import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ClothingItemData } from "@/lib/types";

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

export async function GET() {
  const items = await prisma.clothingItem.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items.map(toClothingItemData));
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const item = await prisma.clothingItem.create({
    data: {
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
}
