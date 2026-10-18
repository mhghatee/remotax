/**
 * Full-Page Screenshot Capture Tool for Remotax Review Package
 * Uses Chrome DevTools Protocol (CDP) via native Node.js WebSocket.
 * Measures actual scrollHeight to guarantee 100% full-page capture without cropping.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'scratch', 'test_screens');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const TARGET_PAGES = [
  { slug: 'countries/spain/', baseName: 'spain' },
  { slug: 'countries/thailand/', baseName: 'thailand' },
  { slug: 'regimes/beckham-law-spain/', baseName: 'beckham_law_spain' },
  { slug: 'comparisons/spain-vs-portugal/', baseName: 'spain_vs_portugal' },
  { slug: 'best/digital-nomad-taxes/', baseName: 'best_digital_nomad_taxes' },
  { slug: 'methodology/', baseName: 'methodology' }
];

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getBrowserWsUrl(port = 9222) {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const data = await res.json();
      if (data.webSocketDebuggerUrl) return data.webSocketDebuggerUrl;
    } catch (_) {}
    await sleep(300);
  }
  throw new Error('Could not connect to Chrome DevTools port ' + port);
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function capture() {
  console.log('======================================================================');
  console.log('       REMOTAX FULL-PAGE SCREENSHOT CAPTURE ENGINE (CDP NATIVE)        ');
  console.log('======================================================================\n');

  // Spawn Chrome with remote debugging
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--window-size=1280,1024'
  ], { stdio: 'ignore' });

  try {
    const wsUrl = await getBrowserWsUrl(9222);
    console.log(`Connected to Chrome DevTools Protocol at ${wsUrl}`);

    const client = new CdpClient(wsUrl);
    await client.connect();

    // Create a new target page
    const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
    const targetWsUrl = `ws://127.0.0.1:9222/devtools/page/${targetId}`;
    const pageClient = new CdpClient(targetWsUrl);
    await pageClient.connect();

    await pageClient.send('Page.enable');
    await pageClient.send('DOM.enable');

    const viewports = [
      { name: 'mobile_390', width: 390, isMobile: true },
      { name: 'desktop_1280', width: 1280, isMobile: false }
    ];

    for (const page of TARGET_PAGES) {
      const targetUrl = `http://localhost:8080/${page.slug}`;

      for (const vp of viewports) {
        const outFileName = `${page.baseName}_${vp.name}.png`;
        const outFilePath = path.join(OUT_DIR, outFileName);

        console.log(`[CAPTURING] ${page.slug} @ ${vp.width}px (${vp.name})...`);

        // 1. Set initial viewport
        await pageClient.send('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: 1000,
          deviceScaleFactor: 1,
          mobile: vp.isMobile
        });

        // 2. Navigate
        await pageClient.send('Page.navigate', { url: targetUrl });
        await sleep(1500); // Wait for render and styles to settle

        // 3. Measure scrollHeight accurately
        const evalRes = await pageClient.send('Runtime.evaluate', {
          expression: 'Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight)'
        });
        const fullHeight = Math.ceil(evalRes.result.value || 2500);

        // 4. Update viewport to full height so entire page is rendered
        await pageClient.send('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: fullHeight,
          deviceScaleFactor: 1,
          mobile: vp.isMobile
        });
        await sleep(500);

        // 5. Capture screenshot
        const shotRes = await pageClient.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true
        });

        const buf = Buffer.from(shotRes.data, 'base64');
        fs.writeFileSync(outFilePath, buf);
        console.log(`  ✓ Saved ${outFileName} (${(buf.length / 1024).toFixed(1)} KB, dimensions: ${vp.width}x${fullHeight}px)`);
      }
    }

    pageClient.close();
    client.close();
    console.log('\nAll 12 full-page screenshots captured successfully!');
  } finally {
    chromeProc.kill();
  }
}

capture().catch(err => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
