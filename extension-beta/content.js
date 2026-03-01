(function () {
  "use strict";

  // Only run on history and profile pages
  if (!location.pathname.startsWith("/profile/history") &&
      !location.pathname.startsWith("/profile/player")) return;

  // Prevent double injection
  if (document.getElementById("fab-stats-exporter-beta")) return;

  const VERSION = "2.1.0-beta";
  const FABSTATS_IMPORT_URL = "https://fabstats.netlify.app/import";

  // ── Known FaB Hero Names ──────────────────────────────────────
  const KNOWN_HEROES = new Set([
    "Arakni","Arakni, Huntsman","Arakni, Marionette","Arakni, Solitary Confinement","Arakni, Web of Deceit",
    "Aurora","Aurora, Shooting Star","Azalea","Azalea, Ace in the Hole",
    "Benji, the Piercing Wind","Betsy","Betsy, Skin in the Game","Blaze, Firemind",
    "Boltyn","Bravo","Bravo, Showstopper","Bravo, Star of the Show",
    "Brevant, Civic Protector","Briar","Briar, Warden of Thorns",
    "Chane","Chane, Bound by Shadow","Cindra","Cindra, Dracai of Retribution",
    "Dash","Dash I/O","Dash, Database","Dash, Inventor Extraordinaire","Data Doll MKII",
    "Dorinthea","Dorinthea Ironsong","Dorinthea, Quicksilver Prodigy",
    "Dromai","Dromai, Ash Artist","Emperor, Dracai of Aesir",
    "Enigma","Enigma, Ledger of Ancestry","Enigma, New Moon",
    "Fai","Fai, Rising Rebellion","Fang","Fang, Dracai of Blades",
    "Florian","Florian, Rotwood Harbinger",
    "Ira, Crimson Haze","Ira, Scarlet Revenger",
    "Iyslander","Iyslander, Stormbind",
    "Kano","Kano, Dracai of Aether",
    "Kassai","Kassai of the Golden Sand","Kassai, Cintari Sellsword",
    "Katsu","Katsu, the Wanderer",
    "Kayo","Kayo, Armed and Dangerous","Kayo, Berserker Runt","Kayo, Strong-arm",
    "Levia","Levia, Shadowborn Abomination","Lexi","Lexi, Livewire",
    "Lyath Goldmane","Lyath Goldmane, Vile Savant",
    "Maxx Nitro","Nuu","Nuu, Alluring Desire",
    "Oldhim","Oldhim, Grandfather of Eternity",
    "Olympia","Olympia, Prized Fighter","Oscilio","Oscilio, Constella Intelligence",
    "Pleiades","Pleiades, Superstar",
    "Prism","Prism, Advent of Thrones","Prism, Awakener of Sol","Prism, Sculptor of Arc Light",
    "Rhinar","Rhinar, Reckless Rampage","Riptide","Riptide, Lurker of the Deep",
    "Ser Boltyn, Breaker of Dawn",
    "Taipanis, Dracai of Judgement","Taylor",
    "Teklovossen","Teklovossen, Esteemed Magnate",
    "Terra","Uzuri","Uzuri, Switchblade",
    "Valda Brightaxe","Valda, Seismic Impact",
    "Verdance","Verdance, Thorn of the Rose",
    "Victor Goldmane","Victor Goldmane, High and Mighty",
    "Viserai","Viserai, Rune Blood",
    "Vynnset","Vynnset, Iron Maiden",
    "Zen","Zen, Tamer of Purpose",
  ]);

  // ── Known Formats ─────────────────────────────────────────────
  const KNOWN_FORMATS = [
    "Classic Constructed",
    "Silver Age",
    "Blitz",
    "Draft",
    "Sealed",
    "Clash",
    "Ultimate Pit Fight",
    "Living Legend",
  ];

  // Aliases for format meta items that don't exactly match
  const FORMAT_ALIASES = {
    "booster draft": "Draft",
    "sealed deck": "Sealed",
    "living legend": "Living Legend",
  };

  // ── Date Parsing ──────────────────────────────────────────────

  function parseDate(text) {
    if (!text) return "";
    // Remove time portion (e.g. ", 11:00 AM")
    const cleaned = text.replace(/,?\s*\d{1,2}:\d{2}\s*(AM|PM)?\s*$/i, "").trim();
    // Remove period after month abbreviation
    const normalized = cleaned.replace(/(\w{3})\.\s/, "$1 ");
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
    return "";
  }

  // ── Event Type Guessing from Meta Item ────────────────────────

  function guessEventType(text) {
    const lower = text.toLowerCase();
    if (/armory/i.test(lower)) return "Armory";
    if (/pre.?release/i.test(lower)) return "Pre-Release";
    if (/on demand/i.test(lower)) return "On Demand";
    if (/skirmish/i.test(lower)) return "Skirmish";
    if (/road to nationals?|\brtn\b/i.test(lower)) return "Road to Nationals";
    if (/pro\s*quest|\bpq\b/i.test(lower)) return "ProQuest";
    if (/battle hardened|\bbh\b/i.test(lower)) return "Battle Hardened";
    if (/\bcalling\b/i.test(lower)) return "The Calling";
    if (/\bnationals?\b/i.test(lower)) return "Nationals";
    if (/pro tour/i.test(lower)) return "Pro Tour";
    if (/\bpti\b|professional tournament invit/i.test(lower)) return "PTI";
    if (/worlds|world championship/i.test(lower)) return "Worlds";
    return "";
  }

  // ── Event Tier Classification ───────────────────────────────

  function getEventTier(eventType) {
    switch (eventType) {
      case "Armory":
      case "On Demand":
      case "Pre-Release":
        return "casual";
      case "Skirmish":
      case "Road to Nationals":
      case "ProQuest":
      case "PTI":
        return "competitive";
      case "Battle Hardened":
      case "The Calling":
      case "Nationals":
      case "Pro Tour":
      case "Worlds":
        return "professional";
      default:
        return "";
    }
  }

  // ── Meta Item Classification ──────────────────────────────────

  function classifyMetaItems(items, fallbackDate) {
    const meta = {
      date: "",
      venue: "",
      eventType: "",
      format: "",
      rated: false,
      xpModifier: 0,
    };

    const dateRegex = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i;
    const shortDateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/i;

    const unmatched = [];

    for (const text of items) {
      // Date: contains full month name + day + year
      if (dateRegex.test(text) || shortDateRegex.test(text)) {
        if (!meta.date) meta.date = parseDate(text);
        continue;
      }

      // Format: exact match, alias, or contains match
      const trimmed = text.trim();
      const trimmedLower = trimmed.toLowerCase();
      if (KNOWN_FORMATS.some(f => f.toLowerCase() === trimmedLower)) {
        meta.format = KNOWN_FORMATS.find(f => f.toLowerCase() === trimmedLower);
        continue;
      }
      if (FORMAT_ALIASES[trimmedLower]) {
        meta.format = FORMAT_ALIASES[trimmedLower];
        continue;
      }

      // Rated / Not Rated
      if (/^\s*Rated\s*$/i.test(text)) { meta.rated = true; continue; }
      if (/^\s*Not Rated\s*$/i.test(text) || /^\s*Unrated\s*$/i.test(text)) { meta.rated = false; continue; }

      // XP Modifier
      const xpMatch = text.match(/XP Modifier:\s*(\d+)/i);
      if (xpMatch) { meta.xpModifier = parseInt(xpMatch[1]); continue; }

      // Event type: contains known event type keywords
      const eventType = guessEventType(text);
      if (eventType) {
        meta.eventType = eventType;
        continue;
      }

      // Unmatched — candidate for venue
      unmatched.push(text);
    }

    // Venue: first unmatched item that looks like a venue (not a number, not too short)
    for (const text of unmatched) {
      const t = text.trim();
      if (t.length >= 2 && t.length < 150 && !/^\d+$/.test(t)) {
        meta.venue = t;
        break;
      }
    }

    // Fallback date from event__when element
    if (!meta.date && fallbackDate) {
      meta.date = parseDate(fallbackDate);
    }

    return meta;
  }

  // ── Playoff Round Classification ──────────────────────────────

  function classifyPlayoffRound(roundText) {
    const lower = roundText.toLowerCase();
    if (/final/i.test(lower) && !/semi|quarter/i.test(lower)) return "Finals";
    if (/semi/i.test(lower)) return "Top 4";
    if (/quarter/i.test(lower)) return "Top 8";
    if (/top\s*4/i.test(lower)) return "Top 4";
    if (/top\s*8/i.test(lower)) return "Top 8";
    return "Playoff";
  }

  // ── Match Table Parsing ───────────────────────────────────────

  function parseMatchTable(detailsEl) {
    const matches = [];
    const tables = detailsEl.querySelectorAll("table");

    for (const table of tables) {
      const ths = [...table.querySelectorAll("th")];
      const headers = ths.map(th => th.textContent.trim().toLowerCase());

      // Skip summary tables (Total Wins, XP Gained, Net Rating Change)
      if (headers.some(h =>
        h.includes("total wins") ||
        h.includes("xp gained") ||
        h.includes("net rating")
      )) continue;

      // Identify match tables by required columns
      const roundIdx = headers.findIndex(h =>
        h.includes("round") || h.includes("playoff") || h === "rnd" || h === "#"
      );
      const oppIdx = headers.findIndex(h =>
        h.includes("opponent") || h.includes("player") || h.includes("team") || h === "name"
      );
      const resultIdx = headers.findIndex(h =>
        h.includes("result") || h.includes("outcome") || h === "w/l" || h === "win/loss"
      );

      // Need at least opponent + result columns
      if (oppIdx === -1 || resultIdx === -1) continue;

      const isPlayoff = headers.some(h => h.includes("playoff") || h.includes("top"));

      // Parse rows — try tbody first, then all tr (skip header)
      const tbodyRows = table.querySelectorAll("tbody tr");
      const rows = tbodyRows.length > 0
        ? tbodyRows
        : [...table.querySelectorAll("tr")].slice(1);

      for (const row of rows) {
        const cells = [...row.querySelectorAll("td")];
        if (cells.length <= Math.max(oppIdx, resultIdx)) continue;

        const roundText = roundIdx >= 0 ? (cells[roundIdx]?.textContent || "").trim() : "0";
        const oppRaw = (cells[oppIdx]?.textContent || "").trim();
        const resultText = (cells[resultIdx]?.textContent || "").trim().toLowerCase();

        // Handle byes
        if (/^bye$/i.test(oppRaw) || /bye/i.test(resultText)) {
          matches.push({
            round: parseInt(roundText) || 0,
            roundLabel: isPlayoff ? classifyPlayoffRound(roundText) : "",
            opponent: "BYE",
            opponentGemId: "",
            result: "bye",
          });
          continue;
        }

        if (!oppRaw || oppRaw.length < 2) continue;

        let result;
        if (resultText === "win" || resultText === "w") result = "win";
        else if (resultText === "loss" || resultText === "l") result = "loss";
        else if (resultText === "draw" || resultText === "d") result = "draw";
        else continue;

        const gemIdMatch = oppRaw.match(/\((\d+)\)\s*$/);
        matches.push({
          round: parseInt(roundText) || 0,
          roundLabel: isPlayoff ? classifyPlayoffRound(roundText) : "",
          opponent: oppRaw.replace(/\s*\(\d+\)\s*$/, "").trim(),
          opponentGemId: gemIdMatch ? gemIdMatch[1] : "",
          result,
        });
      }
    }

    return matches;
  }

  // ── Hero Extraction from Decklists Section ────────────────────

  function extractHeroFromDetails(detailsEl) {
    // Look for "Decklists" heading
    const headings = detailsEl.querySelectorAll("h5");
    let decklistHeading = null;
    for (const h of headings) {
      if (h.textContent.trim() === "Decklists") {
        decklistHeading = h;
        break;
      }
    }
    if (!decklistHeading) return "Unknown";

    // Scan elements after the Decklists heading for known hero names
    let el = decklistHeading.nextElementSibling;
    while (el) {
      // Check links, cells, spans, divs
      for (const child of el.querySelectorAll("a, td, span, div, p")) {
        const text = child.textContent.trim();
        if (KNOWN_HEROES.has(text)) return text;
      }
      // Check the element's own text if it's a leaf
      if (el.children.length <= 1) {
        const text = el.textContent.trim();
        if (KNOWN_HEROES.has(text)) return text;
      }
      el = el.nextElementSibling;
    }

    return "Unknown";
  }

  // ── Hero Extraction from Event Card (player page) ────────────

  function extractHeroFromEventCard(eventEl) {
    const decklistsEl = eventEl.querySelector(".event__decklists");
    if (!decklistsEl) return "Unknown";
    for (const link of decklistsEl.querySelectorAll("a")) {
      const text = link.textContent.trim();
      if (KNOWN_HEROES.has(text)) return text;
    }
    return "Unknown";
  }

  // ── Fetch Report Page for In-Progress Events ────────────────

  async function fetchReportPage(reportUrl) {
    try {
      const resp = await fetch(reportUrl, { credentials: "same-origin" });
      if (!resp.ok) return null;
      const html = await resp.text();
      return new DOMParser().parseFromString(html, "text/html");
    } catch {
      return null;
    }
  }

  // ── Parse Single Event Container ──────────────────────────────

  async function parseOneEvent(eventEl) {
    const gemEventId = eventEl.id || "";
    const titleEl = eventEl.querySelector("h4.event__title") || eventEl.querySelector(".event__title");
    const title = titleEl ? titleEl.textContent.trim() : "";

    const dateLabel = (eventEl.querySelector(".event__when") || {}).textContent || "";

    // Parse structured meta items
    const metaSpans = [...eventEl.querySelectorAll(".event__meta-item > span, .event__meta-item span")];
    const metaTexts = metaSpans.map(s => s.textContent.trim()).filter(t => t.length > 0);
    const meta = classifyMetaItems(metaTexts, dateLabel.trim());

    // Parse match data from details section
    const details = eventEl.querySelector("details.event__extra-details");

    if (details) {
      // Normal completed event — parse from inline details
      const matches = parseMatchTable(details);
      if (matches.length === 0) return null;

      const hero = extractHeroFromDetails(details);

      return {
        gemEventId,
        name: title,
        date: meta.date,
        venue: meta.venue,
        eventType: meta.eventType,
        format: meta.format,
        rated: meta.rated,
        xpModifier: meta.xpModifier,
        hero,
        matches,
      };
    }

    // No details section — check if this is an in-progress event
    const whenEl = eventEl.querySelector(".event__when");
    const isInProgress = whenEl &&
      (whenEl.classList.contains("event__when--active") ||
       /in\s*progress/i.test(whenEl.textContent));

    if (!isInProgress) return null;

    // Find report page link
    const reportLink = eventEl.querySelector('a[href*="/profile/report/"]');
    if (!reportLink) return null;

    const reportUrl = new URL(reportLink.getAttribute("href"), window.location.origin).href;
    const reportDoc = await fetchReportPage(reportUrl);
    if (!reportDoc) return null;

    const matches = parseMatchTable(reportDoc.body);
    if (matches.length === 0) return null;

    // Extract hero: try event card decklists first, then report page
    let hero = extractHeroFromEventCard(eventEl);
    if (hero === "Unknown") {
      hero = extractHeroFromDetails(reportDoc.body);
    }

    return {
      gemEventId,
      name: title,
      date: meta.date || new Date().toISOString().split("T")[0],
      venue: meta.venue,
      eventType: meta.eventType,
      format: meta.format,
      rated: meta.rated,
      xpModifier: meta.xpModifier,
      hero,
      matches,
    };
  }

  // ── Parse All Events from a Document ──────────────────────────

  async function parseEventsFromDoc(doc) {
    const events = [];
    for (const eventEl of doc.querySelectorAll("div.event")) {
      const parsed = await parseOneEvent(eventEl);
      if (parsed) events.push(parsed);
    }
    return events;
  }

  // ── Page Fetching ─────────────────────────────────────────────

  async function fetchPage(pageNum) {
    const url = new URL("/profile/history/", window.location.origin);
    url.searchParams.set("page", String(pageNum));
    const resp = await fetch(url.href, { credentials: "same-origin" });
    if (!resp.ok) throw new Error("Page " + pageNum + ": HTTP " + resp.status);
    const html = await resp.text();
    return new DOMParser().parseFromString(html, "text/html");
  }

  function detectTotalPages(doc) {
    let max = 1;
    for (const link of doc.querySelectorAll("a[href*='page=']")) {
      const href = link.getAttribute("href") || "";
      const m = href.match(/[?&]page=(\d+)/);
      if (m) {
        const p = parseInt(m[1]);
        if (p > max) max = p;
      }
    }
    return max;
  }

  async function fetchAllPages(onProgress, maxPages) {
    // Fetch page 1 (use current page if already on history page 1, otherwise fetch)
    const onHistoryPage = location.pathname.startsWith("/profile/history");
    const currentPage = (() => {
      const m = location.search.match(/page=(\d+)/);
      return m ? parseInt(m[1]) : 1;
    })();

    let doc1;
    if (onHistoryPage && currentPage === 1) {
      // Parse current page HTML directly — no need to fetch
      doc1 = document;
    } else {
      doc1 = await fetchPage(1);
    }

    const totalPages = maxPages ? Math.min(detectTotalPages(doc1), maxPages) : detectTotalPages(doc1);
    let allEvents = await parseEventsFromDoc(doc1);
    onProgress(1, totalPages, allEvents.length);

    // Fetch remaining pages in batches of 3
    for (let batch = 2; batch <= totalPages; batch += 3) {
      const pageNums = [];
      for (let p = batch; p < batch + 3 && p <= totalPages; p++) {
        pageNums.push(p);
      }

      let docs;
      try {
        docs = await Promise.all(pageNums.map(fetchPage));
      } catch {
        // Parallel failed — try sequential
        docs = [];
        for (const p of pageNums) {
          try { docs.push(await fetchPage(p)); } catch { /* skip */ }
        }
      }

      for (const doc of docs) {
        allEvents = allEvents.concat(await parseEventsFromDoc(doc));
      }
      onProgress(Math.min(batch + 2, totalPages), totalPages, allEvents.length);
    }

    // Also check the player page for in-progress events
    const existingIds = new Set(allEvents.map(e => e.gemEventId).filter(id => id));
    let playerDoc;
    if (location.pathname.startsWith("/profile/player")) {
      playerDoc = document;
    } else {
      try {
        const resp = await fetch("/profile/player/", { credentials: "same-origin" });
        if (resp.ok) {
          const html = await resp.text();
          playerDoc = new DOMParser().parseFromString(html, "text/html");
        }
      } catch { /* ignore */ }
    }

    if (playerDoc) {
      const playerEvents = await parseEventsFromDoc(playerDoc);
      for (const evt of playerEvents) {
        if (!existingIds.has(evt.gemEventId)) {
          allEvents.push(evt);
        }
      }
    }

    return allEvents;
  }

  // ── Extract User's GEM ID ────────────────────────────────────

  async function extractUserGemId() {
    try {
      // If already on the profile page, use current document
      if (location.pathname.startsWith("/profile/player")) {
        const match = document.body.innerText.match(/GEM\s*ID[:\s]*(\d+)/i);
        return match ? match[1] : "";
      }
      // Otherwise fetch the profile page
      const resp = await fetch("/profile/player/", { credentials: "same-origin" });
      if (!resp.ok) return "";
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const match = doc.body.innerText.match(/GEM\s*ID[:\s]*(\d+)/i);
      return match ? match[1] : "";
    } catch {
      return "";
    }
  }

  // ── Build Export Payload ───────────────────────────────────────

  function buildExportPayload(events, userGemId) {
    const matches = [];
    for (const event of events) {
      for (const match of event.matches) {
        matches.push({
          event: event.name,
          date: event.date,
          venue: event.venue,
          eventType: event.eventType,
          eventTier: getEventTier(event.eventType),
          format: event.format,
          rated: event.rated,
          hero: event.hero,
          round: match.round,
          roundLabel: match.roundLabel,
          opponent: match.opponent,
          opponentGemId: match.opponentGemId,
          result: match.result,
          gemEventId: event.gemEventId,
          xpModifier: event.xpModifier,
          extensionVersion: VERSION,
        });
      }
    }
    return { fabStatsVersion: 2, userGemId: userGemId || "", matches };
  }

  // ── Deliver to FaB Stats ──────────────────────────────────────

  async function deliverToFabStats(payload, quickMode) {
    if (payload.matches.length === 0) {
      showError("No matches found. Make sure you're on your GEM History page with events listed.");
      return;
    }

    const compact = JSON.stringify(payload);
    const hashPrefix = quickMode ? "#quickext=" : "#ext=";

    // Copy to clipboard
    let clipboardOk = false;
    try {
      await navigator.clipboard.writeText(compact);
      clipboardOk = true;
    } catch { /* clipboard might not be available */ }

    // Build import URL with data in hash
    let importUrl = FABSTATS_IMPORT_URL;
    try {
      const encoded = btoa(
        encodeURIComponent(compact).replace(/%([0-9A-F]{2})/g, function (_, p1) {
          return String.fromCharCode(parseInt(p1, 16));
        })
      );
      if (encoded.length < 1000000) {
        importUrl = FABSTATS_IMPORT_URL + hashPrefix + encoded;
      }
    } catch { /* encoding failed, use base URL */ }

    if (quickMode) {
      // Quick Sync — auto-redirect, no completion overlay
      window.open(importUrl, "_blank");
      hideOverlay();
      return;
    }

    const needsFileDownload = importUrl === FABSTATS_IMPORT_URL;
    showCompletionOverlay(
      payload.matches.length,
      importUrl,
      clipboardOk,
      needsFileDownload ? compact : null
    );
  }

  // ── Styles ────────────────────────────────────────────────────

  const styleEl = document.createElement("style");
  styleEl.textContent = `
    @keyframes fab-stats-pulse-beta {
      0%, 100% { box-shadow: 0 4px 20px rgba(96,165,250,0.3), 0 2px 8px rgba(0,0,0,0.3); }
      50% { box-shadow: 0 4px 28px rgba(96,165,250,0.6), 0 2px 12px rgba(0,0,0,0.4); }
    }
    @keyframes fab-stats-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    #fab-stats-exporter-beta button:first-child { animation: fab-stats-pulse-beta 2s ease-in-out infinite; }
    #fab-stats-exporter-beta button:first-child:hover { animation: none; }
    #fab-stats-exporter-beta button:first-child:disabled { animation: none; }
    #fab-stats-overlay-beta { transition: opacity 0.3s ease; }
  `;
  document.head.appendChild(styleEl);

  // ── Floating Buttons Container ───────────────────────────────

  const btnContainer = document.createElement("div");
  btnContainer.id = "fab-stats-exporter-beta";
  Object.assign(btnContainer.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "99999",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "8px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  });

  const btn = document.createElement("button");
  btn.textContent = "\uD83E\uDDEA Export to FaB Stats";
  Object.assign(btn.style, {
    padding: "14px 28px",
    background: "linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb)",
    color: "#ffffff",
    border: "2px solid #60a5fa",
    borderRadius: "12px",
    fontWeight: "800",
    fontSize: "15px",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(96,165,250,0.3), 0 2px 8px rgba(0,0,0,0.3)",
    transition: "transform 0.15s, box-shadow 0.15s",
    fontFamily: "inherit",
    letterSpacing: "0.02em",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.transform = "translateY(-2px) scale(1.03)";
    btn.style.boxShadow = "0 6px 24px rgba(96,165,250,0.6), 0 4px 12px rgba(0,0,0,0.4)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "";
    btn.style.boxShadow = "";
  });

  const quickBtn = document.createElement("button");
  quickBtn.textContent = "\u26A1 Quick Sync";
  Object.assign(quickBtn.style, {
    padding: "8px 20px",
    background: "rgba(30, 30, 50, 0.95)",
    color: "#60a5fa",
    border: "1px solid #60a5fa50",
    borderRadius: "8px",
    fontWeight: "700",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "inherit",
    letterSpacing: "0.02em",
  });

  quickBtn.addEventListener("mouseenter", () => {
    quickBtn.style.background = "rgba(96,165,250,0.15)";
    quickBtn.style.borderColor = "#60a5fa";
  });
  quickBtn.addEventListener("mouseleave", () => {
    quickBtn.style.background = "rgba(30, 30, 50, 0.95)";
    quickBtn.style.borderColor = "#60a5fa50";
  });

  // ── Quick Sync Event Count Selector ──────────────────────────

  // Each GEM history page has ~25 events; map user-facing event counts to page counts
  const SYNC_OPTIONS = [
    { label: "25", pages: 1 },
    { label: "50", pages: 2 },
    { label: "100", pages: 4 },
    { label: "All", pages: 0 },
  ];
  const storedIdx = localStorage.getItem("fab-stats-quick-idx");
  let quickSyncIdx = storedIdx !== null ? parseInt(storedIdx) : 0;
  if (quickSyncIdx < 0 || quickSyncIdx >= SYNC_OPTIONS.length) quickSyncIdx = 0;

  const pageSelectorRow = document.createElement("div");
  Object.assign(pageSelectorRow.style, {
    display: "flex",
    gap: "4px",
    justifyContent: "center",
    alignItems: "center",
  });

  function renderPageSelector() {
    pageSelectorRow.innerHTML = "";
    const lbl = document.createElement("span");
    lbl.textContent = "Events:";
    Object.assign(lbl.style, { fontSize: "10px", color: "#555", marginRight: "2px" });
    pageSelectorRow.appendChild(lbl);

    SYNC_OPTIONS.forEach((opt, idx) => {
      const b = document.createElement("button");
      b.textContent = opt.label;
      const isActive = idx === quickSyncIdx;
      Object.assign(b.style, {
        padding: "3px 8px",
        background: isActive ? "rgba(96,165,250,0.2)" : "rgba(30,30,50,0.8)",
        color: isActive ? "#60a5fa" : "#666",
        border: isActive ? "1px solid #60a5fa" : "1px solid #333",
        borderRadius: "6px",
        fontSize: "10px",
        fontWeight: "600",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
      });
      b.addEventListener("click", () => {
        quickSyncIdx = idx;
        localStorage.setItem("fab-stats-quick-idx", String(idx));
        renderPageSelector();
      });
      pageSelectorRow.appendChild(b);
    });
  }
  renderPageSelector();

  btnContainer.appendChild(btn);
  btnContainer.appendChild(quickBtn);
  btnContainer.appendChild(pageSelectorRow);
  document.body.appendChild(btnContainer);

  // ── Progress Overlay ──────────────────────────────────────────

  let overlay = null;

  function showOverlay(status, detail, matchCount, progress) {
    btnContainer.style.display = "none";

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "fab-stats-overlay-beta";
      Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        zIndex: "99999",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      });
      document.body.appendChild(overlay);
    }

    const spinner =
      '<div style="width:40px;height:40px;border:3px solid #333;border-top:3px solid #60a5fa;border-radius:50%;animation:fab-stats-spin 1s linear infinite;margin:0 auto 16px;"></div>';

    const matchLine = matchCount > 0
      ? '<div style="font-size:28px;font-weight:800;color:#60a5fa;margin-bottom:4px;">' + matchCount + " matches</div>" +
        '<div style="font-size:13px;color:#888;margin-bottom:16px;">found so far</div>'
      : "";

    let progressLine = "";
    if (progress && progress.total > 1) {
      const pct = Math.round((progress.current / progress.total) * 100);
      progressLine =
        '<div style="margin-bottom:16px;">' +
          '<div style="font-size:12px;color:#888;margin-bottom:6px;">Page ' +
          progress.current + " of " + progress.total + "</div>" +
          '<div style="width:100%;height:6px;background:#333;border-radius:3px;overflow:hidden;">' +
            '<div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#60a5fa,#3b82f6);border-radius:3px;transition:width 0.3s;"></div>' +
          "</div>" +
        "</div>";
    }

    overlay.innerHTML =
      '<div style="background:#1a1a2e;border:2px solid #60a5fa;border-radius:16px;padding:32px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.6);">' +
      '<div style="display:inline-block;background:#60a5fa20;color:#60a5fa;font-size:10px;font-weight:700;padding:3px 10px;border-radius:4px;margin-bottom:12px;letter-spacing:0.1em;">BETA</div>' +
      spinner +
      '<div style="font-size:18px;font-weight:700;color:#e8e0cc;margin-bottom:8px;">' + status + "</div>" +
      '<div style="font-size:13px;color:#aaa;margin-bottom:20px;line-height:1.5;">' + detail + "</div>" +
      matchLine +
      progressLine +
      '<div style="font-size:11px;color:#555;margin-top:8px;">Fetching pages in the background \u2014 no navigation needed</div>' +
      "</div>";
  }

  function showCompletionOverlay(matchCount, importUrl, clipboardOk, downloadJson) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "fab-stats-overlay-beta";
      Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        zIndex: "99999",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      });
      document.body.appendChild(overlay);
    }

    const hasAutoImport = importUrl !== FABSTATS_IMPORT_URL;

    let backup = "";
    if (clipboardOk) {
      backup = '<div style="color:#666;font-size:11px;margin-top:12px;">Also copied to clipboard as backup</div>';
    }

    let actionHtml;
    if (hasAutoImport) {
      actionHtml =
        '<a href="' + importUrl + '" target="_blank" style="display:block;padding:14px 24px;background:linear-gradient(135deg,#60a5fa,#3b82f6);color:#fff;border-radius:12px;font-weight:800;font-size:16px;text-decoration:none;margin-bottom:8px;">' +
        "Open FaB Stats Import \u2192</a>" + backup;
    } else {
      actionHtml =
        '<button id="fab-stats-download-json-beta" style="display:block;width:100%;padding:14px 24px;background:linear-gradient(135deg,#60a5fa,#3b82f6);color:#fff;border:none;border-radius:12px;font-weight:800;font-size:16px;cursor:pointer;margin-bottom:8px;">' +
        "\u2B07 Download Match Data</button>" +
        '<div style="color:#aaa;font-size:12px;margin-bottom:12px;line-height:1.5;">' +
        "Large export \u2014 save the file, then upload it on the " +
        '<a href="' + FABSTATS_IMPORT_URL + '" target="_blank" style="color:#60a5fa;text-decoration:underline;">FaB Stats Import</a> page' +
        "</div>" + backup;
    }

    overlay.innerHTML =
      '<div style="background:#1a1a2e;border:2px solid #60a5fa;border-radius:16px;padding:32px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.6);">' +
      '<div style="display:inline-block;background:#60a5fa20;color:#60a5fa;font-size:10px;font-weight:700;padding:3px 10px;border-radius:4px;margin-bottom:12px;letter-spacing:0.1em;">BETA</div>' +
      '<div style="font-size:48px;margin-bottom:12px;">\u2705</div>' +
      '<div style="font-size:22px;font-weight:800;color:#60a5fa;margin-bottom:4px;">Export Complete!</div>' +
      '<div style="font-size:15px;color:#e8e0cc;margin-bottom:20px;"><strong>' +
      matchCount + " matches</strong> ready to import</div>" +
      actionHtml +
      '<button id="fab-stats-close-overlay-beta" style="margin-top:16px;background:none;border:1px solid #333;color:#888;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:12px;">Close</button>' +
      "</div>";

    // Download button handler
    const dlBtn = overlay.querySelector("#fab-stats-download-json-beta");
    if (dlBtn && downloadJson) {
      dlBtn.addEventListener("click", () => {
        const blob = new Blob([downloadJson], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "fab-stats-export.json";
        a.click();
        URL.revokeObjectURL(url);
        dlBtn.textContent = "\u2705 Downloaded!";
        dlBtn.style.opacity = "0.7";
      });
    }

    const closeBtn = overlay.querySelector("#fab-stats-close-overlay-beta");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        overlay.remove();
        overlay = null;
        btnContainer.style.display = "";
      });
    }
  }

  function hideOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    btnContainer.style.display = "";
  }

  function showError(message) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "fab-stats-overlay-beta";
      Object.assign(overlay.style, {
        position: "fixed",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        zIndex: "99999",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      });
      document.body.appendChild(overlay);
    }

    overlay.innerHTML =
      '<div style="background:#1a1a2e;border:2px solid #dc2626;border-radius:16px;padding:32px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.6);">' +
      '<div style="display:inline-block;background:#60a5fa20;color:#60a5fa;font-size:10px;font-weight:700;padding:3px 10px;border-radius:4px;margin-bottom:12px;letter-spacing:0.1em;">BETA</div>' +
      '<div style="font-size:48px;margin-bottom:12px;">\u274C</div>' +
      '<div style="font-size:18px;font-weight:700;color:#e8e0cc;margin-bottom:8px;">Export Failed</div>' +
      '<div style="font-size:13px;color:#aaa;margin-bottom:20px;line-height:1.5;">' + message + "</div>" +
      '<button id="fab-stats-close-overlay-beta" style="background:none;border:1px solid #333;color:#888;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:12px;">Close</button>' +
      "</div>";

    const closeBtn = overlay.querySelector("#fab-stats-close-overlay-beta");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        hideOverlay();
      });
    }
  }

  // ── Button Click Handlers ─────────────────────────────────────

  async function handleExport(quickMode) {
    hideOverlay();
    btn.disabled = true;
    quickBtn.disabled = true;
    btn.style.opacity = "0.7";
    btn.style.cursor = "wait";
    quickBtn.style.opacity = "0.5";
    quickBtn.style.cursor = "wait";

    try {
      showOverlay(
        quickMode ? "Quick Syncing..." : "Fetching match history...",
        "Reading page 1", 0
      );

      // Fetch match history and GEM ID in parallel
      // Quick Sync: only page 1 + in-progress events; Full Export: all pages
      const [allEvents, userGemId] = await Promise.all([
        fetchAllPages((current, total, matchCount) => {
          showOverlay(
            quickMode ? "Quick Syncing..." : "Fetching match history...",
            "Page " + current + " of " + total,
            matchCount,
            { current, total }
          );
        }, quickMode ? SYNC_OPTIONS[quickSyncIdx].pages : 0),
        extractUserGemId(),
      ]);

      if (allEvents.length === 0) {
        showError("No events with match results found on your history page.");
        return;
      }

      const totalMatches = allEvents.reduce((sum, e) => sum + e.matches.length, 0);
      showOverlay(
        "Building export...",
        allEvents.length + " events, " + totalMatches + " matches",
        totalMatches
      );

      const payload = buildExportPayload(allEvents, userGemId);
      await deliverToFabStats(payload, quickMode);
    } catch (err) {
      showError(err.message || String(err));
    } finally {
      btn.disabled = false;
      quickBtn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      quickBtn.style.opacity = "1";
      quickBtn.style.cursor = "pointer";
    }
  }

  btn.addEventListener("click", () => handleExport(false));
  quickBtn.addEventListener("click", () => handleExport(true));
})();
