import { BEATS } from "./content";
import {
    CARD_CLOSE,
    CARD_OPEN,
    INTRO_END,
    R_END,
    R_PRESENCE,
    R_STATEMENT,
    R_TITLE,
    W_PRESENCE,
    W_STATEMENT,
    WORLD_CAM,
    camAt,
    coverScale,
    easeOut,
    lerp,
    portraitScale,
    ramp,
    smooth,
    timeAt,
    type Range,
} from "./timeline";
import { renderScene } from "./renderScene";

// Writes one frame of the walk-in section straight to the DOM. Called from a
// rAF loop on scroll, so it touches styles only, never React state.

export interface Renderer {
    resize(w: number, h: number): void;
    render(p: number): void;
    dispose(): void;
}

const all = (root: HTMLElement, k: string) =>
    Array.from(root.querySelectorAll<HTMLElement>(`[data-k="${k}"]`));
const one = (root: HTMLElement, k: string) => all(root, k)[0];

export type Els = ReturnType<typeof collect>;

function collect(root: HTMLElement) {
    return {
        media: one(root, "media"),
        inner: one(root, "inner"),
        world: one(root, "world"),
        den: one(root, "den"),
        video: root.querySelector("video") as HTMLVideoElement,
        dim: one(root, "dim"),
        pools: all(root, "pool"),
        zone: one(root, "zone"),
        zoneTag: one(root, "zoneTag"),
        adam: one(root, "adam"),
        bubbles: all(root, "bubble"),
        room: one(root, "room"),
        roomTag: one(root, "roomTag"),
        bob: one(root, "bob"),
        emotes: all(root, "emote"),
        confetti: all(root, "confetti"),
        lamps: all(root, "lamp"),
        lampLabels: all(root, "lampLabel"),
        tiles: all(root, "tile"),
        online: one(root, "online"),
        scrim: one(root, "scrim"),
        grain: one(root, "grain"),
        title: one(root, "title"),
        statement: one(root, "statement"),
        statementWords: all(root, "sw"),
        beats: all(root, "beat").map((b) => Array.from(b.children) as HTMLElement[]),
        presence: one(root, "presence"),
        presenceWords: all(root, "pw"),
        end: one(root, "end"),
        cta: one(root, "cta"),
    };
}

function lightWords(words: HTMLElement[], p: number, a: number, b: number) {
    const n = words.length;
    words.forEach((w, i) => {
        w.style.opacity = String(0.2 + 0.8 * ramp(p, lerp(a, b, i / n), lerp(a, b, (i + 2) / n)));
    });
}

/** Eases in over r[0..1], holds, leaves over r[2..3], drifting up throughout (em). */
function rise(el: HTMLElement, p: number, r: Range, delay = 0, drift = 1.4): number {
    const kin = easeOut(ramp(p, r[0] + delay, r[1] + delay));
    const kout = r[3] > r[2] ? 1 - ramp(p, r[2], r[3]) : 1;
    const drifted = lerp(drift / 2, -drift / 2, ramp(p, r[0], Math.max(r[3], r[1])));
    el.style.opacity = String(Math.min(kin, kout));
    el.style.transform = `translateY(${(1 - kin) * 1.6 + drifted}em)`;
    return Math.min(kin, kout);
}

