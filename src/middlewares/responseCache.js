const cacheStore = new Map();

// Helper to clear specific keys from cache
exports.clearResourceCache = (resource) => {
    const prefix = `/api/${resource}`;
    for (const key of cacheStore.keys()) {
        if (key.includes(prefix)) {
            cacheStore.delete(key);
            console.log(`🧹 Cache cleared for key: ${key}`);
        }
    }
    // Also clear settings when updating settings
    if (resource === 'settings') {
        for (const key of cacheStore.keys()) {
            if (key.includes('/api/settings')) {
                cacheStore.delete(key);
            }
        }
    }
};

// Response cache middleware
exports.responseCache = (durationSeconds) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = req.originalUrl || req.url;
        const cached = cacheStore.get(key);
        if (cached && cached.expire > Date.now()) {
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('Cache-Control', `public, max-age=${durationSeconds}`);
            return res.send(cached.body);
        }

        // Capture response body
        const originalSend = res.send;
        res.send = function (body) {
            if (res.statusCode === 200) {
                cacheStore.set(key, {
                    body: body,
                    expire: Date.now() + durationSeconds * 1000
                });
            }
            res.setHeader('X-Cache', 'MISS');
            res.setHeader('Cache-Control', `public, max-age=${durationSeconds}`);
            return originalSend.apply(res, arguments);
        };
        next();
    };
};
