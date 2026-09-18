import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Upload } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   MaterialDNA AI — Welcome Page (SIH 2026 Edition)
   
   Architecture:
     LAYER 0  —  Solid background
     LAYER 1  —  SVG canvas with physical material animation
     LAYER 2  —  Subtle atmospheric vignette
     LAYER 3  —  Hero content (text, CTA, ecosystem)
   ═══════════════════════════════════════════════════════════════ */

/* ── SVG Gradient Definitions (shared) ─────────────────── */
const SvgDefs = () => (
  <defs>
    {/* Brushed steel body */}
    <linearGradient id="g-steel" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0%" stopColor="#D0D4D1" />
      <stop offset="30%" stopColor="#BCC1BD" />
      <stop offset="65%" stopColor="#A8AEA9" />
      <stop offset="100%" stopColor="#929892" />
    </linearGradient>

    {/* Steel highlight (top face) */}
    <linearGradient id="g-steel-hi" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#E4E7E5" />
      <stop offset="100%" stopColor="#CDD1CD" />
    </linearGradient>

    {/* Dark metal */}
    <linearGradient id="g-dark" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stopColor="#868C88" />
      <stop offset="55%" stopColor="#6B716D" />
      <stop offset="100%" stopColor="#525855" />
    </linearGradient>

    {/* Darker steel variant */}
    <linearGradient id="g-steel-dark" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stopColor="#B0B5B2" />
      <stop offset="50%" stopColor="#9A9F9C" />
      <stop offset="100%" stopColor="#828886" />
    </linearGradient>

    {/* Copper accent */}
    <linearGradient id="g-copper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#C8A882" />
      <stop offset="50%" stopColor="#B08A68" />
      <stop offset="100%" stopColor="#8B6B4A" />
    </linearGradient>

    {/* Subtle thread pattern */}
    <pattern id="thread" patternUnits="userSpaceOnUse" width="14" height="2.8" patternTransform="rotate(0)">
      <line x1="0" y1="1.4" x2="14" y2="1.4" stroke="rgba(0,0,0,0.06)" strokeWidth="0.6" />
    </pattern>
  </defs>
);

/* ═══════════════════════════════════════════════════════════════
   INDIVIDUAL SVG MATERIAL COMPONENTS
   Realistic, minimal, physically believable
   ═══════════════════════════════════════════════════════════════ */

/* ── Hex Bolt (isometric, with thread detail) ───────────── */
const HexBolt = ({ size = 64 }: { size?: number }) => (
  <svg viewBox="0 0 60 100" width={size} height={size * 1.667}>
    {/* Shank */}
    <rect x="23" y="34" width="14" height="54" rx="1.2" fill="url(#g-steel)" />
    <rect x="23" y="34" width="14" height="54" rx="1.2" fill="url(#thread)" />
    {/* Shank left highlight */}
    <rect x="23" y="34" width="3.5" height="54" rx="1" fill="rgba(255,255,255,0.10)" />
    {/* Head — hex (isometric projection) */}
    <polygon points="30,2 48,12 48,28 30,38 12,28 12,12" fill="url(#g-steel)" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
    {/* Head top face */}
    <polygon points="30,2 45,10 45,22 30,30 15,22 15,10" fill="url(#g-steel-hi)" />
    {/* Head edge highlights */}
    <line x1="30" y1="2" x2="15" y2="10" stroke="rgba(255,255,255,0.22)" strokeWidth="0.5" />
    <line x1="30" y1="2" x2="45" y2="10" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />
    {/* Socket circle on top */}
    <circle cx="30" cy="16" r="5.5" fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="0.8" />
    <circle cx="30" cy="16" r="4" fill="rgba(0,0,0,0.03)" />
    {/* Tip chamfer */}
    <path d="M23,88 L24,90 L36,90 L37,88" fill="rgba(0,0,0,0.05)" />
  </svg>
);

/* ── Hex Nut (isometric) ────────────────────────────────── */
const HexNut = ({ size = 38 }: { size?: number }) => (
  <svg viewBox="0 0 50 40" width={size} height={size * 0.8}>
    {/* Body */}
    <polygon points="25,1 44,10 44,28 25,37 6,28 6,10" fill="url(#g-steel)" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
    {/* Top face */}
    <polygon points="25,1 41,9 41,20 25,28 9,20 9,9" fill="url(#g-steel-hi)" />
    {/* Center hole */}
    <ellipse cx="25" cy="14" rx="7.5" ry="5.5" fill="url(#g-dark)" />
    <ellipse cx="25" cy="14" rx="6" ry="4.2" fill="rgba(245,246,243,0.22)" />
  </svg>
);

