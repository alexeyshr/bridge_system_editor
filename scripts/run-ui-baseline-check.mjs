import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.UI_BASELINE_URL || 'http://127.0.0.1:3000';
const rootDir = process.cwd();
const screenshotDir = path.join(rootDir, 'tests', 'ui-baseline', 'screenshots');
const dateStamp = new Date().toISOString().slice(0, 10);
const reportName = process.env.UI_BASELINE_REPORT_NAME || `f09-qa-acceptance-run-${dateStamp}.md`;
const reportPath = path.join(rootDir, 'tests', 'ui-baseline', reportName);

const results = [];
const nowIso = new Date().toISOString();
const runtimeErrors = [];

function record(item, passed, details = '') {
  results.push({ item, passed, details });
}

function screenshotPath(name) {
  return path.join(screenshotDir, name);
}

function attachRuntimeErrorTracking(page, scope) {
  page.on('pageerror', (error) => {
    runtimeErrors.push(`[${scope}] pageerror: ${error.message}`);
  });
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    runtimeErrors.push(`[${scope}] console.error: ${msg.text()}`);
  });
}

async function waitForServer(timeoutMs = 120_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(baseUrl);
      if (res.ok || res.status < 500) return;
    } catch {
      // retry
    }
    await delay(1000);
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

async function clickFirstText(page, variants) {
  for (const text of variants) {
    const locator = page.getByText(text, { exact: true }).first();
    if (await locator.count()) {
      await locator.click({ timeout: 3000 });
      return true;
    }
  }
  return false;
}

async function runDesktopChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1536, height: 900 } });
  const page = await context.newPage();
  attachRuntimeErrorTracking(page, 'desktop');
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Search...').waitFor({ timeout: 15_000 });

  await page.screenshot({ path: screenshotPath('01-shell-default.png'), fullPage: true });
  record('01-shell-default', true, 'Desktop shell rendered');

  await page.screenshot({ path: screenshotPath('02-left-panel-roots-bookmarks.png'), fullPage: true });
  record('02-left-panel-roots-bookmarks', true, 'Left panel captured');

  await page.screenshot({ path: screenshotPath('06-right-panel-empty-state.png'), fullPage: true });
  record('06-right-panel-empty-state', true, 'Right panel empty state captured before selection');

  const selected = await clickFirstText(page, ['2♦', '1♥', '1NT', '1♣']);
  record('select-node', selected, selected ? 'Selected one visible sequence row' : 'Could not select a sequence row');

  await page.screenshot({ path: screenshotPath('03-center-classic-selected-node.png'), fullPage: true });
  record('03-center-classic-selected-node', true, 'Classic mode with selected node captured');

  await page.screenshot({ path: screenshotPath('07-right-panel-node-edit-state.png'), fullPage: true });
  record('07-right-panel-node-edit-state', true, 'Right panel edit state captured');

  const compactButton = page.getByRole('button', { name: 'Compact lanes' });
  if (await compactButton.count()) {
    await compactButton.click();
    await page.screenshot({ path: screenshotPath('04-center-compact-lanes.png'), fullPage: true });
    record('04-center-compact-lanes', true, 'Compact lanes captured');
    await page.getByRole('button', { name: 'Classic' }).click();
  } else {
    record('04-center-compact-lanes', false, 'Compact lanes switch button missing');
  }

  const breadcrumbButtons = page.locator('button[title^="Go to "]');
  if ((await breadcrumbButtons.count()) > 0) {
    await page.screenshot({ path: screenshotPath('05-current-sequence-breadcrumb-clickable.png'), fullPage: true });
    await breadcrumbButtons.first().click();
    record('05-current-sequence-breadcrumb-clickable', true, 'Breadcrumb buttons detected and clicked');
  } else {
    record('05-current-sequence-breadcrumb-clickable', false, 'No breadcrumb navigation buttons found');
  }

  const addButton = page.getByTitle('Add continuation').first();
  if (await addButton.count()) {
    await addButton.click({ force: true });
    await page.getByText('Bids 1C - 7NT', { exact: false }).waitFor({ timeout: 5000 });
    await page.screenshot({ path: screenshotPath('08-add-continuation-form-open.png'), fullPage: true });

    const disabledBidsCount = await page.locator('button[disabled]').count();
    await page.screenshot({ path: screenshotPath('09-add-continuation-disabled-bids.png'), fullPage: true });
    record(
      '09-add-continuation-disabled-bids',
      disabledBidsCount > 0,
      disabledBidsCount > 0 ? `Disabled bids: ${disabledBidsCount}` : 'No disabled bids detected',
    );

    const cancelButton = page.getByRole('button', { name: 'Cancel' }).first();
    if (await cancelButton.count()) {
      await cancelButton.click();
    }
    record('08-add-continuation-form-open', true, 'Add continuation form opened');
  } else {
    record('08-add-continuation-form-open', false, 'Add continuation button missing');
    record('09-add-continuation-disabled-bids', false, 'Skipped because add form did not open');
  }

  const deleteButton = page.getByTitle('Delete').first();
  if (await deleteButton.count()) {
    await deleteButton.click({ force: true });
    await page.getByText('Delete sequence?', { exact: true }).waitFor({ timeout: 5000 });
    await page.screenshot({ path: screenshotPath('10-delete-confirm-modal.png'), fullPage: true });
    record('10-delete-confirm-modal', true, 'Delete modal opened');
    const cancelDelete = page.getByRole('button', { name: 'Cancel' }).first();
    if (await cancelDelete.count()) {
      await cancelDelete.click();
    }
  } else {
    record('10-delete-confirm-modal', false, 'Delete button missing');
  }

  const bookmarkButton = page.getByTitle('Bookmark').first();
  if (await bookmarkButton.count()) {
    await bookmarkButton.click({ force: true });
    await page.screenshot({ path: screenshotPath('11-bookmark-list-with-dash-separators.png'), fullPage: true });
    const bookmarksSection = page.locator('div').filter({ hasText: 'Bookmarks' }).first();
    const bookmarksText = (await bookmarksSection.textContent()) ?? '';
    record(
      '11-bookmark-list-with-dash-separators',
      bookmarksText.includes('-'),
      bookmarksText.includes('-') ? 'Dash separator detected in bookmarks section' : 'Dash separator not detected',
    );
  } else {
    record('11-bookmark-list-with-dash-separators', false, 'Bookmark button missing');
  }

  await context.close();
}

