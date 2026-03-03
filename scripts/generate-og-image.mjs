/**
 * Generate a professional OG image (1200x630) for FaB Stats.
 * Uses satori + @resvg/resvg-js to render JSX → SVG → PNG.
 *
 * Run:  node scripts/generate-og-image.mjs
 * Output: public/og-image.png
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Try to find a font — use Inter if available, otherwise fall back to system
let fontData;
const fontPaths = [
  join(root, "netlify", "functions", "fonts", "Inter-Bold.woff"),
  join(root, "netlify", "functions", "fonts", "Inter-SemiBold.woff"),
];

for (const p of fontPaths) {
  if (existsSync(p)) {
    fontData = readFileSync(p);
    break;
  }
}

if (!fontData) {
  // Try to download Inter Bold
  console.log("No local font found, downloading Inter Bold...");
  const resp = await fetch(
    "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf"
  );
  fontData = Buffer.from(await resp.arrayBuffer());
}

let fontDataRegular;
const regularPaths = [
  join(root, "netlify", "functions", "fonts", "Inter-Regular.woff"),
  join(root, "netlify", "functions", "fonts", "Inter-Medium.woff"),
];
for (const p of regularPaths) {
  if (existsSync(p)) {
    fontDataRegular = readFileSync(p);
    break;
  }
}
if (!fontDataRegular) {
  const resp = await fetch(
    "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
  );
  fontDataRegular = Buffer.from(await resp.arrayBuffer());
}

// Brand colors
const BG = "#0e0c08";
const SURFACE = "#1c1812";
const GOLD = "#d4a54a";
const GOLD_LIGHT = "#e8c06e";
const TEXT = "#e6ddd0";
const MUTED = "#9a8e7a";
const DIM = "#6b6050";
const BORDER = "#3e3528";
const RED = "#E53935";
const YELLOW = "#FBC02D";
const BLUE = "#1E88E5";

const WIDTH = 1200;
const HEIGHT = 630;

const svg = await satori(
  {
    type: "div",
    props: {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: BG,
        position: "relative",
        overflow: "hidden",
      },
      children: [
        // Subtle gradient overlay at top
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "200px",
              background: `linear-gradient(180deg, ${GOLD}08 0%, transparent 100%)`,
            },
          },
        },
        // Top gold accent line
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: `linear-gradient(90deg, transparent 10%, ${GOLD} 50%, transparent 90%)`,
            },
          },
        },
        // Main content container
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "32px",
            },
            children: [
              // Logo + Title row
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                  },
                  children: [
                    // Logo icon (card with bars)
                    {
                      type: "div",
                      props: {
                        style: {
                          width: "72px",
                          height: "72px",
                          borderRadius: "16px",
                          background: SURFACE,
                          border: `2px solid ${BORDER}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                        },
                        children: [
                          {
                            type: "svg",
                            props: {
                              width: "44",
                              height: "44",
                              viewBox: "0 0 24 24",
                              fill: "none",
                              children: [
                                {
                                  type: "rect",
                                  props: {
                                    x: "5",
                                    y: "2",
                                    width: "14",
                                    height: "20",
                                    rx: "2",
                                    stroke: GOLD,
                                    strokeWidth: "2",
                                  },
                                },
                                {
                                  type: "rect",
                                  props: { x: "7.5", y: "13", width: "2", height: "3", fill: RED },
                                },
                                {
                                  type: "rect",
                                  props: { x: "11", y: "10", width: "2", height: "6", fill: YELLOW },
                                },
                                {
                                  type: "rect",
                                  props: { x: "14.5", y: "6", width: "2", height: "10", fill: BLUE },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                    // Title
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "56px",
                                fontWeight: 700,
                                color: GOLD,
                                letterSpacing: "-1px",
                                lineHeight: 1.1,
                              },
                              children: "FaB Stats",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              // Tagline
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "22px",
                    fontWeight: 400,
                    color: MUTED,
                    textAlign: "center",
                    maxWidth: "700px",
                    lineHeight: 1.5,
                  },
                  children: "Track your Flesh and Blood match history, win rates, hero matchups, and event performance.",
                },
              },
              // Feature pills row
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    gap: "12px",
                    marginTop: "8px",
                  },
                  children: [
                    "Win Rates",
                    "Matchups",
                    "Opponents",
                    "Events",
                    "Leaderboard",
                  ].map((label) => ({
                    type: "div",
                    props: {
                      style: {
                        padding: "8px 20px",
                        borderRadius: "8px",
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                        fontSize: "15px",
                        fontWeight: 600,
                        color: TEXT,
                        letterSpacing: "0.2px",
                      },
                      children: label,
                    },
                  })),
                },
              },
            ],
          },
        },
        // Bottom domain
        {
          type: "div",
          props: {
            style: {
              position: "absolute",
              bottom: "28px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "16px",
                    color: DIM,
                    fontWeight: 400,
                    letterSpacing: "0.5px",
                  },
                  children: "fabstats.net",
                },
              },
            ],
          },
        },
      ],
    },
  },
  {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      {
        name: "Inter",
        data: fontData,
        weight: 700,
        style: "normal",
      },
      {
        name: "Inter",
        data: fontDataRegular,
        weight: 400,
        style: "normal",
      },
    ],
  }
);

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: WIDTH },
});
const png = resvg.render().asPng();

const outPath = join(root, "public", "og-image.png");
writeFileSync(outPath, png);
console.log(`✓ Generated ${outPath} (${(png.length / 1024).toFixed(1)} kB)`);
