const https = require('https');
const { SocksProxyAgent } = require('socks-proxy-agent');

const STATIC_PROXY = process.env.SOCKS5_PROXY;
const PROXY_LIST_URL = 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/socks5/data.txt';
const TEST_URL = 'https://api.telegram.org/';
const TEST_TIMEOUT = 8000;
const PROXY_REFRESH_INTERVAL = 30 * 60 * 1000;

let currentAgent = null;
let currentProxyUrl = null;
let proxyList = [];
let lastFetchTime = 0;
let isRotating = false;

function fetchProxyList() {
    return new Promise((resolve, reject) => {
        console.log('[ProxyManager] Fetching fresh SOCKS5 proxy list...');
        https.get(PROXY_LIST_URL, { timeout: 15000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const proxies = data
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && line.includes(':'));
                console.log(`[ProxyManager] Fetched ${proxies.length} SOCKS5 proxies.`);
                resolve(proxies);
            });
        }).on('error', (err) => {
            console.error('[ProxyManager] Failed to fetch proxy list:', err.message);
            reject(err);
        });
    });
}

function testProxy(proxyUrl) {
    return new Promise((resolve) => {
        const agent = new SocksProxyAgent(proxyUrl);
        const req = https.get(TEST_URL, {
            agent,
            timeout: TEST_TIMEOUT,
            family: 4
        }, (res) => {
            if (res.statusCode > 0) {
                res.destroy();
                resolve({ success: true, agent, proxyUrl });
            } else {
                resolve({ success: false });
            }
        });
        req.on('error', () => resolve({ success: false }));
        req.on('timeout', () => { req.destroy(); resolve({ success: false }); });
    });
}

async function findWorkingProxy() {
    if (proxyList.length === 0 || (Date.now() - lastFetchTime > PROXY_REFRESH_INTERVAL)) {
        try {
            proxyList = await fetchProxyList();
            lastFetchTime = Date.now();
        } catch (err) {
            console.error('[ProxyManager] Cannot fetch proxy list. Will retry later.');
            return null;
        }
    }

    const shuffled = [...proxyList].sort(() => Math.random() - 0.5);
    console.log(`[ProxyManager] Testing proxies to find a working one (${shuffled.length} available)...`);

    const BATCH_SIZE = 5;
    for (let i = 0; i < shuffled.length; i += BATCH_SIZE) {
        const batch = shuffled.slice(i, i + BATCH_SIZE);
        const socks5Urls = batch.map(p => p.startsWith('socks5://') ? p : `socks5://${p}`);
        console.log(`[ProxyManager] Testing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${socks5Urls.join(', ')}`);

        const results = await Promise.all(socks5Urls.map(url => testProxy(url)));
        const working = results.find(r => r.success);
        if (working) {
            console.log(`[ProxyManager] ✅ Found working proxy: ${working.proxyUrl}`);
            return working;
        }
    }

    console.error('[ProxyManager] ❌ No working proxy found from the entire list.');
    return null;
}

async function getAgent() {
    if (currentAgent) return currentAgent;

    if (STATIC_PROXY) {
        console.log(`[ProxyManager] Using static proxy from .env: ${STATIC_PROXY}`);
        currentAgent = new SocksProxyAgent(STATIC_PROXY);
        currentProxyUrl = STATIC_PROXY;
        return currentAgent;
    }

    return await rotateProxy();
}

async function rotateProxy() {
    if (isRotating) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return currentAgent;
    }

    isRotating = true;
    try {
        console.log('[ProxyManager] Rotating to a new proxy...');

        if (currentProxyUrl) {
            proxyList = proxyList.filter(p => !currentProxyUrl.includes(p));
        }
        currentAgent = null;
        currentProxyUrl = null;

        const result = await findWorkingProxy();
        if (result) {
            currentAgent = result.agent;
            currentProxyUrl = result.proxyUrl;
            return currentAgent;
        }

        proxyList = [];
        lastFetchTime = 0;
        const retryResult = await findWorkingProxy();
        if (retryResult) {
            currentAgent = retryResult.agent;
            currentProxyUrl = retryResult.proxyUrl;
            return currentAgent;
        }

        console.error('[ProxyManager] ❌ Failed to find any working proxy after full retry.');
        return null;
    } finally {
        isRotating = false;
    }
}

async function markCurrentFailed() {
    console.warn(`[ProxyManager] ⚠️ Current proxy failed: ${currentProxyUrl}. Will rotate.`);
    currentAgent = null;
    currentProxyUrl = null;

    if (STATIC_PROXY) {
        console.log('[ProxyManager] Retrying static proxy from .env...');
        currentAgent = new SocksProxyAgent(STATIC_PROXY);
        currentProxyUrl = STATIC_PROXY;
        return currentAgent;
    }

    return await rotateProxy();
}

function getCurrentProxyUrl() {
    return currentProxyUrl || 'none';
}

module.exports = {
    getAgent,
    rotateProxy,
    markCurrentFailed,
    getCurrentProxyUrl
};