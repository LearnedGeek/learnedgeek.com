#!/usr/bin/env node

/**
 * heading-analysis.mjs — Competitive heading analysis
 *
 * Usage:
 *   URL mode (no API key needed):
 *     node scripts/seo/heading-analysis.mjs --urls "url1,url2" --slug my-post
 *
 *   Search mode (requires Google CSE key):
 *     node scripts/seo/heading-analysis.mjs --keyword "ef core migrations" --slug my-post
 *     node scripts/seo/heading-analysis.mjs --keyword "ef core migrations" --slug my-post --results 5
 *
 * Environment (search mode only):
 *   GOOGLE_CSE_KEY — Google Custom Search API key
 *   GOOGLE_CSE_ID — Programmable Search Engine ID
 */

import { loadPosts, getMarkdownPath, fileExists } from './lib/posts.mjs';
import { readMarkdown, extractHeadings } from './lib/markdown.mjs';

const args = process.argv.slice(2);
const urlsIdx = args.indexOf('--urls');
const keywordIdx = args.indexOf('--keyword');
const slugIdx = args.indexOf('--slug');
const resultsIdx = args.indexOf('--results');

const maxResults = resultsIdx !== -1 ? parseInt(args[resultsIdx + 1], 10) : 5;

function parseArgs() {
  if (slugIdx === -1) {
    console.error('ERROR: --slug is required. Specify which post to compare against.');
    process.exit(1);
  }

  const slug = args[slugIdx + 1];

  if (urlsIdx !== -1) {
    const urls = args[urlsIdx + 1].split(',').filter(Boolean);
    return { mode: 'url', slug, urls };
  }

  if (keywordIdx !== -1) {
    const keyword = args[keywordIdx + 1];
    return { mode: 'search', slug, keyword };
  }

  console.error('ERROR: Specify either --urls "url1,url2" or --keyword "search term"');
  process.exit(1);
}

function extractHtmlHeadings(html) {
  // Use regex for heading extraction (cheerio is optional enhancement)
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const headings = [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    // Strip HTML tags from heading text
    const text = match[2]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    if (text) {
      headings.push({ level: parseInt(match[1], 10), text });
    }
  }

  return headings;
}

async function fetchPageHeadings(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LearnedGeekSEO/1.0)',
        'Accept': 'text/html'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return { url, error: `${response.status} ${response.statusText}`, headings: [] };
    }

    const html = await response.text();
    const headings = extractHtmlHeadings(html);
    return { url, headings, error: null };
  } catch (err) {
    return { url, error: err.message, headings: [] };
  }
}

async function searchGoogle(keyword) {
  const cseKey = process.env.GOOGLE_CSE_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!cseKey || !cseId) {
    console.error('ERROR: Search mode requires GOOGLE_CSE_KEY and GOOGLE_CSE_ID environment variables.');
    console.error('Set up a Programmable Search Engine at https://programmablesearchengine.google.com');
    process.exit(1);
  }

  const params = new URLSearchParams({
    key: cseKey,
    cx: cseId,
    q: keyword,
    num: String(maxResults)
  });

  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);

  if (!response.ok) {
    const body = await response.text();
    console.error(`Google CSE API error: ${response.status} ${body}`);
    process.exit(1);
  }

  const data = await response.json();
  return (data.items || []).map(item => item.link);
}

function normalizeHeading(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function analyzeGaps(localHeadings, competitorResults) {
  const localNormalized = new Set(localHeadings.map(h => normalizeHeading(h.text)));

  // Collect all competitor headings with frequency
  const competitorTopics = new Map(); // normalized -> { text, count, sources }

  for (const result of competitorResults) {
    if (result.error) continue;

    const seen = new Set(); // Avoid counting same heading twice from same page
    for (const h of result.headings) {
      const norm = normalizeHeading(h.text);
      if (seen.has(norm)) continue;
      seen.add(norm);

      if (!competitorTopics.has(norm)) {
        competitorTopics.set(norm, { text: h.text, level: h.level, count: 0, sources: [] });
      }
      const entry = competitorTopics.get(norm);
      entry.count++;
      entry.sources.push(result.url);
    }
  }

  // Topics competitors cover that we don't
  const gaps = [];
  for (const [norm, info] of competitorTopics) {
    if (!localNormalized.has(norm) && info.count >= 1) {
      gaps.push(info);
    }
  }
  gaps.sort((a, b) => b.count - a.count);

  // Our unique headings
  const unique = localHeadings.filter(h => {
    const norm = normalizeHeading(h.text);
    return !competitorTopics.has(norm);
  });

  // Common headings (in both)
  const common = localHeadings.filter(h => {
    const norm = normalizeHeading(h.text);
    return competitorTopics.has(norm);
  });

  return { gaps, unique, common };
}

async function main() {
  const { mode, slug, urls, keyword } = parseArgs();

  console.log('Competitive Heading Analysis\n');

  // Load local post headings
  const mdPath = getMarkdownPath(slug);
  if (!(await fileExists(mdPath))) {
    console.error(`ERROR: Post markdown not found: ${slug}.md`);
    process.exit(1);
  }

  const content = await readMarkdown(mdPath);
  const localHeadings = extractHeadings(content);

  console.log(`  Local post: ${slug}`);
  console.log(`  Local headings: ${localHeadings.length}\n`);

  // Get competitor URLs
  let competitorUrls;
  if (mode === 'url') {
    competitorUrls = urls;
  } else {
    console.log(`  Searching Google for: "${keyword}"...\n`);
    competitorUrls = await searchGoogle(keyword);
  }

  console.log(`  Analyzing ${competitorUrls.length} competitor pages...\n`);

  // Fetch competitor headings
  const results = await Promise.all(competitorUrls.map(fetchPageHeadings));

  for (const r of results) {
    if (r.error) {
      console.log(`  SKIP: ${r.url} (${r.error})`);
    } else {
      console.log(`  OK:   ${r.url} (${r.headings.length} headings)`);
    }
  }
  console.log('');

  // Analyze
  const { gaps, unique, common } = analyzeGaps(localHeadings, results);

  // Report
  console.log('=== Topics Competitors Cover That You Don\'t ===\n');
  if (gaps.length === 0) {
    console.log('  None! Your post covers all competitor topics.\n');
  } else {
    const topGaps = gaps.slice(0, 20);
    for (const g of topGaps) {
      const freq = g.count > 1 ? ` (${g.count} competitors)` : '';
      console.log(`  H${g.level}: ${g.text}${freq}`);
    }
    if (gaps.length > 20) {
      console.log(`\n  ... and ${gaps.length - 20} more.`);
    }
    console.log('');
  }

  console.log('=== Your Unique Headings (competitive advantage) ===\n');
  if (unique.length === 0) {
    console.log('  None — all your headings appear in competitor content too.\n');
  } else {
    for (const h of unique) {
      console.log(`  H${h.level}: ${h.text}`);
    }
    console.log('');
  }

  console.log('=== Common Headings (covered by both) ===\n');
  if (common.length === 0) {
    console.log('  None.\n');
  } else {
    for (const h of common) {
      console.log(`  H${h.level}: ${h.text}`);
    }
    console.log('');
  }

  // Summary
  console.log('=== Summary ===\n');
  console.log(`  Your headings: ${localHeadings.length}`);
  console.log(`  Competitor topics found: ${gaps.length + common.length}`);
  console.log(`  Gaps to consider: ${gaps.length}`);
  console.log(`  Your unique angles: ${unique.length}`);
  console.log(`  Shared coverage: ${common.length}\n`);
}

main().catch(err => {
  console.error('Heading analysis failed:', err.message);
  process.exit(1);
});
