import { stations, stops, standTravel, route, routeLength, makeArcade } from './scenery.js';
import { loadStationContent } from './station-content.js';
import { mountArcadeScores } from '../js/astrocade-scores.js';
import { bindAvatarMotion } from '../js/avatar-motion.js';
import { inkRenderer } from './ink-renderer.js';
import { avatarReactions } from './avatar-reactions.js';

const T = window.THREE;
const { t, localize } = window.VibeLocale;
const $ = (selector) => document.querySelector(selector);
const clamp = T.MathUtils.clamp,
    smooth = T.MathUtils.smoothstep,
    mix = T.MathUtils.lerp;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const touch = matchMedia('(pointer: coarse)');
const scroller = $('#route-scroll');
const world = $('#world');
const map = $('#map'),
    paper = $('.paper'),
    paperBody = $('.paper-body'),
    destination = $('#destination');
const guideNow = $('#now'),
    guideHint = $('#hint'),
    meter = $('#progress');
let distance = 0,
    target = 0,
    direction = 1,
    active = -1;
let journey = null;
let swipe = null;
let suppressFloorClick = false;
let touchRouteY = 0;
const tripSeconds = 2;
const maxWalkingSpeed = 4.1;
let pages,
    drawWorld,
    frame = 0,
    lastTime = 0,
    unavailable = false;
let segments = [],
    scale = 1,
    measureFrame = 0;
let viewWidth = world.clientWidth,
    viewHeight = world.clientHeight;
history.scrollRestoration = 'manual';
const boot = $('#arcade-boot');
const travelNav = $('#station-travel'),
    previousArrow = $('#previous-station'),
    nextArrow = $('#next-station');
let dismissedStation = null;
const bootProgress = $('#boot-progress');
const bootStarted = performance.now();
let booting = true;
let bootLabel = 'Loading the arcade';

function bootStep(label) {
    bootLabel = label;
    $('#boot-label').textContent = t(label);
    bootProgress.value++;
    $('#boot-percent').textContent = Math.round(100 * bootProgress.value / bootProgress.max) + '%';
}

async function revealFloor(ready = false) {
    if (ready) {
        bootStep('Samson’s desk is ready');
        if (!reduced.matches) {
            await new Promise((resolve) => setTimeout(resolve, Math.max(0, 650 - (performance.now() - bootStarted))));
            boot.classList.add('ready');
            await new Promise((resolve) => setTimeout(resolve, 340));
        }
    }
    boot.hidden = true;
    document.body.classList.remove('booting');
    scroller.inert = false;
    address(-1);
    setY(0);
    booting = false;
}

function schedule() {
    if (!document.hidden && !frame) frame = requestAnimationFrame(tick);
}

function routeY() {
    return touch.matches ? touchRouteY : window.scrollY;
}

function nextLabel(index) {
    if (index + 1 >= stations.length) return t('Return to the desk');
    const name = t(stations[index + 1].title);
    return window.VibeLocale.language === 'ko' ? name + '까지 걷기 →' : 'Walk to ' + name + ' →';
}

// One native scroll range alternates between meters of aisle and pixels of reading.
function locate(y) {
    let previousY = 0,
        previousDistance = 0;
    for (const [i, segment] of segments.entries()) {
        // Fractional device scales can land just below an integer scroll destination.
        if (y < segment.start - 0.5)
            return { distance: previousDistance + Math.max(0, y - previousY) / scale, index: -1 };
        if (y <= segment.end || i === segments.length - 1)
            return {
                distance: stops[i],
                index: i,
                read: clamp(y - segment.start, 0, segment.overflow)
            };
        previousY = segment.end;
        previousDistance = stops[i];
    }
    return { distance: 0, index: -1 };
}

function aisleY(meters, forward = true) {
    let previousY = 0,
        previousDistance = 0;
    for (const [i, segment] of segments.entries()) {
        if (meters < stops[i] || (forward && meters === stops[i])) {
            return previousY + (meters - previousDistance) * scale;
        }
        previousY = segment.end;
        previousDistance = stops[i];
    }
    return previousY;
}

function setY(y) {
    const current = routeY();
    const top = Math.round(y);
    if (y === current || top === current) return;
    if (touch.matches) touchRouteY = top;
    else window.scrollTo({ top, behavior: 'instant' });
}

