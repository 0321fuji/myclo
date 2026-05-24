import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCoordinator } from "@/lib/coordinators";
import { buildProfilePromptSnippet } from "@/lib/profile";
import { getProfileForUser } from "@/lib/profile-server";

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { coordinatorId, messages } = (await request.json()) as {
      coordinatorId: string;
      messages: ChatMessage[];
    };

    const coordinator = getCoordinator(coordinatorId);
    if (!coordinator) {
      return NextResponse.json({ error: "Coordinator not found" }, { status: 404 });
    }

    const ai = getOpenAI();
    if (!ai) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY not configured" },
        { status: 500 }
      );
    }

    // ユーザーのクローゼットを取得（コーディネーターに「持ってる服」として渡す）
    const items = await prisma.clothingItem.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const wardrobeList = items
      .map((it) => {
        const colors = JSON.parse(it.colors) as string[];
        const materials = JSON.parse(it.materials || "[]") as string[];
        const matStr = materials.length > 0 ? `・素材:${materials.join("/")}` : "";
        return `- ${it.name}（${it.category}・${it.style}・${colors.join("/")}${it.silhouette ? "・" + it.silhouette : ""}${matStr}）`;
      })
      .join("\n");

    // ユーザープロフィールを取得
    const profile = await getProfileForUser(session.user.id);
    const profileSnippet = buildProfilePromptSnippet(profile);

    const systemPrompt = `${coordinator.systemPrompt}

${profileSnippet ? profileSnippet + "\n\n" : ""}【ユーザーが持っている服一覧】
${wardrobeList || "（まだ何も登録されていません）"}

このリストの中から提案してください。リストにない服は絶対に提案しないこと。
`;

    const completion = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 400,
      temperature: 0.9,
    });

    const reply = completion.choices[0].message.content || "";
    return NextResponse.json({ reply });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/coordinator/chat] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
