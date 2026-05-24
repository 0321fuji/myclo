import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCoordinator } from "@/lib/coordinators";
import { buildProfilePromptSnippet } from "@/lib/profile";
import { getProfileForUser } from "@/lib/profile-server";
import { buildTrendsPromptSnippet } from "@/lib/trends";

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
        const brandStr = it.brand ? `・ブランド:${it.brand}` : "";
        const productStr = it.productName ? `（${it.productName}）` : "";
        return `- ID:${it.id} 名前:${it.name}${productStr}（${it.category}・${it.style}・${colors.join("/")}${it.silhouette ? "・" + it.silhouette : ""}${matStr}${brandStr}）`;
      })
      .join("\n");

    // ユーザープロフィールを取得
    const profile = await getProfileForUser(session.user.id);
    const profileSnippet = buildProfilePromptSnippet(profile);
    const trendsSnippet = buildTrendsPromptSnippet(profile?.gender ?? null);

    const systemPrompt = `${coordinator.systemPrompt}

${profileSnippet ? profileSnippet + "\n\n" : ""}${trendsSnippet}

【ユーザーが持っている服一覧（ID付き）】
${wardrobeList || "（まだ何も登録されていません）"}

【全コーディネーター共通の重要ルール】
- このリストの中から提案する。リストにない服は絶対NG
- コーデを提案する時は、メッセージの最後に必ず以下のタグを付けて、提案した服のIDを列挙すること：
  <outfit>itemId1,itemId2,itemId3</outfit>
- このタグはユーザーには見えない（システムが解析してサムネ画像を表示する）
- 雑談・質問返し・挨拶ではタグを付けない。コーデ提案する時だけ
- 提案するアイテムは最低2点（トップス＋ボトムス）以上。同じカテゴリから複数選ばない（アクセサリーは除く）

あなたのキャラクター性は絶対に崩さず、上記のトレンドとパーソナリティを踏まえて、本人が気づいていない魅力を引き出すコーデを提案してください。
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

    const rawReply = completion.choices[0].message.content || "";

    // <outfit>...</outfit> タグを解析
    const outfitMatch = rawReply.match(/<outfit>([^<]+)<\/outfit>/);
    let suggestedItems: typeof items = [];
    if (outfitMatch) {
      const ids = outfitMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
      // 重複除去＋実在チェック
      const seen = new Set<string>();
      suggestedItems = ids
        .map((id) => items.find((it) => it.id === id))
        .filter((it): it is (typeof items)[number] => {
          if (!it || seen.has(it.id)) return false;
          seen.add(it.id);
          return true;
        });
    }

    // ユーザーに見せる本文からはタグを除去
    const reply = rawReply.replace(/<outfit>[^<]+<\/outfit>/g, "").trim();

    // クライアントが必要とする形に整形
    const suggestedItemsClient = suggestedItems.map((it) => ({
      id: it.id,
      name: it.name,
      brand: it.brand,
      productName: it.productName,
      category: it.category,
      imageUrl: it.imageUrl,
      imageBgRemovedUrl: it.imageBgRemovedUrl,
      wornCount: it.wornCount,
    }));

    return NextResponse.json({ reply, suggestedItems: suggestedItemsClient });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/coordinator/chat] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