function measure() {
    measureFrame = 0;
    if (!pages) return;
    const y = routeY();
    if (viewWidth !== world.clientWidth || viewHeight !== world.clientHeight) swipe = null;
    viewWidth = world.clientWidth;
    viewHeight = world.clientHeight;
    const height = viewHeight;
    const old = locate(y);
    const previous = segments[old.index];
    const fraction = previous ? clamp((y - previous.start) / (previous.end - previous.start), 0, 1) : 0;
    const wasHidden = destination.hidden;
    const readingOffset = paperBody.scrollTop;
    destination.hidden = false;
    scale = clamp(height * 0.15, 84, 134);
    let end = 0;
    segments = pages.map((page, i) => {
        pages.forEach((p) => {
            p.hidden = p !== page;
        });
        $('#continue').textContent = nextLabel(i);
        const overflow = Math.max(0, paperBody.scrollHeight - paperBody.clientHeight);
        const start = Math.round(end + (stops[i] - (stops[i - 1] || 0)) * scale);
        end = start + overflow + Math.round(height * 0.29);
        return { start, end, overflow };
    });
    pages.forEach((p, i) => {
        p.hidden = i !== active;
    });
    destination.hidden = wasHidden;
    if (touch.matches && active >= 0) paperBody.scrollTop = readingOffset;
    if (active >= 0) $('#continue').textContent = nextLabel(active);
    $('#scroll-space').style.height = end + (touch.matches ? 0 : height) + 'px';
    const segment = segments[old.index];
    if (!journey)
        setY(segment ? segment.start + fraction * (segment.end - segment.start) : aisleY(old.distance));
    schedule();
}

function queueMeasure() {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
}

function entryY(index) {
    return segments[index]?.start ?? 0;
}

function guideProgress() {
    const end = segments[segments.length - 1].end;
    if (!journey && touch.matches && active >= 0) return (entryY(active) + paperBody.scrollTop) / end;
    return journey
        ? mix(journey.startProgress, entryY(journey.index) / end, journey.elapsed / journey.duration)
        : routeY() / end;
}

function adjacentStation(step) {
    // Closing a card steps half a metre back onto the floor. Its arrows still belong to that station.
    if (dismissedStation !== null && Math.abs(distance - stops[dismissedStation]) > 0.6) dismissedStation = null;
    const station = active >= 0 ? active : dismissedStation;
    if (station !== null) return station + step;
    if (step < 0) return stops.findLastIndex((stop) => stop < distance);
    const next = stops.findIndex((stop) => stop > distance);
    return next === -1 ? stops.length : next;
}

function updateTravelArrows(atDesk) {
    const previous = adjacentStation(-1), next = adjacentStation(1);
    if (atDesk && document.activeElement === previousArrow) nextArrow.focus({ preventScroll: true });
    if (previousArrow.hidden !== atDesk) previousArrow.hidden = atDesk;
    setArrow(previousArrow, previous, 'Previous station');
    setArrow(nextArrow, next < stops.length ? next : -1, 'Next station');
}

function setArrow(button, index, directionLabel) {
    const name = t(stations[index]?.title || 'Samson’s desk');
    const label = t(directionLabel) + ' · ' + name;
    if (button.title !== label) {
        button.title = label;
        button.setAttribute('aria-label', label);
    }
    if (button.dataset.stop !== String(index)) button.dataset.stop = index;
    const disabled = String(!!journey);
    if (button.getAttribute('aria-disabled') !== disabled) button.setAttribute('aria-disabled', disabled);
}

function updateGuide() {
    const atDesk = distance < 0.01;
    updateTravelArrows(atDesk && !journey && active < 0 && target < 0.01);
    const upcoming =
        direction < 0
            ? stops.findLastIndex((s) => s < distance - 0.05)
            : stops.findIndex((s) => s > distance + 0.05);
    const name = journey ? t(stations[journey.index]?.title || 'the desk') : '';
    const now =
        active >= 0
            ? t('Station') + ' ' + (active + 1) + ' / ' + stations.length
            : journey
              ? journey.running
                  ? 'Running to'
                  : 'Walking to'
              : atDesk
                ? 'Samson’s desk'
                : direction < 0
                  ? 'Walking back'
                  : 'On the arcade floor';
    const hint =
        active >= 0
            ? t(stations[active].title)
            : journey
              ? name
              : atDesk
                ? 'Station select'
                : distance < standTravel
                  ? 'Leaving the desk'
                  : upcoming >= 0
                    ? t('Next') + ' · ' + t(stations[upcoming].title)
                    : 'Back to the desk';
    if (guideNow.textContent !== t(now)) guideNow.textContent = t(now);
    if (guideHint.textContent !== t(hint)) guideHint.textContent = t(hint);
    const progress = 'scaleX(' + clamp(guideProgress(), 0, 1) + ')';
    if (meter.style.transform !== progress) meter.style.transform = progress;
}

function updateCard(index) {
    if (index === active) return;
    if (paper.contains(document.activeElement)) $('#map-button').focus({ preventScroll: true });
    active = index;
    destination.hidden = index < 0;
    destination.classList.toggle('entering', index >= 0);
    pages.forEach((page, i) => {
        page.hidden = i !== index;
    });
    if (index >= 0) $('#continue').textContent = nextLabel(index);
    updateTitle();
}

