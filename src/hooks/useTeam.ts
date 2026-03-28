"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToTeam,
  subscribeToTeamMembers,
  subscribeToMyInvites,
  getTeam,
  getTeamMembers,
} from "@/lib/teams";
import type { Team, TeamMember, TeamInvite } from "@/types";

/** Subscribe to a specific team by ID */
export function useTeam(teamId?: string | null) {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setTeam(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubTeam = subscribeToTeam(teamId, (t) => {
      setTeam(t);
      setLoading(false);
    });
    const unsubMembers = subscribeToTeamMembers(teamId, setMembers);

    return () => {
      unsubTeam();
      unsubMembers();
    };
  }, [teamId]);

  return { team, members, loading };
}

/** Get the current user's team (from profile.teamId) */
export function useMyTeam() {
  const { profile } = useAuth();
  const { team, members, loading } = useTeam(profile?.teamId || null);

  const myRole = profile?.uid && members.length > 0
    ? (members.find((m) => m.uid === profile.uid)?.role ?? null)
    : null;

  return { team, members, myRole, loading };
}

/** Subscribe to pending team invites for the current user */
export function useTeamInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setInvites([]);
      setLoading(false);
      return;
    }

    const unsub = subscribeToMyInvites(user.uid, (inv) => {
      setInvites(inv);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return { invites, loading };
}

/** One-shot fetch of a team + members (for team page SSR-like loading) */
export function useTeamOnce(teamId: string | null) {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) {
      setTeam(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const [t, m] = await Promise.all([getTeam(teamId), getTeamMembers(teamId)]);
        if (!cancelled) {
          setTeam(t);
          setMembers(m);
        }
      } catch {
        // Team not found
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [teamId]);

  return { team, members, loading };
}
