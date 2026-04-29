'use client';

import { useRef, useEffect } from 'react';
import H5AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

interface AudioPlayerProps {
    src: string;
    title: string;
    coverUrl?: string;
    duration?: number;
    inline?: boolean;
    onHeartbeat?: (position: number, sessionDuration: number, completed?: boolean, isSessionEnd?: boolean) => void;
    onComplete?: () => void;
}

export default function AudioPlayer({
    src,
    title,
    coverUrl,
    duration: backendDuration,
    inline,
    onHeartbeat,
    onComplete,
}: AudioPlayerProps) {
    const playerRef = useRef<any>(null);
    const sessionStartRef = useRef(0);
    const lastEmitTimeRef = useRef(0);

    useEffect(() => {
        const audio: HTMLAudioElement | undefined = playerRef.current?.audio?.current;
        if (!audio) return;

        let fixPending = false;

        const fixDuration = () => {
            if (audio.duration === Infinity || isNaN(audio.duration)) {
                fixPending = true;
                audio.currentTime = 1e101;
            }
        };
        const seekBack = () => {
            if (fixPending) {
                fixPending = false;
                audio.currentTime = 0;
            }
        };

        audio.addEventListener('loadedmetadata', fixDuration);
        audio.addEventListener('seeked', seekBack);
        return () => {
            audio.removeEventListener('loadedmetadata', fixDuration);
            audio.removeEventListener('seeked', seekBack);
        };
    }, [src]);

    const flushSession = (completed: boolean = false, currentTime: number = 0) => {
        if (sessionStartRef.current === 0) return;
        
        const sessionDur = (Date.now() - sessionStartRef.current) / 1000;
        if (sessionDur >= 2 || completed) { 
            const pos = Number.isFinite(currentTime) ? currentTime : 0;
            if (onHeartbeat) onHeartbeat(pos, sessionDur, completed, true);
        }
        sessionStartRef.current = 0;
        lastEmitTimeRef.current = 0;
    };

    const handleListen = (e: any) => {
        const currentTime = e.target.currentTime;
        
        if (sessionStartRef.current > 0 && Math.round(currentTime) > 0 && Math.round(currentTime) % 10 === 0) {
            // Prevent duplicate emission at the exact same 10s boundary
            if (Math.round(currentTime) !== lastEmitTimeRef.current) {
                const sessionDur = (Date.now() - sessionStartRef.current) / 1000;
                if (sessionDur >= 5) {
                    const pos = Number.isFinite(currentTime) ? currentTime : 0;
                    if (onHeartbeat) onHeartbeat(pos, sessionDur, false);
                    // Do NOT reset sessionStartRef — it must stay at play start for accurate total duration
                    lastEmitTimeRef.current = Math.round(currentTime);
                }
            }
        }
    };

    const handlePlay = () => {
        sessionStartRef.current = Date.now();
    };

    const handlePause = (e: any) => {
        // HTML5 audio fires 'pause' BEFORE 'ended' when track finishes.
        // Skip flush here so handleEnded can send the completed heartbeat.
        if (e.target.ended) return;
        flushSession(false, e.target.currentTime);
    };

    const handleEnded = (e: any) => {
        const currentTime = e.target.currentTime;
        if (sessionStartRef.current > 0) {
            flushSession(true, currentTime);
        } else {
            // Session already flushed (e.g. by pause) — still send completed heartbeat
            const pos = Number.isFinite(currentTime) ? currentTime : 0;
            if (onHeartbeat) onHeartbeat(pos, 0, true);
        }
        onComplete?.();
    };

    useEffect(() => {
        return () => {
            flushSession(false);
        };
    }, []);

    if (!src) return null;

    return (
        <div className={`audio-player${inline ? ' audio-player-inline' : ''}`}>
            <div className="player-info" style={{ minWidth: '180px', flexShrink: 0 }}>
                {coverUrl && (
                    <img src={coverUrl} alt={title} className="player-cover" />
                )}
                <span className="player-title">{title}</span>
            </div>

            <H5AudioPlayer
                ref={playerRef}
                src={src}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnded={handleEnded}
                onListen={handleListen}
                listenInterval={1000}
                customAdditionalControls={[]}
            />
        </div>
    );
}