function updateTitle() {
    document.title = t(stations[active]?.title || '3D Arcade') + ' · ' + t('VibeCreAI Arcade');
}

document.addEventListener('vibe-language-change', () => {
    updateTitle();
    if (booting) $('#boot-label').textContent = t(bootLabel);
    if (segments.length) {
        if (active >= 0) $('#continue').textContent = nextLabel(active);
        updateGuide();
        queueMeasure();
    }
});

function address(index, push = false) {
    const hash = stations[index] ? '#' + stations[index].id : '';
    if (location.hash !== hash)
        history[push ? 'pushState' : 'replaceState'](null, '', location.pathname + location.search + hash);
}

function arrive(index) {
    dismissedStation = null;
    updateCard(index);
    const top = entryY(index);
    setY(top);
    paperBody.scrollTop = 0;
}

function travelTo(index) {
    if (booting || !pages) return;
    dismissedStation = null;
    swipe = null;
    if (map.open) map.close();
    const startProgress = guideProgress();
    target = stops[index] || 0;
    const span = Math.abs(target - distance);
    if (span < 0.001) {
        journey = null;
        distance = target;
        arrive(index);
        address(index, true);
        schedule();
        return;
    }
    updateCard(-1);
    const deskMeters = Math.abs(Math.min(target, standTravel) - Math.min(distance, standTravel));
    const aisleMeters = span - deskMeters;
    const deskSeconds = (0.58 * deskMeters) / standTravel;
    // Reserve time for getting out of the chair. Only partial, very short trips finish early.
    const duration = Math.min(tripSeconds, deskSeconds + aisleMeters / 2.15);
    const aisleSeconds = duration - deskSeconds;
    journey = {
        index,
        start: distance,
        sign: Math.sign(target - distance),
        startProgress,
        elapsed: 0,
        deskMeters,
        aisleMeters,
        deskSeconds,
        aisleSeconds,
        duration,
        running: aisleMeters > maxWalkingSpeed * aisleSeconds
    };
    lastTime = performance.now();
    address(index, true);
    schedule();
}

function advanceJourney(elapsed) {
    const trip = journey;
    trip.elapsed = Math.min(trip.duration, trip.elapsed + elapsed);
    const t = trip.elapsed / trip.duration;
    // Ramp only at departure and arrival, with constant speed past intervening cabinets.
    const ramp = 0.1;
    let progress = t - ramp / 2;
    if (t < ramp) progress = (t * t) / (2 * ramp);
    if (t > 1 - ramp) progress = 1 - ramp - (1 - t) ** 2 / (2 * ramp);
    const clock = (progress * trip.duration) / (1 - ramp);
    const deskTime = clock - (trip.sign < 0 ? trip.aisleSeconds : 0);
    const aisleTime = clock - (trip.sign > 0 ? trip.deskSeconds : 0);
    const desk = trip.deskSeconds > 0 ? trip.deskMeters * clamp(deskTime / trip.deskSeconds, 0, 1) : 0;
    const aisle = trip.aisleSeconds > 0 ? trip.aisleMeters * clamp(aisleTime / trip.aisleSeconds, 0, 1) : 0;
    distance = trip.start + trip.sign * (desk + aisle);
    if (trip.elapsed === trip.duration) {
        distance = target;
        journey = null;
        arrive(trip.index);
    }
}

function cancelTravel() {
    if (!journey) return;
    setY(aisleY(distance, journey.sign > 0));
    journey = null;
    address(-1);
    schedule();
}

