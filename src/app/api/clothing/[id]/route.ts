import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.clothingItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const item = await prisma.clothingItem.update({
    where: { id },
    data: {
      ...(body.wornCount !== undefined && { wornCount: body.wornCount }),
      ...(body.lastWornAt !== undefined && { lastWornAt: new Date(body.lastWornAt) }),
      ...(body.name !== undefined && { name: body.name }),
    },
  });

  return NextResponse.json(item);
}
