import { ADAM_PATH, AMELIA_LOUNGE, BOB_PATH, EMOTES, FAR_FRIEND, FRAME, LAMPS, PLAZA, PRIVATE_PAIR } from "./content";
import type { Els } from "./renderFrame";
import { along, lerp, ramp, smooth } from "./timeline";

// The things that happen in the map, by film time t: Adam walks over to
// Amelia and the main office lights up as one voice zone (proximity chat),
// Bob walks through the door into the glass room and the cameras come up
// (video pods), emotes burst over the plaza, then night falls and lamps light
// where friends are (presence).

const CONFETTI_COLORS = ["#e85d04", "#f0a35e", "#97c27f", "#fff2d6", "#6fb3ff"];
const GRASS = [99, 166, 80];
const NIGHT = [34, 42, 29];

const frameAt = (el: HTMLElement, f: number) => {
    el.style.backgroundPosition = `${-f * 16}px 0`;
};
const walkFrame = (dir: number, k: number, t: number) =>
    k > 0 && k < 1 ? dir + (Math.floor(t * 10) % 6) : dir;

/** Puts an "in voice" badge over the head of a sprite whose top-left is (x, y). */
function voiceAt(el: HTMLElement, x: number, y: number, on: number) {
    el.style.opacity = String(on);
    el.style.left = `${x + 8}px`;
    el.style.top = `${y - 1}px`;
    el.style.transform = `translate(-50%, -100%) scale(${0.6 + 0.4 * on})`;
}

/** A short swell each time someone speaks, so the room itself reads as live. */
const speech = (t: number, at: number) => ramp(t, at, at + 0.12) * (1 - ramp(t, at + 0.25, at + 0.6));

export function renderScene(els: Els, t: number) {
    // proximity chat: voice is by room, so the whole zone lights and everyone
    // in it is "in voice", however far apart, instead of a circle around Adam
    const wk = smooth(ramp(t, 9.4, 10.5));
    const [ax, ay, adamFacing] = along(ADAM_PATH, wk);
    els.adam.style.left = `${ax}px`;
    els.adam.style.top = `${ay}px`;
    frameAt(els.adam, wk > 0 && wk < 1 ? walkFrame(FRAME[adamFacing], wk, t) : FRAME.up);
    const inZone = Math.min(ramp(t, 9.2, 9.6), 1 - ramp(t, 12.2, 12.8));
    els.zone.style.opacity = String(inZone);
    els.zoneTag.style.opacity = String(inZone);
    els.zonePath.style.fillOpacity = String(0.08 + 0.1 * Math.max(speech(t, 10.15), speech(t, 10.45)));
    // everyone stays in their room's voice until the pods beat ends
    const voiceOut = 1 - ramp(t, 16.2, 16.7);
    const inMain = (i: number) => Math.min(ramp(t, 9.6 + i * 0.12, 9.85 + i * 0.12), voiceOut);
    voiceAt(els.voices[0], ax, ay, inMain(0));
    voiceAt(els.voices[1], AMELIA_LOUNGE[0], AMELIA_LOUNGE[1], inMain(1));
    voiceAt(els.voices[2], FAR_FRIEND[0], FAR_FRIEND[1], inMain(2));
    PRIVATE_PAIR.forEach(([x, y], j) =>
        voiceAt(els.voices[4 + j], x, y, Math.min(ramp(t, 13.6 + j * 0.12, 13.85 + j * 0.12), voiceOut)),
    );
    const bubble = (el: HTMLElement, on: number, x: number, y: number, anchor: number) => {
        el.style.opacity = String(on);
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.transform = `translate(${anchor}%, 0) scale(${0.8 + 0.2 * on})`;
    };
    const bubbleOut = 1 - ramp(t, 12.1, 12.5);
    bubble(els.bubbles[0], Math.min(ramp(t, 10.15, 10.4), bubbleOut), ax - 4, ay - 26, -100);
    bubble(els.bubbles[1], Math.min(ramp(t, 10.45, 10.7), bubbleOut), 734, 380, -10);

    // video pods
    const bk = smooth(ramp(t, 13.4, 14.9));
    const [bx, by, facing] = along(BOB_PATH, bk);
    els.bob.style.left = `${bx}px`;
    els.bob.style.top = `${by}px`;
    frameAt(els.bob, walkFrame(FRAME[facing], bk, t));
    // Bob hears the main office until his feet cross the doorway (main office
    // ends at y 590, the private office starts at 626), then the private office
    const feet = by + 30;
    const bobVoice = feet < 608 ? inMain(3) * (1 - ramp(feet, 582, 598)) : ramp(feet, 628, 646) * voiceOut;
    voiceAt(els.voices[3], bx, by, bobVoice);
    const inRoom = String(ramp(t, 14.3, 14.6) * (1 - ramp(t, 16.2, 16.7)));
    els.room.style.opacity = inRoom;
    els.roomTag.style.opacity = inRoom;
    els.tiles.forEach((tile, i) => {
        const on = Math.min(ramp(t, 14.4 + i * 0.18, 14.7 + i * 0.18), 1 - ramp(t, 16.2, 16.6));
        tile.style.opacity = String(on);
        tile.style.transform = `translateY(${(1 - on) * -12}px) scale(${0.85 + 0.15 * on})`;
    });

    // emotes
    EMOTES.forEach((e, i) => {
        const [x, y] = PLAZA[e.who];
        const k = ramp(t, e.at, e.at + 1.3);
        const el = els.emotes[i];
        el.style.opacity = String(k > 0 && k < 1 ? Math.min(1, Math.sin(k * Math.PI) * 1.2) : 0);
        el.style.left = `${x + (i % 2 ? 6 : -4) + Math.sin(k * 6 + i) * 4}px`;
        el.style.top = `${y - 6 - k * 46}px`;
        el.style.transform = `scale(${1 + k * 0.9})`;
    });
    const ck = ramp(t, 18, 19.6);
    els.confetti.forEach((c, i) => {
        const a = (i / els.confetti.length) * Math.PI * 2;
        const sp = 40 + (i % 5) * 14;
        c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        c.style.opacity = String(ck > 0 && ck < 1 ? 1 - ck : 0);
        c.style.left = `${1272 + Math.cos(a) * sp * ck}px`;
        c.style.top = `${1030 + Math.sin(a) * sp * ck * 0.8 + ck * ck * 40}px`;
    });

    // presence: night falls, lamps light where friends are
    const night = ramp(t, 21.2, 23);
    els.dim.style.opacity = String(night);
    const [r, g, b] = GRASS.map((c, i) => lerp(c, NIGHT[i], night));
    els.media.style.background = `rgb(${r} ${g} ${b})`;
    LAMPS.forEach((l, i) => {
        const k = ramp(t, l.at, l.at + 0.7);
        els.pools[i].style.opacity = String(k * night);
        els.pools[i].style.transform = `scale(${0.55 + 0.45 * k})`;
        els.lamps[i].style.opacity = String(k);
        els.lampLabels[i].style.opacity = String(ramp(t, l.at + 0.3, l.at + 0.8));
    });
    els.online.style.opacity = String(ramp(t, 23.6, 24.2));
}