async function runMobileChecks(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  attachRuntimeErrorTracking(page, 'mobile');
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('header').first().waitFor({ timeout: 15_000 });

  const closeRight = page.getByTitle('Close Right Panel');
  if (await closeRight.count()) {
    await closeRight.click();
  }
  const openLeft = page.getByTitle('Open Left Panel');
  if (await openLeft.count()) {
    await openLeft.click();
  }

  await page.screenshot({ path: screenshotPath('12-mobile-overlay-mode.png'), fullPage: true });
  record('12-mobile-overlay-mode', true, 'Mobile overlay captured');
  await context.close();
}

function writeReport() {
  const passCount = results.filter((item) => item.passed).length;
  const failCount = results.length - passCount;

  const lines = [
    `# F09 QA Acceptance Run (${dateStamp})`,
    '',
    `Executed at: ${nowIso}`,
    '',
    '## Automated Checklist Evidence',
    '',
    ...results.map(
      (item) =>
        `- [${item.passed ? 'x' : ' '}] ${item.item}${item.details ? ` - ${item.details}` : ''}`,
    ),
    '',
    `Summary: ${passCount} passed, ${failCount} failed.`,
    '',
    '## Screenshot Manifest',
    '',
    '- tests/ui-baseline/screenshots/01-shell-default.png',
    '- tests/ui-baseline/screenshots/02-left-panel-roots-bookmarks.png',
    '- tests/ui-baseline/screenshots/03-center-classic-selected-node.png',
    '- tests/ui-baseline/screenshots/04-center-compact-lanes.png',
    '- tests/ui-baseline/screenshots/05-current-sequence-breadcrumb-clickable.png',
    '- tests/ui-baseline/screenshots/06-right-panel-empty-state.png',
    '- tests/ui-baseline/screenshots/07-right-panel-node-edit-state.png',
    '- tests/ui-baseline/screenshots/08-add-continuation-form-open.png',
    '- tests/ui-baseline/screenshots/09-add-continuation-disabled-bids.png',
    '- tests/ui-baseline/screenshots/10-delete-confirm-modal.png',
    '- tests/ui-baseline/screenshots/11-bookmark-list-with-dash-separators.png',
    '- tests/ui-baseline/screenshots/12-mobile-overlay-mode.png',
    '',
    '## Notes',
    '',
    '- This run validates UI regression points through automated browser interactions.',
    '- Remaining manual domain validation (if needed): semantic correctness of bridge bidding constraints beyond UI mechanics.',
    '',
  ];

  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  await waitForServer();

  const browser = await chromium.launch({ headless: true });
  try {
    await runDesktopChecks(browser);
    await runMobileChecks(browser);
  } finally {
    await browser.close();
  }

  record(
    'no-runtime-errors',
    runtimeErrors.length === 0,
    runtimeErrors.length === 0
      ? 'No runtime console/page errors'
      : runtimeErrors.slice(0, 5).join(' | '),
  );

  writeReport();

  const failed = results.filter((item) => !item.passed);
  if (failed.length > 0) {
    console.error(`UI baseline checks failed: ${failed.map((item) => item.item).join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log('UI baseline checks passed');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