/* ── Washer (top view) ──────────────────────────────────── */
const Washer = ({ size = 30 }: { size?: number }) => (
  <svg viewBox="0 0 30 30" width={size} height={size}>
    <circle cx="15" cy="15" r="13" fill="url(#g-steel)" stroke="rgba(0,0,0,0.06)" strokeWidth="0.4" />
    <circle cx="15" cy="15" r="12" fill="url(#g-steel-hi)" />
    <circle cx="15" cy="15" r="5.5" fill="#E8EAE7" />
    <circle cx="15" cy="15" r="5.5" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.4" />
    {/* Subtle radial highlight */}
    <circle cx="13" cy="13" r="5" fill="rgba(255,255,255,0.08)" />
  </svg>
);

/* ── Ball Bearing (top view) ────────────────────────────── */
const Bearing = ({ size = 52 }: { size?: number }) => (
  <svg viewBox="0 0 50 50" width={size} height={size}>
    <circle cx="25" cy="25" r="22" fill="url(#g-steel)" />
    <circle cx="25" cy="25" r="22" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
    <circle cx="25" cy="25" r="16.5" fill="url(#g-dark)" />
    {/* Balls */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
      const x = 25 + 16.5 * Math.cos((angle * Math.PI) / 180);
      const y = 25 + 16.5 * Math.sin((angle * Math.PI) / 180);
      return <circle key={angle} cx={x} cy={y} r="2.6" fill="url(#g-steel-hi)" stroke="rgba(0,0,0,0.08)" strokeWidth="0.3" />;
    })}
    <circle cx="25" cy="25" r="10" fill="url(#g-steel)" />
    <circle cx="25" cy="25" r="6.5" fill="url(#g-dark)" opacity="0.6" />
    <circle cx="22" cy="22" r="2.5" fill="rgba(255,255,255,0.08)" />
  </svg>
);

