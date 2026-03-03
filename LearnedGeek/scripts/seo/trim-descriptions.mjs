#!/usr/bin/env node

/**
 * trim-descriptions.mjs — Auto-trim over-length meta descriptions in posts.json
 *
 * Finds the best natural break point (sentence end, then clause/punctuation,
 * then word boundary) before the 160-char limit, rather than hard-cutting.
 *
 * Usage:
 *   node scripts/seo/trim-descriptions.mjs --dry-run   # Preview changes
 *   node scripts/seo/trim-descriptions.mjs             # Apply changes
 *   node scripts/seo/trim-descriptions.mjs --slug foo  # Single post
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_JSON = join(__dirname, '..', '..', 'Content', 'posts.json');
const MAX_LENGTH = 160;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const slugIdx = args.indexOf('--slug');
const targetSlug = slugIdx !== -1 ? args[slugIdx + 1] : null;

/**
 * Find the best trim point at or under maxLen.
 * Priority: sentence end > clause punctuation > word boundary > hard cut
 */
function smartTrim(text, maxLen = MAX_LENGTH) {
  if (text.length <= maxLen) return text;

  const candidate = text.slice(0, maxLen);

  // 1. Last sentence-ending punctuation (. ! ?) with at least 60% of maxLen
  //    Use lastIndexOf approach to find the rightmost match
  let best = -1;
  for (let i = candidate.length - 1; i >= Math.floor(maxLen * 0.6); i--) {
    if ('.!?'.includes(candidate[i])) {
      // Ensure it's followed by whitespace or is the end of candidate
      if (i === candidate.length - 1 || candidate[i + 1] === ' ') {
        best = i;
        break;
      }
    }
  }
  if (best !== -1) {
    return candidate.slice(0, best + 1).trim();
  }

  // 2. Last clause-ending punctuation (, ; :) with at least 60% of maxLen
  for (let i = candidate.length - 1; i >= Math.floor(maxLen * 0.6); i--) {
    if (',:;'.includes(candidate[i]) && candidate[i + 1] === ' ') {
      // Strip the trailing punctuation so it doesn't look odd before "..."
      const base = candidate.slice(0, i).trim();
      const result = base + '...';
      if (result.length <= maxLen) return result;
    }
  }

  // 3. Last word boundary — walk back from end of candidate to find a space
  for (let i = maxLen - 4; i >= Math.floor(maxLen * 0.6); i--) {
    if (candidate[i] === ' ') {
      const base = candidate.slice(0, i).trim();
      const result = base + '...';
      if (result.length <= maxLen) return result;
    }
  }

  // 4. Hard cut at maxLen - 3 + ellipsis
  return candidate.slice(0, maxLen - 3).trim() + '...';
}

async function main() {
  const raw = await readFile(POSTS_JSON, 'utf-8');
  const data = JSON.parse(raw);

  let changed = 0;
  const changes = [];

  for (const post of data.posts) {
    if (targetSlug && post.slug !== targetSlug) continue;
    if (!post.description || post.description.length <= MAX_LENGTH) continue;

    const original = post.description;
    const trimmed = smartTrim(original);

    changes.push({ slug: post.slug, original, trimmed });

    if (!dryRun) {
      post.description = trimmed;
    }
    changed++;
  }

  // Report
  console.log(`\nDescription Trimmer — ${dryRun ? 'DRY RUN' : 'APPLYING CHANGES'}\n`);
  console.log(`Found ${changed} descriptions over ${MAX_LENGTH} chars.\n`);

  for (const { slug, original, trimmed } of changes) {
    console.log(`  [${slug}]`);
    console.log(`  Before (${original.length}): ${original}`);
    console.log(`  After  (${trimmed.length}): ${trimmed}`);
    console.log('');
  }

  if (!dryRun && changed > 0) {
    await writeFile(POSTS_JSON, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`✓ Updated ${changed} descriptions in posts.json\n`);
  } else if (dryRun) {
    console.log('(No changes written — remove --dry-run to apply)\n');
  }
}

main().catch(err => {
  console.error('Trim failed:', err.message);
  process.exit(1);
});
