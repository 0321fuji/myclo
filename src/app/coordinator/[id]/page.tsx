"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Send, RotateCcw } from "lucide-react";
import { getCoordinator } from "@/lib/coordinators";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "返信エラー");
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setSending(false);
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
          <div
            key={i}
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
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start items-end gap-2">
            <div
              className={`w-7 h-7 rounded-full ${coordinator.bgColor} flex items-center justify-center text-sm`}
            >
              {coordinator.emoji}
            </div>
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 border border-stone-100">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 text-center">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white px-3 py-3 border-t border-stone-100">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="メッセージを入力..."
            disabled={sending}
            className="flex-1 bg-stone-50 rounded-full px-4 py-2.5 text-sm text-stone-800 placeholder-stone-300 border border-stone-100 focus:outline-none focus:border-rose-300 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
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
