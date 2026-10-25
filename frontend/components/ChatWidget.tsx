"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { sendChatMessage } from "@/lib/api";
import { getFaqAnswer } from "@/lib/faqBot";

interface ChatMessage {
  role: "bot" | "user";
  text: string;
}

const QUICK_PROMPTS = [
  "What are my missing skills?",
  "Can we talk about my last analysis?",
  "How is my score calculated?",
  "What algorithms are used?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  // Extract report ID if user is on /results/[id]
  const reportIdMatch = pathname?.match(/\/results\/(\d+)/);
  const currentReportId = reportIdMatch ? parseInt(reportIdMatch[1], 10) : null;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Hi! I'm your ResumePerfecto AI Assistant. Ask me anything about your analysis, missing skills, or how our matching algorithms work.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build conversation history for context
      const conversationTurns = messages
        .filter((m) => m.role === "user" || m.role === "bot")
        .slice(-6)
        .map((m) => ({
          role: m.role === "user" ? "user" : "model",
          text: m.text,
        }));

      const res = await sendChatMessage({
        message: text,
        reportId: currentReportId,
        conversation: conversationTurns,
      });

      setMessages((prev) => [
        ...prev,
        { role: "bot", text: res.reply || "I analyzed your request. Let me know if you need more details!" },
      ]);
    } catch (err) {
      // Fallback to local rule engine if network request fails
      const fallback = getFaqAnswer(text);
      setMessages((prev) => [...prev, { role: "bot", text: fallback }]);
    } finally {
      setLoading(false);
    }
  };

  const renderFormattedText = (text: string) => {
    // Basic markdown formatting: bold **text**, bullet points, and newlines
    const lines = text.split("\n");
    return (
      <div className="space-y-1.5">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;
          
          // Bold formatting replacement
          const parts = line.split(/(\*\*.*?\*\*)/g);
          const parsed = parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return <strong key={pIdx} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
            }
            return part;
          });

          if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-clay-textSoft font-bold mt-0.5">•</span>
                <span>{parsed}</span>
              </div>
            );
          }

          return <p key={idx}>{parsed}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="clay-card w-[340px] sm:w-[380px] h-[480px] flex flex-col p-4 bg-clay-lavender/30 shadow-2xl border border-white/60">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/40">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden shadow-clay-sm relative flex-shrink-0">
                <Image src="/character.png" alt="Helper" fill className="object-cover" />
              </div>
              <div>
                <p className="font-heading font-semibold text-sm leading-tight">ResumePerfecto AI</p>
                <p className="text-[11px] text-clay-textSoft flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {currentReportId ? `Active on Report #${currentReportId}` : "Grounded to your analysis"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-white/50 flex items-center justify-center transition"
            >
              <X size={15} className="text-slate-600" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2.5 py-3 pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`clay-card-flat px-3.5 py-2.5 text-xs sm:text-sm max-w-[88%] leading-relaxed ${
                  m.role === "user"
                    ? "self-end bg-clay-blue text-slate-800 font-medium"
                    : "self-start bg-white/85 text-slate-700 shadow-2xs"
                }`}
              >
                {m.role === "bot" ? renderFormattedText(m.text) : m.text}
              </div>
            ))}

            {loading && (
              <div className="self-start clay-card-flat px-3.5 py-2 bg-white/70 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-clay-blue" />
                <span>Consulting your match data...</span>
              </div>
            )}
          </div>

          {/* Quick Prompts (visible on initial turns) */}
          {messages.length <= 2 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="text-[11px] bg-white/70 hover:bg-white text-slate-700 px-2.5 py-1 rounded-full border border-white/60 transition disabled:opacity-50 text-left"
                >
                  <Sparkles size={10} className="inline mr-1 text-amber-500" />
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="flex items-center gap-2 pt-1 border-t border-white/40">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about your score, missing skills..."
              disabled={loading}
              className="clay-input flex-1 px-3 py-2 text-xs sm:text-sm bg-white/80"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="clay-button w-9 h-9 flex items-center justify-center bg-clay-blue flex-shrink-0 disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-16 h-16 rounded-full shadow-clay-hover border-2 border-white/70 overflow-hidden relative bg-clay-pink hover:scale-105 transition-transform flex items-center justify-center"
        title="Chat with ResumePerfecto AI"
      >
        {open ? (
          <X size={26} className="text-clay-text" />
        ) : (
          <Image src="/character.png" alt="Chat helper" fill className="object-cover" />
        )}
      </button>
    </div>
  );
}
