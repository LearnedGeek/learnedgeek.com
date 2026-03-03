#!/usr/bin/env node

/**
 * validate-sitemap.mjs — Sitemap freshness validation
 *
 * Usage:
 *   node scripts/seo/validate-sitemap.mjs          # Offline: validate against posts.json
 *   node scripts/seo/validate-sitemap.mjs --live    # Also fetch live sitemap and compare
 */

import { loadPosts, STATIC_SITEMAP_URLS, BASE_URL } from './lib/posts.mjs';

const args = process.argv.slice(2);
const liveMode = args.includes('--live');

let errors = 0;
let warnings = 0;

function error(msg) {
  console.error(`  ERROR: ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`  WARN:  ${msg}`);
  warnings++;
}

function buildExpectedUrls(posts) {
  const urls = new Set();

  for (const path of STATIC_SITEMAP_URLS) {
    urls.add(`${BASE_URL}${path}`);
  }

  for (const post of posts) {
    urls.add(`${BASE_URL}/Blog/Post/${post.slug}`);
  }

  return urls;
}

async function fetchLiveSitemap() {
  const url = `${BASE_URL}/sitemap.xml`;
  console.log(`  Fetching ${url}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();

  // Extract <loc> URLs from sitemap XML
  const locRegex = /<loc>([^<]+)<\/loc>/g;
  const urls = new Set();
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.add(match[1].trim());
  }

  return urls;
}

async function main() {
  console.log('Validating sitemap freshness...\n');

  const posts = await loadPosts();
  const expectedUrls = buildExpectedUrls(posts);

  console.log(`  Expected: ${STATIC_SITEMAP_URLS.length} static pages + ${posts.length} published posts = ${expectedUrls.size} URLs\n`);

  // Check for duplicate slugs that would create duplicate URLs
  const slugs = posts.map(p => p.slug);
  const duplicates = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (duplicates.length > 0) {
    error(`Duplicate slugs would create duplicate sitemap entries: ${duplicates.join(', ')}`);
  }

  // Verify all URLs use correct base
  for (const url of expectedUrls) {
    if (!url.startsWith('https://')) {
      error(`URL not using HTTPS: ${url}`);
    }
    if (url.includes('www.')) {
      error(`URL contains www: ${url}`);
    }
  }

  if (liveMode) {
    console.log('  Live mode: comparing against deployed sitemap...\n');

    try {
      const liveUrls = await fetchLiveSitemap();
      console.log(`  Live sitemap contains ${liveUrls.size} URLs\n`);

      // Find missing from live
      const missingFromLive = [...expectedUrls].filter(u => !liveUrls.has(u));
      if (missingFromLive.length > 0) {
        console.log('  Missing from live sitemap:');
        for (const url of missingFromLive) {
          error(`Not in live sitemap: ${url}`);
        }
      }

      // Find extra in live (not expected)
      const extraInLive = [...liveUrls].filter(u => !expectedUrls.has(u));
      if (extraInLive.length > 0) {
        console.log('\n  Extra URLs in live sitemap (not in posts.json):');
        for (const url of extraInLive) {
          warn(`Extra in live sitemap: ${url}`);
        }
      }

      if (missingFromLive.length === 0 && extraInLive.length === 0) {
        console.log('  Live sitemap matches expected URLs exactly.\n');
      }
    } catch (err) {
      error(`Live sitemap fetch failed: ${err.message}`);
    }
  }

  // Summary
  console.log('');
  if (errors > 0) {
    console.error(`FAILED: ${errors} error(s), ${warnings} warning(s)\n`);
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`PASSED with ${warnings} warning(s)\n`);
  } else {
    console.log('PASSED: Sitemap configuration valid.\n');
  }
}

main().catch(err => {
  console.error('Sitemap validation failed:', err.message);
  process.exit(1);
});
