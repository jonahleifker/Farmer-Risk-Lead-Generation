'use client';

import { useState, useEffect, useRef } from 'react';

interface AnimatedNumberProps {
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    duration?: number;
    className?: string;
    style?: React.CSSProperties;
    color?: string;
}

function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function AnimatedNumber({
    value,
    prefix = '',
    suffix = '',
    decimals = 2,
    duration = 800,
    className,
    style,
    color,
}: AnimatedNumberProps) {
    const [display, setDisplay] = useState('0');
    const prevValue = useRef(0);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const startValue = prevValue.current;
        const endValue = value;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutExpo(progress);
            const current = startValue + (endValue - startValue) * easedProgress;

            const abs = Math.abs(current);
            let formatted: string;
            if (abs >= 1000000) {
                formatted = `${current < 0 ? '-' : ''}${(abs / 1000000).toFixed(2)}M`;
            } else if (abs >= 10000) {
                formatted = `${current < 0 ? '-' : ''}${(abs / 1000).toFixed(1)}K`;
            } else {
                formatted = `${current < 0 ? '-' : ''}${abs.toFixed(decimals)}`;
            }

            setDisplay(formatted);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                prevValue.current = endValue;
            }
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [value, duration, decimals]);

    return (
        <span className={className} style={{ ...style, color, transition: 'color 0.3s' }}>
            {prefix}{display}{suffix}
        </span>
    );
}
