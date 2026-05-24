import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { removeBackgroundAndUpload } from "@/lib/bg-removal";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.clothingItem.delete({
    where: { id, userId: session.user.id },
  });
  return NextResponse.json({ success: true });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const item = await prisma.clothingItem.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...item,
      colors: JSON.parse(item.colors),
      materials: JSON.parse(item.materials || "[]"),
      tags: JSON.parse(item.tags),
      lastWornAt: item.lastWornAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/clothing/[id]] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // 既存アイテムの所有者チェック
    const existing = await prisma.clothingItem.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isAddingImage = body.imageUrl && !existing.imageUrl;

    const item = await prisma.clothingItem.update({
      where: { id },
      data: {
        ...(body.wornCount !== undefined && { wornCount: body.wornCount }),
        ...(body.lastWornAt !== undefined && {
          lastWornAt: body.lastWornAt ? new Date(body.lastWornAt) : null,
        }),
        ...(body.name !== undefined && { name: body.name }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.silhouette !== undefined && { silhouette: body.silhouette || null }),
        ...(body.style !== undefined && { style: body.style }),
        ...(body.colors !== undefined && { colors: JSON.stringify(body.colors) }),
        ...(body.materials !== undefined && { materials: JSON.stringify(body.materials) }),
        ...(body.tags !== undefined && { tags: JSON.stringify(body.tags) }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl || null }),
        // 画像を新しく追加 or 変更した場合は背景削除URLをリセット
        ...(isAddingImage && { imageBgRemovedUrl: null }),
      },
    });

    // 画像が新規に追加されたら背景削除をバックグラウンド実行
    if (isAddingImage) {
      after(async () => {
        try {
          const bgRemovedUrl = await removeBackgroundAndUpload(body.imageUrl);
          await prisma.clothingItem.update({
            where: { id },
            data: { imageBgRemovedUrl: bgRemovedUrl },
          });
          console.log(`[bg-removal] success for item ${id}`);
        } catch (err) {
          console.error(`[bg-removal] failed for item ${id}:`, err);
        }
      });
    }

    return NextResponse.json(item);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[PATCH /api/clothing/[id]] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
