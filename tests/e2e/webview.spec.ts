/**
 * webview.spec.ts - Playwright visual tests for G_Dashboard webview panels
 *
 * VSCode extensions render webviews inside the editor. Since we cannot launch
 * a full VSCode instance in CI, we extract the webview HTML and serve it as
 * a standalone page. Playwright then navigates to it, validates structure,
 * and captures screenshot baselines.
 *
 * STRATEGY:
 * 1. The Memory Detail and Prompt Versions webviews generate self-contained
 *    HTML strings (see src/commands/index.ts: renderMemoryHtml, renderPromptHtml).
 * 2. We replicate those HTML strings here with mock data.
 * 3. A local HTTP server serves them.
 * 4. Playwright asserts structure and optionally compares screenshots.
 *
 * USAGE:
 *   npm run test:e2e
 *   npx playwright test tests/e2e/webview.spec.ts --update-snapshots  # baseline
 */

import { test, expect } from '@playwright/test';
import * as http from 'http';

// ---------------------------------------------------------------------------
// Mock data mirrors the types in src/data/types.ts
// ---------------------------------------------------------------------------

const MOCK_MEMORY_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 16px; color: #cccccc; background: #1e1e1e; }
table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
td, th { padding: 6px 12px; text-align: left; border: 1px solid #3c3c3c; }
th { background: #2a2a2a; }
pre { background: #252525; padding: 12px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.verified { background: #2ea04366; color: #2ea043; }
.unverified { background: #d29922aa; color: #d29922; }
.derived { background: #388bfd66; color: #388bfd; }
</style></head><body>
<h2>Memory #42</h2>
<table>
<tr><th>Project</th><td>g-dashboard</td></tr>
<tr><th>Agent</th><td>orchestrator</td></tr>
<tr><th>Type</th><td>semantic</td></tr>
<tr><th>Trust</th><td><span class="badge verified">verified</span></td></tr>
<tr><th>Confidence</th><td>95.0%</td></tr>
<tr><th>Tags</th><td><code>e2e</code> <code>testing</code></td></tr>
<tr><th>Created</th><td>2026-02-24T12:00:00Z</td></tr>
</table>
<h3>Content</h3>
<pre>This is a mock memory entry used for E2E visual testing.</pre>
</body></html>`;

const MOCK_PROMPT_HTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 16px; color: #cccccc; background: #1e1e1e; }
table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
td, th { padding: 6px 12px; text-align: left; border: 1px solid #3c3c3c; }
th { background: #2a2a2a; }
pre { background: #252525; padding: 12px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.production { background: #2ea04366; color: #2ea043; }
.staging { background: #388bfd66; color: #388bfd; }
.dev { background: #d29922aa; color: #d29922; }
</style></head><body>
<h2>Prompt: system-audit</h2>
<h3>Versions</h3>
<table>
<tr><th>Version</th><th>Label</th><th>Vendor</th><th>Changelog</th><th>Created</th></tr>
<tr>
<td>v3</td>
<td><span class="badge production">production</span></td>
<td>claude</td>
<td>Added ISO 27001 controls</td>
<td>2026-02-24T12:00:00Z</td>
</tr>
<tr>
<td>v2</td>
<td><span class="badge staging">staging</span></td>
<td>claude</td>
<td>Improved structure</td>
<td>2026-02-20T10:00:00Z</td>
</tr>
<tr>
<td>v1</td>
<td><span class="badge dev">dev</span></td>
<td>gemini</td>
<td>Initial version</td>
<td>2026-02-15T08:00:00Z</td>
</tr>
</table>
<h3>Latest Content (v3)</h3>
<pre>You are the Master Orchestrator agent for the Antigravity system...</pre>
</body></html>`;

// ---------------------------------------------------------------------------
// Lightweight HTTP server fixture
// ---------------------------------------------------------------------------

let server: http.Server;
let serverPort: number;

const pages: Record<string, string> = {
  '/memory': MOCK_MEMORY_HTML,
  '/prompt': MOCK_PROMPT_HTML,
};

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const html = pages[req.url || ''];
    if (html) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      serverPort = typeof address === 'object' && address ? address.port : 5173;
      resolve();
    });
  });
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// ---------------------------------------------------------------------------
// Memory Detail Webview Tests
// ---------------------------------------------------------------------------

test.describe('Memory Detail Webview', () => {
  test('renders memory heading and table @smoke', async ({ page }) => {
    await page.goto(`http://localhost:${serverPort}/memory`);

    // Verify heading
    const heading = page.locator('h2');
    await expect(heading).toHaveText('Memory #42');

    // Verify table has expected rows
    const rows = page.locator('table tr');
    await expect(rows).toHaveCount(8); // header-less: 7 data rows (but th rows count too)

    // Verify key cells
    await expect(page.locator('td:has-text("g-dashboard")')).toBeVisible();
    await expect(page.locator('td:has-text("orchestrator")')).toBeVisible();
    await expect(page.locator('td:has-text("semantic")')).toBeVisible();
  });

  test('displays trust badge with correct class', async ({ page }) => {
    await page.goto(`http://localhost:${serverPort}/memory`);

    const badge = page.locator('.badge.verified');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('verified');
  });

  test('renders content in preformatted block', async ({ page }) => {
    await page.goto(`http://localhost:${serverPort}/memory`);

    const pre = page.locator('pre');
    await expect(pre).toContainText('mock memory entry');
  });

  test('visual baseline: memory detail @smoke', async ({ page }) => {
    await page.goto(`http://localhost:${serverPort}/memory`);
    await expect(page).toHaveScreenshot('memory-detail.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});

// ---------------------------------------------------------------------------
// Prompt Versions Webview Tests
// ---------------------------------------------------------------------------

test.describe('Prompt Versions Webview', () => {
  test('renders prompt heading and version table @smoke', async ({ page }) => {
    await page.goto(`http://localhost:${serverPort}/prompt`);

    const heading = page.locator('h2');
    await expect(heading).toHaveText('Prompt: system-audit');

    // Version table: header + 3 version rows
    const versionRows = page.locator('table tr');
    await expect(versionRows).toHaveCount(4); // 1 header + 3 data rows
  });

  test('displays version badges with correct labels', async ({ page }) => {
    await page.goto(`http://localhost:${serverPort}/prompt`);

    await expect(page.locator('.badge.production')).toHaveText('production');
    await expect(page.locator('.badge.staging')).toHaveText('staging');
    await expect(page.locator('.badge.dev')).toHaveText('dev');
  });

  test('shows latest content section', async ({ page }) => {
    await page.goto(`http://localhost:${serverPort}/prompt`);

    const contentHeading = page.locator('h3:has-text("Latest Content")');
    await expect(contentHeading).toBeVisible();

    const pre = page.locator('pre');
    await expect(pre).toContainText('Master Orchestrator');
  });

  test('visual baseline: prompt versions @smoke', async ({ page }) => {
    await page.goto(`http://localhost:${serverPort}/prompt`);
    await expect(page).toHaveScreenshot('prompt-versions.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});

// ---------------------------------------------------------------------------
// Cross-cutting concerns
// ---------------------------------------------------------------------------

test.describe('Webview Accessibility', () => {
  test('memory page uses semantic HTML', async ({ page }) => {
    await page.goto(`http://localhost:${serverPort}/memory`);

    // Has proper heading hierarchy
    await expect(page.locator('h2')).toHaveCount(1);
    await expect(page.locator('h3')).toHaveCount(1);

    // Table has th elements
    const headers = page.locator('th');
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(7);
  });

  test('prompt page uses semantic HTML', async ({ page }) => {
    await page.goto(`http://localhost:${serverPort}/prompt`);

    await expect(page.locator('h2')).toHaveCount(1);
    await expect(page.locator('h3')).toHaveCount(2); // "Versions" + "Latest Content"
  });
});
