import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCoordinator } from "@/lib/coordinators";
import { buildProfilePromptSnippet } from "@/lib/profile";
import { getProfileForUser } from "@/lib/profile-server";
import { buildTrendsPromptSnippet } from "@/lib/trends";
import {
  ALL_KNOWLEDGE_MODULES,
  selectKnowledgeModules,
  formatModulesForPrompt,
} from "@/lib/shiki";

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

    // ユーザーの最新メッセージから関連ナレッジモジュールを選択
    const latestUserMessage =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const selectedModules = selectKnowledgeModules(
      latestUserMessage,
      ALL_KNOWLEDGE_MODULES,
      coordinatorId
    );
    const knowledgeSnippet = formatModulesForPrompt(selectedModules);

    if (selectedModules.length > 0) {
      console.log(
        `[coordinator/${coordinatorId}] selected knowledge modules:`,
        selectedModules.map((m) => m.id)
      );
    }

    const systemPrompt = `${coordinator.systemPrompt}

${profileSnippet ? profileSnippet + "\n\n" : ""}${trendsSnippet}

${knowledgeSnippet ? knowledgeSnippet + "\n\n" : ""}

【ユーザーが持っている服一覧（ID付き）】
${wardrobeList || "（まだ何も登録されていません）"}

【全コーディネーター共通の重要ルール】
- このリストの中から提案する。リストにない服は絶対NG
- コーデを提案する時は、メッセージの最後に必ず以下のタグを付けて、提案した服のIDを列挙すること：
  <outfit>itemId1,itemId2,itemId3</outfit>
- このタグはユーザーには見えない（システムが解析してサムネ画像を表示する）
- 雑談・質問返し・挨拶ではタグを付けない。コーデ提案する時だけ
- 提案するアイテムは最低2点（トップス＋ボトムス）以上。同じカテゴリから複数選ばない（アクセサリーは除く）

【追問候補の生成（必須）】
回答の最後に、ユーザーが「次に聞きたくなりそうな」追問候補を3〜5個生成すること。
形式：
  <followups>選択肢1|選択肢2|選択肢3</followups>

ルール：
- 直前の自分の回答内容に**具体的に紐づく**選択肢にする（汎用的な「もっと攻めて」より「ジャケットを変えて」のように具体に）
- 各選択肢は15文字以内、口語で
- ユーザーがそのまま送信できる文章にする
- 例：コーデ提案した直後なら「靴を革靴に変えて」「アウター追加して」「ジャケット違いで」など
- 例：質問返ししただけなら「具体例ちょうだい」「他の選択肢も」など
- このタグもユーザーには見えない（システムが解析してチップ表示する）

あなたのキャラクター性は絶対に崩さず、上記のトレンドとパーソナリティを踏まえて、本人が気づいていない魅力を引き出すコーデを提案してください。
`;

    // OpenAIのストリーミング応答を取得
    const aiStream = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 500,
      temperature: 0.9,
      stream: true,
    });

    const encoder = new TextEncoder();
    let fullText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // チャンクごとに text イベントとして送信
          for await (const chunk of aiStream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (delta) {
              fullText += delta;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", delta })}\n\n`
                )
              );
            }
          }

          // 完了したらタグを解析して metadata を送信
          const outfitMatch = fullText.match(/<outfit>([^<]+)<\/outfit>/);
          let suggestedItems: typeof items = [];
          if (outfitMatch) {
            const ids = outfitMatch[1]
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            const seen = new Set<string>();
            suggestedItems = ids
              .map((id) => items.find((it) => it.id === id))
              .filter((it): it is (typeof items)[number] => {
                if (!it || seen.has(it.id)) return false;
                seen.add(it.id);
                return true;
              });
          }

          const followupsMatch = fullText.match(
            /<followups>([^<]+)<\/followups>/
          );
          let suggestedFollowups: string[] = [];
          if (followupsMatch) {
            suggestedFollowups = followupsMatch[1]
              .split("|")
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 5);
          }

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

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                suggestedItems: suggestedItemsClient,
                suggestedFollowups,
              })}\n\n`
            )
          );
          controller.close();
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[chat stream] error:", msg);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: msg })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/coordinator/chat] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
