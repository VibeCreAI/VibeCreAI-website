import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';

const username = 'VibeCreAI';
const ttl = 60_000;
let lastGood;
let pending;
let retryAfter = 0;

async function readProfile() {
    let options = { channel: 'chrome' };
    if (process.env.CHROME_EXECUTABLE_PATH) {
        options = { executablePath: process.env.CHROME_EXECUTABLE_PATH };
    } else if (process.env.VERCEL && process.platform === 'linux') {
        const { default: chromium } = await import('@sparticuz/chromium');
        options = {
            args: chromium.args,
            executablePath: await chromium.executablePath(resolve('node_modules/@sparticuz/chromium/bin'))
        };
    }
    const browser = await puppeteer.launch({ ...options, headless: true, timeout: 15000 });
    try {
        const page = await browser.newPage();
        // Read the public profile as a signed-out visitor. Only return the scoreboard fields.
        function profileResponse(path) {
            return page.waitForResponse((response) => {
                const url = new URL(response.url());
                return response.request().method() === 'GET' && response.ok() && url.origin === 'https://astrocade-api-prod.com' &&
                    url.pathname === '/v3/' + path && url.searchParams.get('username') === username &&
                    (path === 'users' || url.searchParams.get('sortBy') === 'popular');
            }, { timeout: 18000 }).then((response) => response.json());
        }
        const [user, list] = await Promise.all([
            profileResponse('users'), profileResponse('games'),
            page.goto('https://www.astrocade.com/profile/' + username, { waitUntil: 'domcontentloaded', timeout: 18000 })
        ]);
        if (user.username !== username || !Number.isSafeInteger(user.totalPlays) || user.totalPlays < 0)
            throw Error('Profile total unavailable');
        const games = list.games.filter((g) => g.username === username && g.isPublic &&
            typeof g.title === 'string' && /^[A-Z0-9]{26}$/.test(g.gameId) &&
            Number.isSafeInteger(g.plays) && g.plays >= 0)
            .sort((a, b) => b.plays - a.plays).slice(0, 10)
            .map((g) => ({ id: g.gameId, title: g.title, plays: g.plays, thumbnail: g.thumbnailUrl }));
        if (games.length !== 10 || new Set(games.map((g) => g.id)).size !== 10)
            throw Error('Incomplete popular games list');
        return { total: user.totalPlays, games, updatedAt: Date.now() };
    } finally {
        await browser.close();
    }
}

export default async function stats(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        res.writeHead(405).end();
        return;
    }
    if ((!lastGood || Date.now() - lastGood.updatedAt >= ttl) && Date.now() >= retryAfter) {
        pending ??= readProfile().then((value) => { lastGood = value; }).catch((error) => {
            console.warn('Astrocade profile refresh failed:', error.message);
            retryAfter = Date.now() + 15_000;
        }).finally(() => { pending = null; });
        await pending;
    }
    if (!lastGood) {
        res.writeHead(503).end(JSON.stringify({ error: 'Scoreboard temporarily unavailable' }));
        return;
    }
    const age = Date.now() - lastGood.updatedAt;
    if (age < ttl) res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=' + Math.floor((ttl - age) / 1000));
    res.end(JSON.stringify({ ...lastGood, stale: age >= ttl }));
}