/* ── Pipe Elbow (side, thick stroke) ───────────────────── */
const PipeElbow = ({ size = 42 }: { size?: number }) => (
  <svg viewBox="0 0 50 50" width={size} height={size}>
    <path d="M8,8 L8,28 Q8,42 22,42 L42,42" fill="none" stroke="url(#g-steel)" strokeWidth="9" strokeLinecap="round" />
    <path d="M8,8 L8,28 Q8,42 22,42 L42,42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/* ── Gate Valve (simplified side view) ──────────────────── */
const Valve = ({ size = 52 }: { size?: number }) => (
  <svg viewBox="0 0 60 72" width={size} height={size * 1.2}>
    {/* Stem */}
    <rect x="27" y="2" width="6" height="20" rx="1" fill="url(#g-dark)" />
    {/* Handwheel */}
    <ellipse cx="30" cy="5" rx="14" ry="4" fill="url(#g-steel)" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
    <ellipse cx="30" cy="5" rx="11" ry="2.8" fill="url(#g-steel-hi)" />
    {/* Bonnet */}
    <rect x="23" y="20" width="14" height="10" rx="2" fill="url(#g-steel)" stroke="rgba(0,0,0,0.05)" strokeWidth="0.4" />
    {/* Body */}
    <path d="M8,36 L22,30 L38,30 L52,36 L52,52 L38,58 L22,58 L8,52 Z" fill="url(#g-steel)" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
    {/* Flanges */}
    <rect x="1" y="38" width="9" height="16" rx="1" fill="url(#g-steel-dark)" stroke="rgba(0,0,0,0.06)" strokeWidth="0.4" />
    <rect x="50" y="38" width="9" height="16" rx="1" fill="url(#g-steel-dark)" stroke="rgba(0,0,0,0.06)" strokeWidth="0.4" />
  </svg>
);

/* ── Gasket Ring ────────────────────────────────────────── */
const Gasket = ({ size = 36 }: { size?: number }) => (
  <svg viewBox="0 0 36 36" width={size} height={size}>
    <circle cx="18" cy="18" r="16" fill="url(#g-dark)" opacity="0.75" />
    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.4" />
    <circle cx="18" cy="18" r="9" fill="#E8EAE7" />
    <circle cx="18" cy="18" r="9" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="0.4" />
  </svg>
);

/* ── Spring Washer (Belleville) ─────────────────────────── */
const SpringWasher = ({ size = 28 }: { size?: number }) => (
  <svg viewBox="0 0 30 14" width={size} height={size * 0.467}>
    <ellipse cx="15" cy="7" rx="13" ry="5.5" fill="none" stroke="url(#g-steel)" strokeWidth="2.5" />
    <ellipse cx="15" cy="6" rx="10" ry="3.5" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8" />
  </svg>
);

/* ── Industrial Flange ─────────────────────────────────── */
const Flange = ({ size = 44 }: { size?: number }) => (
  <svg viewBox="0 0 50 50" width={size} height={size}>
    <circle cx="25" cy="25" r="22" fill="url(#g-steel)" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
    <circle cx="25" cy="25" r="21" fill="url(#g-steel-hi)" />
    <circle cx="25" cy="25" r="14" fill="url(#g-dark)" />
    <circle cx="25" cy="25" r="9" fill="#E8EAE7" stroke="rgba(0,0,0,0.06)" strokeWidth="0.4" />
    {[0, 60, 120, 180, 240, 300].map(deg => {
      const rad = (deg * Math.PI) / 180;
      const x = 25 + 17.5 * Math.cos(rad);
      const y = 25 + 17.5 * Math.sin(rad);
      return <circle key={deg} cx={x} cy={y} r="2.2" fill="url(#g-dark)" stroke="rgba(0,0,0,0.1)" strokeWidth="0.3" />;
    })}
  </svg>
);

/* ── Precision Spur Gear ────────────────────────────────── */
const Gear = ({ size = 44 }: { size?: number }) => (
  <svg viewBox="0 0 50 50" width={size} height={size}>
    <g transform="translate(25,25)">
      {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
        <rect key={deg} x="-3" y="-22" width="6" height="5" rx="1" fill="url(#g-steel)" transform={`rotate(${deg})`} />
      ))}
      <circle cx="0" cy="0" r="19" fill="url(#g-steel)" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
      <circle cx="0" cy="0" r="17.5" fill="url(#g-steel-hi)" />
      <circle cx="0" cy="0" r="11" fill="url(#g-dark)" opacity="0.8" />
      <circle cx="0" cy="0" r="6" fill="#E8EAE7" stroke="rgba(0,0,0,0.06)" strokeWidth="0.4" />
      <rect x="-1.2" y="-7.5" width="2.4" height="3" fill="url(#g-steel-dark)" />
    </g>
  </svg>
);

/* ═══════════════════════════════════════════════════════════════
   ANIMATION SCENE — Full Screen Physical Materials Canvas
   Populates every nook, side, center, left, right, top, and bottom
   ═══════════════════════════════════════════════════════════════ */

interface AnimObj {
  id: string;
  Component: React.FC<{ size?: number }>;
  size: number;
  x: number;   // percent of viewport width (0 - 100)
  y: number;   // percent of viewport height (0 - 100)
  opacity: number;
  blur: number;
  delay: number;
  traj: 't1' | 't2' | 't3' | 't4';
}