function openMap() {
    const current = active >= 0 ? active : distance < 0.01 ? -1 : null;
    [...$('#stations').children].forEach((link, i) => {
        if (i - 1 === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
    });
    map.showModal();
    (map.querySelector('[aria-current]') || $('#stations a')).focus({ preventScroll: true });
}

function backToFloor() {
    if (active < 0) return;
    dismissedStation = active;
    swipe = null;
    setY(segments[active].start - scale * 0.52);
    schedule();
}
function bindStationSigns(canvas, camera, scene, signs) {
    const ray = new T.Raycaster();
    const pointer = new T.Vector2();
    let press = null;
    let hovered = null;

    function pick(event) {
        const bounds = canvas.getBoundingClientRect();
        pointer.set(
            ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
            1 - ((event.clientY - bounds.top) / bounds.height) * 2
        );
        ray.setFromCamera(pointer, camera);
        ray.far = camera.far;
        ray.layers.set(2);
        const [hit] = ray.intersectObjects(signs);
        if (!hit) return null;
        // Ignore a sign seen through the back of a cabinet or covered by the character.
        ray.layers.set(0);
        ray.layers.enable(1);
        ray.far = hit.distance - 0.001;
        return ray.intersectObjects(scene.children, true).length ? null : hit.object;
    }
    function highlight(sign) {
        if (sign === hovered) return;
        if (hovered) hovered.material.color.setScalar(1);
        hovered = sign;
        if (sign) sign.material.color.setScalar(1.35);
        canvas.style.cursor = sign ? 'pointer' : '';
        schedule();
    }
    canvas.addEventListener('pointerdown', (event) => {
        press = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
    });
    canvas.addEventListener('pointermove', (event) => {
        if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 9) press = null;
        if (event.pointerType === 'mouse' && !event.buttons) highlight(pick(event));
    });
    canvas.addEventListener('pointerleave', () => highlight(null));
    canvas.addEventListener('pointercancel', () => {
        press = null;
    });
    canvas.addEventListener('click', (event) => {
        const tap = press && Math.hypot(event.clientX - press.x, event.clientY - press.y) <= 9;
        press = null;
        if (!tap) {
            event.stopPropagation();
            return;
        }
        const sign = pick(event);
        if (sign) {
            event.stopPropagation();
            highlight(null);
            travelTo(sign.userData.stationIndex);
        }
    });
}
$('#return').addEventListener('click', backToFloor);
world.addEventListener('click', (event) => {
    if (!touch.matches || active < 0 || journey) return;
    if (event.clientY < paper.getBoundingClientRect().top) backToFloor();
});
$('#continue').addEventListener('click', () => travelTo(active + 1 < stations.length ? active + 1 : -1));
travelNav.addEventListener('click', (event) => {
    const button = event.target.closest('.travel-arrow');
    if (button && !journey && !button.hidden) travelTo(Number(button.dataset.stop));
});
$('#map-button').addEventListener('click', openMap);
map.querySelector('.close').addEventListener('click', () => map.close());
map.addEventListener('click', (e) => {
    if (e.target !== map) return;
    const r = map.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) map.close();
});
for (const [i, name] of ['Samson’s desk', ...stations.map((s) => s.title)].entries()) {
    const link = document.createElement('a'),
        key = document.createElement('kbd');
    link.href = '#' + (i ? stations[i - 1].id : 'desk');
    key.textContent = i;
    link.append(key, name);
    $('#stations').append(link);
}
document.addEventListener('click', (e) => {
    const link = e.target.closest('#stations a,.wordmark');
    if (!link || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    e.preventDefault();
    travelTo(stations.findIndex((s) => link.hash === '#' + s.id));
});
document.addEventListener('keydown', (e) => {
    if (
        booting ||
        e.defaultPrevented ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.target.closest('input,textarea,select,[contenteditable]')
    )
        return;
    const openDialog = document.querySelector('dialog[open]');
    if (e.key === 'Escape' && openDialog) {
        e.preventDefault();
        openDialog.close();
        return;
    }
    if (openDialog && openDialog !== map) return;
    if (e.key.toLowerCase() === 'm' && !e.repeat) {
        e.preventDefault();
        if (map.open) map.close();
        else openMap();
    } else if (/^[0-9]$/.test(e.key) && Number(e.key) <= stations.length && !e.repeat) {
        e.preventDefault();
        travelTo(Number(e.key) - 1);
    } else if (e.key === 'Escape' && !map.open && active >= 0) $('#return').click();
    else if (
        !map.open &&
        ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)
    ) {
        swipe = null;
        cancelTravel();
    }
});
paperBody.addEventListener('focusin', (e) => {
    if (touch.matches || active < 0 || !e.target.matches(':focus-visible')) return;
    const r = e.target.getBoundingClientRect(),
        bounds = paperBody.getBoundingClientRect();
    const overflow = segments[active].overflow;
    if (r.top < bounds.top + 4 || r.bottom > bounds.bottom - 4) {
        const offset = clamp(paperBody.scrollTop + r.top - bounds.top - paperBody.clientHeight / 2, 0, overflow);
        setY(segments[active].start + offset);
    }
});

const aliases = {
    'hollow-strider': 'chroma',
    'vibe-survivor': 'chroma',
    vibetube: 'apps',
    spin2pick: 'apps',
    'eco-guardian': 'apps'
};
function restore() {
    if (booting || !segments.length) return;
    swipe = null;
    journey = null;
    const id = location.hash.slice(1);
    const index = stations.findIndex((s) => s.id === (aliases[id] || id));
    distance = target = stops[index] || 0;
    arrive(index);
    if (id === 'connect' && !map.open) {
        openMap();
        $('#contacts a[href^="mailto:"]')?.focus({ preventScroll: true });
    }
    schedule();
}
window.addEventListener('popstate', restore);
window.addEventListener('hashchange', restore);
window.addEventListener('scroll', schedule, { passive: true });
paperBody.addEventListener('scroll', () => {
    if (touch.matches && active >= 0) schedule();
}, { passive: true });
let lastWheel = -Infinity, leavingDeskByWheel = false;
window.addEventListener('wheel', (event) => {
    if (booting || touch.matches || event.ctrlKey || document.querySelector('dialog[open]')) return;
    const now = performance.now();
    const first = now - lastWheel > 220;
    lastWheel = now;
    if (first) leavingDeskByWheel = !journey && active < 0 && distance < 0.01 && routeY() === 0 &&
        event.deltaY < 0 && -event.deltaY > Math.abs(event.deltaX);
    // Accept wheel-up at the desk and consume the rest of that gesture's momentum.
    if (leavingDeskByWheel && event.deltaY < 0) {
        event.preventDefault();
        if (first) travelTo(0);
        return;
    }
    leavingDeskByWheel = false;
    swipe = null;
    cancelTravel();
}, { passive: false });

