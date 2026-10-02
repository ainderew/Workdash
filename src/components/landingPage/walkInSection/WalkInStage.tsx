import React, { Fragment, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MotionValue } from "framer-motion";
import { SPRITES } from "../floaties/floaties";
import styles from "./walkIn.module.css";
import { WORLD_RASTER, WORLD_H, WORLD_W } from "./timeline";
import {
    ADAM_PATH,
    AMELIA_LOUNGE,
    BEATS,
    BOB_PATH,
    CAMERA_TILES,
    CONFETTI_COUNT,
    EMOTES,
    END_ACCENT,
    END_LINE,
    FAR_FRIEND,
    FRAME,
    LAMPS,
    MAIN_OFFICE_OUTLINE,
    MAIN_OFFICE_TAG,
    PLAZA,
    PRESENCE,
    PRESENCE_EYEBROW,
    PRESENCE_SUB,
    PRIVATE_OFFICE,
    PRIVATE_PAIR,
    SHEETS,
    STATEMENT,
    TITLE,
    TITLE_ACCENT,
    type Sheet,
} from "./content";
import { createRenderer } from "./renderFrame";
import { INTRO_POSTER, useIntroVideo } from "./useIntroVideo";

interface Props {
    /** Scroll progress through the section (0–1). */
    progress?: MotionValue<number>;
    /** Render one fixed frame instead (reduced motion). */
    still?: number;
}

const POOL_R = 120;

function Sprite({ sheet, x, y, frame, k }: { sheet: Sheet; x: number; y: number; frame: number; k?: string }) {
    return (
        <div
            data-k={k}
            className={styles.sprite}
            style={{ left: x, top: y, backgroundImage: `url(${SHEETS[sheet]})`, backgroundPosition: `${-frame * 16}px 0` }}
        />
    );
}

function Words({ text, k }: { text: string; k: string }) {
    return text.split(" ").map((word, i) => (
        <Fragment key={i}>
            {i > 0 && " "}
            <span data-k={k} className={styles.word}>{word}</span>
        </Fragment>
    ));
}

