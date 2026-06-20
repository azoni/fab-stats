/**
 * Ingest the RAG corpus (card rules + site docs) into the Firestore `ragChunks`
 * collection as 384-dim Vector embeddings, for the AI assistant's
 * search_knowledge tool.
 *
 * ── ONE-TIME: create the vector index (gcloud) ──
 *   gcloud firestore indexes composite create \
 *     --collection-group=ragChunks --query-scope=COLLECTION \
 *     --field-config=field-path=embedding,vector-config='{"dimension":384,"flat":"{}"}'
 *
 * ── RUN ──
 *   # point at a service account with Firestore write access:
 *   GOOGLE_APPLICATION_CREDENTIALS=../fab-stats-bot/fabstats-service-account.json \
 *     npx tsx scripts/ingest-rag.ts            # cards + docs
 *   npx tsx scripts/ingest-rag.ts --docs       # docs only
 *
 * Writes ~3,000 card docs + ~40 doc-section docs to PRODUCTION Firestore.
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as cheerio from "cheerio";
import { writeChunk, type RagChunkInput } from "../netlify/functions/lib/agent/rag";
import { allCards } from "../netlify/functions/lib/agent/cards";

function db() {
  if (!getApps().length) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    initializeApp({ credential: sa ? cert(JSON.parse(sa)) : cert(process.env.GOOGLE_APPLICATION_CREDENTIALS || "./fabstats-service-account.json") });
  }
  return getFirestore();
}

function buildCardChunks(): RagChunkInput[] {
  const chunks: RagChunkInput[] = [];
  for (const c of allCards) {
    const text = c.functionalText?.trim();
    if (!text) continue;
    const stat = [c.pitch != null ? `pitch ${c.pitch}` : null, c.cost != null ? `cost ${c.cost}` : null, c.power != null ? `${c.power} power` : null, c.defense != null ? `${c.defense} defense` : null]
      .filter(Boolean)
      .join(", ");
    chunks.push({
      sourceType: "card",
      sourceId: c.cardIdentifier,
      title: c.name,
      url: `https://www.fabstats.net/card/${encodeURIComponent(c.name)}`,
      content: `${c.name} — ${c.typeText}.${stat ? ` (${stat})` : ""} ${text}`.replace(/\s+/g, " ").trim(),
      metadata: { classes: c.classes, talents: c.talents, keywords: c.keywords, formats: c.legalFormats },
    });
  }
  return chunks;
}

async function buildDocChunks(): Promise<RagChunkInput[]> {
  const url = "https://www.fabstats.net/docs";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const $ = cheerio.load(await res.text());
  const chunks: RagChunkInput[] = [];
  $("section[id]").each((_, el) => {
    const section = $(el);
    const id = section.attr("id");
    if (!id) return;
    const title = (section.find("h1,h2,h3").first().text() || id).replace(/\s+/g, " ").trim();
    const raw = section.text().replace(/\s+/g, " ").trim();
    if (raw.length < 40) return;
    // one chunk/section; split very long sections on ~1100 chars
    const parts = raw.length <= 1100 ? [raw] : (raw.match(/.{1,1100}(\s|$)/g) ?? [raw]).map((s) => s.trim());
    parts.forEach((content, i) => {
      chunks.push({ sourceType: "doc", sourceId: parts.length > 1 ? `${id}_${i}` : id, title, url: `${url}#${id}`, content, metadata: { section: id } });
    });
  });
  return chunks;
}

async function main() {
  const onlyDocs = process.argv.includes("--docs");
  const onlyCards = process.argv.includes("--cards");
  const firestore = db();

  const chunks: RagChunkInput[] = [];
  if (!onlyDocs) chunks.push(...buildCardChunks());
  if (!onlyCards) chunks.push(...(await buildDocChunks()));

  console.log(`Embedding + upserting ${chunks.length} chunks into ragChunks…`);
  let done = 0;
  for (const chunk of chunks) {
    await writeChunk(firestore, chunk);
    if (++done % 200 === 0) console.log(`  ${done}/${chunks.length}`);
  }
  console.log(`✓ ingested ${done} chunks`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
