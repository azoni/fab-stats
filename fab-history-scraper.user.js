// ==UserScript==
// @name         FaB History Scraper (Fixed)
// @version      3.0
// @description  Export match history from GEM profile as CSV. Fixed for current GEM layout.
// @author       Based on AltarisV's original, fixed for 2025+ GEM layout
// @match        https://gem.fabtcg.com/profile/player/
// @match        https://gem.fabtcg.com/profile/player
// @match        https://gem.fabtcg.com/profile/history/*
// @match        https://gem.fabtcg.com/profile/history*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const navigationDelay = 1500;

    const localizedWins = ['Win', '勝利', 'Victoria', 'Vittoria', 'Victoire', 'Sieg'];
    const localizedLosses = ['Loss', '敗北', 'Derrota', 'Sconfitta', 'Défaite', 'Niederlage'];
    const localizedDraws = ['Draw', '引き分け', 'Empate', 'Pareggio', 'Match nul', 'Unentschieden', 'Égalité'];
    const localizedByes = ['Bye', '不戦勝', 'Bye (Freilos)', 'Sin rival'];

    const isProfilePage = window.location.pathname.startsWith('/profile/player');
    const isHistoryPage = window.location.pathname.startsWith('/profile/history');

    console.log('[FaB Scraper] Script loaded. Profile:', isProfilePage, 'History:', isHistoryPage);

    if (isProfilePage && !isHistoryPage) {
        // Wait for page to fully render
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(injectScrapeButton, 500));
        } else {
            setTimeout(injectScrapeButton, 500);
        }
    }

    if (localStorage.getItem('scrapeInProgress') === 'true' && isHistoryPage) {
        console.log('[FaB Scraper] Resuming scraping...');
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(scrapeEventData, navigationDelay));
        } else {
            setTimeout(scrapeEventData, navigationDelay);
        }
        return;
    }

    function findPlayerName() {
        // Try multiple selectors for the player name
        const selectors = [
            '.profile-text h2',
            'h2',
            'h1',
            '[class*="profile"] h2',
            '[class*="profile"] h1',
            '[class*="player"] h2',
            '[class*="player"] h1',
        ];

        for (const sel of selectors) {
            const els = document.querySelectorAll(sel);
            for (const el of els) {
                const text = el.textContent.trim();
                // Skip navigation items, short text, and common non-name headings
                if (text.length > 2 && !text.includes('Dashboard') && !text.includes('History') && !text.includes('Decklists') && !text.includes('GEM ID')) {
                    return el;
                }
            }
        }
        return null;
    }

    function findGemId() {
        // Look for GEM ID in page text
        const allText = document.body.innerText;
        const match = allText.match(/GEM\s*ID[:\s]*(\d+)/i);
        return match ? match[1] : 'Unknown';
    }

    function findEloRating() {
        // Look for Elo rating
        const allText = document.body.innerText;
        const match = allText.match(/Elo\s*Rating[^0-9]*(\d+)/i);
        if (match) return match[1];

        // Try looking in profile stat blocks
        const statEls = document.querySelectorAll('[class*="stat"] strong, [class*="stat"] b, [class*="rating"]');
        for (const el of statEls) {
            const num = parseInt(el.textContent.trim());
            if (num > 800 && num < 3000) return el.textContent.trim();
        }
        return 'Unknown';
    }

    function injectScrapeButton() {
        // Don't double-inject
        if (document.getElementById('fab-scraper-btn')) return;

        const nameEl = findPlayerName();
        console.log('[FaB Scraper] Found name element:', nameEl?.textContent);

        // Create a floating button that's always visible, regardless of page structure
        const button = document.createElement('button');
        button.id = 'fab-scraper-btn';
        button.textContent = 'Start Match History Export';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99999;
            font-size: 16px;
            font-weight: bold;
            padding: 12px 24px;
            background-color: #d4af37;
            color: #000;
            border: 2px solid #b8960c;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            font-family: Arial, sans-serif;
        `;

        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = '#e5c96e';
        });
        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = '#d4af37';
        });

        button.addEventListener('click', () => {
            const playerName = nameEl ? nameEl.textContent.trim() : 'Unknown';
            const gemId = findGemId();
            const eloRating = findEloRating();

            console.log('[FaB Scraper] Starting export for:', playerName, 'GEM ID:', gemId);

            localStorage.setItem('fabPlayerMeta', JSON.stringify({ name: playerName, gemId, eloRating }));
            localStorage.setItem('allEventData', JSON.stringify([]));
            localStorage.setItem('scrapeInProgress', 'true');

            button.textContent = 'Redirecting to history...';
            button.disabled = true;

            window.location.href = '/profile/history/?page=1';
        });

        document.body.appendChild(button);
        console.log('[FaB Scraper] Button injected successfully');
    }

    function scrapeEventData() {
        const currentPageIndex = getCurrentPageIndex();
        let allEventData = JSON.parse(localStorage.getItem('allEventData')) || [];

        // Show progress indicator
        showProgress(`Scraping page ${currentPageIndex}...`);

        // Try multiple selectors for event containers
        let events = document.querySelectorAll('.event');
        if (!events.length) events = document.querySelectorAll('[class*="event"]');
        if (!events.length) events = document.querySelectorAll('.card, .panel, article');

        console.log(`[FaB Scraper] Found ${events.length} events on page ${currentPageIndex}`);

        if (!events.length) {
            // Maybe the page structure changed - try to find tables directly
            const tables = document.querySelectorAll('table');
            console.log(`[FaB Scraper] No event containers, found ${tables.length} raw tables`);
        }

        events.forEach(event => {
            const eventName = (
                event.querySelector('h4.event__title') ||
                event.querySelector('h4') ||
                event.querySelector('h3') ||
                event.querySelector('[class*="title"]')
            )?.textContent.trim() || 'Unknown';

            const eventDate = (
                event.querySelector('.event__when') ||
                event.querySelector('[class*="when"]') ||
                event.querySelector('[class*="date"]') ||
                event.querySelector('time')
            )?.textContent.trim() || 'Unknown';

            let rated = 'No';
            const metaItems = event.querySelectorAll('.event__meta-item, [class*="meta"] span, [class*="meta"] div');
            for (const item of metaItems) {
                const txt = item.textContent.toLowerCase();
                if (txt.includes('rated')) {
                    rated = (txt.includes('not rated') || txt.includes('unrated')) ? 'No' : 'Yes';
                    break;
                }
            }

            const tables = event.querySelectorAll('table');
            const matches = [];

            tables.forEach(table => {
                const headerCell = table.querySelector('tr th, thead th');
                if (!headerCell) return;
                const headerText = headerCell.textContent.trim().toLowerCase();
                const isPlayoff = headerText.includes('playoff') || headerText.includes('top');
                const isRound = headerText.includes('round') || headerText.includes('swiss');

                if (!isPlayoff && !isRound) return;

                let rows = table.querySelectorAll('tbody tr');
                if (!rows.length) {
                    rows = table.querySelectorAll('tr:not(:first-child)');
                }

                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 3) {
                        let round = cells[0].textContent.trim();
                        if (isPlayoff) round = 'P' + round;
                        const opponent = cells[1].textContent.trim().normalize('NFC');
                        let result = cells[2].textContent.trim();
                        const ratingChange = isPlayoff
                            ? (cells[3]?.textContent.trim() || '')
                            : (cells.length >= 5 ? cells[4].textContent.trim() : '');

                        if (localizedWins.includes(result)) result = 'Win';
                        else if (localizedLosses.includes(result)) result = 'Loss';
                        else if (localizedDraws.includes(result)) result = 'Draw';
                        else if (localizedByes.includes(result)) result = 'Bye';
                        else result = 'Unknown';

                        matches.push({ round, opponent, result, ratingChange });
                    }
                });
            });

            if (matches.length > 0) {
                allEventData.push({ eventName, eventDate, rated, matches });
            }
        });

        console.log(`[FaB Scraper] Scraped page ${currentPageIndex}. Total events so far: ${allEventData.length}`);
        localStorage.setItem('allEventData', JSON.stringify(allEventData));
        navigateToNextPage(currentPageIndex);
    }

    function getCurrentPageIndex() {
        const active = document.querySelector('.pagination .page-item.active, .pagination .active, [class*="pagination"] .active');
        if (active) {
            const num = parseInt(active.textContent.trim());
            if (!isNaN(num)) return num;
        }
        // Fallback: parse from URL
        const urlMatch = window.location.search.match(/page=(\d+)/);
        return urlMatch ? parseInt(urlMatch[1]) : 1;
    }

    function navigateToNextPage(currentPageIndex) {
        // Strategy 1: Find active page item and get next sibling
        const active = document.querySelector('.pagination .page-item.active, .pagination .active');
        if (active) {
            const next = active.nextElementSibling;
            const link = next?.querySelector('a') || (next?.tagName === 'A' ? next : null);
            if (link && link.href) {
                console.log(`[FaB Scraper] Navigating to page ${currentPageIndex + 1}...`);
                showProgress(`Navigating to page ${currentPageIndex + 1}...`);
                setTimeout(() => { window.location.href = link.href; }, navigationDelay);
                return;
            }
        }

        // Strategy 2: Look for a "Next" link
        const nextLinks = document.querySelectorAll('.pagination a, [class*="pagination"] a');
        for (const link of nextLinks) {
            const text = link.textContent.trim().toLowerCase();
            if (text === 'next' || text === '›' || text === '»' || text === '>') {
                console.log(`[FaB Scraper] Found "next" link, navigating...`);
                showProgress(`Navigating to next page...`);
                setTimeout(() => { window.location.href = link.href; }, navigationDelay);
                return;
            }
        }

        // Strategy 3: Try incrementing page number in URL
        const nextPageUrl = `/profile/history/?page=${currentPageIndex + 1}`;
        // But first check if we actually have more pages by looking at pagination
        const paginationLinks = document.querySelectorAll('.pagination a, [class*="pagination"] a');
        let hasNextPage = false;
        for (const link of paginationLinks) {
            const num = parseInt(link.textContent.trim());
            if (!isNaN(num) && num > currentPageIndex) {
                hasNextPage = true;
                break;
            }
        }

        if (hasNextPage) {
            console.log(`[FaB Scraper] Using URL increment to page ${currentPageIndex + 1}...`);
            showProgress(`Navigating to page ${currentPageIndex + 1}...`);
            setTimeout(() => { window.location.href = nextPageUrl; }, navigationDelay);
            return;
        }

        // No more pages - we're done!
        console.log('[FaB Scraper] Reached last page. Saving CSV...');
        localStorage.setItem('scrapeInProgress', 'false');
        showProgress('Export complete! Downloading CSV...');
        saveDataToCSV();
        localStorage.removeItem('allEventData');
    }

    function saveDataToCSV() {
        const allEventData = JSON.parse(localStorage.getItem('allEventData')) || [];
        const playerMeta = JSON.parse(localStorage.getItem('fabPlayerMeta')) || {};

        const totalMatches = allEventData.reduce((sum, e) => sum + e.matches.length, 0);
        console.log(`[FaB Scraper] Saving ${allEventData.length} events, ${totalMatches} matches to CSV`);

        const metaHeader = [
            `# Player Name: ${playerMeta.name ?? 'Unknown'}`,
            `# GEM ID: ${playerMeta.gemId ?? 'Unknown'}`,
            `# Elo Rating (Overall): ${playerMeta.eloRating ?? 'Unknown'}`,
            `# Export Date: ${new Date().toISOString()}`,
            ''
        ];

        const csvRows = ['Event Name,Event Date,Rated,Round,Opponent,Result,Rating Change'];

        allEventData.forEach(event => {
            event.matches.forEach(match => {
                csvRows.push([
                    `"${event.eventName.replace(/"/g, '""')}"`,
                    `"${event.eventDate}"`,
                    `"${event.rated}"`,
                    `"${match.round}"`,
                    `"${match.opponent.replace(/"/g, '""')}"`,
                    `"${match.result}"`,
                    `"${match.ratingChange}"`
                ].join(','));
            });
        });

        const BOM = '\uFEFF';
        const csvContent = BOM + metaHeader.concat(csvRows).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.setAttribute('download', 'match_history.csv');
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        showProgress(`Done! Exported ${totalMatches} matches from ${allEventData.length} events.`);
        console.log('[FaB Scraper] CSV download triggered.');
    }

    function showProgress(message) {
        let overlay = document.getElementById('fab-scraper-progress');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'fab-scraper-progress';
            overlay.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 99999;
                padding: 16px 24px;
                background-color: #1a1a2e;
                color: #d4af37;
                border: 2px solid #d4af37;
                border-radius: 8px;
                font-size: 14px;
                font-weight: bold;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                max-width: 400px;
            `;
            document.body.appendChild(overlay);
        }
        overlay.textContent = message;
    }
})();
