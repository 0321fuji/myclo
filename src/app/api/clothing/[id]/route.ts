import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const item = await prisma.clothingItem.update({
    where: { id, userId: session.user.id },
    data: {
      ...(body.wornCount !== undefined && { wornCount: body.wornCount }),
      ...(body.lastWornAt !== undefined && { lastWornAt: new Date(body.lastWornAt) }),
      ...(body.name !== undefined && { name: body.name }),
    },
  });

  return NextResponse.json(item);
}
