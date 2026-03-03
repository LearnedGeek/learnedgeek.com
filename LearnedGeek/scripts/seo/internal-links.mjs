#!/usr/bin/env node

/**
 * internal-links.mjs — Internal link gap detector
 *
 * Usage:
 *   node scripts/seo/internal-links.mjs                  # Full report
 *   node scripts/seo/internal-links.mjs --min-tags 2      # Require at least N shared tags (default: 2)
 *   node scripts/seo/internal-links.mjs --slug my-post    # Suggestions for one post only
 *   node scripts/seo/internal-links.mjs --json            # Machine-readable output
 */

import { loadPosts, getMarkdownPath, fileExists } from './lib/posts.mjs';
import { readMarkdown, extractInternalLinks } from './lib/markdown.mjs';

const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const minTagsIdx = args.indexOf('--min-tags');
const minTags = minTagsIdx !== -1 ? parseInt(args[minTagsIdx + 1], 10) : 2;
const slugIdx = args.indexOf('--slug');
const filterSlug = slugIdx !== -1 ? args[slugIdx + 1] : null;

async function buildLinkGraph(posts) {
  const graph = new Map(); // slug -> Set of linked slugs

  for (const post of posts) {
    const mdPath = getMarkdownPath(post.slug);
    const outbound = new Set();

    if (await fileExists(mdPath)) {
      try {
        const content = await readMarkdown(mdPath);
        const links = extractInternalLinks(content);
        for (const link of links) {
          outbound.add(link.slug);
        }
      } catch {
        // Skip unreadable files
      }
    }

    graph.set(post.slug, outbound);
  }

  return graph;
}

function getTagOverlap(tagsA, tagsB) {
  const setB = new Set(tagsB.map(t => t.toLowerCase()));
  return tagsA.filter(t => setB.has(t.toLowerCase()));
}

async function main() {
  const posts = await loadPosts();
  const postMap = new Map(posts.map(p => [p.slug, p]));
  const graph = await buildLinkGraph(posts);

  const suggestions = [];
  const orphans = []; // No outbound links
  const unreferenced = []; // No inbound links

  // Build inbound link counts
  const inboundCounts = new Map();
  for (const post of posts) {
    inboundCounts.set(post.slug, 0);
  }
  for (const [, outbound] of graph) {
    for (const target of outbound) {
      if (inboundCounts.has(target)) {
        inboundCounts.set(target, inboundCounts.get(target) + 1);
      }
    }
  }

  // Find orphans and unreferenced
  for (const post of posts) {
    const outbound = graph.get(post.slug);
    if (!outbound || outbound.size === 0) orphans.push(post.slug);
    if (inboundCounts.get(post.slug) === 0) unreferenced.push(post.slug);
  }

  // Find link gap opportunities
  const postsToCheck = filterSlug
    ? posts.filter(p => p.slug === filterSlug)
    : posts;

  for (const postA of postsToCheck) {
    for (const postB of posts) {
      if (postA.slug === postB.slug) continue;

      const outboundA = graph.get(postA.slug) || new Set();
      const alreadyLinked = outboundA.has(postB.slug);

      if (alreadyLinked) continue;

      const overlap = getTagOverlap(postA.tags || [], postB.tags || []);

      if (overlap.length >= minTags) {
        // Check if B links to A (bidirectional awareness)
        const outboundB = graph.get(postB.slug) || new Set();
        const reverseLinked = outboundB.has(postA.slug);

        suggestions.push({
          from: postA.slug,
          to: postB.slug,
          sharedTags: overlap,
          reverseLinked
        });
      }
    }
  }

  // Sort by number of shared tags (descending)
  suggestions.sort((a, b) => b.sharedTags.length - a.sharedTags.length);

  if (jsonOutput) {
    console.log(JSON.stringify({ suggestions, orphans, unreferenced }, null, 2));
    return;
  }

  // Formatted output
  console.log('=== Internal Link Opportunities ===\n');

  if (suggestions.length === 0) {
    console.log('  No gaps found with current threshold (--min-tags ' + minTags + ').\n');
  } else {
    console.log(`  Found ${suggestions.length} opportunities (min ${minTags} shared tags):\n`);
    for (const s of suggestions.slice(0, 50)) { // Cap at 50 for readability
      const reverse = s.reverseLinked ? ' (reverse link exists)' : '';
      console.log(`  ${s.from}`);
      console.log(`    -> ${s.to}`);
      console.log(`    Shared tags: ${s.sharedTags.join(', ')} (${s.sharedTags.length})${reverse}`);
      console.log('');
    }
    if (suggestions.length > 50) {
      console.log(`  ... and ${suggestions.length - 50} more. Use --json for full output.\n`);
    }
  }

  console.log('=== Orphan Posts (no outbound internal links) ===\n');
  if (orphans.length === 0) {
    console.log('  None! Every post links to at least one other post.\n');
  } else {
    console.log(`  ${orphans.length} posts with no outbound links:\n`);
    for (const slug of orphans) {
      console.log(`  - ${slug}`);
    }
    console.log('');
  }

  console.log('=== Unreferenced Posts (no inbound internal links) ===\n');
  if (unreferenced.length === 0) {
    console.log('  None! Every post is linked from at least one other post.\n');
  } else {
    console.log(`  ${unreferenced.length} posts with no inbound links:\n`);
    for (const slug of unreferenced) {
      console.log(`  - ${slug}`);
    }
    console.log('');
  }

  // Summary stats
  const totalLinks = [...graph.values()].reduce((sum, s) => sum + s.size, 0);
  console.log('=== Stats ===\n');
  console.log(`  Total posts: ${posts.length}`);
  console.log(`  Total internal links: ${totalLinks}`);
  console.log(`  Avg links per post: ${(totalLinks / posts.length).toFixed(1)}`);
  console.log(`  Orphan posts: ${orphans.length}`);
  console.log(`  Unreferenced posts: ${unreferenced.length}`);
  console.log(`  Link opportunities: ${suggestions.length}\n`);
}

main().catch(err => {
  console.error('Internal link analysis failed:', err.message);
  process.exit(1);
});