const ALL_MATERIAL_OBJECTS: AnimObj[] = [
  // ── TOP EDGE & UPPER CORNERS ──
  { id: 't1', Component: Gear, size: 34, x: 2, y: 4, opacity: 0.22, blur: 1.5, delay: 0.5, traj: 't1' },
  { id: 't2', Component: HexNut, size: 24, x: 18, y: 3, opacity: 0.25, blur: 1.2, delay: 2, traj: 't2' },
  { id: 't3', Component: Bearing, size: 30, x: 34, y: 4, opacity: 0.20, blur: 2, delay: 4, traj: 't3' },
  { id: 't4', Component: Washer, size: 22, x: 50, y: 3, opacity: 0.24, blur: 1.5, delay: 1, traj: 't4' },
  { id: 't5', Component: SpringWasher, size: 24, x: 66, y: 4, opacity: 0.22, blur: 1.8, delay: 3.5, traj: 't1' },
  { id: 't6', Component: HexBolt, size: 28, x: 82, y: 3, opacity: 0.22, blur: 1.5, delay: 1.5, traj: 't2' },
  { id: 't7', Component: Valve, size: 36, x: 95, y: 4, opacity: 0.20, blur: 2, delay: 5, traj: 't3' },

  // ── LEFT SIDE & NOOKS (x: 2% to 28%) ──
  { id: 'l1', Component: Flange, size: 42, x: 3, y: 16, opacity: 0.24, blur: 1.2, delay: 0, traj: 't1' },
  { id: 'l2', Component: PipeElbow, size: 36, x: 15, y: 22, opacity: 0.22, blur: 1.5, delay: 3, traj: 't2' },
  { id: 'l3', Component: Gear, size: 38, x: 25, y: 15, opacity: 0.20, blur: 2, delay: 1.2, traj: 't3' },
  { id: 'l4', Component: HexBolt, size: 32, x: 2, y: 34, opacity: 0.24, blur: 1.5, delay: 4.5, traj: 't4' },
  { id: 'l5', Component: Bearing, size: 36, x: 16, y: 38, opacity: 0.26, blur: 1.0, delay: 2.2, traj: 't1' },
  { id: 'l6', Component: HexNut, size: 28, x: 26, y: 42, opacity: 0.25, blur: 1.2, delay: 5.5, traj: 't2' },
  { id: 'l7', Component: Valve, size: 40, x: 4, y: 52, opacity: 0.22, blur: 1.8, delay: 1.8, traj: 't3' },
  { id: 'l8', Component: SpringWasher, size: 26, x: 18, y: 56, opacity: 0.24, blur: 1.5, delay: 3.8, traj: 't4' },
  { id: 'l9', Component: Gasket, size: 28, x: 28, y: 62, opacity: 0.20, blur: 2.2, delay: 0.8, traj: 't1' },
  { id: 'l10', Component: PipeElbow, size: 34, x: 3, y: 72, opacity: 0.23, blur: 1.5, delay: 4.2, traj: 't2' },
  { id: 'l11', Component: Washer, size: 24, x: 15, y: 76, opacity: 0.28, blur: 1.0, delay: 2.8, traj: 't3' },
  { id: 'l12', Component: Flange, size: 38, x: 25, y: 80, opacity: 0.22, blur: 1.8, delay: 1.5, traj: 't4' },

  // ── CENTER NOOKS (behind headline, eyebrow & buttons) ──
  { id: 'c1', Component: Gear, size: 32, x: 38, y: 18, opacity: 0.18, blur: 2.2, delay: 2.5, traj: 't2' },
  { id: 'c2', Component: Valve, size: 34, x: 49, y: 14, opacity: 0.17, blur: 2.5, delay: 1.0, traj: 't3' },
  { id: 'c3', Component: Bearing, size: 30, x: 61, y: 18, opacity: 0.19, blur: 2.0, delay: 4.8, traj: 't4' },
  { id: 'c4', Component: HexBolt, size: 28, x: 36, y: 35, opacity: 0.18, blur: 2.5, delay: 3.2, traj: 't1' },
  { id: 'c5', Component: Gasket, size: 30, x: 63, y: 34, opacity: 0.18, blur: 2.5, delay: 5.2, traj: 't2' },
  { id: 'c6', Component: Flange, size: 34, x: 39, y: 52, opacity: 0.18, blur: 2.2, delay: 1.6, traj: 't3' },
  { id: 'c7', Component: PipeElbow, size: 32, x: 60, y: 52, opacity: 0.17, blur: 2.4, delay: 3.6, traj: 't4' },
  { id: 'c8', Component: HexNut, size: 26, x: 37, y: 69, opacity: 0.20, blur: 1.8, delay: 0.4, traj: 't1' },
  { id: 'c9', Component: Gear, size: 34, x: 49, y: 72, opacity: 0.19, blur: 2.0, delay: 2.6, traj: 't2' },
  { id: 'c10', Component: SpringWasher, size: 24, x: 62, y: 69, opacity: 0.18, blur: 2.2, delay: 4.4, traj: 't3' },

  // ── RIGHT SIDE & NOOKS (x: 70% to 98%) ──
  { id: 'r1', Component: Flange, size: 40, x: 74, y: 15, opacity: 0.22, blur: 1.5, delay: 0.6, traj: 't1' },
  { id: 'r2', Component: Valve, size: 42, x: 86, y: 18, opacity: 0.24, blur: 1.2, delay: 2.4, traj: 't2' },
  { id: 'r3', Component: HexBolt, size: 34, x: 96, y: 16, opacity: 0.25, blur: 1.0, delay: 4.6, traj: 't3' },
  { id: 'r4', Component: PipeElbow, size: 36, x: 72, y: 34, opacity: 0.22, blur: 1.8, delay: 1.4, traj: 't4' },
  { id: 'r5', Component: Bearing, size: 40, x: 85, y: 36, opacity: 0.26, blur: 1.0, delay: 3.4, traj: 't1' },
  { id: 'r6', Component: Washer, size: 24, x: 95, y: 34, opacity: 0.28, blur: 0.8, delay: 5.0, traj: 't2' },
  { id: 'r7', Component: Gear, size: 40, x: 73, y: 53, opacity: 0.24, blur: 1.2, delay: 1.8, traj: 't3' },
  { id: 'r8', Component: HexNut, size: 28, x: 86, y: 55, opacity: 0.26, blur: 1.0, delay: 3.8, traj: 't4' },
  { id: 'r9', Component: Gasket, size: 30, x: 96, y: 53, opacity: 0.20, blur: 2.0, delay: 0.2, traj: 't1' },
  { id: 'r10', Component: Valve, size: 38, x: 72, y: 73, opacity: 0.22, blur: 1.8, delay: 2.2, traj: 't2' },
  { id: 'r11', Component: Flange, size: 36, x: 85, y: 75, opacity: 0.24, blur: 1.5, delay: 4.2, traj: 't3' },
  { id: 'r12', Component: SpringWasher, size: 24, x: 95, y: 73, opacity: 0.22, blur: 1.8, delay: 1.0, traj: 't4' },

  // ── BOTTOM EDGE & LOWER CORNERS ──
  { id: 'b1', Component: Bearing, size: 32, x: 3, y: 91, opacity: 0.24, blur: 1.5, delay: 0.4, traj: 't1' },
  { id: 'b2', Component: HexBolt, size: 28, x: 19, y: 92, opacity: 0.26, blur: 1.2, delay: 2.8, traj: 't2' },
  { id: 'b3', Component: Gasket, size: 26, x: 35, y: 91, opacity: 0.20, blur: 2.0, delay: 5.0, traj: 't3' },
  { id: 'b4', Component: Washer, size: 22, x: 50, y: 92, opacity: 0.25, blur: 1.2, delay: 1.4, traj: 't4' },
  { id: 'b5', Component: HexNut, size: 26, x: 65, y: 91, opacity: 0.26, blur: 1.0, delay: 3.6, traj: 't1' },
  { id: 'b6', Component: PipeElbow, size: 32, x: 81, y: 92, opacity: 0.22, blur: 1.8, delay: 0.8, traj: 't2' },
  { id: 'b7', Component: Gear, size: 36, x: 94, y: 91, opacity: 0.24, blur: 1.4, delay: 4.0, traj: 't3' },
];

