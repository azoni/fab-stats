(function () {
  "use strict";

  try {

  // ── Validate page — redirect if not on the right page ──
  if (location.hostname !== "gem.fabtcg.com") {
    window.location.href = "https://gem.fabtcg.com/profile/history/";
    return;
  }
  if (!location.pathname.startsWith("/profile/history") && !location.pathname.startsWith("/profile/player")) {
    window.location.href = "https://gem.fabtcg.com/profile/history/";
    return;
  }

  // ── Known Heroes ──
  var KNOWN_HEROES = new Set([
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

  // ── Known Formats ──
  var KNOWN_FORMATS = [
    "Classic Constructed","Silver Age","Blitz","Draft","Sealed","Clash","Ultimate Pit Fight","Living Legend",
  ];
  var FORMAT_ALIASES = {
    "booster draft": "Draft",
    "sealed deck": "Sealed",
    "living legend": "Living Legend",
  };

  // ── Helpers ──

  function parseDate(text) {
    if (!text) return "";
    var cleaned = text.replace(/,?\s*\d{1,2}:\d{2}\s*(AM|PM)?\s*$/i, "").trim();
    var normalized = cleaned.replace(/(\w{3})\.\s/, "$1 ");
    var d = new Date(normalized);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return "";
  }

  function guessEventType(text) {
    var lower = text.toLowerCase();
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

  function getEventTier(eventType) {
    switch (eventType) {
      case "Armory": case "On Demand": case "Pre-Release": return "casual";
      case "Skirmish": case "Road to Nationals": case "ProQuest": case "PTI": return "competitive";
      case "Battle Hardened": case "The Calling": case "Nationals": case "Pro Tour": case "Worlds": return "professional";
      default: return "";
    }
  }

  function classifyMetaItems(items, fallbackDate) {
    var meta = { date: "", venue: "", eventType: "", format: "", rated: false, xpModifier: 0 };
    var dateRegex = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i;
    var shortDateRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/i;
    var unmatched = [];

    for (var i = 0; i < items.length; i++) {
      var text = items[i];
      if (dateRegex.test(text) || shortDateRegex.test(text)) { if (!meta.date) meta.date = parseDate(text); continue; }
      var trimmed = text.trim();
      var trimmedLower = trimmed.toLowerCase();
      var fmt = KNOWN_FORMATS.find(function(f) { return f.toLowerCase() === trimmedLower; });
      if (fmt) { meta.format = fmt; continue; }
      if (FORMAT_ALIASES[trimmedLower]) { meta.format = FORMAT_ALIASES[trimmedLower]; continue; }
      if (/^\s*Rated\s*$/i.test(text)) { meta.rated = true; continue; }
      if (/^\s*Not Rated\s*$/i.test(text) || /^\s*Unrated\s*$/i.test(text)) { meta.rated = false; continue; }
      var xpMatch = text.match(/XP Modifier:\s*(\d+)/i);
      if (xpMatch) { meta.xpModifier = parseInt(xpMatch[1]); continue; }
      var et = guessEventType(text);
      if (et) { meta.eventType = et; continue; }
      unmatched.push(text);
    }

    for (var j = 0; j < unmatched.length; j++) {
      var t = unmatched[j].trim();
      if (t.length >= 2 && t.length < 150 && !/^\d+$/.test(t)) { meta.venue = t; break; }
    }

    if (!meta.date && fallbackDate) meta.date = parseDate(fallbackDate);
    return meta;
  }

  function classifyPlayoffRound(roundText) {
    var lower = roundText.toLowerCase();
    if (/final/i.test(lower) && !/semi|quarter/i.test(lower)) return "Finals";
    if (/semi/i.test(lower)) return "Top 4";
    if (/quarter/i.test(lower)) return "Top 8";
    if (/top\s*4/i.test(lower)) return "Top 4";
    if (/top\s*8/i.test(lower)) return "Top 8";
    return "Playoff";
  }

  function parseMatchTable(detailsEl) {
    var matches = [];
    var tables = detailsEl.querySelectorAll("table");

    for (var ti = 0; ti < tables.length; ti++) {
      var table = tables[ti];
      var ths = Array.from(table.querySelectorAll("th"));
      var headers = ths.map(function(th) { return th.textContent.trim().toLowerCase(); });

      if (headers.some(function(h) { return h.includes("total wins") || h.includes("xp gained") || h.includes("net rating"); })) continue;

      var roundIdx = headers.findIndex(function(h) { return h.includes("round") || h.includes("playoff") || h === "rnd" || h === "#"; });
      var oppIdx = headers.findIndex(function(h) { return h.includes("opponent") || h.includes("player") || h.includes("team") || h === "name"; });
      var resultIdx = headers.findIndex(function(h) { return h.includes("result") || h.includes("outcome") || h === "w/l" || h === "win/loss"; });

      if (oppIdx === -1 || resultIdx === -1) continue;

      var isPlayoff = headers.some(function(h) { return h.includes("playoff") || h.includes("top"); });
      var tbodyRows = table.querySelectorAll("tbody tr");
      var rows = tbodyRows.length > 0 ? tbodyRows : Array.from(table.querySelectorAll("tr")).slice(1);

      for (var ri = 0; ri < rows.length; ri++) {
        var cells = Array.from(rows[ri].querySelectorAll("td"));
        if (cells.length <= Math.max(oppIdx, resultIdx)) continue;

        var roundText = roundIdx >= 0 ? (cells[roundIdx].textContent || "").trim() : "0";
        var oppRaw = (cells[oppIdx].textContent || "").trim();
        var resultText = (cells[resultIdx].textContent || "").trim().toLowerCase();

        if (/^bye$/i.test(oppRaw) || /bye/i.test(resultText)) {
          matches.push({ round: parseInt(roundText) || 0, roundLabel: isPlayoff ? classifyPlayoffRound(roundText) : "", opponent: "BYE", opponentGemId: "", result: "bye" });
          continue;
        }
        if (!oppRaw || oppRaw.length < 2) continue;

        var result;
        if (resultText === "win" || resultText === "w") result = "win";
        else if (resultText === "loss" || resultText === "l") result = "loss";
        else if (resultText === "draw" || resultText === "d") result = "draw";
        else continue;

        var gemIdMatch = oppRaw.match(/\((\d+)\)\s*$/);
        matches.push({
          round: parseInt(roundText) || 0,
          roundLabel: isPlayoff ? classifyPlayoffRound(roundText) : "",
          opponent: oppRaw.replace(/\s*\(\d+\)\s*$/, "").trim(),
          opponentGemId: gemIdMatch ? gemIdMatch[1] : "",
          result: result,
        });
      }
    }
    return matches;
  }

  function extractHeroFromDetails(detailsEl) {
    var headings = detailsEl.querySelectorAll("h5");
    var decklistHeading = null;
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].textContent.trim() === "Decklists") { decklistHeading = headings[i]; break; }
    }
    if (!decklistHeading) return "Unknown";

    var el = decklistHeading.nextElementSibling;
    while (el) {
      var children = el.querySelectorAll("a, td, span, div, p");
      for (var j = 0; j < children.length; j++) {
        var text = children[j].textContent.trim();
        if (KNOWN_HEROES.has(text)) return text;
      }
      if (el.children.length <= 1) {
        var ownText = el.textContent.trim();
        if (KNOWN_HEROES.has(ownText)) return ownText;
      }
      el = el.nextElementSibling;
    }
    return "Unknown";
  }

  function extractHeroFromEventCard(eventEl) {
    var decklistsEl = eventEl.querySelector(".event__decklists");
    if (!decklistsEl) return "Unknown";
    var links = decklistsEl.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) {
      var text = links[i].textContent.trim();
      if (KNOWN_HEROES.has(text)) return text;
    }
    return "Unknown";
  }

  // ── Parse Events from Current Page ──

  function parseCurrentPage() {
    var events = [];
    var eventEls = document.querySelectorAll("div.event");

    for (var i = 0; i < eventEls.length; i++) {
      var eventEl = eventEls[i];
      var gemEventId = eventEl.id || "";
      var titleEl = eventEl.querySelector("h4.event__title") || eventEl.querySelector(".event__title");
      var title = titleEl ? titleEl.textContent.trim() : "";
      var dateLabel = (eventEl.querySelector(".event__when") || {}).textContent || "";

      var metaSpans = Array.from(eventEl.querySelectorAll(".event__meta-item > span, .event__meta-item span"));
      var metaTexts = metaSpans.map(function(s) { return s.textContent.trim(); }).filter(function(t) { return t.length > 0; });
      var meta = classifyMetaItems(metaTexts, dateLabel.trim());

      // Completed events with details
      var details = eventEl.querySelector("details.event__extra-details");
      if (details) {
        var matches = parseMatchTable(details);
        if (matches.length === 0) continue;
        var hero = extractHeroFromDetails(details);
        events.push({
          gemEventId: gemEventId, name: title, date: meta.date, venue: meta.venue,
          eventType: meta.eventType, format: meta.format, rated: meta.rated,
          xpModifier: meta.xpModifier, hero: hero, matches: matches,
        });
        continue;
      }

      // In-progress events (from player page)
      var hero2 = extractHeroFromEventCard(eventEl);
      var tables = eventEl.querySelectorAll("table");
      if (tables.length > 0) {
        var matches2 = parseMatchTable(eventEl);
        if (matches2.length > 0) {
          events.push({
            gemEventId: gemEventId, name: title, date: meta.date || new Date().toISOString().split("T")[0],
            venue: meta.venue, eventType: meta.eventType, format: meta.format, rated: meta.rated,
            xpModifier: meta.xpModifier, hero: hero2, matches: matches2,
          });
        }
      }
    }
    return events;
  }

  // ── Build Payload & Redirect ──

  var events = parseCurrentPage();
  if (events.length === 0) {
    alert("FaB Stats Quick Sync\n\nNo events found on this page.\n\nMake sure you're on:\n• gem.fabtcg.com/profile/history/ (completed events)\n• gem.fabtcg.com/profile/player/ (in-progress events)");
    return;
  }

  var allMatches = [];
  for (var i = 0; i < events.length; i++) {
    var evt = events[i];
    for (var j = 0; j < evt.matches.length; j++) {
      var m = evt.matches[j];
      allMatches.push({
        event: evt.name, date: evt.date, venue: evt.venue,
        eventType: evt.eventType, eventTier: getEventTier(evt.eventType),
        format: evt.format, rated: evt.rated, hero: evt.hero,
        round: m.round, roundLabel: m.roundLabel,
        opponent: m.opponent, opponentGemId: m.opponentGemId,
        result: m.result, gemEventId: evt.gemEventId,
        xpModifier: evt.xpModifier, extensionVersion: "bookmarklet-1.0",
      });
    }
  }

  var payload = { fabStatsVersion: 2, userGemId: "", matches: allMatches };

  var compact = JSON.stringify(payload);

  try {
    var encoded = btoa(
      encodeURIComponent(compact).replace(/%([0-9A-F]{2})/g, function (_, p1) {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
    if (encoded.length > 1000000) {
      alert("FaB Stats Quick Sync\n\nToo much data for a single page.");
      return;
    }
    // Use a temporary link click to navigate — more reliable on iOS Safari
    // than setting window.location.href after an alert
    var url = "https://www.fabstats.net/import#quickext=" + encoded;
    var a = document.createElement("a");
    a.href = url;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
  } catch (e) {
    alert("FaB Stats Quick Sync — Error\n\n" + e.message);
  }

  // Cleanup
  var scriptEl = document.getElementById("fab-stats-bookmarklet");
  if (scriptEl) scriptEl.remove();

  } catch (err) {
    alert("FaB Stats Quick Sync — Error\n\n" + err.message + "\n\n" + err.stack);
  }
})();
