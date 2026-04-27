"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function VantaBackground({ theme = 'dark' }) {
  const containerRef = useRef(null);
  const vantaRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    import('vanta/dist/vanta.net.min').then((module) => {
      if (cancelled || !containerRef.current) {
        return;
      }

      const VANTA = module.default;

      if (vantaRef.current) {
        vantaRef.current.destroy();
        vantaRef.current = null;
      }

      const isLight = theme === 'light';

      vantaRef.current = VANTA({
        el: containerRef.current,
        THREE,
        backgroundColor: isLight ? 0xf0f5ff : 0x020405,
        color: isLight ? 0xb5c8f5 : 0x292c34,
        points: 16.0,
        maxDistance: 22.0,
        spacing: 18.0,
        showDots: false,
        minHeight: 500.0,
        minWidth: 500.0,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
      });
    });

    return () => {
      cancelled = true;
      if (vantaRef.current) {
        vantaRef.current.destroy();
        vantaRef.current = null;
      }
    };
  }, [theme]);

  return <div ref={containerRef} className="vanta-bg" />;
}
