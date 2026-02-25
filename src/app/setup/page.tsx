"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { isUsernameTaken, createProfile } from "@/lib/firestore-storage";

const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/;

export default function SetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(
    user?.displayName || user?.email?.split("@")[0] || ""
  );
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function checkUsername(value: string) {
    const lower = value.toLowerCase();
    if (!USERNAME_REGEX.test(lower)) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const taken = await isUsernameTaken(lower);
    setAvailable(!taken);
    setChecking(false);
  }

  function handleUsernameChange(value: string) {
    const lower = value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
    setUsername(lower);
    setAvailable(null);
    setError("");

    // Debounce check
    if (USERNAME_REGEX.test(lower)) {
      const timeout = setTimeout(() => checkUsername(lower), 400);
      return () => clearTimeout(timeout);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!USERNAME_REGEX.test(username)) {
      setError("Username must be 3-20 characters: letters, numbers, hyphens, underscores.");
      return;
    }

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    if (!user) return;

    setSubmitting(true);
    try {
      await createProfile(user.uid, {
        username,
        displayName: displayName.trim(),
        photoUrl: user.photoURL || undefined,
        isPublic: true,
      });
      router.push("/");
    } catch (err) {
      if (err instanceof Error && err.message.includes("already taken")) {
        setError("That username is taken. Try another.");
        setAvailable(false);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-fab-gold mb-2">Set Up Your Profile</h1>
          <p className="text-fab-muted text-sm">
            Pick a username so other players can find you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm text-fab-muted mb-1">
              Username
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="w-full bg-fab-surface border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
                placeholder="azoni"
                maxLength={20}
              />
              {checking && (
                <span className="absolute right-3 top-2.5 text-fab-dim text-sm">...</span>
              )}
              {!checking && available === true && (
                <span className="absolute right-3 top-2.5 text-fab-win text-sm">Available</span>
              )}
              {!checking && available === false && (
                <span className="absolute right-3 top-2.5 text-fab-loss text-sm">Taken</span>
              )}
            </div>
            <p className="text-xs text-fab-dim mt-1">
              3-20 characters. Letters, numbers, hyphens, underscores.
            </p>
            <p className="text-xs text-fab-dim mt-0.5">
              Your profile will be at <span className="text-fab-gold">/player/{username || "..."}</span>
            </p>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm text-fab-muted mb-1">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-fab-surface border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
              placeholder="Your name"
              maxLength={50}
            />
          </div>

          {error && (
            <p className="text-fab-loss text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || available === false || !USERNAME_REGEX.test(username)}
            className="w-full py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
