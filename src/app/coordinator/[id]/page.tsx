"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, RotateCcw, Check, ImageOff } from "lucide-react";
import { getCoordinator } from "@/lib/coordinators";

interface SuggestedItem {
  id: string;
  name: string;
  brand: string | null;
  productName: string | null;
  category: string;
  imageUrl: string | null;
  imageBgRemovedUrl: string | null;
  wornCount: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestedItems?: SuggestedItem[];
  suggestedFollowups?: string[]; // AIが生成した、この返信に応じた追問候補
  worn?: boolean; // 「このコーデにする」を押したか
}

export default function CoordinatorChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const coordinator = getCoordinator(id);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 履歴をlocalStorageに保存・復元
  useEffect(() => {
    if (!coordinator) return;
    const saved = localStorage.getItem(`chat-${coordinator.id}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        // ignore
      }
    } else {
      // キャラ定義の挨拶を初回メッセージに
      setMessages([{ role: "assistant", content: coordinator.greeting }]);
    }
  }, [coordinator]);

  useEffect(() => {
    if (!coordinator) return;
    if (messages.length > 0) {
      localStorage.setItem(`chat-${coordinator.id}`, JSON.stringify(messages));
    }
  }, [messages, coordinator]);

  // 新規メッセージで一番下にスクロール
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  if (!coordinator) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500">コーディネーターが見つかりません</p>
        <button
          onClick={() => router.push("/coordinator")}
          className="mt-4 text-rose-500 text-sm"
        >
          一覧に戻る
        </button>
      </div>
    );
  }

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    // 暫定のアシスタント空メッセージを追加（ストリーミング受信用）
    const messagesWithStreamingSlot: ChatMessage[] = [
      ...newMessages,
      { role: "assistant", content: "" },
    ];
    const streamingIdx = messagesWithStreamingSlot.length - 1;
    setMessages(messagesWithStreamingSlot);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/coordinator/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coordinatorId: coordinator.id,
          messages: newMessages,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `返信エラー (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });

        // SSEは "\n\n" で区切られる
        const events = sseBuffer.split("\n\n");
        sseBuffer = events.pop() || "";

        for (const evt of events) {
          const line = evt.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          try {
            const payload = JSON.parse(line.substring(6));
            if (payload.type === "text") {
              accumulated += payload.delta;
              const display = stripStreamingTags(accumulated, false);
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === streamingIdx ? { ...m, content: display } : m
                )
              );
            } else if (payload.type === "done") {
              const finalText = stripStreamingTags(accumulated, true);
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === streamingIdx
                    ? {
                        ...m,
                        content: finalText,
                        suggestedItems: payload.suggestedItems || [],
                        suggestedFollowups: payload.suggestedFollowups || [],
                      }
                    : m
                )
              );
            } else if (payload.type === "error") {
              throw new Error(payload.error || "ストリーミングエラー");
            }
          } catch (parseErr) {
            console.error("SSE parse error:", parseErr, line);
          }
        }
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "送信に失敗しました");
      // 失敗時は暫定の空アシスタントメッセージを削除
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  };

  /**
   * ストリーミング中のテキストから <outfit> <followups> タグを除外して表示用に整形
   * @param final 完了済みかどうか（true なら閉じてないタグは諦めて表示）
   */
  function stripStreamingTags(text: string, final: boolean): string {
    let result = text;
    // 完全に閉じているタグを除去
    result = result.replace(/<outfit>[^<]*<\/outfit>/g, "");
    result = result.replace(/<followups>[^<]*<\/followups>/g, "");
    if (!final) {
      // 開いてるが閉じてないタグ（ストリーミング途中）を除去
      result = result.replace(/<outfit>[^<]*$/g, "");
      result = result.replace(/<followups>[^<]*$/g, "");
      // 最後に未確定の < があれば隠す（タグ開始の可能性）
      const ltIdx = result.lastIndexOf("<");
      if (ltIdx > -1 && result.indexOf(">", ltIdx) === -1) {
        result = result.substring(0, ltIdx);
      }
    }
    return result.trim();
  }

  const handleWearOutfit = async (msgIdx: number, items: SuggestedItem[]) => {
    // 楽観更新
    setMessages((prev) =>
      prev.map((m, i) => (i === msgIdx ? { ...m, worn: true } : m))
    );
    try {
      await Promise.all(
        items.map((it) =>
          fetch(`/api/clothing/${it.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wornCount: it.wornCount + 1,
              lastWornAt: new Date().toISOString(),
            }),
          })
        )
      );
    } catch (e) {
      console.error("[wear-outfit] failed:", e);
    }
  };

  const resetChat = () => {
    if (!confirm("会話をリセットしますか？")) return;
    localStorage.removeItem(`chat-${coordinator.id}`);
    setMessages([]);
    // 初回挨拶を再表示するためにリロード
    location.reload();
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-stone-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-3 border-b border-stone-100 flex items-center gap-3">
        <Link
          href="/coordinator"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-50"
        >
          <ChevronLeft size={20} className="text-stone-600" />
        </Link>
        <div
          className={`w-10 h-10 rounded-xl ${coordinator.bgColor} flex items-center justify-center text-xl`}
        >
          {coordinator.emoji}
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-stone-800">{coordinator.name}</h1>
          <p className={`text-[10px] ${coordinator.accentColor}`}>{coordinator.tagline}</p>
        </div>
        <button
          onClick={resetChat}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-50 text-stone-400"
          title="会話をリセット"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i}>
            <div
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}
            >
              {m.role === "assistant" && (
                <div
                  className={`w-7 h-7 rounded-full ${coordinator.bgColor} flex items-center justify-center text-sm flex-shrink-0`}
                >
                  {coordinator.emoji}
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-rose-400 text-white rounded-br-md"
                    : "bg-white text-stone-700 rounded-bl-md border border-stone-100"
                }`}
              >
                {m.role === "assistant" && m.content === "" ? (
                  <span className="inline-flex gap-1 py-0.5">
                    <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                ) : (
                  m.content
                )}
              </div>
            </div>

            {/* 提案アイテムのサムネ表示 */}
            {m.role === "assistant" && m.suggestedItems && m.suggestedItems.length > 0 && (
              <div className="mt-2 ml-9">
                <div className="bg-white border border-stone-100 rounded-2xl p-3 shadow-sm">
                  <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
                    提案コーデ（{m.suggestedItems.length}点）
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {m.suggestedItems.map((item) => {
                      const src = item.imageBgRemovedUrl || item.imageUrl;
                      return (
                        <Link
                          key={item.id}
                          href={`/closet/${item.id}`}
                          className="block"
                        >
                          <div className="aspect-square rounded-xl overflow-hidden bg-stone-50 relative">
                            {src ? (
                              <Image
                                src={src}
                                alt={item.name}
                                fill
                                className="object-cover"
                                sizes="100px"
                                unoptimized={!!item.imageBgRemovedUrl}
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-50">
                                <ImageOff size={16} className="text-stone-300" />
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1">
                              <p className="text-white text-[9px] font-medium truncate">
                                {item.name}
                              </p>
                            </div>
                          </div>
                          {item.brand && (
                            <p className="text-[9px] text-stone-400 truncate mt-0.5 px-0.5">
                              {item.brand}
                            </p>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handleWearOutfit(i, m.suggestedItems!)}
                    disabled={m.worn}
                    className={`w-full h-9 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
                      m.worn
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-stone-800 text-white"
                    }`}
                  >
                    <Check size={14} />
                    {m.worn ? "今日のコーデに決定しました" : "このコーデにする"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {error && (
          <div className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 text-center">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Starter chips（最初のメッセージ前のみ表示） */}
      {coordinator.starters &&
        coordinator.starters.length > 0 &&
        !messages.some((m) => m.role === "user") &&
        !sending && (
          <div className="bg-stone-50 px-3 pb-2">
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                話題のヒント
              </span>
              <span className="text-[10px] text-stone-400">タップして相談開始</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {coordinator.starters.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className={`flex-none px-3 py-2 rounded-full text-xs font-medium bg-white border ${coordinator.accentColor} border-stone-200 active:scale-95 transition-all whitespace-nowrap shadow-sm`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Followup chips（会話中：最後のメッセージがアシスタントの返信の時のみ） */}
      {(() => {
        if (sending) return null;
        if (messages.length === 0) return null;
        const last = messages[messages.length - 1];
        if (last.role !== "assistant") return null;
        if (!messages.some((m) => m.role === "user")) return null;

        // 動的（AIが生成した）追問候補を優先。なければ静的なフォールバック。
        const chips =
          last.suggestedFollowups && last.suggestedFollowups.length > 0
            ? last.suggestedFollowups
            : coordinator.followups || [];

        if (chips.length === 0) return null;
        const isDynamic = !!(last.suggestedFollowups && last.suggestedFollowups.length > 0);

        return (
          <div className="bg-stone-50 px-3 pb-2">
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                続けて聞く
              </span>
              {isDynamic && (
                <span className={`text-[9px] font-bold ${coordinator.accentColor}`}>
                  ✨ 会話に合わせて生成
                </span>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {chips.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className={`flex-none px-3 py-1.5 rounded-full text-[11px] font-medium bg-white border ${coordinator.accentColor} border-stone-200 active:scale-95 transition-all whitespace-nowrap`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Input */}
      <div className="bg-white px-3 py-3 border-t border-stone-100">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // IME変換中のEnterは無視（日本語入力の確定とぶつかるのを防ぐ）
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="メッセージを入力..."
            disabled={sending}
            className="flex-1 bg-stone-50 rounded-full px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 border border-stone-100 focus:outline-none focus:border-rose-300 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              !input.trim() || sending
                ? "bg-stone-100 text-stone-300"
                : "bg-rose-400 text-white shadow-md"
            }`}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