scroller.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary) {
        swipe = null;
        return;
    }
    suppressFloorClick = false;
    if (event.button !== 0 || booting || !segments.length || map.open) return;
    const surface = event.pointerType === 'mouse' ? '#world' : '#world, .paper-body';
    if (!event.target.closest(surface) ||
        event.target.closest('input, textarea, select, video, iframe, [contenteditable]')) return;
    suppressFloorClick = !!journey;
    cancelTravel();
    swipe = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        origin: distance,
        meters: distance,
        dragging: false,
        horizontal: false,
        previous: Math.max(-1, adjacentStation(-1)),
        next: Math.min(stops.length - 1, adjacentStation(1)),
        samples: [{ x: event.clientX, time: event.timeStamp }]
    };
});

function followDrag(event) {
    const dx = swipe.x - event.clientX;
    const dy = Math.abs(swipe.y - event.clientY);
    if (!swipe.horizontal) {
        if (Math.max(Math.abs(dx), dy) < 8) return;
        if (Math.abs(dx) <= dy * 1.35) {
            swipe = null;
            return;
        }
        swipe.horizontal = true;
        suppressFloorClick = true;
        // The card can disappear during this gesture. Capture on the persistent 3D surface.
        if (event.type === 'pointermove') world.setPointerCapture(event.pointerId);
    }
    const leg = dx >= 0 ? swipe.next : Math.min(stops.length - 1, swipe.previous + 1);
    const length = stops[leg] - (stops[leg - 1] ?? 0);
    const travelPixels = clamp(viewWidth * 0.78, 180, 440);
    swipe.meters = clamp(
        swipe.origin + dx * length / travelPixels,
        Math.min(swipe.origin, stops[swipe.previous] ?? 0),
        Math.max(swipe.origin, stops[swipe.next])
    );
    if (swipe.meters !== swipe.origin) swipe.dragging = true;
    if (swipe.dragging) {
        dismissedStation = null;
        setY(aisleY(swipe.meters));
        schedule();
    }
    if (swipe.samples.at(-1).x !== event.clientX) {
        swipe.samples.push({ x: event.clientX, time: event.timeStamp });
        while (swipe.samples.length > 2 && event.timeStamp - swipe.samples[0].time > 150) swipe.samples.shift();
    }
}

window.addEventListener('pointermove', (event) => {
    if (swipe?.id === event.pointerId) followDrag(event);
});
window.addEventListener('pointerup', (event) => {
    if (swipe?.id !== event.pointerId) return;
    followDrag(event);
    const drag = swipe;
    swipe = null;
    if (!drag?.dragging) return;
    distance = target = drag.meters;
    schedule();
    // Only a flick at release continues the walk. Holding still discards the earlier velocity.
    const first = drag.samples[0], last = drag.samples.at(-1);
    if (event.timeStamp - last.time > 165) return;
    const dx = first.x - last.x;
    if (Math.abs(dx) < 22 || Math.abs(dx) < 0.55 * (last.time - first.time)) return;
    let index = dx > 0 ? drag.next : drag.previous;
    // A flick back toward the starting station should land there before passing it.
    if (dx * (drag.meters - drag.origin) < 0) {
        index = dx > 0 ? stops.findIndex((stop) => stop >= distance) : stops.findLastIndex((stop) => stop <= distance);
    }
    travelTo(index);
});
window.addEventListener('pointercancel', (event) => {
    if (swipe?.id === event.pointerId) swipe = null;
});
scroller.addEventListener('click', (event) => {
    if (!suppressFloorClick || !event.detail) return;
    suppressFloorClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
}, true);
window.addEventListener('pointerdown', (event) => {
    if (event.clientX >= document.documentElement.clientWidth) cancelTravel();
});
new ResizeObserver(queueMeasure).observe(world);
touch.addEventListener('change', () => {
    swipe = null;
    if (segments.length && !journey) setY(active >= 0 ? entryY(active) + paperBody.scrollTop : aisleY(distance));
    queueMeasure();
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden) swipe = null;
    lastTime = 0;
    schedule();
});
reduced.addEventListener('change', schedule);

