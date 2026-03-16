"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function GemAutoSync() {
  const { user, profile } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState(false);

  const { isAdmin } = useAuth();

  if (!user || !profile || !isAdmin) return null;

  const syncStatus = profile.gemSyncStatus;
  const isConnected = syncStatus?.enabled && syncStatus?.lastStatus !== "disconnected";

  async function callFunction(path: string, body: unknown) {
    const token = await user!.getIdToken();
    const res = await fetch(`/.netlify/functions/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    return res;
  }

  async function handleConnect() {
    if (!username.trim() || !password.trim()) {
      setError("Username and password are required");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await callFunction("gem-credentials", {
        action: "connect",
        username: username.trim(),
        password,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to connect");
        return;
      }
      setSuccess("GEM account connected! Your matches will sync automatically.");
      setUsername("");
      setPassword("");
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await callFunction("gem-credentials", { action: "disconnect" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to disconnect");
        return;
      }
      setSuccess("GEM account disconnected.");
    } catch {
      setError("Disconnect failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    setError("");
    setSuccess("");
    try {
      const res = await callFunction("gem-sync", {});
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sync failed");
        return;
      }
      if (data.imported > 0) {
        setSuccess(`Synced ${data.imported} new match${data.imported !== 1 ? "es" : ""}!`);
      } else {
        setSuccess("Already up to date — no new matches found.");
      }
    } catch {
      setError("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  const lastSyncLabel = syncStatus?.lastSyncAt
    ? new Date(syncStatus.lastSyncAt).toLocaleString()
    : "Never";

  return (
    <div className="bg-fab-surface border border-fab-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-fab-bg/50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-inset ring-emerald-500/20 shrink-0">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-fab-text">GEM Auto-Sync</p>
          <p className="text-xs text-fab-dim">
            {isConnected
              ? `Connected — last sync: ${lastSyncLabel}`
              : "Connect your GEM account for automatic match imports"}
          </p>
        </div>
        {isConnected && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 shrink-0">
            Active
          </span>
        )}
        <svg
          className={`w-4 h-4 text-fab-dim transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-fab-border/50">
          {error && (
            <div className="mt-3 p-2.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-3 p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              {success}
            </div>
          )}

          {isConnected ? (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-fab-dim">Status</p>
                  <p className="text-fab-text font-medium">
                    {syncStatus?.lastStatus === "error" ? (
                      <span className="text-red-400">Error</span>
                    ) : syncStatus?.lastStatus === "syncing" ? (
                      <span className="text-amber-400">Syncing...</span>
                    ) : (
                      <span className="text-emerald-400">Active</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-fab-dim">Last Sync</p>
                  <p className="text-fab-text font-medium">{lastSyncLabel}</p>
                </div>
                {syncStatus?.matchesImported != null && syncStatus.matchesImported > 0 && (
                  <div>
                    <p className="text-fab-dim">Last Import</p>
                    <p className="text-fab-text font-medium">{syncStatus.matchesImported} matches</p>
                  </div>
                )}
              </div>

              {syncStatus?.lastError && (
                <p className="text-xs text-red-400">{syncStatus.lastError}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-fab-gold/15 text-fab-gold hover:bg-fab-gold/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "..." : "Disconnect"}
                </button>
              </div>

              <p className="text-[10px] text-fab-dim leading-relaxed">
                Your matches sync automatically once daily. Use "Sync Now" to import your latest matches immediately.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-fab-muted leading-relaxed">
                Connect your GEM account to automatically import your match history daily.
                Your credentials are encrypted and stored securely — they are never visible to anyone.
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="GEM Username / Email"
                  className="w-full bg-fab-bg border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold"
                  autoComplete="username"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="GEM Password"
                  className="w-full bg-fab-bg border border-fab-border rounded-md px-3 py-2 text-fab-text text-sm placeholder:text-fab-dim focus:outline-none focus:border-fab-gold"
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                />
              </div>
              <button
                onClick={handleConnect}
                disabled={loading || !username.trim() || !password.trim()}
                className="px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Connecting..." : "Connect GEM Account"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
