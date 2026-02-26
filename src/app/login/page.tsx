"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const ERROR_MAP: Record<string, string> = {
  "auth/invalid-email": "Invalid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "Invalid email or password.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/popup-closed-by-user": "Sign-in popup was closed.",
  "auth/cancelled-popup-request": "Sign-in cancelled.",
};

function friendlyError(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    return ERROR_MAP[(err as { code: string }).code] || "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle, enterGuestMode, resetPassword } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function handleResetPassword() {
    if (!email.trim()) {
      setError("Enter your email address first, then click Forgot Password.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      router.push("/");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push("/");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <svg viewBox="0 0 32 32" className="w-10 h-10">
              <rect width="32" height="32" rx="6" fill="#0c0a0e" />
              <path
                d="M16 4L6 9v7c0 6.2 4.3 11.9 10 13.7 5.7-1.8 10-7.5 10-13.7V9L16 4z"
                stroke="#c9a84c"
                strokeWidth="1.2"
                fill="#c9a84c"
                fillOpacity="0.1"
              />
              <path
                d="M16 9l-1.8 5.5H9.5l3.7 2.7-1.4 4.3L16 18.8l4.2 2.7-1.4-4.3 3.7-2.7h-4.7L16 9z"
                fill="#c9a84c"
              />
            </svg>
            <span className="text-2xl font-bold text-fab-gold">FaB Stats</span>
          </div>
          <p className="text-fab-muted text-sm">
            Track your Flesh and Blood tournament results
          </p>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg font-semibold bg-white text-gray-800 hover:bg-gray-100 transition-colors disabled:opacity-50 mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>
        <p className="text-[11px] text-fab-dim text-center -mt-2 mb-2">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-fab-gold/60 hover:underline" target="_blank">Terms</Link>
          {" "}&amp;{" "}
          <Link href="/privacy" className="text-fab-gold/60 hover:underline" target="_blank">Privacy Policy</Link>
        </p>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-fab-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-fab-bg px-3 text-fab-dim">or</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 border border-fab-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(""); }}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mode === "signin"
                ? "bg-fab-gold text-fab-bg"
                : "bg-fab-surface text-fab-muted hover:text-fab-text"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mode === "register"
                ? "bg-fab-gold text-fab-bg"
                : "bg-fab-surface text-fab-muted hover:text-fab-text"
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-fab-muted mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-fab-surface border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-fab-muted mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-fab-surface border border-fab-border text-fab-text rounded-lg px-3 py-2 focus:outline-none focus:border-fab-gold"
              placeholder="At least 6 characters"
            />
            {mode === "signin" && (
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-xs text-fab-gold/70 hover:text-fab-gold mt-1 transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>

          {mode === "register" && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 accent-fab-gold"
              />
              <span className="text-xs text-fab-muted">
                I agree to the{" "}
                <Link href="/terms" className="text-fab-gold hover:underline" target="_blank">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-fab-gold hover:underline" target="_blank">Privacy Policy</Link>
              </span>
            </label>
          )}

          {error && (
            <p className="text-fab-loss text-sm">{error}</p>
          )}
          {success && (
            <p className="text-fab-win text-sm">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading || (mode === "register" && !acceptedTerms)}
            className="w-full py-2.5 rounded-lg font-semibold bg-fab-gold text-fab-bg hover:bg-fab-gold-light transition-colors disabled:opacity-50"
          >
            {loading
              ? "..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        {/* Guest mode */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-fab-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-fab-bg px-3 text-fab-dim">just want to try it out?</span>
          </div>
        </div>

        <button
          onClick={() => {
            enterGuestMode();
            router.push("/");
          }}
          className="w-full py-2.5 rounded-lg font-semibold bg-fab-surface border border-fab-gold/30 text-fab-text hover:bg-fab-gold/10 hover:border-fab-gold/50 transition-colors"
        >
          Continue as Guest
        </button>
        <p className="text-xs text-fab-dim text-center mt-2">
          No account needed — start importing right away. Your data stays in this browser. You can sign up later to sync across devices.
        </p>

        {/* Credit */}
        <div className="mt-10 pt-6 border-t border-fab-border text-center">
          <p className="text-xs text-fab-dim mb-2">
            Built by <a href="https://azoni.ai/" target="_blank" rel="noopener noreferrer" className="text-fab-gold hover:text-fab-gold-light transition-colors">azoni</a>
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href="https://x.com/azoniNFT" target="_blank" rel="noopener noreferrer" className="text-fab-dim hover:text-fab-text transition-colors" title="X / Twitter">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://github.com/azoni" target="_blank" rel="noopener noreferrer" className="text-fab-dim hover:text-fab-text transition-colors" title="GitHub">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/charltonsmith/" target="_blank" rel="noopener noreferrer" className="text-fab-dim hover:text-fab-text transition-colors" title="LinkedIn">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a href="https://azoni.ai/" target="_blank" rel="noopener noreferrer" className="text-fab-dim hover:text-fab-text transition-colors" title="Website">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
