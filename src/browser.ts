import {chromium} from "playwright"

const TARGET_SELECTOR = ".image-grid-image"

async function autoScroll(page: any, { step = 400, maxSteps = 50, wait = 200 } = {}) {
    for (let i = 0; i < maxSteps; i++) {
      const before = await page.evaluate(() => document.body.scrollHeight);
      await page.evaluate((s: any) => window.scrollBy(0, s), step);
      await page.waitForTimeout(wait);
      const after = await page.evaluate(() => document.body.scrollHeight);
      if (after === before) break; // no more growth
    }
  }

export async function extractFromPage(url: string){
  let browser;
  
  try {
    // Launch browser with more realistic settings to avoid detection
    browser = await chromium.launch({ 
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-http2', // Disable HTTP2 to avoid protocol errors
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const page = await context.newPage();

    // Add script to remove webdriver property
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    // Load the page with improved retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        console.log(`Attempting to load page (${4 - retries}/3): ${url}`);
        
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        
        console.log('Page loaded successfully');
        break; // Success, exit retry loop
        
      } catch (error: any) {
        retries--;
        console.log(`Attempt failed: ${error.message}`);
        
        if ((error.message.includes('ERR_HTTP2_PROTOCOL_ERROR') || 
             error.message.includes('net::ERR_') ||
             error.message.includes('timeout')) && retries > 0) {
          console.log(`Retrying... (${retries} attempts left)`);
          await page.waitForTimeout(3000); // Wait longer before retry
          continue;
        }
        throw error; // Re-throw if no more retries or different error
      }
    }

    // Wait for network to settle and target selector to appear
    console.log('Waiting for page to settle...');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('Network idle timeout, continuing anyway...');
    });
    
    console.log('Waiting for target selector...');
    await page.waitForSelector(TARGET_SELECTOR, { state: 'attached', timeout: 15000 });

    // Try to trigger lazy content
    console.log('Scrolling to load lazy content...');
    await autoScroll(page);

    console.log('Extracting image URLs...');
    const urls = await page.evaluate(({ sel }) => {
      const seen = new Set();
      const absolute = (u: any) => {
        try { return new URL(u, document.baseURI).href; } catch { return null; }
      };

      const pullFromCss = (css: any) => {
        const found = [];
        const re = /url\(\s*(["']?)(.*?)\1\s*\)/gi;
        let m;
        while ((m = re.exec(css || '')) !== null) {
          const abs = absolute(m[2]);
          if (abs) found.push(abs);
        }
        return found;
      };

      const els = Array.from(document.querySelectorAll(sel));
      const out = [];

      for (const el of els) {
        // 1) Inline style (fast path if author set style="background-image: url(...)")
        const inline = el.getAttribute('style') || '';
        for (const u of pullFromCss(inline)) {
          if (!seen.has(u)) { seen.add(u); out.push(u); }
        }

        // 2) Computed style (covers cases set via CSS classes)
        const bg = getComputedStyle(el).backgroundImage || '';
        for (const u of pullFromCss(bg)) {
          if (!seen.has(u)) { seen.add(u); out.push(u); }
        }
      }

      return out;
    }, { sel: TARGET_SELECTOR });

    // Optional: filter only http/https (drop data:, blob:)
    const httpUrls = urls.filter(u => /^https?:\/\//i.test(u));
    
    console.log(`Found ${httpUrls.length} image URLs`);

    return httpUrls;

  } catch (error) {
    console.error('Error in extractFromPage:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}