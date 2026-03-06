# Social Tweet Generator — Data Reference

Everything the LLM has access to when generating tweets. All data is aggregated from public leaderboard entries across the entire community.

---

## Currently Sent to LLM

### Overview
| Field | Description |
|-------|-------------|
| totalPlayers | Number of public players on the platform |
| totalMatches | Total matches tracked across all players |
| totalDraws | Total draws across all matches |
| totalByes | Total byes across all matches |
| drawRate | Community-wide draw percentage |

### Hero Stats (Top 25)
Per hero: players, matches, wins, winRate, metaShare%

### Weekly Heroes (Top 15)
This week's hero usage: hero, matches, wins, winRate

### Top 8 Heroes (Top 20)
Playoff appearances: hero, count, champions, finalists, top4, top8

### Top 8 by Event Type
Broken down by: ProQuest, Skirmish, Battle Hardened, Calling, Nationals, Pro Tour, etc.
Each: top 10 heroes with count + champions

### Top Matchups (Top 30, min 10 matches)
Hero vs hero: hero1Wins, hero2Wins, draws, total

### Top Players (Top 10, min 20 matches)
name, matches, winRate, topHero, top8s

### Formats
Per format (CC, Blitz, Draft, Sealed, etc.): matches, winRate

### Venues (Top 20)
Per venue: matches, wins, winRate

### Event Types
Per event type (Armory, Skirmish, ProQuest, etc.): matches, wins, players, winRate

### Streak Leaders (Top 5, min 5 win streak)
Longest all-time win streaks: name, streak, topHero

### Hot Streaks (Top 5, currently on 3+ wins)
Currently on fire: name, currentStreak, topHero

### Armory Stats
totalPlayers (5+ armory matches), totalMatches, avgWinRate, top 5 armory players by winRate

### Activity Stats
weeklyActivePlayers, weeklyTotalMatches, monthlyActivePlayers, monthlyTotalMatches

### Hero Loyalists (Top 10)
Players most dedicated to one hero: name, hero, matches on that hero, total matches, dedication%

### Hero Diversity (Top 5)
Players who play the most different heroes: name, uniqueHeroes count, totalMatches

### Globe Trotters (Top 5, 3+ venues)
Players who visit the most venues: name, venueCount, totalMatches

### Event Grinders (Top 5, 5+ events)
Most events played: name, eventsPlayed, eventWins, totalMatches

---

## Available in Leaderboard but NOT Yet Sent

These fields exist on each player's leaderboard entry but aren't currently aggregated for the LLM:

| Field | Description | Potential Use |
|-------|-------------|---------------|
| ratedMatches / ratedWinRate / ratedWinStreak | Rated (competitive) match stats | "Rated vs casual performance" |
| nemesis / nemesisWinRate / nemesisMatches | Worst matchup opponent | "Community rivalries" |
| monthlyWinRate / monthlyMatches | This month's performance | "Monthly recap" trends |
| totalFinalists | Runner-up finishes | "Always the bridesmaid" angle |
| earnings | Prize money (if entered) | "Top earners" |
| longestLossStreak | Worst losing streak | "Comeback stories" |
| uniqueOpponents | Different people played against | "Most social players" |
| top8sByEventType | Top 8 count per event type | Already partially covered by top8ByEventType |
| minorTop8sByEventType | Minor event top 8s | Armory/Skirmish specific leaderboards |

---

## Available in Stats Library but NOT in Leaderboard

These are computed from raw match data (per-player, not community-wide):

| Function | Source | Description |
|----------|--------|-------------|
| computeStreaks() | stats.ts | Current + longest streaks (win & loss) |
| computeOpponentStats() | stats.ts | Head-to-head records vs specific opponents |
| computeEventStats() | stats.ts | Per-event results with venue/format/type |
| computeEventTypeStats() | stats.ts | Aggregated performance by event type |
| computeVenueStats() | stats.ts | Win rate per venue |
| computeRollingWinRate() | stats.ts | 10-match rolling win rate (momentum) |
| computeTrends() | stats.ts | Weekly/monthly match volume trends |
| computePlayoffFinishes() | stats.ts | Best finishes with event details |
| computeBestFinish() | stats.ts | Single best competitive finish |
| computeMinorEventFinishes() | stats.ts | Armory/Skirmish/ProQuest finishes |
| computeMetaStats() | meta-stats.ts | Hero meta with format/eventType/period filters |
| computeTop8HeroMeta() | meta-stats.ts | Playoff hero performance by filters |
| computeTop8ByEvent() | meta-stats.ts | Top 8s grouped by specific event |
| detectActiveEventType() | meta-stats.ts | Auto-detect this weekend's main event |

---

## Ideas for Tweet Prompts

Based on available data, here are angles the LLM can handle:

**Meta & Heroes**
- "Which hero has the highest win rate this week?"
- "What's the most played hero at ProQuest events?"
- "Hero with most Top 8s but zero wins"
- "Compare Briar vs Prism matchup data"
- "Which hero dominates Blitz vs Classic Constructed?"

**Community & Players**
- "Who has the longest win streak right now?"
- "Most dedicated one-hero player"
- "Player who's visited the most venues"
- "Who grinds the most events?"
- "This week's most active players"

**Venues & Events**
- "What venue has the most matches played?"
- "Best win rate at a specific venue"
- "Armory vs ProQuest: how does the meta differ?"
- "Which event type has the most draws?"

**Trends & Milestones**
- "Community draw rate — is it going up?"
- "Weekly vs monthly activity trends"
- "How many total matches has the community tracked?"
- "Format popularity breakdown"

**Fun / Hot Takes**
- "Hero with the worst win rate but still played a lot"
- "Most lopsided hero matchup"
- "Armory grinders — who lives at their LGS?"
- "Globe trotters — who travels most for FaB?"

---

## Not Yet Possible (Would Need New Data)

| Idea | What's Missing |
|------|---------------|
| "Which hero improved most this month vs last?" | Need historical snapshots or diff computation |
| "New players this week" | No createdAt tracking on leaderboard in context |
| "Deck list trends" | No deck list data stored |
| "Prize pool totals" | Earnings data is sparse/optional |
| "Regional meta differences" | No location/region data on venues |
| "Day-of-week performance" | Match dates exist but not day analysis in context |
| "Game (FaBdoku/etc.) stats" | Game leaderboard data not fetched in social-tweet |
