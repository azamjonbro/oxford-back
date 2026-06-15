const https = require('https');
const { SocksProxyAgent } = require('socks-proxy-agent');

// .env dan barcha proxy larni olish
function getStaticProxies() {
    const proxies = [];
    if (process.env.SOCKS5_PROXY) proxies.push(process.env.SOCKS5_PROXY);
    let i = 2;
    while (process.env[`SOCKS5_PROXY_${i}`]) {
        proxies.push(process.env[`SOCKS5_PROXY_${i}`]);
        i++;
    }
    return proxies;
}

const PROXY_LIST_URL = 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/socks5/data.txt';
const TEST_URL = 'https://api.telegram.org/';
const TEST_TIMEOUT = 8000;
const PROXY_REFRESH_INTERVAL = 30 * 60 * 1000;

let currentProxyUrl = null;
let currentProxyIndex = 0;
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
                resolve({ success: true, proxyUrl });
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
            return working.proxyUrl;
        }
    }

    console.error('[ProxyManager] ❌ No working proxy found from the entire list.');
    return null;
}

async function getAgent() {
    const staticProxies = getStaticProxies();

    if (staticProxies.length > 0) {
        const proxy = staticProxies[currentProxyIndex % staticProxies.length];
        currentProxyUrl = proxy;
        console.log(`[ProxyManager] Using static proxy [${currentProxyIndex % staticProxies.length + 1}/${staticProxies.length}]: ${proxy}`);
        return new SocksProxyAgent(proxy);
    }

    // Static proxy yo'q — bepul listdan topamiz
    if (!currentProxyUrl) {
        currentProxyUrl = await findWorkingProxy();
    }

    if (currentProxyUrl) {
        return new SocksProxyAgent(currentProxyUrl);
    }

    return null;
}

async function markCurrentFailed() {
    console.warn(`[ProxyManager] ⚠️ Current proxy failed: ${currentProxyUrl}. Will rotate.`);

    const staticProxies = getStaticProxies();

    if (staticProxies.length > 0) {
        currentProxyIndex++;
        const nextProxy = staticProxies[currentProxyIndex % staticProxies.length];
        currentProxyUrl = nextProxy;
        console.log(`[ProxyManager] 🔄 Switching to next static proxy [${currentProxyIndex % staticProxies.length + 1}/${staticProxies.length}]: ${nextProxy}`);
        return new SocksProxyAgent(nextProxy);
    }

    // Static proxy yo'q — bepul listdan yangi topamiz
    currentProxyUrl = null;
    if (isRotating) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return currentProxyUrl ? new SocksProxyAgent(currentProxyUrl) : null;
    }

    isRotating = true;
    try {
        currentProxyUrl = await findWorkingProxy();
        if (!currentProxyUrl) {
            proxyList = [];
            lastFetchTime = 0;
            currentProxyUrl = await findWorkingProxy();
        }
        return currentProxyUrl ? new SocksProxyAgent(currentProxyUrl) : null;
    } finally {
        isRotating = false;
    }
}

function getCurrentProxyUrl() {
    return currentProxyUrl || 'none';
}

module.exports = {
    getAgent,
    markCurrentFailed,
    getCurrentProxyUrl
};