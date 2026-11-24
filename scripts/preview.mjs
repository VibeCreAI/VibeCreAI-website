import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import serve from 'serve-handler';
import stats from '../api/astrocade-stats.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 5173);
createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname;
    if (path === '/api/astrocade-stats') return stats(req, res);
    if (['/cartridge-cove', '/cartridge-cove/', '/cartridge-cove/index.html'].includes(path)) {
        res.writeHead(308, { Location: '/' + url.search }).end();
        return;
    }
    if (!/^\/(?:$|(?:cartridge-cove|styles|fonts|images|js|sound)\/|(?:index|classic)\.html$|favicon\.ico$|app-ads\.txt$|robots\.txt$|sitemap\.xml$)/.test(path)) {
        res.writeHead(404).end();
        return;
    }
    if (path === '/') req.url = '/index.html' + url.search;
    return serve(req, res, { public: root, directoryListing: false, cleanUrls: false, symlinks: false });
}).listen(port, host, () => console.log(`Arcade preview at http://${host}:${port}/`));
