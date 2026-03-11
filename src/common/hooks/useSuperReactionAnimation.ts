import { useEffect, useRef, useState } from 'react';
import { getSuperReactionAnimationUrl, isSuperReactionEmoji } from '@/common/config/superReactionAnimations';

const MAX_CACHE_SIZE = 50;
const cache = typeof window !== 'undefined'
    ? new Map<string, Promise<object>>()
    : null;

function evictIfNeeded() {
    if (!cache || cache.size <= MAX_CACHE_SIZE) return;
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
}

function fetchAnimation(url: string): Promise<object> {
    if (!cache) return Promise.reject(new Error('SSR'));
    const cached = cache.get(url);
    if (cached) return cached;
    const promise = fetch(url).then((res) => res.json() as Promise<object>);
    cache.set(url, promise);
    evictIfNeeded();
    return promise;
}

/**
 * lottie-web mutates animationData in-place during loadAnimation()
 * (adds `completed`, `__used` flags, converts relative paths to absolute).
 * Passing the same cached reference on remount feeds corrupted data.
 * Deep-clone once per component mount so each Lottie instance gets a fresh copy.
 */
function cloneAnimationData(data: object): object {
    return JSON.parse(JSON.stringify(data));
}

export function useSuperReactionAnimation(emoji: string): object | null {
    const isSuper = isSuperReactionEmoji(emoji);
    const [animationData, setAnimationData] = useState<object | null>(null);
    const mountId = useRef(0);

    useEffect(() => {
        if (!isSuper) return;
        const id = ++mountId.current;
        const url = getSuperReactionAnimationUrl(emoji);
        fetchAnimation(url)
            .then((data) => {
                if (id !== mountId.current) return;
                setAnimationData(cloneAnimationData(data));
            })
            .catch(() => {});
        return () => { mountId.current++; };
    }, [emoji, isSuper]);

    return isSuper ? animationData : null;
}