export function WalkInStage({ progress, still }: Props) {
    const rootRef = useRef<HTMLDivElement>(null);
    const videoRef = useIntroVideo(rootRef, still == null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const renderer = createRenderer(root, { still: still != null });
        let target = still ?? progress?.get() ?? 0;
        let cur = target;
        let raf = 0;
        const tick = () => {
            cur += (target - cur) * 0.14;
            if (Math.abs(target - cur) < 0.0004) cur = target;
            renderer.render(cur);
            raf = cur === target ? 0 : requestAnimationFrame(tick);
        };
        const ro = new ResizeObserver(() => {
            renderer.resize(root.clientWidth, root.clientHeight);
            renderer.render(cur);
        });
        ro.observe(root);
        const unsubscribe = progress?.on("change", (v) => {
            target = v;
            if (!raf) raf = requestAnimationFrame(tick);
        });
        return () => {
            ro.disconnect();
            unsubscribe?.();
            cancelAnimationFrame(raf);
            renderer.dispose();
        };
    }, [progress, still]);

    return (
        <div ref={rootRef} className={`${styles.stage} ${still != null ? styles.still : ""}`}>
            <div data-k="media" className={styles.media} aria-hidden="true">
                <div data-k="inner" className={styles.inner}>
                    <div className={styles.layer}>
                        <div data-k="world" className={`${styles.cam} ${styles.world}`}>
                            <Image src={WORLD_RASTER} alt="" width={WORLD_W} height={WORLD_H} unoptimized className={styles.map} />
                            <Image data-k="dim" src={WORLD_RASTER} alt="" width={WORLD_W} height={WORLD_H} unoptimized className={styles.dim} />
                            {LAMPS.map((l) => (
                                <div
                                    key={l.name}
                                    data-k="pool"
                                    className={styles.pool}
                                    style={{
                                        left: l.x - POOL_R, top: l.y - POOL_R, width: POOL_R * 2, height: POOL_R * 2,
                                        backgroundImage: `url(${WORLD_RASTER})`,
                                        backgroundPosition: `${-(l.x - POOL_R)}px ${-(l.y - POOL_R)}px`,
                                    }}
                                />
                            ))}
                            <svg data-k="zone" className={styles.zoneShape} width={WORLD_W} height={WORLD_H} viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} aria-hidden="true">
                                <path d={MAIN_OFFICE_OUTLINE} />
                            </svg>
                            <div data-k="zoneTag" className={styles.roomTag} style={MAIN_OFFICE_TAG}>Main office · everyone here can hear</div>
                            <Sprite k="adam" sheet="adam" x={ADAM_PATH[0][0]} y={ADAM_PATH[0][1]} frame={FRAME.up} />
                            <Sprite sheet="amelia" x={AMELIA_LOUNGE[0]} y={AMELIA_LOUNGE[1]} frame={FRAME.down} />
                            <Sprite sheet="bob" x={FAR_FRIEND[0]} y={FAR_FRIEND[1]} frame={FRAME.left} />
                            <div data-k="bubble" className={styles.bubble}>got a sec?</div>
                            <div data-k="bubble" className={styles.bubble}>yeah, pull up</div>
                            <div data-k="room" className={styles.roomOutline} style={PRIVATE_OFFICE} />
                            <div data-k="roomTag" className={styles.roomTag} style={{ left: PRIVATE_OFFICE.left + 10, top: PRIVATE_OFFICE.top + 10, transform: "none" }}>Private office · 3 on camera</div>
                            <Sprite k="bob" sheet="bob" x={BOB_PATH[0][0]} y={BOB_PATH[0][1]} frame={FRAME.left} />
                            {PRIVATE_PAIR.map(([x, y, sheet, frame], i) => <Sprite key={i} sheet={sheet} x={x} y={y} frame={frame} />)}
                            {/* "In voice" over each head: Adam, lounge Amelia, the far friend, Bob, then the private office pair */}
                            {Array.from({ length: 6 }, (_, i) => (
                                <div key={i} data-k="voice" className={styles.voice}><i /><i /><i /></div>
                            ))}
                            {PLAZA.map(([x, y, sheet, frame], i) => <Sprite key={i} sheet={sheet} x={x} y={y} frame={frame} />)}
                            {EMOTES.map((e, i) => (
                                <Image key={i} data-k="emote" src={SPRITES[e.kind].src} alt="" width={SPRITES[e.kind].width} height={SPRITES[e.kind].height} unoptimized className={styles.emote} />
                            ))}
                            {Array.from({ length: CONFETTI_COUNT }, (_, i) => <div key={i} data-k="confetti" className={styles.confetti} />)}
                            {LAMPS.map((l) => (
                                <Fragment key={l.name}>
                                    <div data-k="lamp" className={styles.lamp} style={{ left: l.x, top: l.y }} />
                                    <div data-k="lampLabel" className={`${styles.lampLabel} ${l.above ? styles.lampLabelAbove : ""}`} style={{ left: l.x, top: l.y }}>
                                        <i />{l.name} · {l.doing}
                                    </div>
                                </Fragment>
                            ))}
                        </div>
                    </div>
                    <div data-k="den" className={styles.layer}>
                        <video ref={videoRef} className={styles.intro} poster={INTRO_POSTER} muted playsInline preload="none" />
                    </div>
                    <div className={styles.tiles}>
                        {CAMERA_TILES.map((c) => (
                            <div key={c.name} data-k="tile" className={`${styles.tile} ${"speaking" in c ? styles.tileSpeaking : ""} ${"off" in c ? styles.tileOff : ""}`}>
                                {"off" in c ? <Image src={c.src} alt="" width={64} height={64} /> : <Image src={c.src} alt="" fill sizes="180px" />}
                                <b>{c.name}</b>
                            </div>
                        ))}
                    </div>
                    <div data-k="online" className={styles.online}><i />4 online</div>
                    <div data-k="scrim" className={styles.scrim} />
                    <div className={styles.vignette} />
                    <div data-k="grain" className={styles.grain} />
                </div>
            </div>

            <div data-k="title" className={`${styles.copy} ${styles.title}`}>
                <h2 id="walk-in-title">{TITLE} <span className={styles.grad}>{TITLE_ACCENT}</span></h2>
            </div>
            <p data-k="statement" className={`${styles.copy} ${styles.statement}`}><Words text={STATEMENT} k="sw" /></p>
            {BEATS.map((b) => (
                <div key={b.eyebrow} data-k="beat" className={`${styles.copy} ${styles.beat}`}>
                    <p className={styles.eyebrow}>{b.eyebrow}</p>
                    <h3>{b.line1} <br /><span>{b.line2}</span></h3>
                    <p><b>{b.lead}</b> {b.body}</p>
                </div>
            ))}
            <div data-k="presence" className={`${styles.copy} ${styles.presence}`}>
                <p className={styles.eyebrow}>{PRESENCE_EYEBROW}</p>
                <h3><Words text={PRESENCE} k="pw" /></h3>
                <p>{PRESENCE_SUB}</p>
            </div>
            <div data-k="end" className={`${styles.copy} ${styles.end}`}>
                <h3>{END_LINE} <br /><span className={styles.grad}>{END_ACCENT}</span></h3>
                <div data-k="cta" className={styles.cta}>
                    <Link href="/app" data-umami-event="cta_open_room" data-umami-event-location="walk_in" className="wd-landing-btn-primary">Open the room</Link>
                    <a href="#demo" className={styles.link}>Look inside first ›</a>
                </div>
            </div>
        </div>
    );
}