/* ── Animation Canvas Component ────────────────────────── */
function MaterialAnimationCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setTimeout(() => setMounted(true), 80);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="welcome-anim" ref={canvasRef} aria-hidden="true">
      {/* Shared SVG defs (gradients, patterns) */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <SvgDefs />
      </svg>

      {/* ── LEFT Convergence Group: Pipe Elbow + Valve + Flange → Unified Flange ── */}
      <div className={`conv-group conv-group--left ${mounted ? 'conv-group--active' : ''}`}>
        <div className="conv-bolt conv-bolt--a">
          <PipeElbow size={46} />
        </div>
        <div className="conv-bolt conv-bolt--b">
          <Valve size={44} />
        </div>
        <div className="conv-bolt conv-bolt--c">
          <Flange size={42} />
        </div>
        <div className="conv-bolt conv-bolt--result">
          <Flange size={54} />
          <div className="conv-pulse-ring" />
        </div>
      </div>

      {/* ── RIGHT Convergence Group: Hex Bolt + Nut + Bearing → Precision Gear ── */}
      <div className={`conv-group conv-group--right ${mounted ? 'conv-group--active' : ''}`}>
        <div className="conv-bolt conv-bolt--a">
          <HexBolt size={48} />
        </div>
        <div className="conv-bolt conv-bolt--b">
          <HexNut size={42} />
        </div>
        <div className="conv-bolt conv-bolt--c">
          <Bearing size={40} />
        </div>
        <div className="conv-bolt conv-bolt--result">
          <Gear size={54} />
          <div className="conv-pulse-ring" />
        </div>
      </div>

      {/* ── All Sides, Nooks & Center Ambient Industrial Materials ── */}
      {ALL_MATERIAL_OBJECTS.map(obj => (
        <div
          key={obj.id}
          className={`amb-obj amb-obj--${obj.traj} ${mounted ? 'amb-obj--visible' : ''}`}
          style={{
            left: `${obj.x}%`,
            top: `${obj.y}%`,
            filter: `blur(${obj.blur}px) drop-shadow(0 2px 6px rgba(0,0,0,0.05))`,
            animationDelay: `${obj.delay}s`,
            '--amb-opacity': obj.opacity,
          } as React.CSSProperties}
        >
          <obj.Component size={obj.size} />
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WELCOME PAGE — Composed Scene
   ═══════════════════════════════════════════════════════════════ */

export default function Welcome() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setTimeout(() => setLoaded(true), 40);
    });
    return () => cancelAnimationFrame(t);
  }, []);

  const cpseList = [
    'NTPC Limited',
    'BHEL',
    'ONGC',
    'Indian Oil (IOCL)',
    'SAIL',
    'GAIL India',
  ];

  return (
    <div className={`welcome ${loaded ? 'welcome--loaded' : ''}`}>

      {/* ─── LAYER 1: Background Material Animation ─── */}
      <MaterialAnimationCanvas />

      {/* ─── LAYER 2: Atmospheric depth vignette ─── */}
      <div className="welcome-atmosphere" aria-hidden="true" />

      {/* ─── LAYER 3: Foreground Content ─── */}

      {/* Top Navigation */}
      <header className="welcome-nav">
        <div className="welcome-nav__inner">
          <div className="welcome-nav__brand">
            <div className="welcome-nav__logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="5" cy="6" r="2.2" fill="#fff" opacity="0.75" />
                <circle cx="5" cy="12" r="2.2" fill="#fff" opacity="0.9" />
                <circle cx="5" cy="18" r="2.2" fill="#fff" opacity="0.75" />
                <line x1="7.2" y1="6" x2="14" y2="12" stroke="#fff" strokeWidth="1.3" opacity="0.55" />
                <line x1="7.2" y1="12" x2="14" y2="12" stroke="#fff" strokeWidth="1.3" opacity="0.8" />
                <line x1="7.2" y1="18" x2="14" y2="12" stroke="#fff" strokeWidth="1.3" opacity="0.55" />
                <polygon points="18,7 22,12 18,17 14,12" fill="#fff" />
              </svg>
            </div>
            <span className="welcome-nav__brand-name">MaterialDNA AI</span>
          </div>
        </div>
      </header>

      {/* Hero Content Area */}
      <main className="welcome-hero">
        <div className="welcome-hero__inner">

          {/* Eyebrow */}
          <div className="welcome-eyebrow">
            MATERIAL INTELLIGENCE PLATFORM
          </div>

          {/* Headline */}
          <h1 className="welcome-heading">
            <span className="heading-line">One Material.</span>
            <span className="heading-line">One Identity.</span>
            <span className="heading-line welcome-heading__accent">Across CPSEs.</span>
          </h1>

          {/* Description */}
          <p className="welcome-desc">
            AI-driven standardization and harmonization of material codes across CPSEs.
          </p>

          {/* Supporting text */}
          <p className="welcome-subdesc">
            Different material descriptions across CPSEs are analyzed, technically validated, and mapped to a verified common material identity.
          </p>

          {/* CTAs */}
          <div className="welcome-ctas">
            <button
              className="welcome-cta-primary"
              onClick={() => navigate('/matching')}
              id="cta-start-analysis"
            >
              START AI ANALYSIS <ArrowRight size={16} className="cta-arrow" />
            </button>
            <button
              className="welcome-cta-secondary"
              onClick={() => navigate('/import')}
              id="cta-import-data"
            >
              <Upload size={14} /> Import Material Data
            </button>
          </div>

          {/* CPSE Ecosystem Strip */}
          <div className="welcome-ecosystem-strip">
            <span className="ecosystem-heading">
              CENTRAL PUBLIC SECTOR ENTERPRISES ECOSYSTEM
            </span>
            <div className="ecosystem-tags-row">
              {cpseList.map(cpse => (
                <div key={cpse} className="ecosystem-tag">
                  <span className="ecosystem-dot" />
                  <span>{cpse}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
