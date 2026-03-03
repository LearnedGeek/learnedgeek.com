import { readFile } from 'node:fs/promises';

export async function readMarkdown(filePath) {
  return readFile(filePath, 'utf-8');
}

export function extractInternalLinks(markdownContent) {
  const regex = /\[([^\]]*)\]\(\/Blog\/Post\/([a-z0-9-]+)\)/gi;
  const links = [];
  let match;
  while ((match = regex.exec(markdownContent)) !== null) {
    links.push({ text: match[1], slug: match[2].toLowerCase() });
  }
  return links;
}

export function extractHeadings(markdownContent) {
  const regex = /^(#{1,6})\s+(.+)$/gm;
  const headings = [];
  let match;
  while ((match = regex.exec(markdownContent)) !== null) {
    headings.push({ level: match[1].length, text: match[2].trim() });
  }
  return headings;
}
