import { test as base, chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

export interface TauriAppOptions {
  appPath: string;
  platform: 'linux' | 'windows' | 'macos';
  cwd?: string;
  timeout?: number;
}

export interface TauriApp {
  process: ChildProcess;
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}

export async function launchTauriApp(options: TauriAppOptions): Promise<TauriApp> {
  const { appPath, platform, cwd = process.cwd(), timeout = 30000 } = options;

  if (!existsSync(appPath)) {
    throw new Error(`App not found at: ${appPath}`);
  }

  let executablePath = appPath;
  let args: string[] = [];

  if (platform === 'linux') {
    if (appPath.endsWith('.AppImage')) {
      args = [appPath];
      executablePath = appPath;
    } else if (appPath.endsWith('.deb')) {
      throw new Error('DEB packages require installation. Use AppImage or portable binary.');
    } else {
      executablePath = appPath;
    }
  } else if (platform === 'windows') {
    if (appPath.endsWith('.exe') && !appPath.includes('setup')) {
      executablePath = appPath;
    } else if (appPath.includes('setup')) {
      throw new Error('NSIS installer cannot be used for testing. Use portable executable.');
    }
  } else if (platform === 'macos') {
    if (appPath.endsWith('.app')) {
      executablePath = 'open';
      args = ['-a', appPath];
    } else {
      executablePath = appPath;
    }
  }

  console.log(`Launching Tauri app: ${executablePath} ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const proc = spawn(executablePath, args, {
      cwd,
      detached: platform !== 'windows',
    });

    let browser: Browser | null = null;

    const cleanup = async () => {
      if (proc.pid && !proc.killed) {
        try {
          if (platform === 'windows') {
            spawn('taskkill', ['/pid', proc.pid.toString(), '/f', '/t']);
          } else {
            process.kill(-proc.pid);
          }
        } catch {
          proc.kill('SIGTERM');
        }
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout launching Tauri app after ${timeout}ms`));
    }, timeout);

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      cleanup();
      reject(err);
    });

    base.step('Launch Tauri app', async () => {
      try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        clearTimeout(timeoutId);

        resolve({
          process: proc,
          context,
          page,
          close: async () => {
            await cleanup();
          },
        });
      } catch (err) {
        clearTimeout(timeoutId);
        cleanup();
        reject(err);
      }
    });
  });
}

export function getAppExecutablePath(
  platform: 'linux' | 'windows' | 'macos',
  buildDir: string
): string {
  const { readdirSync, statSync } = require('fs');

  if (platform === 'linux') {
    const files = readdirSync(buildDir);
    const appImage = files.find((f: string) => f.endsWith('.AppImage'));
    if (appImage) {
      return resolve(buildDir, appImage);
    }
    const exe = files.find((f: string) => {
      const stat = statSync(resolve(buildDir, f));
      return stat.isFile() && (f.startsWith('qwk-fox') || f.startsWith('QWK')) && !f.includes('.');
    });
    if (exe) {
      return resolve(buildDir, exe);
    }
    throw new Error('No Linux executable found');
  }

  if (platform === 'windows') {
    const files = readdirSync(buildDir);
    const exe = files.find((f: string) =>
      f.endsWith('.exe') &&
      !f.includes('setup') &&
      !f.includes('WebView2')
    );
    if (exe) {
      return resolve(buildDir, exe);
    }
    throw new Error('No Windows executable found');
  }

  if (platform === 'macos') {
    const files = readdirSync(buildDir);
    const app = files.find((f: string) => f.endsWith('.app'));
    if (app) {
      return resolve(buildDir, app);
    }
    throw new Error('No macOS app found');
  }

  throw new Error(`Unsupported platform: ${platform}`);
}
