import { stations } from './scenery.js';
import { mountCreatorCards } from '../js/creator-cards.js';

const $ = (selector) => document.querySelector(selector);

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
}

export async function loadStationContent() {
    const response = await fetch('/classic.html');
    if (!response.ok) throw Error('Could not load homepage content');
    // Resolve homepage artwork while the markup is inert, before a station can request it.
    const template = document.createElement('template');
    template.innerHTML = await response.text();
    const doc = template.content;
    for (const image of doc.querySelectorAll('img[src]')) {
        image.src = new URL(image.getAttribute('src'), response.url).href;
    }

    function copy(node) {
        return document.importNode(node, true);
    }

    const socialLinks = new Map();
    for (const link of doc.querySelectorAll('.hero-social-link, .contact-social-link')) {
        if (socialLinks.has(link.href)) continue;
        const a = copy(link);
        const name = a.getAttribute('aria-label').replace('Twitter', 'X');
        a.removeAttribute('class');
        a.title = name;
        a.setAttribute('aria-label', name);
        a.querySelector('svg').setAttribute('aria-hidden', 'true');
        socialLinks.set(link.href, a);
    }
    const links = [...socialLinks.values()];
    const shortcuts = ['Astrocade', 'YouTube', 'X']
        .map((name) => links.find((a) => a.title === name))
        .filter(Boolean);
    $('#quick-socials').append(...shortcuts.map(copy));
    const otherLinks = links.filter((a) => !shortcuts.includes(a));
    for (const group of [shortcuts, otherLinks]) {
        const row = element('div', 'contact-row');
        row.append(...group);
        $('#contacts').append(row);
    }

    const cards = new Map(
        [...doc.querySelectorAll('.app-card')].map((card) => [
            card.querySelector('.app-title').textContent.trim(),
            card
        ])
    );
    function project(name, season) {
        const card = cards.get(name);
        const group = element('div', 'project');
        const icon = copy(card.querySelector('img'));
        icon.removeAttribute('style');
        icon.className = 'project-icon';
        group.append(icon, element('h2', '', name));
        if (season) group.append(element('p', 'chroma-season', season));
        for (const node of card.querySelectorAll(
            '.award-highlight,.app-description,.app-buttons-container'
        )) {
            group.append(copy(node));
        }
        return group;
    }

    const pages = stations.map((station) => {
        const section = element('section');
        section.hidden = true;
        section.dataset.place = station.id;
        const title = element('h1', '', station.title);
        section.append(title);
        if (station.id === 'creator') {
            section.append(copy(doc.querySelector('#about .section-subtitle')));
            for (const card of doc.querySelectorAll('.about-card')) {
                const row = element('div', 'creator-bio');
                const body = element('div');
                body.append(copy(card.querySelector('h3')), copy(card.querySelector('p')));
                row.append(copy(card.querySelector('.about-icon')), body);
                section.append(row);
            }
        } else if (station.id === 'astrocade') {
            for (const selector of ['.arcade-plays', '.arcade-feature .feature-actions', '.arcade-ranking']) {
                section.append(copy(doc.querySelector(selector)));
            }
        } else if (station.id === 'chroma') {
            title.textContent = 'HOLLOW STRIDER';
            for (const selector of [
                '.chroma-season',
                '.chroma-description',
                '.chroma-trailer',
                '.chroma-feature .feature-actions'
            ]) {
                section.append(copy(doc.querySelector(selector)));
            }
            section.append(project('Vibe Survivor', 'Chroma Awards · Season 1'));
        } else {
            section.append(...['Spin2Pick', 'VibeTube', 'ECO Guardian'].map((name) => project(name)));
        }
        $('#pages').append(section);
        return section;
    });

    mountCreatorCards(pages[0], { celShaded: true });
    document.body.append(copy(doc.querySelector('#demo-video-modal')));
    await import('../js/demo-modal.js');
    return pages;
}
