export interface LookupPlayer {
  name: string;
  hero: string;
  result: string;
}

export interface LookupEvent {
  name: string;
  date: string;
  format: string;
  eventType: string;
  players: LookupPlayer[];
}

export async function lookupEvents(): Promise<LookupEvent[]> {
  const res = await fetch("/.netlify/functions/event-lookup");
  if (!res.ok) throw new Error("Failed to fetch events");
  const data = await res.json();
  return data.events || [];
}
