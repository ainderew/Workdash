import { useCallback, useRef } from 'react';
import { getSuperReactionAnimationUrl } from '@/common/config/superReactionAnimations';

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

export function useSuperReactionAnimation(emoji: string) {
    const animationDataRef = useRef<object | null>(null);

    const preload = useCallback(() => {
        const url = getSuperReactionAnimationUrl(emoji);
        fetchAnimation(url)
            .then((data) => {
                animationDataRef.current = data;
            })
            .catch(() => {});
    }, [emoji]);

    const getAnimationData = useCallback((): object | null => {
        return animationDataRef.current;
    }, []);

    return { preload, getAnimationData };
}
