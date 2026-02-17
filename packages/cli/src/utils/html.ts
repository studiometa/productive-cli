/**
 * HTML text utilities for cleaning up API responses
 *
 * Delegates to the base `stripHtml` from @studiometa/productive-api for
 * tag stripping and entity decoding, then layers on terminal-specific features
 * (link extraction, clickable URLs).
 */

import { stripHtml as baseStripHtml } from '@studiometa/productive-api';

import { isColorEnabled, colors } from './colors.js';

// URL regex pattern
const URL_REGEX = /https?:\/\/[^\s<>"']+/g;

/**
 * Create a clickable terminal hyperlink using OSC 8 escape sequence
 * Falls back to plain text if colors/terminal features are disabled
 * Supported by: iTerm2, WezTerm, Windows Terminal, Konsole, etc.
 */
export function link(text: string, url: string): string {
  if (!isColorEnabled()) return text;
  // OSC 8 hyperlink format: \e]8;;URL\e\\TEXT\e]8;;\e\\
  const underlinedText = colors.underline(text);
  return `\x1b]8;;${url}\x1b\\${underlinedText}\x1b]8;;\x1b\\`;
}

/**
 * Extract links from HTML anchor tags
 * Returns a map of placeholder -> {url, text}
 */
function extractLinks(html: string): {
  text: string;
  links: Map<string, { url: string; text: string }>;
} {
  const links = new Map<string, { url: string; text: string }>();
  let index = 0;

  // Extract <a> tags and replace with placeholders
  const text = html.replace(
    /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi,
    (_, url, linkText) => {
      const placeholder = `__LINK_${index++}__`;
      links.set(placeholder, { url, text: linkText || url });
      return placeholder;
    },
  );

  return { text, links };
}

/**
 * Convert HTML to plain text for terminal display
 * - Converts <br>, <br/>, <br /> to newlines
 * - Converts </p>, </div>, </li> to newlines
 * - Extracts links and makes them clickable
 * - Strips all other HTML tags
 * - Decodes common HTML entities
 * - Trims and normalizes whitespace
 *
 * Delegates to the base `stripHtml` from the API package for tag stripping
 * and entity decoding, then restores links as clickable terminal hyperlinks.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';

  // First extract links to preserve them as placeholders
  const { text: htmlWithPlaceholders, links } = extractLinks(html);

  // Delegate to base implementation for tag stripping and entity decoding
  let text = baseStripHtml(htmlWithPlaceholders);

  // Restore links as clickable terminal links
  for (const [placeholder, { url, text: linkText }] of links) {
    text = text.replace(placeholder, link(linkText, url));
  }

  // Also convert any remaining plain URLs to clickable links
  text = text.replace(URL_REGEX, (url) => {
    // Don't double-link if already processed (check for OSC 8 sequence)
    if (text.includes(`\x1b]8;;${url}`)) return url;
    return link(url, url);
  });

  return text;
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}
