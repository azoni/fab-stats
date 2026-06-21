"use client";
import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, Send, BookOpen, Lock, Plus, Square } from "lucide-react";

interface Citation {
  id: string;
  label: string;
  url?: string | null;
  kind: string;
}
interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  pending?: boolean;
  streaming?: boolean;
  status?: string;
  error?: boolean;
}

const STARTERS = [
  "What's the current community meta?",
  "What does Command and Conquer do?",
  "What's my win rate and best hero?",
  "Who are the top Classic Constructed heroes?",
];

// ── Lightweight chat-text renderer (bold, inline code, bullet lists) ──
function renderInline(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] != null) nodes.push(<strong key={`${key}-b${k++}`} className="font-semibold text-fab-text">{m[2]}</strong>);
    else if (m[3] != null) nodes.push(<code key={`${key}-c${k++}`} className="rounded bg-fab-bg px-1 py-0.5 text-[0.85em]">{m[3]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function ChatText({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  let n = 0;
  const flush = () => {
    if (bullets.length) {
      const items = bullets;
      blocks.push(
        <ul key={`ul${n++}`} className="list-disc space-y-1 pl-5">
          {items.map((b, i) => (
            <li key={i}>{renderInline(b, `ul${n}-${i}`)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  content.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (/^[-*•]\s+/.test(t)) bullets.push(t.replace(/^[-*•]\s+/, ""));
    else if (/^\d+\.\s+/.test(t)) bullets.push(t.replace(/^\d+\.\s+/, ""));
    else {
      flush();
      if (t) blocks.push(<p key={`p${i}`}>{renderInline(t, `p${i}`)}</p>);
    }
  });
  flush();
  return <div className="space-y-2 text-sm leading-6 text-fab-text">{blocks}</div>;
}

function buildHistory(msgs: ChatMsg[]): { role: "user" | "assistant"; content: string }[] {
  const turns = msgs.filter((m) => !m.pending && !m.error && m.content.trim()).map((m) => ({ role: m.role, content: m.content }));
  const out: { role: "user" | "assistant"; content: string }[] = [];
  for (const t of turns) {
    const last = out[out.length - 1];
    if (last && last.role === t.role) continue;
    if (out.length === 0 && t.role !== "user") continue;
    out.push(t);
  }
  let capped = out.slice(-12);
  if (capped[0]?.role === "assistant") capped = capped.slice(1);
  return capped;
}

export default function InsightsPage() {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy || !user) return;
      setInput("");
      const history = buildHistory(messages);
      const pendingId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: q },
        { id: pendingId, role: "assistant", content: "", pending: true, streaming: true },
      ]);
      setBusy(true);
      const patch = (p: Partial<ChatMsg>) => setMessages((prev) => prev.map((m) => (m.id === pendingId ? { ...m, ...p } : m)));
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/.netlify/functions/ai-insights", {
          method: "POST",
          headers: { "content-type": "application/json", Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          body: JSON.stringify({ question: q, history, stream: true }),
          signal: ac.signal,
        });

        // Caps / auth / config errors come back as a non-200 JSON body.
        if (!res.ok) {
          let msg = `Request failed (${res.status}).`;
          try {
            const d = await res.json();
            msg = d?.error ?? msg;
          } catch {
            /* non-JSON */
          }
          throw new Error(msg);
        }

        // Graceful fallback: server answered JSON (streaming unavailable).
        const ct = res.headers.get("content-type") ?? "";
        if (!res.body || ct.includes("application/json")) {
          const data = await res.json();
          patch({ pending: false, streaming: false, status: undefined, content: data.answer, citations: data.citations });
          return;
        }

        // SSE: read `data: {...}\n\n` frames and apply each event.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let answer = "";
        let finished = false;
        while (!finished) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const frames = buf.split("\n\n");
          buf = frames.pop() ?? "";
          for (const frame of frames) {
            const line = frame.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            let ev: { type: string; text?: string; value?: string; answer?: string; citations?: Citation[]; error?: string };
            try {
              ev = JSON.parse(line.slice(5).trim());
            } catch {
              continue;
            }
            if (ev.type === "delta") {
              answer += ev.text ?? "";
              patch({ content: answer, pending: false, status: undefined });
            } else if (ev.type === "status") {
              patch({ status: ev.value });
            } else if (ev.type === "reset") {
              answer = "";
              patch({ content: "", pending: true });
            } else if (ev.type === "done") {
              patch({ content: ev.answer ?? answer, citations: ev.citations, pending: false, streaming: false, status: undefined });
              finished = true;
            } else if (ev.type === "error") {
              patch({ error: true, content: ev.error ?? "Something went wrong.", pending: false, streaming: false, status: undefined });
              finished = true;
            }
          }
        }
        // Stream ended without an explicit done/error (e.g. truncated) — settle the bubble.
        patch({ pending: false, streaming: false, status: undefined });
      } catch (e) {
        if ((e as Error)?.name === "AbortError") {
          // User pressed Stop — keep whatever streamed so far.
          setMessages((prev) => prev.map((m) => (m.id === pendingId ? { ...m, pending: false, streaming: false, status: undefined, content: m.content || "_Stopped._" } : m)));
        } else {
          patch({ pending: false, streaming: false, status: undefined, error: true, content: (e as Error)?.message ?? "Something went wrong." });
        }
      } finally {
        setBusy(false);
        abortRef.current = null;
      }
    },
    [busy, user, messages],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  // Admin-only gate.
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-fab-border bg-fab-surface p-5 text-sm text-fab-muted">
          <Lock className="h-5 w-5 shrink-0 text-fab-dim" />
          <p>
            The AI assistant is in a private admin beta.{" "}
            {!user && (
              <Link href="/login" className="text-fab-gold hover:underline">
                Sign in
              </Link>
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-fab-gold/30 bg-fab-gold/10 text-fab-gold">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-sm font-bold text-fab-text">Insights</h1>
            <p className="text-[11px] text-fab-dim">Grounded in your data, the meta &amp; card rules</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-1 rounded-md border border-fab-border bg-fab-bg px-2.5 py-1.5 text-xs text-fab-muted hover:text-fab-text"
          >
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 pb-28">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-10 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-fab-gold/30 bg-fab-gold/10 text-fab-gold">
              <Sparkles className="h-6 w-6" />
            </span>
            <p className="text-base font-semibold text-fab-text">Ask me about FaB Stats</p>
            <p className="mt-1 max-w-sm text-sm text-fab-muted">Your matches, the community meta, matchups, or card rules — every answer cites its sources.</p>
            <div className="mt-5 grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-fab-border bg-fab-surface px-3 py-2.5 text-left text-sm text-fab-muted transition-colors hover:border-fab-gold/40 hover:text-fab-text"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} msg={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 -mx-1 bg-gradient-to-t from-fab-bg via-fab-bg to-transparent px-1 pb-3 pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 rounded-xl border border-fab-border bg-fab-surface p-2 focus-within:border-fab-gold/50"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask anything…  (Enter to send, Shift+Enter for a new line)"
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none"
            maxLength={1000}
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-fab-border bg-fab-bg text-fab-text transition-colors hover:border-fab-gold/50"
              aria-label="Stop"
              title="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fab-gold text-fab-bg transition-colors hover:bg-fab-gold-light disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: ChatMsg }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-br-sm border border-fab-gold/30 bg-fab-gold/10 px-3.5 py-2 text-sm text-fab-text">{msg.content}</div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-fab-border bg-fab-surface px-4 py-3">
        {msg.error ? (
          <p className="text-sm text-fab-loss">{msg.content}</p>
        ) : !msg.content ? (
          <div className="flex items-center gap-2">
            <Typing />
            {msg.status && <span className="text-xs text-fab-dim">{msg.status}</span>}
          </div>
        ) : (
          <>
            <div className="relative">
              <ChatText content={msg.content} />
              {msg.streaming && <span className="ml-0.5 inline-block h-3.5 w-[3px] translate-y-0.5 animate-pulse rounded-sm bg-fab-gold align-text-bottom" aria-hidden />}
            </div>
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-3 border-t border-fab-border pt-2">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-fab-dim">
                  <BookOpen className="h-3 w-3" /> Sources
                </p>
                <ol className="space-y-0.5 text-xs text-fab-muted">
                  {msg.citations.slice(0, 8).map((c, i) => (
                    <li key={c.id}>
                      <span className="text-fab-dim">[{i + 1}]</span>{" "}
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:underline">
                          {c.label}
                        </a>
                      ) : (
                        c.label
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Thinking">
      <span className="h-2 w-2 animate-bounce rounded-full bg-fab-dim [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-fab-dim [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-fab-dim" />
    </div>
  );
}
