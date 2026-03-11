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
const INSTRUMENTATION_TIMEOUT = 10000;
const SETTLE_DELAY = 500;

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
  const lines = ['The following content is NOT covered by UE models and will be lost on save:\n'];
  issues.forEach(({ blockName, uninstrumented }) => {
    lines.push(`Block: ${blockName}`);
    uninstrumented.forEach(({ description }) => {
      lines.push(`  - ${description}`);
    });
    lines.push('');
  });
  return lines.join('\n');
}

function buildAEMCoderPrompt(issues) {
  return issues.map(({ blockName, uninstrumented }) => {
    const details = uninstrumented.map(({ description }) => description).join(' and ');
    return `Run /ue-enable ${blockName} — the ${blockName} block has uninstrumented content: ${details} are not covered by the UE model and will be lost on save.`;
  }).join('\n');
}

function showPreflightDialog(report, prompt) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'ue-preflight-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '99999',
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
    });

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      background: '#fff',
      borderRadius: '12px',
      padding: '32px',
      maxWidth: '640px',
      width: '90vw',
      maxHeight: '80vh',
      overflow: 'auto',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    });

    const title = document.createElement('h2');
    title.textContent = 'Content will be lost';
    Object.assign(title.style, { margin: '0 0 16px', color: '#c00' });

    const reportPre = document.createElement('pre');
    reportPre.textContent = report;
    Object.assign(reportPre.style, {
      background: '#f5f5f5',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '13px',
      whiteSpace: 'pre-wrap',
      overflow: 'auto',
      maxHeight: '200px',
    });

    const promptLabel = document.createElement('p');
    promptLabel.textContent = 'Copy this prompt into AEM Coder to fix the model:';
    Object.assign(promptLabel.style, { margin: '16px 0 8px', fontWeight: '600' });

    const promptBox = document.createElement('textarea');
    promptBox.value = prompt;
    promptBox.readOnly = true;
    Object.assign(promptBox.style, {
      width: '100%',
      minHeight: '60px',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #ccc',
      fontFamily: 'monospace',
      fontSize: '13px',
      resize: 'vertical',
      boxSizing: 'border-box',
    });
    promptBox.addEventListener('click', () => {
      promptBox.select();
      navigator.clipboard.writeText(prompt).catch(() => {});
    });

    const actions = document.createElement('div');
    Object.assign(actions.style, {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px',
    });

    const goBack = document.createElement('button');
    goBack.textContent = 'Go back';
    Object.assign(goBack.style, {
      padding: '10px 24px',
      borderRadius: '6px',
      border: 'none',
      background: '#0265dc',
      color: '#fff',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
    });

    const continueBtn = document.createElement('button');
    continueBtn.textContent = 'Continue anyway — content will be lost';
    Object.assign(continueBtn.style, {
      padding: '10px 24px',
      borderRadius: '6px',
      border: '1px solid #c00',
      background: 'transparent',
      color: '#c00',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
    });

    goBack.addEventListener('click', () => {
      window.history.back();
    });

    continueBtn.addEventListener('click', () => {
      overlay.remove();
      resolve();
    });

    actions.append(goBack, continueBtn);
    dialog.append(title, reportPre, promptLabel, promptBox, actions);
    overlay.append(dialog);
    document.body.append(overlay);
  });
}

function waitForInstrumentation() {
  return new Promise((resolve) => {
    const main = document.querySelector('main');
    if (!main) {
      resolve();
      return;
    }

    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };

    const poll = () => {
      if (resolved) return;
      if (main.querySelector('.block[data-aue-resource]')) {
        // eslint-disable-next-line no-console
        console.debug('[ue-preflight] blocks instrumented, settling…');
        setTimeout(done, SETTLE_DELAY);
        return;
      }
      setTimeout(poll, 200);
    };

    poll();

    // Fallback timeout — UE framework may not be active
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.debug('[ue-preflight] timeout waiting for instrumentation');
      done();
    }, INSTRUMENTATION_TIMEOUT);
  });
}

export default async function runPreflight() {
  // TEST: always block to verify preflight is running
  await showPreflightDialog('TEST: Preflight is running', 'This is a test');
}
