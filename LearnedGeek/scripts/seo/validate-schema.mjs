#!/usr/bin/env node

/**
 * validate-schema.mjs — Verify Schema.org BlogPosting JSON-LD on live posts
 *
 * Fetches live blog post pages and confirms:
 *   - A <script type="application/ld+json"> block exists
 *   - It parses as valid JSON
 *   - Required BlogPosting fields are present and non-empty
 *
 * Usage:
 *   node scripts/seo/validate-schema.mjs                    # Check all published posts
 *   node scripts/seo/validate-schema.mjs --slug my-post     # Check one post
 *   node scripts/seo/validate-schema.mjs --limit 5          # Check first 5 posts
 */

import { loadPosts, BASE_URL } from './lib/posts.mjs';

const args = process.argv.slice(2);
const slugIdx = args.indexOf('--slug');
const limitIdx = args.indexOf('--limit');
const targetSlug = slugIdx !== -1 ? args[slugIdx + 1] : null;
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

const REQUIRED_FIELDS = ['@type', 'headline', 'description', 'url', 'datePublished', 'author', 'publisher'];

let errors = 0;
let warnings = 0;
let checked = 0;

function error(slug, msg) {
  console.error(`  ERROR [${slug}]: ${msg}`);
  errors++;
}

function warn(slug, msg) {
  console.warn(`  WARN  [${slug}]: ${msg}`);
  warnings++;
}

function ok(slug, msg) {
  console.log(`  OK    [${slug}]: ${msg}`);
}

function extractJsonLd(html) {
  const regex = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  const results = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      results.push(JSON.parse(match[1]));
    } catch {
      // Malformed JSON-LD — will be caught below
      results.push(null);
    }
  }
  return results;
}

async function checkPost(slug) {
  const url = `${BASE_URL}/Blog/Post/${slug}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'LearnedGeek-SEO-Validator/1.0' }
    });

    if (!response.ok) {
      error(slug, `HTTP ${response.status} fetching ${url}`);
      return;
    }

    const html = await response.text();
    const schemas = extractJsonLd(html);

    if (schemas.length === 0) {
      error(slug, 'No <script type="application/ld+json"> found');
      return;
    }

    // Find the BlogPosting schema
    const blogPosting = schemas.find(s => s && s['@type'] === 'BlogPosting');

    if (!blogPosting) {
      const types = schemas.filter(Boolean).map(s => s['@type']).join(', ');
      error(slug, `No BlogPosting schema found (found: ${types || 'none parseable'})`);
      return;
    }

    // Validate required fields
    let allGood = true;
    for (const field of REQUIRED_FIELDS) {
      if (!blogPosting[field]) {
        error(slug, `Missing required field: ${field}`);
        allGood = false;
      }
    }

    // Validate field quality
    if (blogPosting.headline && blogPosting.headline.length > 110) {
      warn(slug, `headline is ${blogPosting.headline.length} chars (Google recommends ≤110)`);
    }

    if (blogPosting.description && blogPosting.description.length > 160) {
      warn(slug, `description is ${blogPosting.description.length} chars (over 160)`);
    }

    if (blogPosting.url && !blogPosting.url.startsWith('https://')) {
      error(slug, `url must use HTTPS: ${blogPosting.url}`);
      allGood = false;
    }

    if (allGood) {
      ok(slug, `BlogPosting schema valid (${REQUIRED_FIELDS.length} required fields present)`);
    }
  } catch (err) {
    error(slug, `Fetch failed: ${err.message}`);
  }
}

async function main() {
  console.log('Schema.org Validation (live site)\n');

  const allPosts = await loadPosts({ includeScheduled: true });

  let posts;
  if (targetSlug) {
    posts = allPosts.filter(p => p.slug === targetSlug);
    if (posts.length === 0) {
      console.error(`  ERROR: Slug "${targetSlug}" not found in posts.json\n`);
      process.exit(1);
    }
  } else {
    posts = allPosts.slice(0, limit);
  }

  console.log(`  Checking ${posts.length} post(s) against ${BASE_URL}...\n`);

  // Fetch in small batches to avoid overwhelming the server
  const BATCH_SIZE = 5;
  for (let i = 0; i < posts.length; i += BATCH_SIZE) {
    const batch = posts.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(p => checkPost(p.slug)));
    checked += batch.length;
  }

  console.log('');
  console.log(`  Checked: ${checked} posts`);
  if (errors > 0) {
    console.error(`  FAILED: ${errors} error(s), ${warnings} warning(s)\n`);
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`  PASSED with ${warnings} warning(s)\n`);
  } else {
    console.log(`  PASSED: All schemas valid.\n`);
  }
}

main().catch(err => {
  console.error('Schema validation failed:', err.message);
  process.exit(1);
});
