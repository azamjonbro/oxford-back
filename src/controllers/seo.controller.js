const { Setting } = require('../models');

exports.getSitemap = async (req, res) => {
    try {
        const frontendUrlSetting = await Setting.findOne({ key: 'frontend_url' });
        const baseUrl = (frontendUrlSetting ? frontendUrlSetting.value : '').trim() || 'https://youroxford.uz';

        const staticRoutes = [
            '/',
            '/about',
            '/courses',
            '/teachers',
            '/events',
            '/branches',
            '/placement-test',
            '/contact',
            '/results'
        ];

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

        const locales = ['uz-UZ', 'ru-RU', 'en-US'];

        staticRoutes.forEach(route => {
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}${route}</loc>\n`;
            xml += `    <changefreq>daily</changefreq>\n`;
            xml += `    <priority>${route === '/' ? '1.0' : '0.8'}</priority>\n`;

            // Alternate links for multilingual SEO (hreflang)
            locales.forEach(loc => {
                const lang = loc.split('-')[0];
                xml += `    <xhtml:link rel="alternate" hreflang="${loc}" href="${baseUrl}${route}?lang=${lang}"/>\n`;
            });
            xml += `  </url>\n`;
        });

        xml += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('Sitemap generation error:', err);
        res.status(500).send('Error generating sitemap');
    }
};

exports.getRobots = async (req, res) => {
    try {
        const frontendUrlSetting = await Setting.findOne({ key: 'frontend_url' });
        const baseUrl = (frontendUrlSetting ? frontendUrlSetting.value : '').trim() || 'https://youroxford.uz';

        let txt = `User-agent: *\n`;
        txt += `Allow: /\n\n`;
        txt += `Sitemap: ${baseUrl}/sitemap.xml\n`;

        res.header('Content-Type', 'text/plain');
        res.send(txt);
    } catch (err) {
        console.error('Robots.txt generation error:', err);
        res.status(500).send('Error generating robots.txt');
    }
};
