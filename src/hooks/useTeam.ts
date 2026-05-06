"use client";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  subscribeToTeam,
  subscribeToTeamMembers,
  subscribeToMyInvites,
  getTeam,
  getTeamMembers,
  getProfilePrimaryTeamId,
  getProfileTeamIds,
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

/** Get the current user's primary team (the one shown on badges, /team default).
 *  Falls back to legacy `teamId` for not-yet-migrated profiles. */
export function useMyTeam() {
  const { profile } = useAuth();
  const primaryTeamId = profile ? getProfilePrimaryTeamId(profile) : null;
  const { team, members, loading } = useTeam(primaryTeamId);

  const myRole = profile?.uid && members.length > 0
    ? (members.find((m) => m.uid === profile.uid)?.role ?? null)
    : null;

  return { team, members, myRole, loading };
}

/** Get every team the current user belongs to, plus the primary team's id.
 *  Used by the My Teams panel to render a switcher / management list. */
export function useMyTeams(): { teams: Team[]; primaryTeamId: string | null; loading: boolean } {
  const { profile } = useAuth();
  const teamIds = useMemo(() => (profile ? getProfileTeamIds(profile) : []), [profile]);
  const primaryTeamId = profile ? getProfilePrimaryTeamId(profile) : null;
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (teamIds.length === 0) {
      setTeams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    (async () => {
      const fetched = await Promise.all(teamIds.map((id) => getTeam(id)));
      if (cancelled) return;
      setTeams(fetched.filter((t): t is Team => t !== null));
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // teamIds is a fresh array each render; stringify so we only re-fetch when contents change.
  }, [teamIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { teams, primaryTeamId, loading };
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
