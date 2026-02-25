(function () {
  "use strict";

  // Only run on history pages
  if (!location.pathname.startsWith("/profile/history")) return;

  // Prevent double injection
  if (document.getElementById("fab-stats-exporter")) return;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const SCRAPE_KEY = "fab-stats-scrape";

  const FABSTATS_IMPORT_URL = "https://fabstats.netlify.app/import";

  // ── Styles ────────────────────────────────────────────────────

  const styleEl = document.createElement("style");
  styleEl.textContent = `
    @keyframes fab-stats-pulse {
      0%, 100% { box-shadow: 0 4px 20px rgba(201,168,76,0.3), 0 2px 8px rgba(0,0,0,0.3); }
      50% { box-shadow: 0 4px 28px rgba(201,168,76,0.6), 0 2px 12px rgba(0,0,0,0.4); }
    }
    @keyframes fab-stats-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    #fab-stats-exporter { animation: fab-stats-pulse 2s ease-in-out infinite; }
    #fab-stats-exporter:hover { animation: none; }
    #fab-stats-exporter:disabled { animation: none; }
    #fab-stats-overlay { transition: opacity 0.3s ease; }
  `;
  document.head.appendChild(styleEl);

  // ── Floating Export Button ──────────────────────────────────────

  const btn = document.createElement("button");
  btn.id = "fab-stats-exporter";
  btn.textContent = "\u26A1 Export to FaB Stats";
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "99999",
    padding: "14px 28px",
    background: "linear-gradient(135deg, #d4af37, #c9a84c, #b8963f)",
    color: "#1a1a2e",
    border: "2px solid #d4af37",
    borderRadius: "12px",
    fontWeight: "800",
    fontSize: "16px",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(201,168,76,0.3), 0 2px 8px rgba(0,0,0,0.3)",
    transition: "transform 0.15s, box-shadow 0.15s",
    fontFamily: "system-ui, -apple-system, sans-serif",
    letterSpacing: "0.02em",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.transform = "translateY(-2px) scale(1.03)";
    btn.style.boxShadow =
      "0 6px 24px rgba(201,168,76,0.6), 0 4px 12px rgba(0,0,0,0.4)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "";
    btn.style.boxShadow = "";
  });

  document.body.appendChild(btn);

  // ── Centered Progress Overlay ─────────────────────────────────

  let overlay = null;

  function showOverlay(status, detail, matchCount) {
    btn.style.display = "none";

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "fab-stats-overlay";
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
      '<div style="width:40px;height:40px;border:3px solid #333;border-top:3px solid #d4af37;border-radius:50%;animation:fab-stats-spin 1s linear infinite;margin:0 auto 16px;"></div>';

    const matchLine =
      matchCount > 0
        ? '<div style="font-size:28px;font-weight:800;color:#d4af37;margin-bottom:4px;">' +
          matchCount +
          " matches</div>" +
          '<div style="font-size:13px;color:#888;margin-bottom:16px;">found so far</div>'
        : "";

    overlay.innerHTML =
      '<div style="background:#1a1a2e;border:2px solid #d4af37;border-radius:16px;padding:32px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.6);">' +
      spinner +
      '<div style="font-size:18px;font-weight:700;color:#e8e0cc;margin-bottom:8px;">' +
      status +
      "</div>" +
      '<div style="font-size:13px;color:#aaa;margin-bottom:20px;line-height:1.5;">' +
      detail +
      "</div>" +
      matchLine +
      '<div style="font-size:11px;color:#555;margin-top:8px;">Keep this tab open \u2014 do not navigate away</div>' +
      "</div>";
  }

  function showCompletionOverlay(matchCount, pageCount, importUrl, clipboardOk) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "fab-stats-overlay";
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

    const pages = pageCount > 1 ? " across " + pageCount + " pages" : "";
    const backup = clipboardOk
      ? '<div style="color:#666;font-size:11px;margin-top:12px;">Also copied to clipboard as backup</div>'
      : "";

    overlay.innerHTML =
      '<div style="background:#1a1a2e;border:2px solid #d4af37;border-radius:16px;padding:32px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.6);">' +
      '<div style="font-size:48px;margin-bottom:12px;">\u2705</div>' +
      '<div style="font-size:22px;font-weight:800;color:#d4af37;margin-bottom:4px;">Export Complete!</div>' +
      '<div style="font-size:15px;color:#e8e0cc;margin-bottom:20px;"><strong>' +
      matchCount +
      " matches</strong>" +
      pages +
      " ready to import</div>" +
      '<a href="' +
      importUrl +
      '" target="_blank" style="display:block;padding:14px 24px;background:linear-gradient(135deg,#d4af37,#c9a84c);color:#1a1a2e;border-radius:12px;font-weight:800;font-size:16px;text-decoration:none;margin-bottom:8px;">' +
      "Open FaB Stats Import \u2192</a>" +
      backup +
      '<button id="fab-stats-close-overlay" style="margin-top:16px;background:none;border:1px solid #333;color:#888;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:12px;">Close</button>' +
      "</div>";

    const closeBtn = overlay.querySelector("#fab-stats-close-overlay");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        overlay.remove();
        overlay = null;
        btn.style.display = "";
      });
    }
  }

  function hideOverlay() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
    btn.style.display = "";
  }

  function showError(message) {
    if (overlay) {
      overlay.innerHTML =
        '<div style="background:#1a1a2e;border:2px solid #dc2626;border-radius:16px;padding:32px 40px;max-width:420px;width:90%;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.6);font-family:system-ui,-apple-system,sans-serif;">' +
        '<div style="font-size:48px;margin-bottom:12px;">\u274C</div>' +
        '<div style="font-size:18px;font-weight:700;color:#e8e0cc;margin-bottom:8px;">Export Failed</div>' +
        '<div style="font-size:13px;color:#aaa;margin-bottom:20px;line-height:1.5;">' +
        message +
        "</div>" +
        '<button id="fab-stats-close-overlay" style="background:none;border:1px solid #333;color:#888;padding:8px 20px;border-radius:8px;cursor:pointer;font-size:12px;">Close</button>' +
        "</div>";
      const closeBtn = overlay.querySelector("#fab-stats-close-overlay");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          hideOverlay();
          setBtnReady();
        });
      }
    }
  }

  function setBtnReady() {
    btn.textContent = "\u26A1 Export to FaB Stats";
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
    btn.style.display = "";
  }

  // ── Expand All Collapsed Sections ─────────────────────────────

  async function expandAllSections() {
    let expanded = 0;

    const candidates = document.querySelectorAll(
      "a, button, summary, span, div, [role='button']"
    );
    for (const el of candidates) {
      const text = (el.textContent || "").trim();
      if (/View Results/i.test(text) && text.length < 30) {
        el.click();
        expanded++;
        await sleep(500);
      }
    }

    for (const detail of document.querySelectorAll("details:not([open])")) {
      const summary = detail.querySelector("summary");
      if (summary) {
        summary.click();
        expanded++;
        await sleep(400);
      }
    }

    if (expanded === 0) {
      for (const el of candidates) {
        const text = (el.textContent || "").trim();
        if (
          (text.includes("View") || text.includes("Show")) &&
          text.length < 30
        ) {
          el.click();
          expanded++;
          await sleep(500);
        }
      }
    }

    if (expanded > 0) await sleep(600);
    return expanded;
  }

  // ── Event Name Abbreviation Mapping ──────────────────────────

  // Common GEM abbreviations → expanded names (case-insensitive keys)
  const EVENT_ABBREVIATIONS = {
    "rtn": "Road to Nationals",
    "pq": "ProQuest",
    "bh": "Battle Hardened",
    "upf": "Ultimate Pit Fight",
    "cc": "Classic Constructed",
    "sa": "Silver Age",
  };

  /**
   * Expand known abbreviations in event names.
   * "RtN" → "Road to Nationals"
   * "DapperGames RTN" → "DapperGames Road to Nationals"
   * "PQ Las Vegas" → "ProQuest Las Vegas"
   * Only replaces when the abbreviation appears as a whole word.
   */
  function expandEventName(name) {
    // Check if the ENTIRE name (trimmed, lowered) is an abbreviation
    const lowerFull = name.trim().toLowerCase();
    if (EVENT_ABBREVIATIONS[lowerFull]) {
      return EVENT_ABBREVIATIONS[lowerFull];
    }

    // Replace abbreviations that appear as whole words in the name
    let result = name;
    for (const [abbr, expanded] of Object.entries(EVENT_ABBREVIATIONS)) {
      // Word-boundary match, case-insensitive
      const regex = new RegExp("\\b" + abbr + "\\b", "gi");
      result = result.replace(regex, expanded);
    }
    return result;
  }

  // ── Extract Event Info ────────────────────────────────────────

  function extractEventInfo(matchTable) {
    const info = {
      name: "Unknown Event",
      date: new Date().toISOString().split("T")[0],
      venue: "",
      eventType: "",
      format: "",
      rated: false,
    };

    const isGenericHeading = (text) =>
      /^(Results|Matches|Decklists|Event History|History|Dashboard|Profile)$/i.test(text);

    // ── Step 1: Find the closest non-generic heading ──
    // Walk up from the match table, checking preceding siblings at each level.
    // Track both the heading's sibling element and the match table's ancestor
    // at that same level, so we can scope context to just this event.
    let current = matchTable;
    let headingSib = null; // the sibling element that is (or contains) the heading
    let tableAncestor = null; // matchTable's ancestor at the same sibling level

    for (let depth = 0; depth < 10 && current; depth++) {
      let sib = current.previousElementSibling;
      while (sib) {
        let found = false;
        if (/^H[1-5]$/i.test(sib.tagName)) {
          const text = sib.textContent.trim();
          if (!isGenericHeading(text) && text.length > 2 && text.length < 250) {
            info.name = text;
            found = true;
          }
        }
        if (!found) {
          const headings = sib.querySelectorAll("h1, h2, h3, h4, h5");
          for (let hi = headings.length - 1; hi >= 0; hi--) {
            const text = headings[hi].textContent.trim();
            if (!isGenericHeading(text) && text.length > 2 && text.length < 250) {
              info.name = text;
              found = true;
              break;
            }
          }
        }
        if (found) {
          headingSib = sib;
          tableAncestor = current;
          break;
        }
        sib = sib.previousElementSibling;
      }
      if (headingSib) break;
      current = current.parentElement;
    }

    if (!headingSib) return info;

    // Expand abbreviations in the event name (e.g. "RtN" → "Road to Nationals")
    info.name = expandEventName(info.name);

    // ── Step 2: Collect scoped context text ──
    // Only gather text from elements between the heading and the match table.
    // This prevents picking up metadata from neighboring events.

    // Include up to 3 elements before the heading (for date labels like "Feb. 22, 2026")
    // but stop at other event headings or tables.
    const preTexts = [];
    let prev = headingSib.previousElementSibling;
    for (let i = 0; i < 3 && prev; i++) {
      const t = (prev.textContent || "").trim();
      if (/^H[1-5]$/i.test(prev.tagName) && !isGenericHeading(t)) break;
      if (prev.querySelector && prev.querySelector("table")) break;
      preTexts.unshift(t);
      prev = prev.previousElementSibling;
    }

    // Collect elements from heading through to the table ancestor
    const scopeEls = [];
    let el = headingSib;
    while (el) {
      scopeEls.push(el);
      if (el === tableAncestor || el.contains(matchTable)) break;
      el = el.nextElementSibling;
    }

    const fullText =
      preTexts.join(" ") + " " + scopeEls.map((e) => e.textContent || "").join(" ");

    // ── Step 3: Extract metadata from scoped text ──

    // Date (try full month names first, then abbreviated)
    let dateMatch = fullText.match(
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i
    );
    if (!dateMatch) {
      dateMatch = fullText.match(
        /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}/i
      );
    }
    if (dateMatch) {
      const d = new Date(dateMatch[0].replace(/(\w{3})\./, "$1"));
      if (!isNaN(d.getTime())) {
        info.date = d.toISOString().split("T")[0];
      }
    }

    // Format
    if (/Classic Constructed/i.test(fullText))
      info.format = "Classic Constructed";
    else if (/\bSilver Age\b/i.test(fullText)) info.format = "Silver Age";
    else if (/\bBlitz\b/i.test(fullText)) info.format = "Blitz";
    else if (/\bDraft\b/i.test(fullText)) info.format = "Draft";
    else if (/\bSealed\b/i.test(fullText)) info.format = "Sealed";
    else if (/\bClash\b/i.test(fullText)) info.format = "Clash";
    else if (/Ultimate Pit Fight|UPF/i.test(fullText))
      info.format = "Ultimate Pit Fight";

    // Fallback: check event name for format keywords
    if (!info.format) {
      const name = info.name;
      if (/Classic Constructed/i.test(name))
        info.format = "Classic Constructed";
      else if (/\bSilver Age\b/i.test(name)) info.format = "Silver Age";
      else if (/\bBlitz\b/i.test(name)) info.format = "Blitz";
      else if (/\bDraft\b/i.test(name)) info.format = "Draft";
      else if (/\bSealed\b/i.test(name)) info.format = "Sealed";
      else if (/\bClash\b/i.test(name)) info.format = "Clash";
      else if (/Ultimate Pit Fight|UPF/i.test(name))
        info.format = "Ultimate Pit Fight";
    }

    // Rated
    if (/\bRated\b/.test(fullText) && !/Not Rated|Unrated/i.test(fullText))
      info.rated = true;

    // Event type
    if (/proquest|pro quest/i.test(fullText)) info.eventType = "ProQuest";
    else if (/\bcalling\b/i.test(fullText)) info.eventType = "The Calling";
    else if (/battle hardened/i.test(fullText))
      info.eventType = "Battle Hardened";
    else if (/road to nationals/i.test(fullText))
      info.eventType = "Road to Nationals";
    else if (/\bnationals?\b/i.test(fullText)) info.eventType = "Nationals";
    else if (/skirmish/i.test(fullText)) info.eventType = "Skirmish";
    else if (/armory/i.test(fullText)) info.eventType = "Armory";
    else if (/pre.?release/i.test(fullText)) info.eventType = "Pre-Release";
    else if (/on demand/i.test(fullText)) info.eventType = "On Demand";

    // ── Step 4: Venue extraction (scoped to event elements) ──

    // Build list of DOM elements to search — only from between heading and table
    const venueEls = [];
    for (const scopeEl of scopeEls) {
      for (const child of scopeEl.querySelectorAll("span, a, p, div, small")) {
        venueEls.push(child);
      }
    }

    // Tier 1: Elements with venue/location/store attributes
    for (const vel of venueEls) {
      const t = vel.textContent.trim();
      if (t.length < 3 || t.length > 100 || vel.children.length > 2) continue;
      const title = vel.getAttribute("title") || "";
      const ariaLabel = vel.getAttribute("aria-label") || "";
      if (
        /venue|location|store|shop/i.test(title) ||
        /venue|location|store|shop/i.test(ariaLabel)
      ) {
        info.venue = t;
        break;
      }
    }

    // Tier 2: Look for elements with "(closed)" — strong venue indicator
    if (!info.venue) {
      for (const vel of venueEls) {
        if (vel.closest("table")) continue;
        const t = vel.textContent.trim();
        if (t.length > 5 && t.length < 120 && vel.children.length <= 2) {
          if (/\(closed\)|\(temporarily closed\)/i.test(t)) {
            info.venue = t
              .replace(/\s*\((?:temporarily\s+)?closed\)\s*/i, "")
              .trim();
            break;
          }
        }
      }
    }

    // Tier 3: Look for leaf elements that match store-like names
    if (!info.venue) {
      for (const vel of venueEls) {
        if (vel.closest("table")) continue;
        const t = vel.textContent.trim();
        if (t.length < 5 || t.length > 100) continue;
        if (vel.children.length > 1) continue;
        if (t === info.name) continue;
        if (t.includes("\n")) continue;
        if (/January|February|March|April|May|June|July|August|September|October|November|December/i.test(t)) continue;
        if (/^\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}/.test(t)) continue;
        if (/Classic Constructed|Blitz|Draft|Sealed|Clash|Ultimate Pit Fight|Silver Age/i.test(t)) continue;
        if (/Armory|ProQuest|Calling|Battle Hardened|Road to Nationals|Nationals|Skirmish|Pre.?Release/i.test(t)) continue;
        if (/XP Modifier|Not rated|^Rated$/i.test(t)) continue;
        if (/View Results|Results|Matches|Decklists/i.test(t)) continue;
        if (/^\d+[WLD]|\b(Win|Loss|Draw)\b/i.test(t)) continue;
        if (/^(Round|Playoff|Opponent|Result|Hero|Total)/i.test(t)) continue;
        if (/^\d+$/.test(t)) continue;
        if (/Event$|Event Type|Event description/i.test(t)) continue;
        if (/Rating Change|Pending/i.test(t)) continue;

        if (
          /game|games|hobby|card|comics|shop|store|castle|kastle|mox|channel|fireball|face.to.face|good.games|guf/i.test(t) ||
          /\(closed\)/i.test(t)
        ) {
          info.venue = t
            .replace(/\s*\((?:temporarily\s+)?closed\)\s*/i, "")
            .trim();
          break;
        }
      }
    }

    // Tier 4: Extract venue from event name (pattern: "Venue - EventType Format")
    if (!info.venue && info.name.includes(" - ")) {
      const dashParts = info.name.split(/\s+[-\u2013\u2014]\s+/);
      if (dashParts.length >= 2) {
        const afterDash = dashParts.slice(1).join(" ");
        if (
          /armory|proquest|calling|battle hardened|skirmish|nationals|pre.?release|weekly|classic constructed|blitz|draft|sealed|clash|upf|ultimate pit fight/i.test(
            afterDash
          )
        ) {
          info.venue = dashParts[0].trim();
        }
      }
    }

    return info;
  }

  // ── Extract Hero from Decklists Section ───────────────────────

  // GEM player names look like "Bosco, Drew (78366571)" — filter these out
  function isPlayerName(text) {
    // Pattern: "LastName, FirstName (digits)" or just "Name (digits)"
    if (/\(\d{4,}\)/.test(text)) return true;
    // Pattern: pure "LastName, FirstName" without FaB hero keywords
    if (/^[A-Z][a-z]+,\s+[A-Z][a-z]+$/.test(text) && text.length < 40) return true;
    return false;
  }

  function isValidHeroName(text) {
    if (!text || text.length < 3 || text.length > 80) return false;
    if (isPlayerName(text)) return false;
    if (/^(Classic Constructed|Blitz|Draft|Sealed|Clash|Ultimate Pit Fight)$/i.test(text)) return false;
    // Filter out scores, ratings, numbers
    if (/^\d+$/.test(text)) return false;
    if (/^\d+-\d+/.test(text)) return false;
    return true;
  }

  function extractHero(matchTable) {
    let container = matchTable.parentElement;

    for (let i = 0; i < 8 && container; i++) {
      const text = container.textContent || "";
      if (!text.includes("Decklists")) {
        container = container.parentElement;
        continue;
      }

      const tables = container.querySelectorAll("table");
      for (const table of tables) {
        if (table === matchTable) continue;

        const ths = [...table.querySelectorAll("th")];
        const headerText = ths
          .map((th) => th.textContent.trim().toLowerCase())
          .join(" ");
        if (
          headerText.includes("round") ||
          headerText.includes("playoff") ||
          headerText.includes("total wins") ||
          headerText.includes("xp")
        )
          continue;

        const cells = table.querySelectorAll("td");
        for (const cell of cells) {
          const t = cell.textContent.trim();
          if (isValidHeroName(t)) {
            const link = cell.querySelector("a");
            const heroText = link ? link.textContent.trim() : t;
            if (isValidHeroName(heroText)) return heroText;
          }
        }
      }

      const allElements = container.querySelectorAll("*");
      let foundDecklists = false;
      let foundFormat = false;

      for (const el of allElements) {
        const t = el.textContent.trim();
        if (el.children.length > 1) continue;

        if (t === "Decklists") {
          foundDecklists = true;
          continue;
        }
        if (foundDecklists) {
          if (
            /^(Classic Constructed|Blitz|Draft|Sealed|Clash|Ultimate Pit Fight)$/i.test(
              t
            )
          ) {
            foundFormat = true;
            continue;
          }
          if (foundFormat && isValidHeroName(t) && !t.includes("\n")) {
            return t;
          }
        }
      }

      break;
    }

    return "Unknown";
  }

  // ── Scrape All Events on Current Page ─────────────────────────

  function scrapeAllEvents() {
    const results = [];
    const tables = document.querySelectorAll("table");

    for (const table of tables) {
      const ths = [...table.querySelectorAll("th")];
      const headers = ths.map((th) => th.textContent.trim().toLowerCase());

      // Match "round", "rnd", "playoff", "#" as round column
      const roundIdx = headers.findIndex(
        (h) =>
          h.includes("round") ||
          h.includes("playoff") ||
          h === "rnd" ||
          h === "#"
      );
      const oppIdx = headers.findIndex((h) => h.includes("opponent"));
      const resultIdx = headers.findIndex((h) => h.includes("result"));

      // Need at least opponent + result columns
      if (oppIdx === -1 || resultIdx === -1) continue;

      const eventInfo = extractEventInfo(table);
      const hero = extractHero(table);

      // Detect if this is a playoff table from the headers
      const isPlayoffTable = headers.some(
        (h) => h.includes("playoff") || h.includes("top")
      );

      const rows = table.querySelectorAll("tbody tr");
      if (rows.length === 0) {
        const allRows = table.querySelectorAll("tr");
        for (let r = 1; r < allRows.length; r++) {
          processRow(allRows[r]);
        }
      } else {
        for (const row of rows) {
          processRow(row);
        }
      }

      function processRow(row) {
        const cells = [...row.querySelectorAll("td")];
        if (cells.length <= Math.max(oppIdx, resultIdx)) return;

        const roundText =
          roundIdx >= 0 ? (cells[roundIdx]?.textContent || "").trim() : "0";
        const oppRaw = (cells[oppIdx]?.textContent || "").trim();
        const resultText = (cells[resultIdx]?.textContent || "")
          .trim()
          .toLowerCase();

        if (/bye/i.test(oppRaw)) return;
        if (!oppRaw || oppRaw.length < 2) return;

        let result;
        if (resultText === "win" || resultText === "w") result = "win";
        else if (resultText === "loss" || resultText === "l") result = "loss";
        else if (resultText === "draw" || resultText === "d") result = "draw";
        else return;

        const gemIdMatch = oppRaw.match(/\((\d+)\)\s*$/);
        const opponentGemId = gemIdMatch ? gemIdMatch[1] : "";
        const opponent = oppRaw.replace(/\s*\(\d+\)\s*$/, "").trim();

        // Determine round label for playoffs
        let roundLabel = "";
        if (isPlayoffTable) {
          const rl = roundText.toLowerCase();
          if (/final/i.test(rl) && !/semi|quarter/i.test(rl))
            roundLabel = "Finals";
          else if (/semi/i.test(rl)) roundLabel = "Top 4";
          else if (/quarter/i.test(rl)) roundLabel = "Top 8";
          else if (/top\s*4/i.test(rl)) roundLabel = "Top 4";
          else if (/top\s*8/i.test(rl)) roundLabel = "Top 8";
          else roundLabel = "Playoff";
        }

        results.push({
          event: eventInfo.name,
          date: eventInfo.date,
          venue: eventInfo.venue,
          eventType: eventInfo.eventType,
          format: eventInfo.format,
          rated: eventInfo.rated,
          hero: hero,
          round: parseInt(roundText) || 0,
          roundLabel: roundLabel,
          opponent,
          opponentGemId,
          result,
        });
      }
    }

    return results;
  }

  // ── Pagination ────────────────────────────────────────────────

  function getCurrentPage() {
    const match = location.search.match(/page=(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  function findNextPageUrl() {
    const currentPage = getCurrentPage();
    const nextPage = currentPage + 1;

    const links = document.querySelectorAll("a[href]");
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const pageMatch = href.match(/[?&]page=(\d+)/);
      if (pageMatch && parseInt(pageMatch[1]) === nextPage) {
        return link.href;
      }
    }

    for (const link of links) {
      const text = (link.textContent || "").trim();
      if (text === ">>" || text === ">" || /^next$/i.test(text)) {
        const href = link.getAttribute("href") || "";
        if (href.includes("page=")) return link.href;
      }
    }

    return null;
  }

  // ── Navigate to Page 1 ───────────────────────────────────────

  function getPage1Url() {
    const url = new URL(window.location.href);
    url.searchParams.set("page", "1");
    return url.href;
  }

  // ── Multi-Page Scrape ─────────────────────────────────────────

  async function scrapePage(state) {
    const page = getCurrentPage();

    try {
      showOverlay(
        "Expanding events...",
        "Page " + page + " \u2014 Opening all collapsed sections",
        state.matches.length
      );
      await expandAllSections();
      // Second pass — lazy-loaded content may reveal more expandable sections
      await sleep(500);
      await expandAllSections();

      showOverlay(
        "Reading matches...",
        "Page " + page + " \u2014 Scraping match tables",
        state.matches.length
      );
      const pageMatches = scrapeAllEvents();
      state.matches = state.matches.concat(pageMatches);
      state.pagesScraped++;

      const nextUrl = findNextPageUrl();

      // Stop only if there's no next page link
      if (!nextUrl) {
        sessionStorage.removeItem(SCRAPE_KEY);
        await finishExport(state);
        return;
      }

      showOverlay(
        "Moving to page " + (page + 1) + "...",
        "Found " +
          pageMatches.length +
          " matches on this page (" +
          state.matches.length +
          " total)",
        state.matches.length
      );
      state.nextUrl = nextUrl;
      sessionStorage.setItem(SCRAPE_KEY, JSON.stringify(state));
      await sleep(800);
      window.location.href = nextUrl;
    } catch (err) {
      sessionStorage.removeItem(SCRAPE_KEY);
      if (state.matches.length > 0) {
        await finishExport(state);
      } else {
        showError(err.message || String(err));
      }
    }
  }

  async function finishExport(state) {
    if (state.matches.length === 0) {
      showError(
        "No matches found. Make sure you're on your GEM History page with events listed."
      );
      return;
    }

    // Copy to clipboard as backup
    let clipboardOk = false;
    try {
      const jsonPretty = JSON.stringify(state.matches, null, 2);
      await navigator.clipboard.writeText(jsonPretty);
      clipboardOk = true;
    } catch {
      // Clipboard might not be available
    }

    // Build import URL — include data in hash for auto-import
    let importUrl = FABSTATS_IMPORT_URL;
    try {
      const compact = JSON.stringify(state.matches);
      const encoded = btoa(
        encodeURIComponent(compact).replace(/%([0-9A-F]{2})/g, function (
          _,
          p1
        ) {
          return String.fromCharCode(parseInt(p1, 16));
        })
      );
      if (encoded.length < 1000000) {
        importUrl = FABSTATS_IMPORT_URL + "#ext=" + encoded;
      }
    } catch {
      // If encoding fails, just use base URL
    }

    showCompletionOverlay(
      state.matches.length,
      state.pagesScraped,
      importUrl,
      clipboardOk
    );
  }

  // ── Auto-Continue from Previous Page ──────────────────────────

  const savedState = sessionStorage.getItem(SCRAPE_KEY);
  if (savedState) {
    try {
      const state = JSON.parse(savedState);
      showOverlay(
        "Resuming export...",
        "Loading page " + getCurrentPage(),
        state.matches.length
      );
      setTimeout(() => scrapePage(state), 2000);
    } catch {
      sessionStorage.removeItem(SCRAPE_KEY);
    }
  }

  // ── Button Click Handler ──────────────────────────────────────

  btn.addEventListener("click", async () => {
    sessionStorage.removeItem(SCRAPE_KEY);
    hideOverlay();

    // Always start from page 1 to ensure we get all matches
    const currentPage = getCurrentPage();
    if (currentPage !== 1) {
      showOverlay("Starting export...", "Navigating to page 1", 0);
      const state = { matches: [], pagesScraped: 0 };
      sessionStorage.setItem(SCRAPE_KEY, JSON.stringify(state));
      await sleep(500);
      window.location.href = getPage1Url();
      return;
    }

    try {
      const state = { matches: [], pagesScraped: 0 };
      await scrapePage(state);
    } catch (err) {
      showError(err.message || String(err));
    }
  });
})();
