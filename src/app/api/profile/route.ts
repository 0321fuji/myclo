import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { UserProfileData } from "@/lib/profile";

function toClientProfile(p: {
  gender: string | null;
  ageGroup: string | null;
  height: number | null;
  bodyType: string | null;
  personalColor: string | null;
  preferredStyles: string;
  dislikedStyles: string;
  inspirations: string | null;
  occupation: string | null;
  scenes: string;
  avoid: string | null;
}): UserProfileData {
  return {
    gender: p.gender as UserProfileData["gender"],
    ageGroup: p.ageGroup as UserProfileData["ageGroup"],
    height: p.height,
    bodyType: p.bodyType as UserProfileData["bodyType"],
    personalColor: p.personalColor as UserProfileData["personalColor"],
    preferredStyles: JSON.parse(p.preferredStyles || "[]"),
    dislikedStyles: JSON.parse(p.dislikedStyles || "[]"),
    inspirations: p.inspirations,
    occupation: p.occupation as UserProfileData["occupation"],
    scenes: JSON.parse(p.scenes || "[]"),
    avoid: p.avoid,
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!profile) return NextResponse.json(null);
    return NextResponse.json(toClientProfile(profile));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/profile] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<UserProfileData>;

    const data = {
      gender: body.gender ?? null,
      ageGroup: body.ageGroup ?? null,
      height: body.height ?? null,
      bodyType: body.bodyType ?? null,
      personalColor: body.personalColor ?? null,
      preferredStyles: JSON.stringify(body.preferredStyles ?? []),
      dislikedStyles: JSON.stringify(body.dislikedStyles ?? []),
      inspirations: body.inspirations ?? null,
      occupation: body.occupation ?? null,
      scenes: JSON.stringify(body.scenes ?? []),
      avoid: body.avoid ?? null,
    };

    const profile = await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: data,
    });

    return NextResponse.json(toClientProfile(profile));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[PATCH /api/profile] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