function tick(now) {
    frame = 0;
    if (!pages || !segments.length) return;
    if (booting) setY(0);
    const elapsed = lastTime ? Math.max(0, (now - lastTime) / 1000) : 0;
    const dt = clamp(elapsed || 0.016, 0.001, 0.085);
    lastTime = now;
    const before = distance;
    let locationOnRoute;
    if (journey) {
        direction = journey.sign;
        if (drawWorld || unavailable) advanceJourney(unavailable ? journey.duration : elapsed);
        if (!journey) locationOnRoute = locate(routeY());
    } else {
        locationOnRoute = locate(routeY());
        target = swipe?.dragging ? swipe.meters : locationOnRoute.distance;
        const gap = target - distance;
        if (Math.abs(gap) > 0.004) direction = Math.sign(gap);
        const limit =
            distance < standTravel || (direction < 0 && distance <= standTravel + 0.05) ? 1.75 : 3.7;
        if (swipe?.dragging || unavailable) distance = target;
        else if (drawWorld && touch.matches) {
            // Ease the short step back when dismissing a card.
            distance += Math.abs(gap) < 0.012 ? gap : gap * -Math.expm1(-14 * dt);
        } else if (drawWorld) distance += Math.sign(gap) * Math.min(Math.abs(gap), dt * limit);
    }
    const index = !journey && !swipe?.dragging && Math.abs(target - distance) < 0.012 ? locationOnRoute.index : -1;
    if (index !== active) {
        if (index >= 0) arrive(index);
        else updateCard(-1);
        if (!journey) address(index);
    } else if (!touch.matches && index >= 0 && Math.abs(paperBody.scrollTop - locationOnRoute.read) >= 0.5)
        paperBody.scrollTop = locationOnRoute.read;
    updateGuide();
    const moving = drawWorld?.(now, Math.abs(distance - before) / (elapsed || dt));
    if (!document.hidden && (moving || journey || Math.abs(target - distance) > 0.002)) schedule();
    else lastTime = 0;
}

