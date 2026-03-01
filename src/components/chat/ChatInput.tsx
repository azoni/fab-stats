"use client";
import { useState, useRef, type KeyboardEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  rateLimits: { hourlyRemaining: number; dailyRemaining: number } | null;
  error: string | null;
  multiline?: boolean;
}

export function ChatInput({ onSend, disabled, rateLimits, error, multiline }: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const canSend = text.trim().length > 0 && !disabled && text.length <= 2000;

  function handleSend() {
    if (!canSend) return;
    onSend(text.trim());
    setText("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const nearLimit = rateLimits && (rateLimits.hourlyRemaining <= 2 || rateLimits.dailyRemaining <= 5);

  return (
    <div className="border-t border-fab-border p-3">
      {error && (
        <div className="text-xs text-fab-loss bg-fab-loss/10 rounded px-2 py-1.5 mb-2">
          {error}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Sending..." : "Ask about your stats..."}
          disabled={disabled}
          rows={multiline ? 3 : 1}
          className="flex-1 resize-none bg-fab-bg border border-fab-border rounded-lg px-3 py-2 text-sm text-fab-text placeholder:text-fab-dim focus:outline-none focus:border-fab-gold/40 disabled:opacity-50 transition-colors"
          style={{ maxHeight: multiline ? "120px" : "40px" }}
          maxLength={2000}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="shrink-0 p-2 rounded-lg bg-fab-gold text-fab-bg disabled:opacity-30 hover:bg-fab-gold-light transition-colors"
          title="Send"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        {text.length > 1800 && (
          <span className="text-[10px] text-fab-loss">{text.length}/2000</span>
        )}
        {!text.length && nearLimit && rateLimits && (
          <span className="text-[10px] text-fab-dim">
            {rateLimits.hourlyRemaining}/{10} this hour · {rateLimits.dailyRemaining}/{50} today
          </span>
        )}
      </div>
    </div>
  );
}