export function createRenderer(root: HTMLElement, opts: { still: boolean }): Renderer {
    const els = collect(root);
    let W = 0;
    let H = 0;
    let base = 16;
    let seeking = false;
    let pending: number | null = null;

    const onSeeked = () => {
        seeking = false;
        if (pending !== null) {
            const next = pending;
            pending = null;
            seek(next);
        }
    };
    els.video.addEventListener("seeked", onSeeked);

    function seek(t: number) {
        const v = els.video;
        if (!v.duration || opts.still) return;
        const target = Math.min((t / INTRO_END) * v.duration, v.duration - 0.04);
        if (Math.abs(v.currentTime - target) < 1 / 60) return;
        if (seeking) {
            pending = target;
            return;
        }
        seeking = true;
        v.currentTime = target;
    }

    // k = 0 full screen, 1 = a rounded card of width bw·W centred at cy·H.
    // Wide screens get a 16:9 card; phones scale the whole frame down.
    function frame(k: number, bw: number, cy: number) {
        const portrait = H > W;
        const ix = portrait ? 0 : Math.max(0, (W - (H * 16) / 9) / 2);
        const iy = portrait ? 0 : Math.max(0, (H - (W * 9) / 16) / 2);
        const sc = lerp(1, (W * bw) / (W - 2 * ix), k);
        els.media.style.transform = `translateY(${lerp(0, H * cy - H / 2, k)}px) scale(${sc})`;
        els.media.style.clipPath =
            k > 0.0005 ? `inset(${iy * k}px ${ix * k}px round ${(base * 2.1 * k) / sc}px)` : "none";
        els.inner.style.transform = `scale(${1 + 0.05 * k})`;
    }

    function render(p: number) {
        if (!W) return;
        const t = timeAt(p);
        const portrait = H > W;

        const kOpen = 1 - smooth(ramp(p, CARD_OPEN[0], CARD_OPEN[1]));
        const kClose = smooth(ramp(p, CARD_CLOSE[0], CARD_CLOSE[1]));
        if (kClose > kOpen) frame(kClose, portrait ? 0.6 : 0.5, portrait ? 0.665 : 0.685);
        else frame(kOpen, portrait ? 0.62 : 0.56, portrait ? 0.645 : 0.64);

        // intro clip, handing off to the live map as its last frame lands
        els.den.style.opacity = String(1 - ramp(t, INTRO_END - 0.35, INTRO_END));
        els.den.style.visibility = t >= INTRO_END ? "hidden" : "visible";
        if (t < INTRO_END + 0.1) seek(Math.min(t, INTRO_END));

        // live map camera
        const [cx, cy, vw] = camAt(WORLD_CAM, t);
        const s = portrait ? portraitScale(W, H, vw, t) : coverScale(W, H, vw);
        els.world.style.transform = `translate(${W / 2 - cx * s}px, ${H / 2 - cy * s}px) scale(${s})`;
        els.world.style.fontSize = `${(base * 0.85) / s}px`;
        renderScene(els, t);
        const g = Math.floor(t * 12);
        els.grain.style.transform = `translate(${((g * 37) % 40) - 20}px, ${((g * 53) % 40) - 20}px)`;

        // copy
        const io = 1 - ramp(p, R_TITLE[2], R_TITLE[3]);
        els.title.style.opacity = String(io);
        els.title.style.transform = `translateY(${(1 - io) * -1.6}em) scale(${0.97 + 0.03 * io})`;
        const sv = rise(els.statement, p, R_STATEMENT, 0, 1.2);
        lightWords(els.statementWords, p, W_STATEMENT[0], W_STATEMENT[1]);
        let beatVis = 0;
        BEATS.forEach((b, i) => {
            els.beats[i].forEach((part, j) => {
                const v = rise(part, p, b.range, j * 0.007);
                if (j === 1) beatVis = Math.max(beatVis, v);
            });
        });
        const pv = rise(els.presence, p, R_PRESENCE, 0, 1.2);
        lightWords(els.presenceWords, p, W_PRESENCE[0], W_PRESENCE[1]);
        els.scrim.style.opacity = String(Math.max(beatVis, pv, sv * 0.85));
        const ek = easeOut(ramp(p, R_END[0], R_END[1]));
        els.end.style.opacity = String(ek);
        els.end.style.transform = `translateY(${(1 - ek) * 1.4}em)`;
        els.cta.style.visibility = ek > 0.05 ? "visible" : "hidden";
    }

    return {
        resize(w, h) {
            W = w;
            H = h;
            base = Math.min(Math.max(w * 0.0125, 11), 19);
            if (opts.still) base = w * 0.0125;
            root.style.fontSize = `${base}px`;
            root.dataset.portrait = String(h > w);
        },
        render,
        dispose() {
            els.video.removeEventListener("seeked", onSeeked);
        },
    };
}

