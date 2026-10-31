import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';
import { CharacterCreationScreen } from '@/common/components/CharacterCreation/CharacterCreationScreen';
import { CharacterType, type CharacterCustomization } from '@/game/character/_types';
import { guestFunnelEvent } from './funnel';
import { Challenge } from './Challenge';
import { guestRequest, GuestRequestError, isGuestGame, type GuestSnapshot } from './session';
import styles from './entry.module.css';

// This is the same App that /app renders, including PhaserGame and AudioChat.
const Platform = dynamic(() => import('@/App'), { ssr: false });
const messages: Record<string, string> = {
    UNAVAILABLE: 'Guest rooms are unavailable right now. Please try again shortly.',
    CHALLENGE_REQUIRED: 'Please complete the security check and try again.',
    ROOM_FULL: 'This room is full. Ask your friend to try again when a place opens.',
    GUEST_CAPACITY: 'All guest places are in use. Please try again shortly.',
    ROOM_CAPACITY: 'All guest rooms are in use. Please try again shortly.',
    RATE_LIMITED: 'Too many attempts. Please wait and try again later.',
    INVITE_UNAVAILABLE: 'This invite has expired or was replaced. Ask your friend for a new link.',
    ROOM_ENDED: 'Your trial room has ended. You can still sign in to save your character and room.',
    SESSION_EXPIRED: 'This guest session is no longer available.',
    SESSION_REVOKED: 'This guest session was removed and can no longer join rooms.',
    ALREADY_IN_ROOM: 'You already have a guest room open. Return to that room to continue.',
    CREATION_PAUSED: 'New guest rooms are paused right now. Please try again later.',
    JOINS_PAUSED: 'Joining guest rooms is paused right now. Please try again later.',
    SESSION_REPLACED: 'Your room is open in another tab. You can continue there.',
    CHARACTER_CHOICE_REQUIRED: 'Your account already has a character. Choose whether to replace it below.',
    WORKSPACE_LIMIT: 'Your account has reached the room limit. You can still save your character.',
};
const describe = (error: unknown) => messages[error instanceof GuestRequestError ? error.code : String(error)] || 'That did not work. Please try again.';

