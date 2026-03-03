#!/usr/bin/env node

/**
 * submit-urls.mjs — Notify search engines of new/updated URLs via IndexNow
 *
 * Usage:
 *   node scripts/seo/submit-urls.mjs                        # Auto-detect new posts since last run
 *   node scripts/seo/submit-urls.mjs --slugs foo,bar        # Submit specific slugs
 *   node scripts/seo/submit-urls.mjs --since 2026-02-01     # Submit all posts since date
 *   node scripts/seo/submit-urls.mjs --dry-run              # Show what would be submitted
 *
 * Environment:
 *   INDEXNOW_KEY — Your IndexNow API key (UUID)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPosts, BASE_URL, fileExists } from './lib/posts.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAST_SUBMIT_FILE = join(__dirname, '.last-submit');
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const slugsIdx = args.indexOf('--slugs');
const sinceIdx = args.indexOf('--since');

function getKey() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    console.error('ERROR: INDEXNOW_KEY environment variable not set.');
    console.error('Generate a UUID and set it: export INDEXNOW_KEY="your-uuid-here"');
    process.exit(1);
  }
  return key;
}

async function getLastSubmitDate() {
  try {
    const content = await readFile(LAST_SUBMIT_FILE, 'utf-8');
    return new Date(content.trim());
  } catch {
    return null;
  }
}

async function saveLastSubmitDate() {
  await writeFile(LAST_SUBMIT_FILE, new Date().toISOString(), 'utf-8');
}

async function getUrlsToSubmit() {
  // Include scheduled posts — URLs are live immediately, just not listed on the blog index yet.
  // Submitting early lets search engines crawl and index before the listing date.
  const posts = await loadPosts({ includeScheduled: true });

  if (slugsIdx !== -1) {
    const slugList = args[slugsIdx + 1].split(',').filter(Boolean);
    const urls = slugList.map(slug => `${BASE_URL}/Blog/Post/${slug}`);
    return { urls, reason: `explicit slugs: ${slugList.join(', ')}` };
  }

  if (sinceIdx !== -1) {
    const sinceDate = new Date(args[sinceIdx + 1]);
    if (isNaN(sinceDate.getTime())) {
      console.error(`ERROR: Invalid date: "${args[sinceIdx + 1]}"`);
      process.exit(1);
    }
    const filtered = posts.filter(p => new Date(p.date) >= sinceDate);
    const urls = filtered.map(p => `${BASE_URL}/Blog/Post/${p.slug}`);
    return { urls, reason: `posts since ${sinceDate.toISOString().split('T')[0]}` };
  }

  // Auto-detect: posts newer than last submit
  const lastSubmit = await getLastSubmitDate();
  if (!lastSubmit) {
    console.log('No previous submission recorded. Submit all published posts? Use --since or --slugs to be specific.\n');
    // Default: submit posts from the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const filtered = posts.filter(p => new Date(p.date) >= weekAgo);
    const urls = filtered.map(p => `${BASE_URL}/Blog/Post/${p.slug}`);
    return { urls, reason: `posts from last 7 days (no .last-submit found)` };
  }

  const filtered = posts.filter(p => new Date(p.date) > lastSubmit);
  const urls = filtered.map(p => `${BASE_URL}/Blog/Post/${p.slug}`);
  return { urls, reason: `posts since last submission (${lastSubmit.toISOString().split('T')[0]})` };
}

async function submitToIndexNow(urls, key) {
  const body = JSON.stringify({
    host: 'learnedgeek.com',
    key: key,
    keyLocation: `${BASE_URL}/${key}.txt`,
    urlList: urls
  });

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });

  return {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok || response.status === 202 // 202 = accepted
  };
}

async function main() {
  console.log('IndexNow URL Submission\n');

  const { urls, reason } = await getUrlsToSubmit();

  console.log(`  Selection: ${reason}`);
  console.log(`  URLs to submit: ${urls.length}\n`);

  if (urls.length === 0) {
    console.log('  No URLs to submit.\n');
    return;
  }

  for (const url of urls) {
    console.log(`    ${url}`);
  }
  console.log('');

  if (dryRun) {
    console.log('  DRY RUN: No URLs were submitted.\n');
    return;
  }

  const key = getKey();

  // Verify key file exists locally
  const keyFilePath = join(__dirname, '..', '..', 'wwwroot', `${key}.txt`);
  if (!(await fileExists(keyFilePath))) {
    console.warn(`  WARN: Key file not found at wwwroot/${key}.txt`);
    console.warn('  IndexNow requires this file to be served at the root of your domain.');
    console.warn(`  Create it with: echo "${key}" > wwwroot/${key}.txt\n`);
  }

  console.log('  Submitting to IndexNow...');

  try {
    const result = await submitToIndexNow(urls, key);

    if (result.ok) {
      console.log(`  Success: ${result.status} ${result.statusText}`);
      console.log('  URLs submitted to Bing, Yandex, Naver, Seznam, and Yep.\n');
      await saveLastSubmitDate();
    } else {
      console.error(`  Failed: ${result.status} ${result.statusText}`);
      console.error('  Check that your INDEXNOW_KEY is valid and the key file is deployed.\n');
      process.exit(1);
    }
  } catch (err) {
    console.error(`  Network error: ${err.message}\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('URL submission failed:', err.message);
  process.exit(1);
});
