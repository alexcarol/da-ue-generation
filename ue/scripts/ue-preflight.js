/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const SIGNIFICANT_SELECTORS = 'img, h1, h2, h3, h4, h5, h6, p, a';

function isCovered(node, blockBoundary) {
  let el = node;
  while (el && el !== blockBoundary) {
    if (el.hasAttribute('data-aue-prop') || el.getAttribute('data-aue-type') === 'richtext') {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function isSignificant(node) {
  if (node.tagName === 'P') {
    return node.textContent.trim().length > 0 || node.children.length > 0;
  }
  return true;
}

function describeNode(node) {
  const tag = node.tagName.toLowerCase();
  if (tag === 'img') {
    const src = node.getAttribute('src') || node.getAttribute('data-src') || '';
    const alt = node.getAttribute('alt') || '';
    return `<img> ${alt || src.split('/').pop() || '(image)'}`;
  }
  const text = node.textContent.trim();
  const preview = text.length > 60 ? `${text.substring(0, 60)}...` : text;
  return `<${tag}>"${preview}"`;
}

function scanForUninstrumentedContent() {
  const issues = [];
  const blocks = document.querySelectorAll('main .block[data-aue-resource]');

  blocks.forEach((block) => {
    const blockName = [...block.classList].find((c) => c !== 'block') || 'unknown';
    const contentNodes = block.querySelectorAll(SIGNIFICANT_SELECTORS);
    const uninstrumented = [];

    contentNodes.forEach((node) => {
      if (!isSignificant(node)) return;
      // Skip nodes whose ancestor (within the block) is already in our list
      const ancestorAlreadyListed = uninstrumented.some((u) => u.contains(node));
      if (ancestorAlreadyListed) return;
      if (!isCovered(node, block)) {
        uninstrumented.push(node);
      }
    });

    if (uninstrumented.length > 0) {
      issues.push({
        blockName,
        block,
        uninstrumented: uninstrumented.map((n) => ({ node: n, description: describeNode(n) })),
      });
    }
  });

  return issues;
}

function buildPreflightReport(issues) {
  const grouped = {};
  issues.forEach(({ blockName }) => {
    grouped[blockName] = (grouped[blockName] || 0) + 1;
  });

  const summary = Object.entries(grouped)
    .map(([name, count]) => `${name} (${count})`)
    .join(', ');
  return `Blocks with uninstrumented content: ${summary}`;
}

function buildAEMCoderPrompt(issues) {
  const blockNames = [...new Set(issues.map(({ blockName }) => blockName))];
  return blockNames.map((name) => `Run /ue-enable ${name}`).join('\n');
}

async function showPreflightBanner(report, prompt) {
  // Auto-copy prompt to clipboard (iframe has allow="clipboard-write")
  let copied = false;
  try {
    await navigator.clipboard.writeText(prompt);
    copied = true;
  } catch { /* clipboard not available */ }

  const banner = document.createElement('div');
  banner.id = 'ue-preflight-banner';
  Object.assign(banner.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    zIndex: '2147483647',
    background: '#c00',
    color: '#fff',
    padding: '16px 24px',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  });

  const clipboardMsg = copied
    ? 'Fix prompt auto-copied to clipboard — paste into AEM Coder.'
    : 'Check browser console for the fix prompt.';

  banner.innerHTML = `<strong>⚠ Content at risk:</strong> ${report}<br>${clipboardMsg}`;
  document.documentElement.append(banner);
}

export default async function runPreflight() {
  const blocks = document.querySelectorAll('main .block[data-aue-resource]');
  const issues = scanForUninstrumentedContent();

  if (issues.length === 0) {
    // eslint-disable-next-line no-console
    console.warn('[ue-preflight] No issues found across', blocks.length, 'block(s)');
    return;
  }

  const report = buildPreflightReport(issues);
  const prompt = buildAEMCoderPrompt(issues);
  // eslint-disable-next-line no-console
  console.warn(`[ue-preflight] ${issues.length} issue(s) found:\n${report}\nPrompt:\n${prompt}`);
  await showPreflightBanner(report, prompt);
}