export default function GuestEntry({ embedded = false }: { embedded?: boolean }) {
    const Container = embedded ? "section" : "main";
    const Heading = embedded ? "h2" : "h1";
    const entryClass = embedded ? styles.embedded : styles.entry;
    const { status } = useSession();
    const [ready, setReady] = useState(false);
    const [available, setAvailable] = useState(false);
    const [state, setState] = useState<GuestSnapshot | null>(null);
    const [game, setGame] = useState<GuestSnapshot | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [token, setToken] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [invite, setInvite] = useState('');
    const [save, setSave] = useState(false);
    const [saveRoom, setSaveRoom] = useState(true);
    const [replace, setReplace] = useState(false);
    const [choiceRequired, setChoiceRequired] = useState(false);
    const [deadline, setDeadline] = useState(0);
    const [now, setNow] = useState(Date.now());
    const [copied, setCopied] = useState(false);
    const [people, setPeople] = useState(false);
    const [muted, setMuted] = useState<Set<string>>(new Set());
    const onToken = useCallback((value: string) => setToken(value), []);
    useEffect(() => {
        let active = true;
        const readInvite = () => setInvite(new URLSearchParams(window.location.hash.slice(1)).get('invite') || '');
        readInvite();
        window.addEventListener('hashchange', readInvite);
        void (async () => {
            try {
                const bootstrap = await fetch('/api/guest', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Guest-Request': '1' }, body: JSON.stringify({ action: 'bootstrap' }) });
                if (!bootstrap.ok) throw new GuestRequestError('UNAVAILABLE');
                const config = await fetch('/api/guest').then(r => r.json());
                if (!active) return;
                setAvailable(!!config.enabled);
                if (config.enabled && !isGuestGame()) guestFunnelEvent("entry_viewed");
                try {
                    const draft = await guestRequest({ action: isGuestGame() ? 'resume' : 'inspect' });
                    if (!active) return;
                    setState(draft);
                    if (isGuestGame() && ['active', 'converted'].includes(draft.room.status)) { setGame(draft); setDeadline(Date.now() + draft.room.expiresAt - draft.serverNow); }
                } catch (e) { if (isGuestGame() && active) setError(describe(e)); }
            } catch (e) { if (active) setError(describe(e)); }
            finally { if (active) setReady(true); }
        })();
        const ended = (e: Event) => { setGame(null); setError(describe((e as CustomEvent<string>).detail)); };
        window.addEventListener('guest-ended', ended);
        return () => { active = false; window.removeEventListener('guest-ended', ended); window.removeEventListener('hashchange', readInvite); };
    }, []);
    useEffect(() => {
        if (!game) return;
        let active = true;
        const clock = setInterval(() => setNow(Date.now()), 1000);
        const poll = setInterval(() => {
            void guestRequest({ action: 'inspect' }).then(s => {
                if (!active) return; setState(s);
                if (!['active', 'converted'].includes(s.room.status)) { setGame(null); setError(messages.ROOM_ENDED); }
            }).catch(e => { if (active) { setGame(null); setError(describe(e)); } });
        }, 10000);
        return () => { active = false; clearInterval(clock); clearInterval(poll); };
    }, [game]);
    const admit = async (appearance: CharacterCustomization) => {
        setBusy(true); setError('');
        try {
            await guestRequest(invite ? { action: 'join', invite, appearance } : { action: 'create', appearance }, token);
            window.location.assign('/try?play=1');
        } catch (e) { setError(describe(e)); setToken(''); setAttempt(a => a + 1); }
        finally { setBusy(false); }
    };
    const command = async (action: Record<string, unknown>) => {
        setBusy(true); setError('');
        try { const next = await guestRequest(action); setState(next); return next; }
        catch (e) {
            if (e instanceof GuestRequestError && e.code === 'CHARACTER_CHOICE_REQUIRED') setChoiceRequired(true);
            setError(describe(e));
        } finally { setBusy(false); }
    };
    const claim = async () => {
        const next = await command({ action: 'claim', saveRoom: !!state?.room.canSaveRoom && saveRoom, replaceCharacter: replace });
        if (next) {
            setGame(null);
            // Only a real saved account workspace is persisted, never the guest namespace.
            if (next.room.workspaceId) localStorage.setItem('workdash:defaultWorkspaceId', next.room.workspaceId);
            window.location.assign('/app?mode=world');
        }
    };
    const copyInvite = async () => {
        if (!state?.room.invite) return;
        try { await navigator.clipboard.writeText(`${window.location.origin}/try#invite=${state.room.invite}`); setCopied(true); }
        catch { setError('Your browser could not copy the invite. Try allowing clipboard access.'); }
    };
    const enterSave = () => { guestFunnelEvent('save_intent'); if (status === 'authenticated') setSave(true); else window.location.assign('/login?guest=1'); };
    const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
    if (!ready) return <Container className={entryClass}><p role="status">Getting your visit ready…</p></Container>;
    if (!state && available && !isGuestGame()) return <CharacterCreationScreen
        inline={embedded} mode="create" isLoading={busy} completeDisabled={!!process.env.NEXT_PUBLIC_GUEST_TURNSTILE_SITE_KEY && !token}
        completeLabel={invite ? 'Join your friend' : 'Enter the world'}
        description={embedded ? "Choose your look. You can save it when you sign in." : "Try WorkDash without an account. Walk around and talk with friends for up to 20 minutes. Rooms close after three empty minutes. Sign in to keep your character and room."}
        onComplete={admit} onCancel={() => window.location.assign('/')}
        initialCustomization={{ type: CharacterType.ADULT, bodyId: 1, eyesId: 1, hairstyleId: 1, outfitId: 1 }}
        footer={<><Challenge onToken={onToken} attempt={attempt} />{error && <p role="alert">{error}</p>}</>}
    />;
    return <Container className={game ? styles.world : entryClass}>
        {game && <Platform guest={game} />}
        <section className={game ? styles.toolbar : styles.panel} aria-label="Your guest room">
            <div><Heading>{game ? 'Your guest room' : state ? 'Keep what you made' : 'Try WorkDash'}</Heading>
                <p>{game ? `${state?.participants.length ?? 1}/${state?.room.capacity ?? 8} here · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} left` : state ? 'Save your character and make this room yours.' : 'Walk around the world and talk with friends, without an account.'}</p>
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
            {notice && <p role="status">{notice}</p>}
            {!state && !available && <p>Guest rooms are not open right now.</p>}
            {!state && available && <a href="/try">Create a guest room</a>}
            {state && <div className={styles.actions}>
                {game && state.room.invite && <button onClick={copyInvite}>{copied ? 'Invite copied' : 'Invite a friend'}</button>}
                {game && <button onClick={() => setPeople(v => !v)}>People</button>}
                {!save && <button className={styles.primary} onClick={enterSave}>{status === 'authenticated' ? 'Save character & room' : 'Sign in to save'}</button>}
                {!game && !save && available && ['active', 'converted'].includes(state.room.status) && <button onClick={() => window.location.assign('/try?play=1')}>Return to room</button>}
                {game && <button disabled={busy} onClick={async () => { const s = await command({ action: 'leave' }); if (s) { setGame(null); setNotice('You left the room. Your draft stays available for 24 hours after the trial ends.'); } }}>Leave</button>}
            </div>}
            {people && game && state && <div className={styles.people}>
                {state.participants.map(person => <div key={person.id}>
                    <span>{person.id === state.selfId ? 'You' : `Guest ${person.id.slice(0, 4)}`}</span>
                    {person.id !== state.selfId && <>
                        <button onClick={async () => {
                            const next = new Set(muted); const mute = !next.has(person.id);
                            if (mute) next.add(person.id); else next.delete(person.id);
                            const { AudioChat } = await import('@/communication/audioChat/audioChat');
                            AudioChat.getInstance().setGuestMuted(`guest:${person.id}`, mute); setMuted(next);
                        }}>{muted.has(person.id) ? 'Unmute locally' : 'Mute locally'}</button>
                        <button disabled={busy} onClick={async () => { if (await command({ action: 'report', participantId: person.id, reason: 'disruptive' })) setNotice('Report received. You can leave the room at any time.'); }}>Report</button>
                        {state.room.host && <button disabled={busy} onClick={() => void command({ action: 'kick', participantId: person.id })}>Remove</button>}
                    </>}
                </div>)}
                {state.room.host && <button disabled={busy} onClick={async () => { if (await command({ action: 'rotate' })) { setCopied(false); setNotice('Old invite revoked. Copy a new invite to share.'); } }}>Replace invite link</button>}
            </div>}
            {(save || (!game && status === 'authenticated' && state)) && state && <div className={styles.save}>
                {state.room.canSaveRoom && <label><input type="checkbox" checked={saveRoom} onChange={e => setSaveRoom(e.target.checked)} /> Save this room to my account</label>}
                {choiceRequired && <label><input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} /> Replace my existing character with this one</label>}
                <button className={styles.primary} disabled={busy || (choiceRequired && !replace)} onClick={claim}>{busy ? 'Saving…' : 'Save and continue'}</button>
                {choiceRequired && <a href="/app">Keep my existing character</a>}
            </div>}
            {!game && <p className={styles.muted}>{state ? 'Your draft is kept for 24 hours after the trial ends. Saving does not extend the temporary room or admit guests into your account workspace.' : <a href="/login">Sign in to WorkDash</a>}</p>}
            {game && <p className={styles.hint}>Move with WASD, arrow keys or touch. Turn on your microphone when you want to talk. Friends hear you in the same area.</p>}
        </section>
    </Container>;
}
