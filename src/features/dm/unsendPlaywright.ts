import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export async function runUnsendPlaywright(cookieString: string, threadId: string): Promise<number> {
    const threadUrl = `https://www.instagram.com/direct/t/${threadId}/`;
    
    // Parse the cookie string to Playwright format
    const cookies = cookieString.split(';').map(c => c.trim()).filter(c => c).map(c => {
        const [name, ...valueParts] = c.split('=');
        return {
            name: name,
            value: valueParts.join('='),
            domain: '.instagram.com',
            path: '/',
            secure: true,
            httpOnly: false,
            sameSite: 'Lax' as const
        };
    });

    // We expect idmu.user.js to be built into src/assets/idmu.user.js
    const userscriptPath = path.join(__dirname, '..', '..', 'assets', 'idmu.user.js');
    if (!fs.existsSync(userscriptPath)) {
        throw new Error(`Userscript not found at ${userscriptPath}. Please build it first.`);
    }

    const userscriptCode = fs.readFileSync(userscriptPath, 'utf8');
    const scriptBody = userscriptCode
        .replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/m, '')
        .trim();

    const browser = await chromium.launch({
        headless: false,
        slowMo: 0,
        args: [
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,900',
            '--window-position=0,0',
        ],
    });

    let totalUnsent = 0;
    try {
        const context = await browser.newContext({
            viewport: { width: 1280, height: 900 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            locale: 'en-US',
        });

        // Remove automation fingerprint
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            (window as any).chrome = { runtime: {} };
        });

        await context.addInitScript(scriptBody);
        await context.addCookies(cookies);

        const page = await context.newPage();

        // Forward browser console logs (optional, commented out for cleaner CLI output)
        /*
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('idmu') || text.includes('IDMU') || text.includes('Unsend') ||
                text.includes('DefaultStrategy') || text.includes('Workflow') ||
                text.includes('loadMore') || text.includes('unsent')) {
                const type = msg.type() === 'error' ? '❌' : msg.type() === 'warn' ? '⚠️' : '🔵';
                console.log(`  ${type} [browser] ${text}`);
            }
        });
        */

        console.log(`\n🌐  Navigating to thread ${threadUrl}...`);
        await page.goto(threadUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Dismiss blocking modals
        await page.waitForTimeout(2000);
        const url = page.url();
        if (url.includes('login') || url.includes('accounts')) {
            throw new Error('Redirected to login page. Your cookies may be expired or invalid.');
        }

        await page.evaluate(() => {
            const notNow = [...document.querySelectorAll('button')].find(b => 
                b.textContent?.trim() === 'Not Now' || b.textContent?.trim() === 'Not now'
            );
            if (notNow) notNow.click();
        });
        await page.waitForTimeout(1000);

        // Verify IDMU injection
        await page.waitForTimeout(2000);
        let idmuRoot = await page.$('#idmu-root');
        if (!idmuRoot) {
            console.log('⚠️  IDMU root element not found — retrying injection...');
            await page.evaluate(scriptBody);
            await page.waitForTimeout(2000);
            idmuRoot = await page.$('#idmu-root');
        }

        if (!idmuRoot) {
            throw new Error('IDMU root not found after injection. Page structure may have changed.');
        }

        console.log('✅  Unsending started! Monitoring progress (auto-restarts until done)...');

        let runNumber = 0;
        let consecutiveZeroRuns = 0;

        while (consecutiveZeroRuns < 2) {
            runNumber++;
            console.log(`\n─── Run #${runNumber} | Total so far: ${totalUnsent} ───────────────────`);

            if (runNumber > 1) {
                let clicked = false;
                for (let attempt = 0; attempt < 10; attempt++) {
                    await page.waitForTimeout(1000);
                    try {
                        const btnText = await page.$eval('#idmu-root button', el => el.textContent?.trim() || '');
                        if (btnText === 'Unsend all DMs') {
                            await page.click('#idmu-root button');
                            clicked = true;
                            break;
                        }
                    } catch { /* ignore navigation errors */ }
                }
                if (!clicked) { console.log('  ⚠️  Could not click button. Stopping.'); break; }
            } else {
                // First run - just click it
                await page.waitForTimeout(1000);
                const unsendBtn = await page.$('#idmu-root button');
                if (unsendBtn) {
                    await unsendBtn.click();
                } else {
                    console.error('❌  Could not find IDMU unsend button');
                    break;
                }
            }

            let lastStatus = '';
            let stuckCount = 0;
            let runUnsent = 0;

            while (true) {
                await page.waitForTimeout(2000);
                try {
                    const status = await page.$eval('#idmu-status', el => el.textContent?.trim() || '');
                    const btnLabel = await page.$eval('#idmu-root button', el => el.textContent?.trim() || '');

                    if (status !== lastStatus) {
                        console.log(`  📊  ${new Date().toLocaleTimeString()} | ${status}`);
                        lastStatus = status;
                        stuckCount = 0;
                    } else {
                        stuckCount++;
                    }

                    if (btnLabel === 'Unsend all DMs' && status !== 'Ready') {
                        const match = status.match(/(\d+) message/);
                        runUnsent = match ? parseInt(match[1]) : 0;
                        totalUnsent += runUnsent;
                        console.log(`  ✅  Run #${runNumber} complete: ${runUnsent} unsent | ${totalUnsent} total`);
                        break;
                    }

                    if (stuckCount >= 60) {
                        console.log(`  ⚠️  Stuck for 2 minutes on: "${status}". Breaking run.`);
                        break;
                    }
                } catch (e: any) {
                    console.log(`  ⚠️  Monitor error: ${e.message}`);
                    break;
                }
            }

            if (runUnsent === 0) {
                consecutiveZeroRuns++;
                console.log(`  ℹ️  Zero unsent this run (${consecutiveZeroRuns}/2 consecutive zeros)`);
            } else {
                consecutiveZeroRuns = 0;
            }

            await page.waitForTimeout(3000);
        }

        console.log(`\n🎉  ALL DONE! Total messages unsent: ${totalUnsent}`);
        await page.waitForTimeout(5000);
    } finally {
        await browser.close();
    }
    
    return totalUnsent;
}
