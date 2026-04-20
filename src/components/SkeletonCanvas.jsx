import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { drawSkeleton } from '../utils/biomechanics';

export default function SkeletonCanvas({ recording, onFrameChange }) {
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    const frames = recording?.frames || [];
    const totalFrames = frames.length;

    const drawFrame = useCallback((frameIdx) => {
        const canvas = canvasRef.current;
        if (!canvas || !frames[frameIdx]) return;

        const ctx = canvas.getContext('2d');
        const frame = frames[frameIdx];
        drawSkeleton(ctx, frame.raw_landmarks, frame.error_flags, canvas.width, canvas.height);
    }, [frames]);

    // Draw current frame
    useEffect(() => {
        drawFrame(currentFrame);
        if (onFrameChange && frames[currentFrame]) {
            onFrameChange(currentFrame, frames[currentFrame]);
        }
    }, [currentFrame, drawFrame, onFrameChange, frames]);

    // Playback loop
    useEffect(() => {
        if (!isPlaying) {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            return;
        }

        let lastTime = 0;
        const interval = 1000 / (30 * playbackSpeed); // 30fps base

        const animate = (timestamp) => {
            if (timestamp - lastTime >= interval) {
                lastTime = timestamp;
                setCurrentFrame((prev) => {
                    if (prev >= totalFrames - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }
            animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);
        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [isPlaying, playbackSpeed, totalFrames]);

    const handleSlider = (e) => {
        const frame = parseInt(e.target.value, 10);
        setCurrentFrame(frame);
        setIsPlaying(false);
    };

    const reset = () => {
        setCurrentFrame(0);
        setIsPlaying(false);
    };

    const stepBack = () => {
        setIsPlaying(false);
        setCurrentFrame((p) => Math.max(0, p - 1));
    };

    const stepForward = () => {
        setIsPlaying(false);
        setCurrentFrame((p) => Math.min(totalFrames - 1, p + 1));
    };

    const currentFrameData = frames[currentFrame];
    const timeStr = currentFrameData
        ? `${String(Math.floor(currentFrame / 30 / 60)).padStart(2, '0')}:${String(Math.floor((currentFrame / 30) % 60)).padStart(2, '0')}`
        : '00:00';

    return (
        <div className="skeleton-canvas-container" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Canvas */}
            <div style={{ padding: 16, display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={500}
                    style={{ borderRadius: 8 }}
                />
            </div>

            {/* Controls */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border-glass)' }}>
                {/* Slider */}
                <input
                    type="range"
                    min={0}
                    max={Math.max(0, totalFrames - 1)}
                    value={currentFrame}
                    onChange={handleSlider}
                    className="playback-slider"
                    style={{ marginBottom: 12 }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Time */}
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                        {timeStr} / Frame {currentFrame + 1} of {totalFrames}
                    </span>

                    {/* Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button onClick={reset} className="btn-ghost" style={{ padding: 6 }} title="Reset">
                            <RotateCcw size={16} />
                        </button>
                        <button onClick={stepBack} className="btn-ghost" style={{ padding: 6 }} title="Step Back">
                            <SkipBack size={16} />
                        </button>
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="btn-primary"
                            style={{ padding: '8px 16px', borderRadius: 10 }}
                        >
                            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button onClick={stepForward} className="btn-ghost" style={{ padding: 6 }} title="Step Forward">
                            <SkipForward size={16} />
                        </button>
                    </div>

                    {/* Speed */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {[0.5, 1, 2].map((s) => (
                            <button
                                key={s}
                                onClick={() => setPlaybackSpeed(s)}
                                className="btn-ghost"
                                style={{
                                    padding: '4px 8px', fontSize: 11, fontWeight: 600,
                                    background: playbackSpeed === s ? 'rgba(34, 211, 238, 0.12)' : 'transparent',
                                }}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                </div>

                {/* Current state info */}
                {currentFrameData && (
                    <div style={{
                        display: 'flex', gap: 16, marginTop: 12, paddingTop: 12,
                        borderTop: '1px solid var(--color-border-glass)',
                        fontSize: 12, color: 'var(--color-text-secondary)',
                    }}>
                        <span>Rep: <strong style={{ color: 'var(--color-accent-cyan)' }}>{currentFrameData.rep_count}</strong></span>
                        <span>State: <strong style={{ color: 'var(--color-accent-teal)' }}>{currentFrameData.state}</strong></span>
                        <span>SEA: <strong style={{ color: 'var(--color-accent-violet)' }}>{currentFrameData.metrics?.SEA?.toFixed(1)}°</strong></span>
                    </div>
                )}
            </div>
        </div>
    );
}
