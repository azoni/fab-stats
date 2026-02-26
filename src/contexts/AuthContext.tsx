"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getProfile, importMatchesFirestore } from "@/lib/firestore-storage";
import { checkIsAdmin } from "@/lib/admin";
import { getAllMatches, clearAllData } from "@/lib/storage";
import type { UserProfile } from "@/types";

const googleProvider = new GoogleAuthProvider();
const GUEST_KEY = "fab-stats-guest-mode";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  needsSetup: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  enterGuestMode: () => void;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const isGuestRef = useRef(false);

  // Restore guest mode from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(GUEST_KEY) === "true") {
      setIsGuest(true);
      isGuestRef.current = true;
    }
  }, []);

  function enterGuestMode() {
    localStorage.setItem(GUEST_KEY, "true");
    setIsGuest(true);
    isGuestRef.current = true;
    setLoading(false);
  }

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      // Migrate guest data to Firestore when user signs in
      if (u && isGuestRef.current) {
        const localMatches = getAllMatches();
        if (localMatches.length > 0) {
          await importMatchesFirestore(u.uid, localMatches);
        }
        clearAllData();
        localStorage.removeItem(GUEST_KEY);
        setIsGuest(false);
        isGuestRef.current = false;
      }

      if (!u) {
        setProfile(null);
        setProfileLoading(false);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Check admin status when user changes
  useEffect(() => {
    if (!user?.email) {
      setIsAdmin(false);
      return;
    }
    checkIsAdmin(user.email).then(setIsAdmin);
  }, [user]);

  // Fetch profile once when user is set
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    getProfile(user.uid).then((p) => {
      setProfile(p);
      setProfileLoading(false);
      setLoading(false);
    });
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await getProfile(user.uid);
    setProfile(p);
  }, [user]);

  const needsSetup = !!user && !profileLoading && !profile;

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Send verification email (non-blocking — don't prevent signup)
    sendEmailVerification(cred.user).catch(() => {});
  }

  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading: loading || profileLoading,
        needsSetup,
        isGuest,
        isAdmin,
        enterGuestMode,
        refreshProfile,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
