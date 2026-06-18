# FaB Stats — Architecture Diagrams

A one-page visual companion to [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md). All diagrams render natively on
GitHub (Mermaid). For the narrative, tradeoffs, and feature inventory, read the full design doc.

---

## 1. System architecture

How the static front end, Firestore tiers, Netlify edge/functions, and the knowledge graph fit together.

```mermaid
flowchart TB
    GEM["GEM tournament site<br/>gem.fabtcg.com"]

    subgraph Browser["BROWSER — static HTML hydrated by React 19"]
        EXT["Extension / Bookmarklet"]
        APP["React app<br/>Firebase Auth (client)<br/>Firestore client SDK + offline cache<br/>ALL owner stats (pure fns)<br/>localStorage: guest, sandbox, theme"]
    end

    subgraph FS["FIRESTORE"]
        PUB["PUBLIC<br/>leaderboard/uid · storeAggregates/slug<br/>heroMatchups · h2h · feed<br/>teams · groups · leagues"]
        PRI["PRIVATE<br/>users/uid/matches/*<br/>conversations · notifications"]
        ADM["ADMIN<br/>admin/config · banner · themeConfig"]
    end

    subgraph Netlify["NETLIFY (CDN)"]
        STATIC["static out/<br/>one _.html per route family"]
        EDGE["EDGE — Deno<br/>og-rewrite + JSON-LD injection"]
        FUNC["FUNCTIONS — Node<br/>store-aggregator (cron 30m/24h)<br/>og-image (satori+resvg)<br/>kg-* · jsonld · gem-sync · lab-data"]
    end

    NEO["Neo4j<br/>knowledge graph + vector ANN"]
    DIS["Discord bot<br/>separate repo"]

    GEM --> EXT --> APP
    APP -->|"reads/writes — rules-gated"| PUB
    APP -->|owner-only| PRI
    APP -->|page loads| STATIC
    EDGE -->|Firestore REST| PUB
    APP -.OG crawl.-> EDGE
    EDGE --> FUNC
    FUNC -->|admin SDK — rules-bypass| FS
    FUNC --> NEO
    DIS --> ADM
```

---

## 2. The data-model spine: private matches → public projections

Raw matches stay private; every public surface is a derived, precomputed projection of them.

```mermaid
flowchart LR
    PRI["PRIVATE<br/>users/uid/matches/*<br/>(raw decklists & results)"]
    PRI -->|"updateLeaderboardEntry (client, on import)"| LB["leaderboard/uid<br/>denormalized public stats<br/>+ venueBreakdown + venueSlugs"]
    PRI -->|"updateCommunityHeroMatchups (client)"| HM["heroMatchups<br/>monthly community meta"]
    PRI -->|"computeH2HForUser (client)"| H2H["h2h/pairId"]
    LB -->|"store-aggregator (cron, admin SDK)"| SA["storeAggregates/slug<br/>+ _directory"]
    LB -->|"kg-sync (nightly, admin SDK)"| KG["Neo4j graph<br/>Player/Hero/Team nodes"]
    LB -->|"Firestore REST (edge)"| OG["OG images + meta tags"]
    classDef priv fill:#3a1f1f,stroke:#a33,color:#fff
    classDef pub fill:#1f2f3a,stroke:#39c,color:#fff
    class PRI priv
    class LB,HM,H2H,SA,KG,OG pub
```

---

## 3. Static-export dynamic-route resolution

Why `/player/alex` works without a server: one static stub + Netlify rewrite + client-side slug read.

```mermaid
flowchart LR
    REQ["GET /player/alex"] --> RW{"Netlify [[redirects]]"}
    RW -->|"/player/* → /player/_.html (status 200)"| STUB["/player/_.html<br/>single static stub"]
    STUB --> HY["React hydrates"]
    HY --> PN["read slug via usePathname()<br/>(useParams returns the generated '_')"]
    PN --> DATA["fetch leaderboard{alex}<br/>+ owner-only matches if self/admin"]
    DATA --> RENDER["compute stats (useMemo) → render"]
```

---

## 4. Import → stats → public projections

```mermaid
sequenceDiagram
    actor U as User
    participant I as /import (client)
    participant PRI as Firestore private
    participant PUB as Firestore public
    U->>I: pick method, paste/scrape
    I->>I: parse, review, dedup, hero-gate
    I->>PRI: importMatchesFirestore (500-doc batches)
    I->>I: compute SessionRecap then render PostEventRecap
    par non-blocking side-effects
        I->>PUB: updateLeaderboardEntry
    and
        I->>PUB: createImportFeedEvent
    and
        I->>PUB: linkMatchesWithOpponents, H2H, heroMatchups
    end
```

---

## 5. Store-page freshness (batch aggregation)

```mermaid
sequenceDiagram
    actor U as User import
    participant LB as leaderboard/uid (public)
    participant AGG as store-aggregator (cron 30m)
    participant SA as storeAggregates/slug
    participant P as Store page
    U->>LB: updateLeaderboardEntry writes venueSlugs (seconds)
    Note over AGG: runs every 30 min — full resync if >24h
    AGG->>LB: fetch docs changed since last run
    AGG->>AGG: collect affected venueSlugs, re-query each store
    AGG->>SA: rewrite store aggregate + directory (<=30 min)
    P->>SA: read one doc, render
```

### Aggregator decision: full vs incremental

```mermaid
flowchart TB
    CRON["cron tick (every 30m)"] --> META{"last full sync &gt; 24h<br/>or no incremental marker?"}
    META -->|yes| FULL["FULL sync<br/>read all leaderboard docs<br/>rebuild every store + directory<br/>(catches removals & drift)"]
    META -->|no| INC["INCREMENTAL sync<br/>fetch docs changed since last run<br/>collect affected venueSlugs<br/>re-query only those stores"]
    FULL --> WRITE["write storeAggregates + _directory"]
    INC --> WRITE["write storeAggregates + _directory"]
```

---

## 6. Social share / OG image

```mermaid
sequenceDiagram
    participant C as Crawler
    participant E as Edge og-rewrite
    participant FS as Firestore REST
    participant OG as og-image fn (satori+resvg)
    C->>E: GET /player/alex
    E->>FS: fetch leaderboard for alex
    E-->>C: HTML with og:image + Person JSON-LD
    C->>OG: GET /og/player/alex.png (Netlify 200-rewrite)
    OG-->>C: 1200x630 PNG, cached 1h
```

---

## 7. Player profile page load

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Netlify
    participant FS as Firestore
    B->>N: GET /player/alex
    N-->>B: /player/_.html (static stub)
    B->>B: hydrate, read slug from usePathname()
    B->>FS: getProfileByUsername (leaderboard)
    B->>FS: if owner/admin, load private matches
    B->>B: compute stats in useMemo, render
```