async function startWorld() {
    await window.VibeLocale.readyFont();
    bootStep('Loading Samson’s desk');
    const renderer = new T.WebGLRenderer({ antialias: !touch.matches, powerPreference: 'high-performance' });
    renderer.outputEncoding = T.sRGBEncoding;
    const scene = new T.Scene();
    scene.autoUpdate = false;
    scene.fog = new T.Fog(0x111f2a, 10, 34);
    const { bands, updateMarquee, stationSigns } = makeArcade(scene, queueMeasure),
        camera = new T.PerspectiveCamera(41, 1, 0.23, 58);
    bindStationSigns(renderer.domElement, camera, scene, stationSigns);
    const key = new T.DirectionalLight(0xffedcf, 0.68);
    key.position.set(-3, 6, 4);
    const rim = new T.DirectionalLight(0x73e7f9, 0.42);
    rim.position.set(4, 3, -2);
    scene.add(key, rim, new T.HemisphereLight(0xc9e8f6, 0x978aaa, 0.43));
    const ink = inkRenderer(T, renderer),
        loader = new T.GLTFLoader();
    async function motion(url) {
        const r = await fetch(url);
        if (!r.ok) throw Error('Missing ' + url);
        return r.json();
    }
    const root = '/images/workstation/';
    const [avatar, desk, idleData, typingData, sittingData, walkingData, runningData, waveData] =
        await Promise.all([
            loader.loadAsync(root + 'model.glb'),
            loader.loadAsync(root + 'workstation.glb'),
            motion(root + 'motions/catwalk-idle.json'),
            motion(root + 'typing.json'),
            motion(new URL('./sit.json', import.meta.url)),
            motion(new URL('./walk.json', import.meta.url)),
            motion(new URL('./run.json', import.meta.url)),
            motion(root + 'motions/waving-gesture.json')
        ].map(async (asset) => {
            const loaded = await asset;
            bootStep('Loading Samson’s desk');
            return loaded;
        }));
    bootLabel = 'Powering on the arcade';
    $('#boot-label').textContent = t(bootLabel);
    const bones = {};
    const characterMaterials = [];
    avatar.scene.traverse((obj) => {
        if (obj.isBone) bones[obj.name.replace(/^mixamorig:?/, '')] = obj;
        if (obj.isSkinnedMesh) {
            obj.frustumCulled = false;
            obj.layers.set(1);
            obj.material = new T.MeshToonMaterial({
                map: obj.material.map,
                color: obj.material.color,
                gradientMap: bands,
                skinning: true
            });
            characterMaterials.push(obj.material);
        }
    });
    const rest = bindAvatarMotion(T, idleData, bones),
        typing = bindAvatarMotion(T, typingData, bones),
        sit = bindAvatarMotion(T, sittingData, bones),
        walk = bindAvatarMotion(T, walkingData, bones),
        run = bindAvatarMotion(T, runningData, bones),
        wave = bindAvatarMotion(T, waveData, bones);
    const react = avatarReactions(T, root, bones, characterMaterials, wave, motion);
    const actor = new T.Group();
    actor.add(avatar.scene);
    scene.add(desk.scene, actor);
    const chair = desk.scene.getObjectByName('Chair'),
        chairZ = chair?.position.z || 0;
    const shadow = new T.Mesh(
        new T.CircleGeometry(1, 24),
        new T.MeshBasicMaterial({
            color: new T.Color(0x0c1720).convertSRGBToLinear(),
            transparent: true,
            opacity: 0.68,
            depthWrite: false
        })
    );
    shadow.layers.set(2);
    shadow.renderOrder = 3;
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(0.52, 0.29, 1);
    scene.add(shadow);
    let w0 = 0,
        h0 = 0,
        typingTime = 1.1,
        idleTime = 0.4,
        gait = 0,
        heading = 0,
        approach = 0,
        cycle = 0,
        previousActive = -1,
        runWeight = 0;
    const p = new T.Vector3(),
        arrowAnchor = new T.Vector3(),
        tangent = new T.Vector3(),
        cam = new T.Vector3(),
        look = new T.Vector3(),
        deskCam = new T.Vector3(),
        deskLook = new T.Vector3();
    let first = true;
    let lastDraw = 0;
    let arrowCenter, arrowTop;
    drawWorld = (now, speed) => {
        const w = viewWidth,
            h = viewHeight,
            small = w <= 680;
        const resizing = w !== w0 || h !== h0;
        // The UI and native scroll keep their own refresh rate while the character is at rest.
        if (
            !resizing &&
            previousActive === active &&
            speed === 0 &&
            !journey &&
            !reduced.matches &&
            now - lastDraw < 1000 / (touch.matches ? 24 : 30) - 1
        )
            return true;
        const dt = clamp((now - lastDraw) / 1000, 0.001, 0.085);
        lastDraw = now;
        if (resizing) {
            w0 = w;
            h0 = h;
            const dpr = Math.min(devicePixelRatio, 1.55);
            renderer.setPixelRatio(dpr);
            renderer.setSize(w, h, false);
            ink.resize(w, h, touch.matches ? Math.min(1, dpr) : dpr);
            camera.aspect = w / h;
            camera.fov = small ? 49 : 40;
            camera.updateProjectionMatrix();
        }
        const stand = clamp(distance / standTravel, 0, 1),
            path = clamp((distance - standTravel) / routeLength, 0, 1);
        route.getPointAt(path, p);
        route.getTangentAt(path, tangent);
        const goal = active;
        approach = mix(approach, goal >= 0 ? 1 : 0, 1 - Math.exp(-8 * dt));
        const sprint = journey?.running && stand >= 1;
        runWeight = mix(runWeight, sprint ? 1 : 0, 1 - Math.exp(-12 * dt));
        gait = mix(gait, stand >= 1 && active < 0 ? clamp(speed / 1.05, 0, 1) : 0, 1 - Math.exp(-14 * dt));
        const atRest =
            stand >= 1 && (active >= 0 || (!journey && Math.abs(target - distance) < 0.012 && speed < 0.09));
        const visibleTyping = stand < 0.24;
        if (!reduced.matches && visibleTyping) typingTime += dt;
        let lift = 0;
        if (stand < 1) {
            const startLift = typing.sample(typingTime % typing.duration);
            // The source clip ends seated. Scrub it backwards and match the hands to the keyboard at the start.
            const seatedMatch = smooth(stand, 0, 0.18);
            lift = startLift;
            if (seatedMatch > 0)
                lift = mix(lift, sit.sample(mix(1.85, 0.15, stand), seatedMatch), seatedMatch);
            const settle = smooth(stand, 0.84, 1);
            if (settle > 0) lift = mix(lift, rest.sample(0.4, settle), settle);
        } else {
            if (!reduced.matches) idleTime = (idleTime + dt) % rest.duration;
            const idleLift = rest.sample(idleTime);
            // The shortcut crosses the actual aisle quickly. Bound the playback cadence so the legs stay readable.
            cycle +=
                dt * (sprint ? clamp(speed / runningData.stride, 1.5, 2.65) : speed / walkingData.stride);
            const phase = cycle % 1;
            const walkLift = gait > 0.001 ? walk.sample(phase * walk.duration, gait) : idleLift;
            const runLift =
                gait * runWeight > 0.001 ? run.sample(phase * run.duration, gait * runWeight) : walkLift;
            lift = mix(idleLift, mix(walkLift, runLift, runWeight), gait);
        }
        lift = react(dt, atRest, reduced.matches, lift);
        previousActive = active;
        const push = smooth(stand, 0.04, 0.72);
        if (chair) chair.position.z = chairZ - push * 0.35;
        actor.position.set(
            p.x,
            0.017 + lift,
            p.z - 0.18 * push * (1 - smooth(path, 0, 0.055)) - 0.13 * approach
        );
        shadow.position.set(p.x, 0.011, actor.position.z);
        const reveal = smooth(distance, standTravel * 0.35, standTravel + 2);
        deskCam.set(small ? 0.37 : 2.48, small ? 1.72 : 1.96, small ? 5.55 : 4.58);
        deskLook.set(small ? -0.085 : 0.17, small ? 0.98 : 1.39, -0.24);
        cam.set(p.x + (small ? -4.5 : -1.95), small ? 2.15 : 2.42, p.z + (small ? 3.6 : 5.4));
        look.set(p.x + (small ? 0.54 : 1.1), 1.47, p.z - 0.72);
        cam.lerp(deskCam, 1 - reveal);
        look.lerp(deskLook, 1 - reveal);
        if (approach > 0.002) {
            const offset = small ? 0 : 1.08;
            // At Bonus Stage the three app prints sit above the shared lightbox.
            const finalWall = smooth(path, 0.92, 1);
            const cameraZ = small ? mix(8.45, 9.7, finalWall) : mix(4.92, 5.8, finalWall);
            const cameraY = small ? 2.65 : mix(2.28, 2.87, finalWall);
            const lookY = small ? mix(-0.8, -0.29, finalWall) : mix(1.58, 1.85, finalWall);
            cam.lerp(deskCam.set(p.x, cameraY, p.z + cameraZ), approach);
            look.lerp(deskLook.set(p.x + offset, lookY, p.z - 0.97), approach);
        }
        const turnGoal = atRest
            ? Math.atan2(cam.x - actor.position.x, cam.z - actor.position.z)
            : Math.atan2(tangent.x * direction, tangent.z * direction);
        const wanted = turnGoal * smooth(stand, 0.67, 1);
        heading +=
            Math.atan2(Math.sin(wanted - heading), Math.cos(wanted - heading)) * (1 - Math.exp(-10 * dt));
        actor.rotation.y = heading;
        camera.position.copy(cam);
        camera.lookAt(look);
        if (distance < standTravel + 1) updateMarquee(performance.now(), reduced.matches);
        scene.updateMatrixWorld();
        ink.draw(scene, camera);
        // Project the torso using the same camera that just rendered the actor. Keep the hit targets
        // in HTML so they remain keyboard-accessible and stay outside the station card.
        arrowAnchor.set(actor.position.x, mix(1.08, 1.42, stand), actor.position.z).project(camera);
        const centerX = Math.round((arrowAnchor.x + 1) * w / 2);
        const top = Math.round((1 - arrowAnchor.y) * h / 2);
        if (centerX !== arrowCenter || top !== arrowTop) {
            travelNav.style.setProperty('--arrow-x', centerX + 'px');
            travelNav.style.setProperty('--arrow-y', top + 'px');
            arrowCenter = centerX;
            arrowTop = top;
        }
        if (first) {
            $('#world').append(renderer.domElement);
            document.body.dataset.world = 'ready';
            first = false;
            revealFloor(true);
        }
        const motion =
            stand < 0.012
                ? 'typing'
                : stand < 1
                  ? 'standing'
                  : sprint
                    ? 'running'
                    : speed > 0.09
                      ? 'walking'
                      : 'idle';
        if (document.body.dataset.motion !== motion) document.body.dataset.motion = motion;
        return (
            (!reduced.matches && (visibleTyping || stand >= 1)) ||
            Math.abs(approach - (goal >= 0 ? 1 : 0)) > 0.003 ||
            (gait > 0.008 && speed < 0.01) ||
            Math.abs(Math.atan2(Math.sin(wanted - heading), Math.cos(wanted - heading))) > 0.01
        );
    };
    drawWorld(performance.now(), 0);
    schedule();
}
async function start() {
    updateTitle();
    address(-1);
    setY(0);
    pages = await loadStationContent();
    localize(document.body);
    bootStep('Starting the display');
    mountArcadeScores($('#pages [data-place="astrocade"]'), queueMeasure);
    measure();
    arrive(-1);
    document.fonts.ready.then(queueMeasure);
    $('#pages').addEventListener('load', queueMeasure, true);
    try {
        await startWorld();
    } catch (error) {
        unavailable = true;
        drawWorld = null;
        console.warn('3D renderer unavailable', error);
        await revealFloor();
        if (active < 0 && !map.open) openMap();
        schedule();
    }
}
start().catch((error) => {
    console.error(error);
    travelNav.hidden = true;
    revealFloor();
    $('#hint').textContent = t('Open the homepage');
    $('#map-button').removeEventListener('click', openMap);
    $('#map-button').setAttribute('aria-label', 'Open the homepage');
    localize(scroller);
    $('#map-button').removeAttribute('aria-haspopup');
    $('#map-button').addEventListener('click', () => location.assign('/classic.html'));
});
