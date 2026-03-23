import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { spawn, ChildProcess, execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

type Platform = 'linux' | 'windows' | 'macos';

interface TauriApp {
  process: ChildProcess;
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

async function launchTauriApp(appPath: string, platform: Platform): Promise<TauriApp> {
  let executablePath = appPath;
  let args: string[] = [];
  let detached = true;

  if (platform === 'linux') {
    execSync(`chmod +x "${appPath}"`);
    executablePath = appPath;
  } else if (platform === 'windows') {
    executablePath = appPath;
    detached = false;
  } else if (platform === 'macos') {
    if (appPath.endsWith('.app')) {
      executablePath = 'open';
      args = ['-a', appPath];
    } else {
      executablePath = appPath;
    }
  }

  console.log(`Launching: ${executablePath} ${args.join(' ')}`);

  const proc = spawn(executablePath, args, {
    detached,
    stdio: 'ignore',
  });

  if (detached) {
    proc.unref();
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:1420');

  return {
    process: proc,
    browser,
    context,
    page,
  };
}

async function closeTauriApp(app: TauriApp) {
  try {
    await app.context.close();
    await app.browser.close();
    if (app.process.pid) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', app.process.pid.toString(), '/f', '/t']);
      } else {
        process.kill(-app.process.pid, 'SIGTERM');
      }
    }
  } catch (e) {
    console.error('Error closing app:', e);
  }
}

function findAppExecutable(platform: Platform, buildDir: string): string {
  const files = readdirSync(buildDir);
  console.log('Files in build dir:', files);

  if (platform === 'linux') {
    // Look for AppImage first
    const appImage = files.find((f: string) => f.endsWith('.AppImage'));
    if (appImage) return resolve(buildDir, appImage);
    
    // Look for executable binary
    const exe = files.find((f: string) => {
      try {
        const stat = statSync(resolve(buildDir, f));
        return stat.isFile() && (f.startsWith('qwk-fox') || f.startsWith('QWK')) && !f.includes('.');
      } catch { return false; }
    });
    if (exe) return resolve(buildDir, exe);
    
    // Look for .deb package and extract
    const deb = files.find((f: string) => f.endsWith('.deb'));
    if (deb) {
      console.log('Found .deb package:', deb);
      // For now, we can't easily extract .deb in test
      // The artifact should contain the unpacked app
    }
    
    throw new Error('No Linux executable found in ' + buildDir + '. Files: ' + files.join(', '));
  }

  if (platform === 'windows') {
    // Look for standalone exe (not installer)
    const exe = files.find((f: string) =>
      f.endsWith('.exe') &&
      !f.includes('setup') &&
      !f.includes('WebView2') &&
      !f.includes('installer')
    );
    if (exe) return resolve(buildDir, exe);
    
    // Look for NSIS installer
    const nsis = files.find((f: string) => f.includes('setup') && f.endsWith('.exe'));
    if (nsis) {
      console.log('Found NSIS installer:', nsis);
      // NSIS installer can't be directly tested
    }
    
    throw new Error('No Windows executable found in ' + buildDir + '. Files: ' + files.join(', '));
  }

  if (platform === 'macos') {
    const app = files.find((f: string) => f.endsWith('.app'));
    if (app) return resolve(buildDir, app);
    throw new Error('No macOS app found in ' + buildDir + '. Files: ' + files.join(', '));
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

const platform = (process.env.TEST_PLATFORM || 'linux') as Platform;
const appPath = process.env.TEST_APP_PATH || '';
const hasBinary = appPath && existsSync(appPath) && (() => {
  try {
    findAppExecutable(platform, appPath);
    return true;
  } catch {
    return false;
  }
})();

if (!hasBinary) {
  console.log('Tauri binary not found. Smoke tests require TEST_APP_PATH and TEST_PLATFORM environment variables.');
  console.log('Run: TEST_PLATFORM=linux TEST_APP_PATH=/path/to/build npm run test:e2e:tauri');
}

let tauriApp: TauriApp | null = null;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  if (!hasBinary || !appPath) {
    console.log('Skipping smoke tests: Tauri binary not available');
    return;
  }
  const executablePath = findAppExecutable(platform, appPath);
  tauriApp = await launchTauriApp(executablePath, platform);
});

test.beforeEach(async ({ page }) => {
  if (!hasBinary || !appPath) {
    test.skip();
  }
});

test.afterAll(async () => {
  if (tauriApp) {
    await closeTauriApp(tauriApp);
  }
});

function getPage(page: Page): Page {
  return tauriApp?.page || page;
}

test('home page loads', async ({ page }) => {
  const p = getPage(page);
  await expect(p).toHaveTitle(/qwk/i);
});

test('shows BBS wizard when no servers exist', async ({ page }) => {
  const p = getPage(page);
  await p.waitForLoadState('networkidle');
  await expect(p.getByRole('heading', { name: 'BBS Wizard' })).toBeVisible({ timeout: 10000 });
  await expect(
    p.getByText("It looks like you haven't set up any BBS subcriptions yet."),
  ).toBeVisible();
});

test.describe('QWK Import', () => {
  test('import menu is accessible', async ({ page }) => {
    const p = getPage(page);
    await expect(p.locator('.menu-container')).toBeVisible();
    await p.getByRole('button', { name: 'File' }).click();
    await expect(p.getByText('Import...')).toBeVisible();
  });
});

test.describe('Server Connection', () => {
  test('main content or wizard is visible', async ({ page }) => {
    const p = getPage(page);
    const wizard = p.getByRole('heading', { name: 'BBS Wizard' });
    const mainContent = p.locator('.window-content');
    
    const hasWizard = await wizard.isVisible().catch(() => false);
    const hasMainContent = await mainContent.isVisible().catch(() => false);
    
    expect(hasWizard || hasMainContent).toBeTruthy();
  });
});

test.describe('Preferences', () => {
  test('preferences menu is accessible', async ({ page }) => {
    const p = getPage(page);
    await p.getByRole('button', { name: 'File' }).click();
    await expect(p.getByText('Preferences...')).toBeVisible();
  });
});

test.describe('Window Management', () => {
  test('window titlebar buttons exist', async ({ page }) => {
    const p = getPage(page);
    await expect(p.locator('#titlebar-minimize')).toBeVisible();
    await expect(p.locator('#titlebar-maximize')).toBeVisible();
    await expect(p.locator('#titlebar-close')).toBeVisible();
  });

  test('menu bar is visible', async ({ page }) => {
    const p = getPage(page);
    await expect(p.getByRole('button', { name: 'File' })).toBeVisible();
    await expect(p.getByRole('button', { name: 'View' })).toBeVisible();
    await expect(p.getByRole('button', { name: 'Help' })).toBeVisible();
  });

  test('view menu options are accessible', async ({ page }) => {
    const p = getPage(page);
    await p.getByRole('button', { name: 'View' }).click();
    await expect(p.getByText('Hide Read Messages')).toBeVisible();
    await expect(p.getByText('Show Message Threads')).toBeVisible();
    await expect(p.getByText('Hide Empty Conferences')).toBeVisible();
    await expect(p.getByText('Column Limit')).toBeVisible();
    await p.keyboard.press('Escape');
  });
});
