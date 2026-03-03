#!/usr/bin/env node

/**
 * validate-posts.mjs — Pre-commit blog post validation
 *
 * Usage:
 *   node scripts/seo/validate-posts.mjs               # Validate all posts
 *   node scripts/seo/validate-posts.mjs --staged-only  # Validate only git-staged files
 */

import { execSync } from 'node:child_process';
import { loadPosts, getMarkdownPath, getImagePath, fileExists, VALID_CATEGORIES } from './lib/posts.mjs';
import { readMarkdown, extractInternalLinks } from './lib/markdown.mjs';

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const TAG_PATTERN = /^[a-z0-9-]+$/;
const MIN_DESCRIPTION_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 160;

const args = process.argv.slice(2);
const stagedOnly = args.includes('--staged-only');

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

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  console.log('Validating blog posts...\n');

  const allPosts = await loadPosts({ includeScheduled: true });
  let postsToValidate = allPosts;

  if (stagedOnly) {
    const staged = getStagedFiles();
    const postsJsonStaged = staged.some(f => f.includes('posts.json'));
    const stagedMdSlugs = staged
      .filter(f => f.match(/Content\/posts\/[^/]+\.md$/))
      .map(f => f.match(/([^/]+)\.md$/)?.[1])
      .filter(Boolean);

    if (!postsJsonStaged && stagedMdSlugs.length === 0) {
      console.log('No blog-related files staged. Skipping validation.\n');
      process.exit(0);
    }

    if (postsJsonStaged) {
      // Validate all posts since the JSON itself changed
      console.log('posts.json is staged — validating all entries.\n');
    } else {
      postsToValidate = allPosts.filter(p => stagedMdSlugs.includes(p.slug));
      console.log(`Validating ${postsToValidate.length} staged post(s).\n`);
    }
  }

  // --- Duplicate checks (always run against full set) ---
  const slugCounts = new Map();
  const titleCounts = new Map();
  for (const post of allPosts) {
    slugCounts.set(post.slug, (slugCounts.get(post.slug) || 0) + 1);
    titleCounts.set(post.title, (titleCounts.get(post.title) || 0) + 1);
  }

  for (const [slug, count] of slugCounts) {
    if (count > 1) error(`Duplicate slug: "${slug}" appears ${count} times`);
  }
  for (const [title, count] of titleCounts) {
    if (count > 1) error(`Duplicate title: "${title}" appears ${count} times`);
  }

  // --- Per-post validation ---
  const allSlugs = new Set(allPosts.map(p => p.slug));

  for (const post of postsToValidate) {
    console.log(`  [${post.slug}]`);

    // Required fields
    if (!post.slug) error('Missing slug');
    else if (!SLUG_PATTERN.test(post.slug)) error(`Invalid slug format: "${post.slug}" (must be lowercase kebab-case)`);

    if (!post.title) error('Missing title');
    if (!post.description) error('Missing description');
    if (post.category === undefined || post.category === null) {
      error('Missing category');
    } else {
      const cat = String(post.category).toLowerCase();
      if (!VALID_CATEGORIES.includes(cat)) error(`Invalid category: "${post.category}" (must be one of: ${VALID_CATEGORIES.join(', ')})`);
    }

    if (!post.tags || !Array.isArray(post.tags) || post.tags.length === 0) {
      error('Missing or empty tags array');
    } else {
      for (const tag of post.tags) {
        if (!TAG_PATTERN.test(tag)) warn(`Tag "${tag}" is not lowercase kebab-case`);
      }
    }

    if (!post.date) error('Missing date');
    else if (isNaN(new Date(post.date).getTime())) error(`Invalid date: "${post.date}"`);

    if (post.featured === undefined || post.featured === null) error('Missing featured flag');

    if (!post.image) {
      error('Missing image path');
    } else if (!post.image.startsWith('/img/posts/')) {
      error(`Image path should start with /img/posts/: "${post.image}"`);
    }

    // Description length (SEO)
    if (post.description) {
      const len = post.description.length;
      if (len < MIN_DESCRIPTION_LENGTH) warn(`Description too short (${len} chars, recommend ${MIN_DESCRIPTION_LENGTH}-${MAX_DESCRIPTION_LENGTH})`);
      if (len > MAX_DESCRIPTION_LENGTH) warn(`Description too long (${len} chars, recommend ${MIN_DESCRIPTION_LENGTH}-${MAX_DESCRIPTION_LENGTH})`);
    }

    // File existence
    if (post.slug) {
      const mdPath = getMarkdownPath(post.slug);
      if (!(await fileExists(mdPath))) error(`Markdown file missing: ${post.slug}.md`);
    }

    if (post.image) {
      const imgPath = getImagePath(post.image);
      if (!(await fileExists(imgPath))) error(`Image file missing: ${post.image}`);
    }

    // Internal link validation (check that linked slugs exist)
    if (post.slug) {
      const mdPath = getMarkdownPath(post.slug);
      if (await fileExists(mdPath)) {
        try {
          const content = await readMarkdown(mdPath);
          const links = extractInternalLinks(content);
          for (const link of links) {
            if (!allSlugs.has(link.slug)) {
              error(`Broken internal link in ${post.slug}.md: "/Blog/Post/${link.slug}" — slug not found in posts.json`);
            }
          }
        } catch {
          // File read errors already caught by existence check
        }
      }
    }
  }

  // --- Summary ---
  console.log('');
  if (errors > 0) {
    console.error(`FAILED: ${errors} error(s), ${warnings} warning(s)\n`);
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`PASSED with ${warnings} warning(s)\n`);
  } else {
    console.log('PASSED: All posts valid.\n');
  }
}

main().catch(err => {
  console.error('Validation script failed:', err.message);
  process.exit(1);
});
