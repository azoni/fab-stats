"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAuth } from "firebase/auth";

async function generateTweets(prompt: string): Promise<{ tweets: string[]; imageRecommendation: string }> {
  const auth = getAuth();
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch("/.netlify/functions/social-tweet", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to generate tweets");
  }

  return res.json();
}

export function SocialTab() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [thread, setThread] = useState<string[]>([]);
  const [imageRec, setImageRec] = useState("");
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<number | "all" | null>(null);

  async function handleGenerate() {
    if (!prompt.trim() || generating) return;
    setError("");
    setGenerating(true);
    try {
      const result = await generateTweets(prompt);
      setThread(result.tweets);
      setImageRec(result.imageRecommendation);
      setGenerated(true);
      setCopied(null);
    } catch (err: any) {
      setError(err.message || "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  function updateTweet(index: number, value: string) {
    setThread((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function addTweet() {
    setThread((prev) => [...prev, ""]);
  }

  function removeTweet(index: number) {
    if (thread.length <= 1) return;
    setThread((prev) => prev.filter((_, i) => i !== index));
  }

  async function copyTweet(index: number) {
    await navigator.clipboard.writeText(thread[index]);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyAll() {
    const text = thread.map((t, i) => `[Tweet ${i + 1}/${thread.length}]\n${t}`).join("\n\n---\n\n");
    await navigator.clipboard.writeText(text);
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-fab-text mb-1">Tweet Thread Generator</h2>
        <p className="text-xs text-fab-dim">Describe what you want to tweet about — AI will pull community data and write a thread</p>
      </div>

      {/* Prompt */}
      <div className="bg-fab-surface border border-fab-border rounded-lg p-4 space-y-3">
        <div>
          <label className="block text-xs text-fab-muted mb-1">What should the thread be about?</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. tweet about ProQuest Silver Age top 8s this season, highlight Briar dominance..."
            rows={3}
            className="w-full bg-fab-bg border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50 resize-none placeholder:text-fab-dim/50"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            "ProQuest Silver Age meta breakdown",
            "Which hero has the most draws?",
            "Most played venue on the platform",
            "Weekly meta shifts and trending heroes",
            "Hero matchup spotlight — biggest mismatches",
            "Community growth stats",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setPrompt(suggestion)}
              className="px-2 py-1 rounded text-[10px] bg-fab-bg border border-fab-border text-fab-dim hover:text-fab-text hover:border-fab-gold/30 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || generating}
          className="w-full py-2.5 rounded-md font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors text-sm disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate Thread"}
        </button>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>

      {/* Generated thread */}
      {generated && (
        <>
          {/* Image recommendation */}
          {imageRec && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
              <span className="text-blue-400 text-lg shrink-0">📸</span>
              <div>
                <p className="text-xs font-medium text-blue-400">Image Recommendation</p>
                <p className="text-xs text-fab-muted mt-0.5">{imageRec}</p>
              </div>
            </div>
          )}

          {/* Tweets */}
          <div className="space-y-3">
            {thread.map((tweet, i) => {
              const charCount = tweet.length;
              const isOver = charCount > 280;
              return (
                <div key={i} className="bg-fab-surface border border-fab-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-fab-muted">
                      Tweet {i + 1}/{thread.length}
                    </span>
                    <div className="flex items-center gap-2">
                      {thread.length > 1 && (
                        <button
                          onClick={() => removeTweet(i)}
                          className="text-[10px] text-fab-dim hover:text-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                      <button
                        onClick={() => copyTweet(i)}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-fab-bg border border-fab-border text-fab-muted hover:text-fab-text transition-colors"
                      >
                        {copied === i ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={tweet}
                    onChange={(e) => updateTweet(i, e.target.value)}
                    rows={Math.max(4, tweet.split("\n").length + 1)}
                    className="w-full bg-fab-bg border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm outline-none focus:border-fab-gold/50 resize-none font-mono"
                  />
                  <p className={`text-[10px] text-right ${isOver ? "text-red-400 font-medium" : "text-fab-dim"}`}>
                    {charCount}/280{isOver ? " — over limit!" : ""}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={addTweet}
              className="px-4 py-2 rounded-md text-xs font-medium bg-fab-surface border border-fab-border text-fab-muted hover:text-fab-text transition-colors"
            >
              + Add Tweet
            </button>
            <div className="flex-1" />
            <button
              onClick={copyAll}
              className="px-4 py-2 rounded-md text-sm font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors"
            >
              {copied === "all" ? "Copied All!" : "Copy All Tweets"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
