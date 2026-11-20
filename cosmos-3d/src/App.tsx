// @ts-nocheck
import React, { useState, useEffect, useLayoutEffect, useId, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Bookmark,
  RotateCw,
  Play,
  Pause,
  Crosshair,
  ExternalLink,
  Search,
  X,
  Send
} from 'lucide-react';

// ============================================================================
// 1A. UTILITY HELPERS (CLAMP & HTTPS URL SANITIZATION)
// ============================================================================
const gxClamp = (val, min, max) => {
  const upper = Math.max(min, max);
  return Math.max(min, Math.min(upper, val));
};

const sanitizeHttpsUrl = (rawUrl, fallback) => {
  try {
    const parsed = new URL(String(rawUrl || '').replace(/^http:/i, 'https:'));
    if (parsed.protocol === 'https:') return parsed.toString();
  } catch {
    // Fallback safely on invalid URLs
  }
  return fallback;
};

// ============================================================================
// 1B. REACT BITS <PillNav /> COMPONENT + CSS (SPRING GLIDE & DOT INDICATOR)
// ============================================================================
const PILL_NAV_CSS = `
.pill-nav {
  --pn-h: 44px;
  --pn-pad: 4px;
  --pn-inner: 36px;
  --pn-x: 16px;
  --pn-font: 12px;
  --pn-gap: 8px;
  --pn-mark: 20px;

  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--pn-gap);
  max-width: 100%;
  box-sizing: border-box;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.pill-nav *, .pill-nav *::before, .pill-nav *::after {
  box-sizing: border-box;
}
.pill-nav[data-layout='joined'] {
  height: var(--pn-h);
  padding: var(--pn-pad);
  border-radius: 9999px;
  gap: 2px;
}
.pill-nav__surface {
  background: var(--pn-surface);
  backdrop-filter: var(--pn-blur, none);
  -webkit-backdrop-filter: var(--pn-blur, none);
  box-shadow: var(--pn-shadow);
  border: 1px solid var(--pn-edge);
}
.pill-nav__rim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 1px 0 var(--pn-rim);
  pointer-events: none;
}
.pill-nav__logo {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--pn-h);
  height: var(--pn-h);
  border-radius: 9999px;
  flex-shrink: 0;
}
.pill-nav[data-layout='joined'] .pill-nav__logo {
  width: var(--pn-inner);
  height: var(--pn-inner);
}
.pill-nav__logo-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  color: var(--pn-strong);
  text-decoration: none;
  cursor: pointer;
}
.pill-nav__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--pn-mark);
  height: var(--pn-mark);
}
.pill-nav__mark img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.pill-nav__bar {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: var(--pn-h);
  padding: var(--pn-pad);
  border-radius: 9999px;
}
.pill-nav[data-layout='joined'] .pill-nav__bar {
  height: var(--pn-inner);
  padding: 0;
}
.pill-nav__track {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: var(--pn-inner);
}
.pill-nav__list {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  list-style: none;
  margin: 0;
  padding: 0;
  height: 100%;
}
.pill-nav__slot {
  position: relative;
  display: inline-flex;
  align-items: center;
  height: 100%;
  border-radius: 9999px;
}
.pill-nav[data-items='pill'] .pill-nav__slot {
  background: var(--pn-tile);
  box-shadow: var(--pn-tile-rim);
}
.pill-nav__item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 var(--pn-x);
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: var(--pn-text);
  font: inherit;
  font-size: var(--pn-font);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  overflow: hidden;
  outline: none;
  transition: color 0.2s ease;
}
.pill-nav__item[aria-current='page'],
.pill-nav__slot[data-lit] .pill-nav__item {
  color: var(--pn-strong);
}
.pill-nav__face,
.pill-nav__face-alt {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease;
}
.pill-nav__face-alt {
  position: absolute;
  inset: 0;
  justify-content: center;
  color: var(--pn-pill-ink);
  transform: translateY(115%);
  opacity: 0;
}
.pill-nav__slot[data-hover] .pill-nav__face {
  transform: translateY(-115%);
  opacity: 0;
}
.pill-nav__slot[data-hover] .pill-nav__face-alt {
  transform: translateY(0);
  opacity: 1;
}
.pill-nav__fill {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--pn-fill, 140px);
  height: var(--pn-fill, 140px);
  border-radius: 9999px;
  background: var(--pn-pill);
  transform: translate(-50%, -50%) scale(0);
  transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
  z-index: 1;
}
.pill-nav__slot[data-hover] .pill-nav__fill,
.pill-nav__slot[data-on] .pill-nav__fill {
  transform: translate(-50%, -50%) scale(1);
}
.pill-nav__glide {
  position: absolute;
  left: 0;
  top: 0;
  height: var(--pn-inner);
  border-radius: 9999px;
  background: var(--pn-pill);
  box-shadow: var(--pn-pill-shadow);
  transform-origin: center center;
  pointer-events: none;
  z-index: 1;
  will-change: transform, width, opacity;
}
.pill-nav__ink {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  pointer-events: none;
  will-change: clip-path, opacity;
}
.pill-nav__ink-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: var(--pn-inner);
  padding: 0 var(--pn-x);
  font-size: var(--pn-font);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--pn-pill-ink);
}
.pill-nav__dot {
  position: absolute;
  left: 0;
  bottom: 2px;
  width: 5px;
  height: 5px;
  margin-left: -2.5px;
  border-radius: 9999px;
  background: var(--pn-dot);
  box-shadow: 0 0 8px var(--pn-dot);
  pointer-events: none;
  z-index: 4;
  will-change: transform, opacity;
}
.pill-nav[data-dot-lit] .pill-nav__dot {
  background: var(--pn-pill-ink);
}
.pill-nav__toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--pn-h);
  height: var(--pn-h);
  border-radius: 9999px;
  color: var(--pn-strong);
  cursor: pointer;
}
.pill-nav__toggle--bare {
  width: var(--pn-inner);
  height: var(--pn-inner);
  border: 0;
  background: transparent;
}
.pill-nav__burger {
  position: relative;
  width: 16px;
  height: 10px;
}
.pill-nav__line {
  position: absolute;
  left: 0;
  width: 16px;
  height: 1.75px;
  border-radius: 9999px;
  background: currentColor;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.pill-nav__line--top { top: 1px; }
.pill-nav__line--bottom { bottom: 1px; }
.pill-nav[data-open] .pill-nav__line--top {
  transform: translateY(3.1px) rotate(45deg);
}
.pill-nav[data-open] .pill-nav__line--bottom {
  transform: translateY(-3.1px) rotate(-45deg);
}
.pill-nav__panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 215px;
  padding: 6px;
  border-radius: 22px;
  z-index: 60;
}
.pill-nav__menu {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pill-nav__row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: var(--pn-text);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease;
}
.pill-nav__row:hover,
.pill-nav__row[aria-current='page'] {
  background: var(--pn-row-hover);
  color: var(--pn-strong);
}
.pill-nav__measure {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  height: 0;
  overflow: hidden;
  white-space: nowrap;
}
`;

const PN_THEMES = {
  dark: {
    '--pn-surface': 'rgba(13, 15, 20, 0.88)',
    '--pn-solid': '#0d0f14',
    '--pn-edge': 'rgba(255, 255, 255, 0.12)',
    '--pn-rim': 'rgba(255, 255, 255, 0.08)',
    '--pn-shadow': '0 22px 44px -20px rgba(0, 0, 0, 0.85), 0 6px 16px -8px rgba(0, 0, 0, 0.6)',
    '--pn-text': 'rgba(203, 213, 225, 0.78)',
    '--pn-strong': '#f8fafc',
    '--pn-pill': 'linear-gradient(180deg, rgba(245, 158, 11, 0.28) 0%, rgba(217, 119, 6, 0.18) 100%)',
    '--pn-pill-ink': '#fcd34d',
    '--pn-pill-shadow': 'inset 0 0 0 1px rgba(245, 158, 11, 0.55), 0 6px 16px -6px rgba(0, 0, 0, 0.65)',
    '--pn-dot': '#fbbf24',
    '--pn-ring': 'rgba(251, 191, 36, 0.55)',
    '--pn-row-hover': 'rgba(245, 158, 11, 0.14)',
    '--pn-tile': 'linear-gradient(180deg, #1b1e26 0%, #111318 100%)',
    '--pn-tile-rim':
      'inset 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 4px 10px -4px rgba(0, 0, 0, 0.7)'
  },
  light: {
    '--pn-surface': 'rgba(240, 240, 243, 0.8)',
    '--pn-solid': '#f0f0f3',
    '--pn-edge': 'rgba(24, 24, 27, 0.07)',
    '--pn-rim': 'rgba(255, 255, 255, 0.95)',
    '--pn-shadow': '0 22px 44px -22px rgba(24, 24, 27, 0.3), 0 6px 16px -10px rgba(24, 24, 27, 0.16)',
    '--pn-text': 'rgba(24, 24, 27, 0.6)',
    '--pn-strong': '#18181b',
    '--pn-pill': 'linear-gradient(180deg, #2c2c31 0%, #18181b 100%)',
    '--pn-pill-ink': '#ffffff',
    '--pn-pill-shadow': 'inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 6px 14px -6px rgba(24, 24, 27, 0.45)',
    '--pn-dot': '#18181b',
    '--pn-ring': 'rgba(24, 24, 27, 0.45)',
    '--pn-row-hover': 'rgba(24, 24, 27, 0.05)',
    '--pn-tile': 'linear-gradient(180deg, #ffffff 0%, #f6f6f8 100%)',
    '--pn-tile-rim':
      'inset 0 0 0 1px rgba(24, 24, 27, 0.08), inset 0 1px 0 rgba(255, 255, 255, 1), 0 4px 10px -5px rgba(24, 24, 27, 0.25)'
  }
};

const PN_SIZES = {
  sm: {
    '--pn-h': '36px',
    '--pn-pad': '3px',
    '--pn-inner': '30px',
    '--pn-x': '13px',
    '--pn-font': '11px',
    '--pn-gap': '6px',
    '--pn-mark': '18px'
  },
  md: {
    '--pn-h': '42px',
    '--pn-pad': '4px',
    '--pn-inner': '34px',
    '--pn-x': '15px',
    '--pn-font': '11px',
    '--pn-gap': '8px',
    '--pn-mark': '20px'
  },
  lg: {
    '--pn-h': '50px',
    '--pn-pad': '5px',
    '--pn-inner': '40px',
    '--pn-x': '18px',
    '--pn-font': '13px',
    '--pn-gap': '10px',
    '--pn-mark': '24px'
  }
};

const PN_EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

const pnContrastInk = color => {
  const hex = String(color || '')
    .trim()
    .replace('#', '');
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map(c => c + c)
          .join('')
      : hex;
  const channel = index => {
    const value = parseInt(full.slice(index, index + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.36 ? '#121016' : '#ffffff';
};

const pnReadVar = (element, name) => parseFloat(getComputedStyle(element).getPropertyValue(name)) || 0;

function PillNav({
  logo,
  logoAlt = 'Logo',
  logoHref = '#',
  onLogoClick,
  items = [],
  activeHref,
  defaultActiveIndex = 0,
  onItemClick,
  linkComponent: LinkComponent = 'a',
  theme = 'dark',
  layout = 'split',
  size = 'md',
  surface = 'glass',
  itemStyle = 'plain',
  hoverEffect = 'glide',
  indicator = 'dot',
  highlightColor,
  highlightTextColor,
  barColor,
  textColor,
  bounce = 0.3,
  stretch = 0.5,
  intro = true,
  collapse = 'auto',
  onMenuToggle,
  ariaLabel = 'Main',
  className = '',
  style
}) {
  const panelId = useId();
  const rootRef = useRef(null);
  const barRef = useRef(null);
  const trackRef = useRef(null);
  const glideRef = useRef(null);
  const inkRef = useRef(null);
  const dotRef = useRef(null);
  const logoRef = useRef(null);
  const markRef = useRef(null);
  const toggleRef = useRef(null);
  const panelRef = useRef(null);
  const measureRef = useRef(null);
  const measureListRef = useRef(null);
  const slotRefs = useRef([]);
  const engineRef = useRef(null);
  const introRef = useRef(intro);
  const slideRef = useRef(false);
  const pendingRef = useRef(null);
  const [selected, setSelected] = useState(defaultActiveIndex);
  const [collapsed, setCollapsed] = useState(collapse === 'always');
  const [open, setOpen] = useState(false);
  const [panelShown, setPanelShown] = useState(false);

  const controlled = activeHref !== undefined;
  const activeIndex = controlled ? items.findIndex(item => item.href === activeHref) : selected;
  const joined = layout === 'joined';
  const hasLogo = Boolean(logo);
  const fill = hoverEffect === 'fill';
  const glide = !fill && (hoverEffect === 'glide' || indicator === 'pill');

  const settings = {
    hoverEffect,
    indicator,
    activeIndex,
    bounce: gxClamp(bounce, 0, 1),
    stretch: gxClamp(stretch, 0, 1)
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const palette = PN_THEMES[theme] ?? PN_THEMES.dark;
  const vars = { ...palette, ...(PN_SIZES[size] ?? PN_SIZES.md) };
  if (surface === 'glass') vars['--pn-blur'] = 'blur(20px) saturate(1.6)';
  if (surface === 'solid') {
    vars['--pn-surface'] = palette['--pn-solid'];
    vars['--pn-blur'] = 'none';
  }
  if (surface === 'none') {
    vars['--pn-surface'] = 'transparent';
    vars['--pn-shadow'] = 'none';
    vars['--pn-blur'] = 'none';
    vars['--pn-edge'] = 'transparent';
    vars['--pn-rim'] = 'transparent';
  }
  if (barColor) {
    vars['--pn-surface'] = barColor;
    vars['--pn-solid'] = barColor;
  }
  if (textColor) {
    vars['--pn-strong'] = textColor;
    vars['--pn-text'] = `color-mix(in srgb, ${textColor} 68%, transparent)`;
  }
  if (highlightColor) {
    vars['--pn-pill'] = highlightColor;
    vars['--pn-dot'] = highlightColor;
    vars['--pn-pill-shadow'] = 'inset 0 1px 0 rgba(255, 255, 255, 0.22), 0 6px 16px -6px rgba(0, 0, 0, 0.55)';
    vars['--pn-pill-ink'] = highlightTextColor || pnContrastInk(highlightColor) || palette['--pn-pill-ink'];
  } else if (highlightTextColor) {
    vars['--pn-pill-ink'] = highlightTextColor;
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const state = {
      x0: 0,
      x1: 0,
      v0: 0,
      v1: 0,
      alpha: 0,
      pop: 1,
      press: 1,
      pressVelocity: 0,
      dotX: 0,
      dotVelocity: 0,
      dotAlpha: 0,
      hover: -1,
      focus: false,
      sliding: false,
      pressing: false,
      waiting: slideRef.current && !reduce
    };
    slideRef.current = false;
    const rects = [];
    let trackWidth = 0;
    let trackHeight = 0;
    let raf = 0;
    let last = 0;

    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      trackWidth = track.offsetWidth;
      trackHeight = track.offsetHeight;
      slotRefs.current.forEach((slot, index) => {
        if (!slot) return;
        rects[index] = { left: slot.offsetLeft, width: slot.offsetWidth };
        const reach = Math.ceil(2 * Math.sqrt((slot.offsetWidth / 2) ** 2 + slot.offsetHeight ** 2)) + 2;
        slot.style.setProperty('--pn-fill', `${reach}px`);
      });
    };

    const glideIndex = () => {
      const s = settingsRef.current;
      if (s.hoverEffect === 'fill') return -1;
      if (s.hoverEffect === 'glide' && state.hover >= 0) return state.hover;
      return s.indicator === 'pill' ? s.activeIndex : -1;
    };

    const sync = () => {
      const s = settingsRef.current;
      slotRefs.current.forEach((slot, index) => {
        if (!slot) return;
        const hovered = state.hover === index;
        slot.toggleAttribute('data-lit', hovered);
        slot.toggleAttribute('data-hover', hovered && s.hoverEffect === 'fill');
      });
      root.toggleAttribute('data-focus', state.focus && state.hover >= 0);
      root.toggleAttribute(
        'data-dot-lit',
        s.hoverEffect === 'fill' && state.hover >= 0 && state.hover === s.activeIndex
      );
    };

    const render = () => {
      const glideEl = glideRef.current;
      const ink = inkRef.current;
      const dot = dotRef.current;
      const width = Math.max(0, state.x1 - state.x0);
      const scale = state.press * state.pop;
      const target = rects[glideIndex()];
      const squash = target ? 1 - gxClamp((width / Math.max(target.width, 1) - 1) * 0.3, 0, 0.14) : 1;
      if (glideEl) {
        glideEl.style.width = `${width}px`;
        glideEl.style.transform = `translate3d(${state.x0}px, 0, 0) scale(${scale}, ${scale * squash})`;
        glideEl.style.opacity = `${state.alpha}`;
      }
      if (ink) {
        const half = (width * scale) / 2;
        const center = (state.x0 + state.x1) / 2;
        const inset = (trackHeight * (1 - scale * squash)) / 2;
        ink.style.clipPath = `inset(${inset}px ${Math.max(0, trackWidth - center - half)}px ${inset}px ${Math.max(0, center - half)}px round ${trackHeight / 2}px)`;
        ink.style.opacity = `${state.alpha}`;
      }
      if (dot) {
        const pull = gxClamp(Math.abs(state.dotVelocity) / 700, 0, 2.2);
        dot.style.transform = `translate3d(${state.dotX}px, 0, 0) scaleX(${1 + pull})`;
        dot.style.opacity = `${state.dotAlpha}`;
      }
    };

    const tick = now => {
      raf = 0;
      const s = settingsRef.current;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const index = glideIndex();
      const target = rects[index];
      const zeta = 1 - 0.55 * s.bounce;
      const base = 520;
      let busy = false;

      if (target && !state.waiting) {
        const t0 = target.left;
        const t1 = target.left + target.width;
        if (state.alpha < 0.02 && !state.sliding) {
          state.x0 = t0;
          state.x1 = t1;
          state.v0 = 0;
          state.v1 = 0;
          state.pop = 0.9;
        }
        if (reduce) {
          state.x0 = t0;
          state.x1 = t1;
          state.v0 = 0;
          state.v1 = 0;
        } else {
          const direction = Math.sign((t0 + t1) / 2 - (state.x0 + state.x1) / 2);
          const lead = base * (1 + 0.9 * s.stretch);
          const trail = base * (1 - 0.5 * s.stretch);
          const k0 = direction < 0 ? lead : direction > 0 ? trail : base;
          const k1 = direction > 0 ? lead : direction < 0 ? trail : base;
          const steps = Math.ceil(dt / (1 / 240));
          const h = dt / steps;
          for (let i = 0; i < steps; i++) {
            state.v0 += (-k0 * (state.x0 - t0) - 2 * zeta * Math.sqrt(k0) * state.v0) * h;
            state.x0 += state.v0 * h;
            state.v1 += (-k1 * (state.x1 - t1) - 2 * zeta * Math.sqrt(k1) * state.v1) * h;
            state.x1 += state.v1 * h;
          }
        }
        state.alpha += (1 - state.alpha) * (reduce ? 1 : 1 - Math.exp(-dt / 0.06));
        busy =
          Math.abs(state.x0 - t0) > 0.05 ||
          Math.abs(state.x1 - t1) > 0.05 ||
          Math.abs(state.v0) > 0.5 ||
          Math.abs(state.v1) > 0.5 ||
          state.alpha < 0.999;
        if (!busy) state.sliding = false;
      } else {
        state.alpha += (0 - state.alpha) * (reduce ? 1 : 1 - Math.exp(-dt / 0.07));
        if (state.alpha > 0.002) busy = true;
        else state.alpha = 0;
      }

      state.pop += (1 - state.pop) * (reduce ? 1 : 1 - Math.exp(-dt / 0.09));
      if (Math.abs(1 - state.pop) > 0.001) busy = true;

      const pressTarget = state.pressing ? 0.95 : 1;
      if (reduce) {
        state.press = pressTarget;
        state.pressVelocity = 0;
      } else {
        state.pressVelocity += (-700 * (state.press - pressTarget) - 30 * state.pressVelocity) * dt;
        state.press += state.pressVelocity * dt;
      }
      if (Math.abs(state.press - pressTarget) > 0.0005 || Math.abs(state.pressVelocity) > 0.01) busy = true;

      const dotTarget = s.indicator === 'dot' ? rects[s.activeIndex] : null;
      if (dotTarget && !state.waiting) {
        const center = dotTarget.left + dotTarget.width / 2;
        if (state.dotAlpha < 0.02) {
          state.dotX = center;
          state.dotVelocity = 0;
        }
        if (reduce) {
          state.dotX = center;
          state.dotVelocity = 0;
        } else {
          const k = 360;
          const steps = Math.ceil(dt / (1 / 240));
          const h = dt / steps;
          for (let i = 0; i < steps; i++) {
            state.dotVelocity +=
              (-k * (state.dotX - center) - 2 * (1 - 0.5 * s.bounce) * Math.sqrt(k) * state.dotVelocity) * h;
            state.dotX += state.dotVelocity * h;
          }
        }
        state.dotAlpha += (1 - state.dotAlpha) * (reduce ? 1 : 1 - Math.exp(-dt / 0.1));
        if (Math.abs(state.dotX - center) > 0.05 || Math.abs(state.dotVelocity) > 0.5 || state.dotAlpha < 0.999)
          busy = true;
      } else {
        state.dotAlpha += (0 - state.dotAlpha) * (reduce ? 1 : 1 - Math.exp(-dt / 0.1));
        if (state.dotAlpha > 0.002) busy = true;
        else state.dotAlpha = 0;
      }

      render();
      if (busy) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    const engine = {
      enter: (index, event) => {
        if (event?.pointerType === 'touch') return;
        state.hover = index;
        state.focus = false;
        sync();
        wake();
      },
      leave: () => {
        if (state.focus) return;
        state.hover = -1;
        sync();
        wake();
      },
      focus: (index, event) => {
        const target = event?.target;
        const visible = target instanceof Element && target.matches(':focus-visible');
        state.focus = visible;
        state.hover = visible ? index : state.hover;
        sync();
        wake();
      },
      blur: () => {
        if (!state.focus) return;
        state.focus = false;
        state.hover = -1;
        sync();
        wake();
      },
      press: event => {
        if (event && event.button > 0) return;
        state.pressing = true;
        wake();
      },
      release: () => {
        if (!state.pressing) return;
        state.pressing = false;
        wake();
      },
      refresh: () => {
        measure();
        sync();
        wake();
      }
    };
    engineRef.current = engine;

    measure();
    sync();
    render();
    wake();

    let timer = 0;
    if (state.waiting) {
      state.x0 = 0;
      state.x1 = 0;
      timer = window.setTimeout(() => {
        state.waiting = false;
        if (glideIndex() >= 0) {
          state.alpha = 1;
          state.sliding = true;
        }
        wake();
      }, 420);
    }

    const resizeObserver = new ResizeObserver(() => {
      measure();
      render();
      wake();
    });
    if (trackRef.current) resizeObserver.observe(trackRef.current);
    document.fonts?.ready?.then(() => engine.refresh()).catch(() => {});
    window.addEventListener('pointerup', engine.release);
    window.addEventListener('pointercancel', engine.release);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('pointerup', engine.release);
      window.removeEventListener('pointercancel', engine.release);
      engineRef.current = null;
    };
  }, [collapsed, items.length]);

  useEffect(() => {
    engineRef.current?.refresh();
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    const measureEl = measureRef.current;
    if (!root || !measureEl) return undefined;
    const evaluate = () => {
      if (collapse === 'always' || collapse === 'never') {
        setCollapsed(collapse === 'always');
        return;
      }
      const parent = root.parentElement;
      if (!parent) return;
      const styles = getComputedStyle(parent);
      const available =
        parent.clientWidth - (parseFloat(styles.paddingLeft) || 0) - (parseFloat(styles.paddingRight) || 0);
      const listWidth = measureListRef.current?.offsetWidth ?? 0;
      const height = pnReadVar(root, '--pn-h');
      const pad = pnReadVar(root, '--pn-pad');
      const gap = pnReadVar(root, '--pn-gap');
      const inner = pnReadVar(root, '--pn-inner');
      const need = joined
        ? pad * 2 + (hasLogo ? inner + 2 : 0) + listWidth
        : (hasLogo ? height + gap : 0) + listWidth + pad * 2;
      const next = need > available + 0.5;
      if (introRef.current && next !== collapsed) pendingRef.current = next;
      setCollapsed(next);
    };
    evaluate();
    const observer = new ResizeObserver(evaluate);
    if (root.parentElement) observer.observe(root.parentElement);
    observer.observe(measureEl);
    return () => observer.disconnect();
  }, [collapse, collapsed, joined, hasLogo, size]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !introRef.current) return;
    if (pendingRef.current !== null && pendingRef.current !== collapsed) return;
    pendingRef.current = null;
    introRef.current = false;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const pop = (element, delay) =>
      element?.animate?.(
        [
          { opacity: 0, transform: 'scale(0.6)' },
          { opacity: 1, transform: 'scale(1)' }
        ],
        { duration: 700, delay, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'backwards' }
      );
    const reveal = element => {
      if (!element?.animate) return;
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      element.animate(
        [
          { clipPath: `inset(0px ${Math.max(0, width - height)}px 0px 0px round ${height / 2}px)` },
          { clipPath: `inset(0px 0px 0px 0px round ${height / 2}px)` }
        ],
        { duration: 760, delay: 90, easing: PN_EASE_OUT, fill: 'backwards' }
      );
    };
    pop(logoRef.current, 0);
    if (collapsed) {
      pop(toggleRef.current, 120);
      return;
    }
    slideRef.current = true;
    reveal(joined ? root : barRef.current);
    slotRefs.current.forEach((slot, index) => {
      slot?.animate?.(
        [
          { opacity: 0, transform: 'translateX(-10px)' },
          { opacity: 1, transform: 'translateX(0)' }
        ],
        { duration: 560, delay: 200 + index * 50, easing: PN_EASE_OUT, fill: 'backwards' }
      );
    });
  }, [collapsed, joined]);

  useEffect(() => {
    if (!collapsed && open) setOpen(false);
  }, [collapsed, open]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const root = rootRef.current;
    if (!panel || !root) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const header = joined ? root.offsetHeight : (toggleRef.current?.offsetHeight ?? 44);
    const start = joined
      ? `inset(0px 0px ${Math.max(0, height - header)}px 0px round ${header / 2}px)`
      : `inset(0px 0px ${Math.max(0, height - header)}px ${Math.max(0, width - header)}px round ${header / 2}px)`;
    const end = 'inset(0px 0px 0px 0px round 22px)';
    const rows = panel.querySelectorAll('li');
    const running = [];
    if (open) {
      if (reduce || !panel.animate) return undefined;
      running.push(panel.animate([{ clipPath: start }, { clipPath: end }], { duration: 560, easing: PN_EASE_OUT }));
      rows.forEach((row, index) => {
        if (!row.animate) return;
        running.push(
          row.animate(
            [
              { opacity: 0, transform: 'translateY(-8px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ],
            { duration: 420, delay: 90 + index * 40, easing: PN_EASE_OUT, fill: 'backwards' }
          )
        );
      });
    } else {
      if (reduce || !panel.animate) {
        setPanelShown(false);
        return undefined;
      }
      const morph = panel.animate([{ clipPath: end }, { clipPath: start }], {
        duration: 380,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      });
      morph.onfinish = () => setPanelShown(false);
      running.push(morph);
      rows.forEach(row => {
        if (!row.animate) return;
        running.push(row.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }));
      });
    }
    return () => {
      running.forEach(animation => {
        animation.onfinish = null;
        animation.cancel();
      });
    };
  }, [open, panelShown, joined]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = event => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = event => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const spin = event => {
    const mark = markRef.current;
    if (!mark || event.pointerType === 'touch' || mark.getAnimations?.().length) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    mark.animate?.([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
      duration: 900,
      easing: 'cubic-bezier(0.65, 0, 0.25, 1)'
    });
  };

  const choose = (item, index, event) => {
    onItemClick?.(item, index, event);
    if (!controlled) setSelected(index);
  };

  const toggle = () => {
    const next = !open;
    if (next) setPanelShown(true);
    setOpen(next);
    onMenuToggle?.(next);
  };

  const link = (item, props, children) => {
    if (!item.href) {
      return (
        <button type="button" {...props}>
          {children}
        </button>
      );
    }
    return (
      <LinkComponent href={item.href} {...props}>
        {children}
      </LinkComponent>
    );
  };

  const face = item => (
    <>
      {item.icon}
      <span>{item.label}</span>
    </>
  );

  return (
    <nav
      ref={rootRef}
      className={['pill-nav', joined ? 'pill-nav__surface' : '', className].filter(Boolean).join(' ')}
      data-layout={layout}
      data-items={itemStyle}
      data-collapsed={collapsed ? '' : undefined}
      data-open={open ? '' : undefined}
      data-panel={panelShown ? '' : undefined}
      style={{ ...vars, ...style }}
      aria-label={ariaLabel}
    >
      {logo && (
        <span ref={logoRef} className={['pill-nav__logo', joined ? '' : 'pill-nav__surface'].filter(Boolean).join(' ')}>
          <LinkComponent
            href={logoHref}
            className="pill-nav__logo-link"
            aria-label={logoAlt}
            onPointerEnter={spin}
            onClick={e => {
              if (onLogoClick) {
                e.preventDefault();
                onLogoClick(e);
              }
            }}
          >
            <span ref={markRef} className="pill-nav__mark">
              {typeof logo === 'string' ? <img src={logo} alt="" draggable={false} /> : logo}
            </span>
          </LinkComponent>
          {!joined && <span className="pill-nav__rim" />}
        </span>
      )}

      {!collapsed && (
        <div ref={barRef} className={['pill-nav__bar', joined ? '' : 'pill-nav__surface'].filter(Boolean).join(' ')}>
          <div ref={trackRef} className="pill-nav__track" onPointerLeave={() => engineRef.current?.leave()}>
            <ul className="pill-nav__list">
              {items.map((item, index) => (
                <li
                  key={`${item.label}-${index}`}
                  ref={element => {
                    slotRefs.current[index] = element;
                  }}
                  className="pill-nav__slot"
                  data-on={fill && indicator === 'pill' && index === activeIndex ? '' : undefined}
                  onPointerEnter={event => engineRef.current?.enter(index, event)}
                  onPointerDown={event => engineRef.current?.press(event)}
                  onFocus={event => engineRef.current?.focus(index, event)}
                  onBlur={() => engineRef.current?.blur()}
                >
                  {link(
                    item,
                    {
                      className: 'pill-nav__item',
                      'aria-current': index === activeIndex ? 'page' : undefined,
                      'aria-label': item.ariaLabel,
                      onClick: event => choose(item, index, event)
                    },
                    <>
                      {fill && <span className="pill-nav__fill" aria-hidden="true" />}
                      <span className="pill-nav__face">{face(item)}</span>
                      {fill && (
                        <span className="pill-nav__face-alt" aria-hidden="true">
                          {face(item)}
                        </span>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
            {glide && <span ref={glideRef} className="pill-nav__glide" aria-hidden="true" />}
            {glide && (
              <div ref={inkRef} className="pill-nav__ink" aria-hidden="true">
                {items.map((item, index) => (
                  <span key={`${item.label}-${index}`} className="pill-nav__ink-item">
                    {face(item)}
                  </span>
                ))}
              </div>
            )}
            {indicator === 'dot' && <span ref={dotRef} className="pill-nav__dot" aria-hidden="true" />}
          </div>
          {!joined && <span className="pill-nav__rim" />}
        </div>
      )}

      {collapsed && (
        <button
          ref={toggleRef}
          type="button"
          className={['pill-nav__toggle', joined ? 'pill-nav__toggle--bare' : 'pill-nav__surface'].join(' ')}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={toggle}
        >
          <span className="pill-nav__burger" aria-hidden="true">
            <span className="pill-nav__line pill-nav__line--top" />
            <span className="pill-nav__line pill-nav__line--bottom" />
          </span>
          {!joined && <span className="pill-nav__rim" />}
        </button>
      )}

      {collapsed && panelShown && (
        <div ref={panelRef} id={panelId} className={['pill-nav__panel', 'pill-nav__surface'].join(' ')}>
          <ul className="pill-nav__menu">
            {items.map((item, index) => (
              <li key={`${item.label}-${index}`}>
                {link(
                  item,
                  {
                    className: 'pill-nav__row',
                    'aria-current': index === activeIndex ? 'page' : undefined,
                    tabIndex: open ? undefined : -1,
                    onClick: event => {
                      choose(item, index, event);
                      setOpen(false);
                      onMenuToggle?.(false);
                    }
                  },
                  face(item)
                )}
              </li>
            ))}
          </ul>
          <span className="pill-nav__rim" />
        </div>
      )}

      <div ref={measureRef} className="pill-nav__measure" aria-hidden="true">
        <div ref={measureListRef} className="pill-nav__list">
          {items.map((item, index) => (
            <span key={`${item.label}-${index}`} className="pill-nav__ink-item">
              {face(item)}
            </span>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// 2. REACT BITS PRO <BlinkingDots /> COMPONENT (FIELD OF DOTS BLINKING ON & OFF)
// ============================================================================
function BlinkingDots({
  spacing = 24,
  dotRadius = 1.35,
  backgroundColor = '#000000',
  colors = ['rgba(255, 255, 255, 0.72)', 'rgba(251, 191, 36, 0.68)', 'rgba(125, 211, 252, 0.62)'],
  minSpeed = 0.65,
  maxSpeed = 2.1,
  activeRatio = 0.78,
  className = ''
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!container || !canvas || !ctx) return undefined;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let dots = [];
    let rafId = 0;
    let lastTime = performance.now();

    const rebuildGrid = () => {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;
      const offsetX = (width - (cols - 1) * spacing) * 0.5;
      const offsetY = (height - (rows - 1) * spacing) * 0.5;

      dots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > activeRatio) continue;
          dots.push({
            x: offsetX + c * spacing,
            y: offsetY + r * spacing,
            phase: Math.random() * Math.PI * 2,
            speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
            color: colors[(r * 7 + c * 13) % colors.length],
            sizeScale: 0.75 + Math.random() * 0.5
          });
        }
      }
    };

    const resizeObserver = new ResizeObserver(rebuildGrid);
    resizeObserver.observe(container);
    rebuildGrid();

    const render = now => {
      rafId = requestAnimationFrame(render);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        dot.phase += dot.speed * dt;
        const wave = Math.sin(dot.phase);
        const alpha = wave <= 0 ? 0.04 : Math.pow(wave, 1.35);
        if (alpha <= 0.045) continue;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = dot.color;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotRadius * dot.sizeScale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [spacing, dotRadius, backgroundColor, colors, minSpeed, maxSpeed, activeRatio]);

  return (
    <div ref={containerRef} className={`pointer-events-none overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="block w-full h-full" aria-hidden="true" />
    </div>
  );
}

// ============================================================================
// 3. OFFICIAL NASA SCIENCE (science.nasa.gov) & ISRO HERO TAGLINES
// ============================================================================
const NASA_SCIENCE_HERO_META = {
  sun: {
    displayTitle: 'The Sun',
    tagline: 'Our star. The heart of our solar system.',
    nasaUrl: 'https://science.nasa.gov/sun/'
  },
  parker_solar: {
    displayTitle: 'Parker Solar Probe',
    tagline: 'A mission to touch the Sun.',
    nasaUrl: 'https://science.nasa.gov/mission/parker-solar-probe/'
  },
  mercury: {
    displayTitle: 'Mercury',
    tagline: 'The smallest and innermost planet in our solar system.',
    nasaUrl: 'https://science.nasa.gov/mercury/'
  },
  venus: {
    displayTitle: 'Venus',
    tagline: 'Earth’s superheated twin shrouded in sulfuric clouds.',
    nasaUrl: 'https://science.nasa.gov/venus/'
  },
  aditya_l1: {
    displayTitle: 'Aditya-L1',
    tagline: 'India’s first space-based solar observatory at Lagrange Point 1.',
    nasaUrl: 'https://www.isro.gov.in/Aditya_L1.html'
  },
  earth: {
    displayTitle: 'Earth',
    tagline: 'Your home. Our mission.',
    nasaUrl: 'https://science.nasa.gov/earth/'
  },
  hubble: {
    displayTitle: 'Hubble Space Telescope',
    tagline: 'Three decades of cosmic discovery above Earth’s atmosphere.',
    nasaUrl: 'https://science.nasa.gov/mission/hubble/'
  },
  moon: {
    displayTitle: 'Earth’s Moon',
    tagline: 'Our constant celestial companion and gateway to deep space.',
    nasaUrl: 'https://science.nasa.gov/moon/'
  },
  chandrayaan3: {
    displayTitle: 'Chandrayaan-3',
    tagline: 'Historic soft landing & Pragyan rover traverse at the Lunar South Pole.',
    nasaUrl: 'https://www.isro.gov.in/Chandrayaan3.html'
  },
  jwst: {
    displayTitle: 'James Webb Space Telescope',
    tagline: 'Unfolding the infrared universe from Sun-Earth L2.',
    nasaUrl: 'https://science.nasa.gov/mission/webb/'
  },
  mars: {
    displayTitle: 'Mars',
    tagline: 'The Red Planet — ancient rivers, giant volcanoes, and future exploration.',
    nasaUrl: 'https://science.nasa.gov/mars/'
  },
  mangalyaan: {
    displayTitle: 'Mars Orbiter Mission',
    tagline: 'India’s maiden interplanetary voyage to the Red Planet.',
    nasaUrl: 'https://www.isro.gov.in/MarsOrbiterMissionSpacecraft.html'
  },
  ceres: {
    displayTitle: 'Ceres',
    tagline: 'Dwarf planet and ocean world of the Main Asteroid Belt.',
    nasaUrl: 'https://science.nasa.gov/dwarf-planets/ceres/'
  },
  jupiter: {
    displayTitle: 'Jupiter',
    tagline: 'King of the planets — twice as massive as all other worlds combined.',
    nasaUrl: 'https://science.nasa.gov/jupiter/'
  },
  europa: {
    displayTitle: 'Europa',
    tagline: 'An icy crust hiding a global saltwater ocean.',
    nasaUrl: 'https://science.nasa.gov/jupiter/jupiter-moons/europa/'
  },
  saturn: {
    displayTitle: 'Saturn',
    tagline: 'Adorned with a dazzling system of icy rings.',
    nasaUrl: 'https://science.nasa.gov/saturn/'
  },
  titan: {
    displayTitle: 'Titan',
    tagline: 'Saturn’s largest moon with liquid methane seas and golden haze.',
    nasaUrl: 'https://science.nasa.gov/saturn/moons/titan/'
  },
  uranus: {
    displayTitle: 'Uranus',
    tagline: 'The sideways ice giant rotating nearly on its side.',
    nasaUrl: 'https://science.nasa.gov/uranus/'
  },
  neptune: {
    displayTitle: 'Neptune',
    tagline: 'Dark, cold, and whipped by supersonic methane winds.',
    nasaUrl: 'https://science.nasa.gov/neptune/'
  },
  pluto: {
    displayTitle: 'Pluto',
    tagline: 'A complex world of ice mountains and frozen nitrogen plains.',
    nasaUrl: 'https://science.nasa.gov/dwarf-planets/pluto/'
  },
  voyager1: {
    displayTitle: 'Voyager 1',
    tagline: 'Humanity’s farthest spacecraft exploring interstellar space.',
    nasaUrl: 'https://science.nasa.gov/mission/voyager/'
  },
  sagittarius_a: {
    displayTitle: 'Sagittarius A*',
    tagline: 'The supermassive black hole anchoring the Milky Way.',
    nasaUrl: 'https://science.nasa.gov/universe/black-holes/'
  },
  milky_way: {
    displayTitle: 'The Milky Way',
    tagline: 'Our home barred spiral galaxy of hundreds of billions of stars.',
    nasaUrl: 'https://science.nasa.gov/universe/galaxies/'
  },
  andromeda: {
    displayTitle: 'Andromeda (M31)',
    tagline: 'Our nearest major galactic neighbor across 2.5 million light-years.',
    nasaUrl: 'https://science.nasa.gov/universe/galaxies/'
  },
  whirlpool_m51: {
    displayTitle: 'Whirlpool Galaxy (M51)',
    tagline: 'Grand-design two-arm spiral galaxy interacting with companion NGC 5195.',
    nasaUrl: 'https://science.nasa.gov/universe/galaxies/'
  }
};

// ============================================================================
// 4. REACT BITS <FlipCard /> COMPONENT + CSS
// ============================================================================
const FLIP_CARD_CSS = `
.flip-card {
  --fc-w: 370px;
  --fc-h: 445px;
  --fc-radius: 22px;
  --fc-bg: #0b0d12;
  --fc-ink: #f5f5f5;
  --fc-shadow: #000000;
  --fc-shadow-o: 0.55;
  --fc-glare: 0.22;

  position: relative;
  display: block;
  width: var(--fc-w);
  max-width: 100%;
  height: var(--fc-h);
  border-radius: var(--fc-radius);
  outline: none;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: pan-y;
}
.flip-card[data-axis='x'] { touch-action: pan-x; }
.flip-card[data-draggable] { cursor: grab; }
.flip-card[data-dragging] { cursor: grabbing; }
.flip-card[data-disabled] { cursor: default; opacity: 0.6; }

.flip-card__shadow {
  position: absolute;
  inset: 10% 8% -4%;
  border-radius: var(--fc-radius);
  background: rgba(0, 0, 0, var(--fc-shadow-o));
  filter: blur(22px);
  pointer-events: none;
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.flip-card__rotor {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  will-change: transform;
}

.flip-card__face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--fc-radius);
  background: var(--fc-bg);
  color: var(--fc-ink);
  border: 1px solid rgba(255, 255, 255, 0.14);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
}

.flip-card__face img { -webkit-user-drag: none; }
.flip-card__face--back { transform: rotateY(180deg); }
.flip-card[data-axis='x'] .flip-card__face--back { transform: rotateX(180deg); }

.flip-card__glare {
  position: absolute;
  inset: 0;
  border-radius: var(--fc-radius);
  background: radial-gradient(
    circle farthest-side at var(--fc-gx, 50%) var(--fc-gy, 50%),
    rgba(255, 255, 255, var(--fc-glare)) 0%,
    rgba(255, 255, 255, calc(var(--fc-glare) * 0.72)) 14%,
    rgba(255, 255, 255, calc(var(--fc-glare) * 0.42)) 30%,
    rgba(255, 255, 255, calc(var(--fc-glare) * 0.16)) 55%,
    rgba(255, 255, 255, 0) 100%
  );
  opacity: var(--fc-sheen, 0);
  pointer-events: none;
  transition: opacity 0.2s ease;
}
`;

const FC_SLOP = { fine: 5, coarse: 9 };
const FC_FLING = 0.16;
const FC_HISTORY_MS = 90;
const fcSnap = deg => Math.round(deg / 180) * 180;
const fcIsBack = deg => Math.abs(Math.round(deg / 180)) % 2 === 1;

function FlipCard({
  front = null,
  back = null,
  flipped,
  defaultFlipped = false,
  onFlipChange,
  axis = 'y',
  flipOnClick = true,
  draggable = true,
  dragDistance = 0,
  tilt = true,
  tiltMax = 10,
  glare = true,
  glareOpacity = 0.22,
  hoverScale = 1.02,
  perspective = 1100,
  stiffness = 170,
  damping = 20,
  width = 370,
  height = 445,
  radius = 22,
  background = 'rgba(11, 13, 18, 0.94)',
  color = '#f5f5f5',
  shadow = true,
  shadowColor = '#000000',
  shadowOpacity = 0.55,
  disabled = false,
  ariaLabel = 'Celestial Dossier Flip Card',
  className = ''
}) {
  const controlled = flipped !== undefined;
  const [inner, setInner] = useState(defaultFlipped);
  const [dragging, setDragging] = useState(false);
  const shown = controlled ? flipped : inner;
  const shownRef = useRef(shown);
  shownRef.current = shown;

  const rootRef = useRef(null);
  const rotorRef = useRef(null);
  const shadowRef = useRef(null);
  const grip = useRef(null);

  const animState = useRef({
    turn: shown ? 180 : 0,
    turnVel: 0,
    targetTurn: shown ? 180 : 0,
    tiltX: 0,
    targetTiltX: 0,
    tiltY: 0,
    targetTiltY: 0,
    lift: 1,
    targetLift: 1,
    sheen: 0,
    targetSheen: 0,
    gx: 50,
    gy: 50
  });

  const settle = useCallback(
    (to, velocity = 0) => {
      animState.current.targetTurn = to;
      animState.current.turnVel = velocity;
      const next = fcIsBack(to);
      if (next !== shownRef.current) {
        shownRef.current = next;
        if (!controlled) setInner(next);
        onFlipChange?.(next);
      }
    },
    [controlled, onFlipChange]
  );

  const flip = useCallback(() => {
    const base = fcSnap(animState.current.targetTurn);
    settle(fcIsBack(base) ? base - 180 : base + 180, 0);
  }, [settle]);

  const rest = useCallback(() => {
    animState.current.targetTiltX = 0;
    animState.current.targetTiltY = 0;
    animState.current.targetSheen = 0;
    animState.current.targetLift = 1;
  }, []);

  useEffect(() => {
    if (!controlled) return;
    if (fcIsBack(animState.current.targetTurn) !== flipped) {
      const base = animState.current.targetTurn;
      animState.current.targetTurn = fcIsBack(base) ? base - 180 : base + 180;
    }
  }, [controlled, flipped]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const step = now => {
      raf = requestAnimationFrame(step);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = animState.current;

      if (!grip.current?.moved) {
        const force = -stiffness * (s.turn - s.targetTurn);
        const damp = -damping * s.turnVel;
        s.turnVel += (force + damp) * dt;
        s.turn += s.turnVel * dt;
        if (Math.abs(s.turn - s.targetTurn) < 0.05 && Math.abs(s.turnVel) < 0.1) {
          s.turn = s.targetTurn;
          s.turnVel = 0;
        }
      }

      const k = 1 - Math.exp(-16 * dt);
      s.tiltX += (s.targetTiltX - s.tiltX) * k;
      s.tiltY += (s.targetTiltY - s.tiltY) * k;
      s.lift += (s.targetLift - s.lift) * k;
      s.sheen += (s.targetSheen - s.sheen) * k;

      if (rotorRef.current) {
        const transform =
          axis === 'x'
            ? `perspective(${perspective}px) scale(${s.lift.toFixed(4)}) rotateY(${s.tiltY.toFixed(2)}deg) rotateX(${(s.turn + s.tiltX).toFixed(2)}deg)`
            : `perspective(${perspective}px) scale(${s.lift.toFixed(4)}) rotateX(${s.tiltX.toFixed(2)}deg) rotateY(${(s.turn + s.tiltY).toFixed(2)}deg)`;
        rotorRef.current.style.transform = transform;
        rotorRef.current.style.setProperty('--fc-gx', `${s.gx.toFixed(1)}%`);
        rotorRef.current.style.setProperty('--fc-gy', `${s.gy.toFixed(1)}%`);
        rotorRef.current.style.setProperty('--fc-sheen', s.sheen.toFixed(3));
      }

      if (shadowRef.current) {
        const facing = Math.abs(Math.cos((s.turn * Math.PI) / 180));
        const spread = 0.08 + 0.92 * facing;
        const shade = 0.1 + 0.9 * facing * facing;
        shadowRef.current.style.transform = axis === 'x' ? `scaleY(${spread.toFixed(3)})` : `scaleX(${spread.toFixed(3)})`;
        shadowRef.current.style.opacity = shade.toFixed(3);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [axis, damping, perspective, stiffness]);

  const onPointerDown = e => {
    if (disabled || e.button !== 0 || grip.current) return;
    if (e.target instanceof Element && e.target.closest('button, input, a')) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    grip.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      base: animState.current.turn,
      moved: false,
      slop: e.pointerType === 'touch' ? FC_SLOP.coarse : FC_SLOP.fine,
      hist: []
    };
    animState.current.targetLift = hoverScale;
  };

  const onPointerMove = e => {
    const g = grip.current;
    if (g && g.id === e.pointerId) {
      const d = axis === 'x' ? e.clientY - g.y : e.clientX - g.x;
      if (!g.moved) {
        if (Math.abs(d) < g.slop || !draggable) return;
        g.moved = true;
        setDragging(true);
        animState.current.targetTiltX = 0;
        animState.current.targetTiltY = 0;
        animState.current.targetSheen = 0;
      }
      const span = dragDistance > 0 ? dragDistance : axis === 'x' ? height : width;
      const deg = g.base + (axis === 'x' ? -1 : 1) * (d / span) * 180;
      animState.current.turn = deg;
      animState.current.targetTurn = deg;
      const now = performance.now();
      g.hist.push({ t: now, v: deg });
      while (g.hist.length > 2 && now - g.hist[0].t > FC_HISTORY_MS) g.hist.shift();
      return;
    }

    if (!tilt || disabled || e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = gxClamp((e.clientX - r.left) / r.width, 0, 1);
    const py = gxClamp((e.clientY - r.top) / r.height, 0, 1);
    animState.current.targetTiltX = (0.5 - py) * 2 * tiltMax;
    animState.current.targetTiltY = (px - 0.5) * 2 * tiltMax;
    animState.current.gx = px * 100;
    animState.current.gy = py * 100;
    animState.current.targetSheen = 1;
  };

  const release = (e, cancelled) => {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setDragging(false);
    if (e.pointerType === 'touch' || !rootRef.current?.matches(':hover')) rest();

    if (!g.moved) {
      if (!cancelled && flipOnClick) flip();
      else settle(animState.current.targetTurn, 0);
      return;
    }

    const here = animState.current.turn;
    let velocity = 0;
    const a = g.hist[0];
    const b = g.hist[g.hist.length - 1];
    if (!cancelled && a && b && b.t > a.t && performance.now() - b.t < 60) {
      velocity = ((b.v - a.v) / (b.t - a.t)) * 1000;
    }
    const to = cancelled
      ? fcSnap(g.base)
      : gxClamp(fcSnap(here + velocity * FC_FLING), fcSnap(here) - 180, fcSnap(here) + 180);
    settle(to, velocity);
  };

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={shown}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={`flip-card${className ? ` ${className}` : ''}`}
      data-axis={axis}
      data-draggable={draggable && !disabled ? '' : undefined}
      data-dragging={dragging ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={e => release(e, false)}
      onPointerCancel={e => release(e, true)}
      onLostPointerCapture={e => release(e, true)}
      onPointerEnter={e => {
        if (!disabled && e.pointerType !== 'touch') animState.current.targetLift = hoverScale;
      }}
      onPointerLeave={() => {
        if (!grip.current) rest();
      }}
      onKeyDown={e => {
        if (disabled || (e.key !== 'Enter' && e.key !== ' ')) return;
        if (e.target instanceof Element && e.target.closest('button, input, a')) return;
        e.preventDefault();
        if (!e.repeat) flip();
      }}
      onDragStart={e => e.preventDefault()}
      style={{
        '--fc-w': `${width}px`,
        '--fc-h': `${height}px`,
        '--fc-radius': `${radius}px`,
        '--fc-bg': background,
        '--fc-ink': color,
        '--fc-shadow': shadowColor,
        '--fc-shadow-o': shadowOpacity,
        '--fc-glare': glareOpacity
      }}
    >
      {shadow ? <span ref={shadowRef} className="flip-card__shadow" aria-hidden="true" /> : null}
      <div ref={rotorRef} className="flip-card__rotor">
        <div className="flip-card__face flip-card__face--front backdrop-blur-xl" aria-hidden={shown}>
          {front}
          {glare ? <span className="flip-card__glare" aria-hidden="true" /> : null}
        </div>
        <div className="flip-card__face flip-card__face--back backdrop-blur-xl" aria-hidden={!shown}>
          {back}
          {glare ? <span className="flip-card__glare" aria-hidden="true" /> : null}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. COMPLETE 51-OBJECT CELESTIAL CATALOG WITH VERIFIED NASA & ISRO IMAGERY
// ============================================================================
const SECTOR_STEP_Z = 420;

const VERIFIED_SATELLITE_PHOTOS = {
  parker_solar: {
    primary: 'https://images-assets.nasa.gov/image/KSC-20180812-PH_KLS01_0063/KSC-20180812-PH_KLS01_0063~medium.jpg',
    backup: 'https://commons.wikimedia.org/wiki/Special:FilePath/Parker_Solar_Probe_Gets_Its_Revolutionary_Heat_Shield.jpg?width=900',
    query: 'Parker Solar Probe spacecraft'
  },
  aditya_l1: {
    primary: 'https://commons.wikimedia.org/wiki/Special:FilePath/Aditya-L1_spacecraft.jpg?width=900',
    backup: 'https://commons.wikimedia.org/wiki/Special:FilePath/PSLV-XL_(C57)_Aditya-L1_ISRO.jpg?width=900',
    query: 'solar observatory spacecraft sun'
  },
  gaganyaan_bas: {
    primary: 'https://commons.wikimedia.org/wiki/Special:FilePath/Gaganyaan_vehicle_used_for_TVD1_mission.webp?width=900',
    backup: 'https://commons.wikimedia.org/wiki/Special:FilePath/Simulated_Crew_Module_(SCM)_Structure_Assembly_for_the_Gaganyaan_project.jpg?width=900',
    query: 'spacecraft crew module capsule'
  },
  hubble: {
    primary: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e002151/GSFC_20171208_Archive_e002151~medium.jpg',
    backup: 'https://commons.wikimedia.org/wiki/Special:FilePath/HST-SM4.jpeg?width=900',
    query: 'Hubble Space Telescope orbit'
  },
  astrosat: {
    primary: 'https://commons.wikimedia.org/wiki/Special:FilePath/Astrosat-1_in_clean_room_with_its_solar-arrays_deployed.jpg?width=900',
    backup: 'https://commons.wikimedia.org/wiki/Special:FilePath/Astrosat-1_prelaunch_preparation_in_cleanroom_02.jpg?width=900',
    query: 'space telescope observatory cleanroom'
  },
  xposat: {
    primary: 'https://commons.wikimedia.org/wiki/Special:FilePath/X-ray_Polarimeter_satellite_(XPoSat).jpg?width=900',
    backup: 'https://commons.wikimedia.org/wiki/Special:FilePath/PSLV-C58_XPoSat_launch.jpg?width=900',
    query: 'IXPE X-ray observatory spacecraft'
  },
  nisar: {
    primary: 'https://commons.wikimedia.org/wiki/Special:FilePath/NISAR_Team_Deploys_Radar_Antenna_Reflector_(PIA26612).jpg?width=900',
    backup: 'https://images-assets.nasa.gov/image/PIA25776/PIA25776~medium.jpg',
    query: 'NISAR radar satellite'
  },
  chandrayaan3: {
    primary: 'https://commons.wikimedia.org/wiki/Special:FilePath/Chandrayaan_3_lander.jpg?width=900',
    backup: 'https://commons.wikimedia.org/wiki/Special:FilePath/Chandrayaan-3,_LVM3_M4_lifting_off_from_SDSC_SHAR.jpg?width=900',
    query: 'lunar lander spacecraft moon'
  },
  chandrayaan2: {
    primary: 'https://commons.wikimedia.org/wiki/Special:FilePath/GSLV_Mk_III_M1,_Chandrayaan-2_-_Vikram_lander_mounted_on_top_of_orbiter.jpg?width=900',
    backup: 'https://commons.wikimedia.org/wiki/Special:FilePath/Chandrayaan-2_orbiter_in_clean-room_being_integrated_with_payloads.jpg?width=900',
    query: 'lunar orbiter spacecraft'
  },
  jwst: {
    primary: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000282/GSFC_20171208_Archive_e000282~medium.jpg',
    backup: 'https://commons.wikimedia.org/wiki/Special:FilePath/James_Webb_Space_Telescope_2009_top.jpg?width=900',
    query: 'James Webb Space Telescope'
  },
  mangalyaan: {
    primary: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mars_Orbiter_Mission.jpg?width=900',
    backup: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mars_Orbiter_Mission_Spacecraft.jpg?width=900',
    query: 'Mars orbiter spacecraft'
  },
  cassini: {
    primary: 'https://images-assets.nasa.gov/image/PIA03883/PIA03883~medium.jpg',
    backup: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cassini_spacecraft_in_clean_room.jpg?width=900',
    query: 'Cassini spacecraft'
  },
  voyager1: {
    primary: 'https://images-assets.nasa.gov/image/PIA21740/PIA21740~medium.jpg',
    backup: 'https://commons.wikimedia.org/wiki/Special:FilePath/Voyager_spacecraft.jpg?width=900',
    query: 'Voyager spacecraft'
  }
};

const RAW_CELESTIAL_DATA = [
  {
    id: 'sun',
    name: 'THE SUN',
    subtitle: 'G-TYPE MAIN-SEQUENCE STAR • SOL (ORIGIN)',
    category: 'Stars & Nebulae',
    distanceAU: 0.0,
    distanceDisplay: '0.00 AU (Origin)',
    lightTime: '8.32 light-min',
    gravityG: 27.9,
    radiusKm: 696340,
    baseRadius: 32,
    yOffset: 0,
    colorHex: '#fbbf24',
    accentHex: '#f59e0b',
    nasaId: 'GSFC_20171208_Archive_e001435',
    image: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001435/GSFC_20171208_Archive_e001435~medium.jpg',
    description:
      'Containing 99.86% of the Solar System’s total mass, our star fuses 600 million tons of hydrogen into helium every second inside a 15-million-Kelvin core.',
    telemetry: {
      distanceFromSun: '0.00 AU (Origin)',
      mass: '1.989 × 10³⁰ kg',
      surfaceTemp: '5,778 K (Corona: 2M K)',
      gravity: '274.0 m/s² (27.9 g)',
      composition: '73% Hydrogen, 25% Helium'
    },
    missions: ['Aditya-L1 (ISRO)', 'Parker Solar Probe', 'Solar Orbiter', 'SDO']
  },
  {
    id: 'parker_solar',
    name: 'PARKER SOLAR PROBE',
    subtitle: 'TOUCHING THE SUN’S CORONA • 6.1M KM PERIHELION',
    category: 'Spacecraft',
    distanceAU: 0.046,
    distanceDisplay: '0.046 AU (6.9M km)',
    lightTime: '23.0 light-sec',
    gravityG: 0,
    radiusKm: 0.003,
    baseRadius: 11,
    yOffset: 1,
    isSpacecraft: true,
    spacecraftArchetype: 'parker',
    colorHex: '#f97316',
    accentHex: '#fb923c',
    nasaId: 'NHQ201808120006',
    image: VERIFIED_SATELLITE_PHOTOS.parker_solar.primary,
    description:
      'Protected by a 11.43 cm carbon-composite Thermal Protection System withstanding 1,377 °C, Parker Solar Probe is humanity’s fastest spacecraft at 692,000 km/h.',
    telemetry: {
      distanceFromSun: '0.046 AU (6.9M km)',
      mass: '685 kg (Launch)',
      surfaceTemp: '1,377 °C (Heat Shield)',
      gravity: 'Microgravity (Heliocentric)',
      composition: 'Carbon-Carbon Composite & Titanium'
    },
    missions: ['WISPR', 'FIELDS', 'SWEAP', 'IS☉IS']
  },
  {
    id: 'mercury',
    name: 'MERCURY',
    subtitle: '1ST PLANET FROM THE SUN • CALORIS BASIN',
    category: 'Planets & Moons',
    distanceAU: 0.39,
    distanceDisplay: '0.39 AU (57.9M km)',
    lightTime: '3.22 light-min',
    gravityG: 0.38,
    radiusKm: 2439.7,
    baseRadius: 13,
    yOffset: -1,
    colorHex: '#a8a29e',
    accentHex: '#d6d3d1',
    nasaId: 'PIA15162',
    image: 'https://images-assets.nasa.gov/image/PIA15162/PIA15162~medium.jpg',
    description:
      'A heavily cratered iron-rich world with an enormous metallic core spanning 85% of its radius and extreme thermal swings from -180 °C to +430 °C.',
    telemetry: {
      distanceFromSun: '0.39 AU (57.9M km)',
      mass: '3.285 × 10²³ kg',
      surfaceTemp: '-180 °C to +430 °C',
      gravity: '3.7 m/s² (0.38 g)',
      composition: 'Silicate Crust & Iron Core'
    },
    missions: ['MESSENGER', 'BepiColombo', 'Mariner 10']
  },
  {
    id: 'venus',
    name: 'VENUS',
    subtitle: '2ND PLANET FROM THE SUN • CO₂ GREENHOUSE WORLD',
    category: 'Planets & Moons',
    distanceAU: 0.72,
    distanceDisplay: '0.72 AU (108.2M km)',
    lightTime: '6.01 light-min',
    gravityG: 0.9,
    radiusKm: 6051.8,
    baseRadius: 16,
    yOffset: 1,
    hasAtmosphere: true,
    atmosphereColor: '#fde68a',
    colorHex: '#eab308',
    accentHex: '#fef08a',
    nasaId: 'PIA00271',
    image: 'https://images-assets.nasa.gov/image/PIA00271/PIA00271~medium.jpg',
    description:
      'Shrouded in reflective sulfuric acid clouds, Venus experiences a runaway greenhouse effect with surface pressures 92 times Earth’s and lead-melting heat.',
    telemetry: {
      distanceFromSun: '0.72 AU (108.2M km)',
      mass: '4.867 × 10²⁴ kg',
      surfaceTemp: '464 °C (Hottest Planet)',
      gravity: '8.87 m/s² (0.90 g)',
      composition: '96.5% CO₂, 3.5% N₂ Atmosphere'
    },
    missions: ['Shukrayaan-1 (ISRO)', 'Magellan', 'VERITAS', 'DAVINCI']
  },
  {
    id: 'aditya_l1',
    name: 'ADITYA-L1 (ISRO)',
    subtitle: 'INDIA’S FIRST SOLAR OBSERVATORY • SUN-EARTH L1',
    category: 'ISRO Missions',
    distanceAU: 0.99,
    distanceDisplay: '0.99 AU (Sun-Earth L1)',
    lightTime: '8.23 light-min',
    gravityG: 0,
    radiusKm: 0.004,
    baseRadius: 11,
    yOffset: 1,
    isIsro: true,
    isSpacecraft: true,
    spacecraftArchetype: 'aditya',
    colorHex: '#f97316',
    accentHex: '#fb923c',
    nasaId: 'PIA24924',
    image: VERIFIED_SATELLITE_PHOTOS.aditya_l1.primary,
    description:
      'Launched aboard PSLV-C57 into a halo orbit around Sun-Earth Lagrange Point 1 (1.5 million km from Earth), ISRO’s Aditya-L1 continuously observes the solar photosphere, chromosphere, and corona without eclipses.',
    telemetry: {
      distanceFromSun: '0.99 AU (Sun-Earth L1)',
      mass: '1,480.7 kg (Launch Mass)',
      surfaceTemp: '20 °C (Thermal Controlled)',
      gravity: 'Lagrange L1 Halo Equilibrium',
      composition: '7 Payloads: VELC, SUIT, SoLEXS, HEL1OS, ASPEX, PAPA, MAG'
    },
    missions: ['PSLV-C57', 'VELC Coronagraph', 'SUIT UV Imager', 'ISTRAC Bengaluru']
  },
  {
    id: 'earth',
    name: 'EARTH',
    subtitle: '3RD PLANET FROM THE SUN • OCEANIC BIOSPHERE',
    category: 'Planets & Moons',
    distanceAU: 1.0,
    distanceDisplay: '1.00 AU (149.6M km)',
    lightTime: '8.32 light-min',
    gravityG: 1.0,
    radiusKm: 6371,
    baseRadius: 17,
    yOffset: 0,
    hasAtmosphere: true,
    atmosphereColor: '#38bdf8',
    colorHex: '#3b82f6',
    accentHex: '#60a5fa',
    nasaId: 'PIA18033',
    image: 'https://images-assets.nasa.gov/image/PIA18033/PIA18033~medium.jpg',
    description:
      'The only known astronomical body harboring life, protected by a dynamic iron-nickel magnetosphere and covered 71% by liquid water oceans.',
    telemetry: {
      distanceFromSun: '1.00 AU (149.6M km)',
      mass: '5.972 × 10²⁴ kg',
      surfaceTemp: '15 °C (Mean)',
      gravity: '9.807 m/s² (1.00 g)',
      composition: '78% N₂, 21% O₂, Liquid H₂O'
    },
    missions: ['ISS', 'NISAR (ISRO-NASA)', 'EOS Fleet', 'Landsat 9']
  },
  {
    id: 'gaganyaan_bas',
    name: 'GAGANYAAN & BAS (ISRO)',
    subtitle: 'INDIA’S HUMAN SPACEFLIGHT & ORBITAL STATION',
    category: 'ISRO Missions',
    distanceAU: 1.0,
    distanceDisplay: '1.00 AU (400 km LEO)',
    lightTime: '1.33 light-ms',
    gravityG: 0,
    radiusKm: 0.008,
    baseRadius: 11,
    yOffset: 1,
    isIsro: true,
    isSpacecraft: true,
    spacecraftArchetype: 'gaganyaan',
    colorHex: '#fb923c',
    accentHex: '#38bdf8',
    nasaId: 'PIA13517',
    image: VERIFIED_SATELLITE_PHOTOS.gaganyaan_bas.primary,
    description:
      'ISRO’s indigenous human spaceflight program launched by Human-Rated LVM3 (HLVM3) to carry a 3-member Vyomanaut crew to a 400 km Low Earth Orbit, paving the way for the Bharatiya Antariksh Station (BAS).',
    telemetry: {
      distanceFromSun: '1.00 AU (400 km LEO)',
      mass: '8,200 kg (Orbital Module)',
      surfaceTemp: '22 °C (ECLSS Cabin)',
      gravity: 'Microgravity (90-Min Orbit)',
      composition: 'Crew Module + Service Module + ECLSS'
    },
    missions: ['HLVM3', 'TV-D1 Abort Test', 'Vyommitra', 'Bharatiya Antariksh Station']
  },
  {
    id: 'hubble',
    name: 'HUBBLE SPACE TELESCOPE',
    subtitle: '2.4M OPTICAL/UV ORBITAL OBSERVATORY • 540 KM LEO',
    category: 'Spacecraft',
    distanceAU: 1.0,
    distanceDisplay: '1.00 AU (540 km LEO)',
    lightTime: '1.80 light-ms',
    gravityG: 0,
    radiusKm: 0.013,
    baseRadius: 11,
    yOffset: -1,
    isSpacecraft: true,
    spacecraftArchetype: 'hubble',
    colorHex: '#94a3b8',
    accentHex: '#e2e8f0',
    nasaId: 'PIA16884',
    image: VERIFIED_SATELLITE_PHOTOS.hubble.primary,
    description:
      'Operating above Earth’s distorting atmosphere since 1990, Hubble has made over 1.6 million observations, pinning down the universe’s expansion rate and capturing the Deep Fields.',
    telemetry: {
      distanceFromSun: '1.00 AU (540 km LEO)',
      mass: '11,110 kg',
      surfaceTemp: '21 °C (Aft Shroud)',
      gravity: 'Microgravity (95-Min Orbit)',
      composition: '2.4m Ritchey–Chrétien Mirror'
    },
    missions: ['WFC3', 'COS', 'ACS', 'STIS']
  },
  {
    id: 'astrosat',
    name: 'ASTROSAT (ISRO)',
    subtitle: 'INDIA’S FIRST MULTI-WAVELENGTH SPACE OBSERVATORY',
    category: 'ISRO Missions',
    distanceAU: 1.0,
    distanceDisplay: '1.00 AU (650 km LEO)',
    lightTime: '2.17 light-ms',
    gravityG: 0,
    radiusKm: 0.005,
    baseRadius: 11,
    yOffset: 0,
    isIsro: true,
    isSpacecraft: true,
    spacecraftArchetype: 'observatory',
    colorHex: '#f97316',
    accentHex: '#a855f7',
    nasaId: 'ISRO_ASTROSAT',
    image: VERIFIED_SATELLITE_PHOTOS.astrosat.primary,
    description:
      'Launched on PSLV-C30 into a 650 km equatorial orbit, AstroSat simultaneously observes celestial sources across UV, optical, and soft/hard X-ray bands—discovering extreme-UV galaxies 9.3 billion light-years away.',
    telemetry: {
      distanceFromSun: '1.00 AU (650 km LEO)',
      mass: '1,513 kg',
      surfaceTemp: '-10 °C to +30 °C',
      gravity: 'Microgravity (6° Inclination)',
      composition: 'UVIT, LAXPC, SXT, CZTI, SSM'
    },
    missions: ['PSLV-C30', 'UVIT Twin Telescopes', 'CZTI Polarimetry', 'IUCAA / TIFR']
  },
  {
    id: 'xposat',
    name: 'XPOSAT (ISRO)',
    subtitle: 'X-RAY POLARIMETER SATELLITE • BLACK HOLE & PULSAR PROBE',
    category: 'ISRO Missions',
    distanceAU: 1.0,
    distanceDisplay: '1.00 AU (650 km LEO)',
    lightTime: '2.17 light-ms',
    gravityG: 0,
    radiusKm: 0.004,
    baseRadius: 10.5,
    yOffset: 1,
    isIsro: true,
    isSpacecraft: true,
    spacecraftArchetype: 'observatory',
    colorHex: '#fb923c',
    accentHex: '#22d3ee',
    nasaId: 'ISRO_XPOSAT',
    image: VERIFIED_SATELLITE_PHOTOS.xposat.primary,
    description:
      'Launched aboard PSLV-C58, XPoSat is the world’s second dedicated X-ray polarimetry mission, measuring polarization degree and angle from black hole accretion disks, magnetars, and pulsar wind nebulae.',
    telemetry: {
      distanceFromSun: '1.00 AU (650 km LEO)',
      mass: '469 kg (IMS-2 Bus)',
      surfaceTemp: '15 °C (Nominal)',
      gravity: 'Microgravity (6° Inclination)',
      composition: 'POLIX (8–30 keV) & XSPECT (0.8–15 keV)'
    },
    missions: ['PSLV-C58', 'POLIX (RRI)', 'XSPECT (URSC)', 'POEM-3 Platform']
  },
  {
    id: 'nisar',
    name: 'NISAR (ISRO–NASA)',
    subtitle: 'DUAL-FREQUENCY L & S-BAND RADAR EARTH OBSERVATORY',
    category: 'ISRO Missions',
    distanceAU: 1.0,
    distanceDisplay: '1.00 AU (747 km SSO)',
    lightTime: '2.49 light-ms',
    gravityG: 0,
    radiusKm: 0.012,
    baseRadius: 11.5,
    yOffset: -1,
    isIsro: true,
    isSpacecraft: true,
    spacecraftArchetype: 'nisar',
    colorHex: '#f97316',
    accentHex: '#3b82f6',
    nasaId: 'PIA25776',
    image: VERIFIED_SATELLITE_PHOTOS.nisar.primary,
    description:
      'A landmark joint mission between ISRO and NASA featuring a 12-meter deployable gold-plated mesh reflector and dual L-band & S-band Synthetic Aperture Radars to map Earth’s land and ice deformation every 12 days.',
    telemetry: {
      distanceFromSun: '1.00 AU (747 km SSO)',
      mass: '2,392 kg (I-3K Bus)',
      surfaceTemp: '18 °C (Nominal)',
      gravity: 'Sun-Synchronous Polar Orbit',
      composition: 'ISRO S-Band SAR + NASA L-Band SAR'
    },
    missions: ['GSLV Mk II', '12m Mesh Reflector', 'Cryosphere & Seismic Mapping']
  },
  {
    id: 'moon',
    name: 'THE MOON (LUNA)',
    subtitle: 'EARTH’S NATURAL SATELLITE • MARE TRANQUILLITATIS',
    category: 'Planets & Moons',
    distanceAU: 1.00257,
    distanceDisplay: '1.0026 AU (384,400 km)',
    lightTime: '1.28 light-sec',
    gravityG: 0.165,
    radiusKm: 1737.4,
    baseRadius: 12,
    yOffset: 0,
    colorHex: '#cbd5e1',
    accentHex: '#f8fafc',
    nasaId: 'PIA00405',
    image: 'https://images-assets.nasa.gov/image/PIA00405/PIA00405~medium.jpg',
    description:
      'Tidally locked to Earth, the Moon stabilizes our planet’s axial tilt and preserves a 4.5-billion-year record of early Solar System impacts and permanently shadowed polar ice.',
    telemetry: {
      distanceFromSun: '1.0026 AU (384,400 km from Earth)',
      mass: '7.342 × 10²² kg',
      surfaceTemp: '-173 °C to +127 °C',
      gravity: '1.62 m/s² (0.165 g)',
      composition: 'Anorthositic Highlands & Basalt Maria'
    },
    missions: ['Chandrayaan-1/2/3 (ISRO)', 'Apollo 11–17', 'Artemis', 'LRO']
  },
  {
    id: 'chandrayaan3',
    name: 'CHANDRAYAAN-3 (ISRO)',
    subtitle: 'VIKRAM LANDER & PRAGYAN ROVER • SHIV SHAKTI POINT',
    category: 'ISRO Missions',
    distanceAU: 1.00257,
    distanceDisplay: '1.0026 AU (Lunar South Pole)',
    lightTime: '1.28 light-sec',
    gravityG: 0.165,
    radiusKm: 0.003,
    baseRadius: 12,
    yOffset: 1,
    isIsro: true,
    isSpacecraft: true,
    spacecraftArchetype: 'chandrayaan3',
    colorHex: '#f97316',
    accentHex: '#facc15',
    nasaId: 'ISRO_CHANDRAYAAN3',
    image: VERIFIED_SATELLITE_PHOTOS.chandrayaan3.primary,
    description:
      'Launched on LVM3-M4, Chandrayaan-3 made India the first nation to achieve a soft landing near the Lunar South Pole (Shiv Shakti Point), deploying Pragyan rover to confirm sulfur and measure polar regolith thermal profiles.',
    telemetry: {
      distanceFromSun: '1.0026 AU (Lunar South Pole)',
      mass: '3,900 kg (Lander: 1,752 kg, Rover: 26 kg)',
      surfaceTemp: '-130 °C to +70 °C',
      gravity: '1.62 m/s² (Lunar Surface)',
      composition: 'ChaSTE, ILSA, RAMBHA-LP, APXS, LIBS, SHAPE'
    },
    missions: ['LVM3-M4', 'Vikram Hop Experiment', 'Pragyan Rover', 'ISTRAC / IDSN']
  },
  {
    id: 'chandrayaan2',
    name: 'CHANDRAYAAN-2 ORBITER (ISRO)',
    subtitle: 'HIGH-RESOLUTION LUNAR POLAR MAPPING ORBITER',
    category: 'ISRO Missions',
    distanceAU: 1.00257,
    distanceDisplay: '1.0026 AU (100 km Lunar Orbit)',
    lightTime: '1.28 light-sec',
    gravityG: 0,
    radiusKm: 0.004,
    baseRadius: 11,
    yOffset: -1,
    isIsro: true,
    isSpacecraft: true,
    spacecraftArchetype: 'orbiter_dish',
    colorHex: '#fb923c',
    accentHex: '#38bdf8',
    nasaId: 'ISRO_CHANDRAYAAN2',
    image: VERIFIED_SATELLITE_PHOTOS.chandrayaan2.primary,
    description:
      'Operating in a 100 × 100 km lunar polar orbit since 2019, ISRO’s Chandrayaan-2 Orbiter carries the highest-resolution lunar camera (OHRC at 0.32 m) and mapped hydroxyl/water molecules across the Moon.',
    telemetry: {
      distanceFromSun: '1.0026 AU (100 km Lunar Orbit)',
      mass: '2,379 kg (Orbiter)',
      surfaceTemp: '15 °C (Nominal)',
      gravity: 'Lunar Polar Orbit (118-Min Period)',
      composition: 'OHRC (0.32m), IIRS, DFSAR, CLASS, CHACE-2'
    },
    missions: ['GSLV Mk III-M1', 'OHRC Sub-Meter Imaging', 'DFSAR Polar Ice Radar']
  },
  {
    id: 'mars',
    name: 'MARS',
    subtitle: '4TH PLANET FROM THE SUN • OLYMPUS MONS & VALLES MARINERIS',
    category: 'Planets & Moons',
    distanceAU: 1.52,
    distanceDisplay: '1.52 AU (227.9M km)',
    lightTime: '12.67 light-min',
    gravityG: 0.38,
    radiusKm: 3389.5,
    baseRadius: 15.5,
    yOffset: 0,
    hasAtmosphere: true,
    atmosphereColor: '#fb923c',
    colorHex: '#ea580c',
    accentHex: '#fdba74',
    nasaId: 'PIA04591',
    image: 'https://images-assets.nasa.gov/image/PIA04591/PIA04591~medium.jpg',
    description:
      'Home to the Solar System’s largest volcano (Olympus Mons) and deepest canyon system (Valles Marineris), Mars preserves ancient river deltas and polar water-ice caps.',
    telemetry: {
      distanceFromSun: '1.52 AU (227.9M km)',
      mass: '6.39 × 10²³ kg',
      surfaceTemp: '-65 °C (Mean)',
      gravity: '3.72 m/s² (0.38 g)',
      composition: '95% CO₂ Air, Iron Oxide Dust'
    },
    missions: ['Mangalyaan (ISRO)', 'Perseverance', 'Curiosity', 'MRO']
  },
  {
    id: 'phobos',
    name: 'PHOBOS',
    subtitle: 'INNER POTATO-SHAPED MOON OF MARS • STICKNEY CRATER',
    category: 'Planets & Moons',
    distanceAU: 1.52006,
    distanceDisplay: '1.52 AU (9,376 km from Mars)',
    lightTime: '12.67 light-min',
    gravityG: 0.00058,
    radiusKm: 11.27,
    baseRadius: 10.5,
    yOffset: 1,
    colorHex: '#a8a29e',
    accentHex: '#78716c',
    nasaId: 'PIA10368',
    image: 'https://images-assets.nasa.gov/image/PIA10368/PIA10368~medium.jpg',
    description:
      'Orbiting closer to Mars than any other known planetary moon, Phobos completes three orbits every Martian day and is slowly spiraling inward toward the Red Planet.',
    telemetry: {
      distanceFromSun: '1.52 AU (9,376 km from Mars)',
      mass: '1.0659 × 10¹⁶ kg',
      surfaceTemp: '-40 °C (Mean)',
      gravity: '0.0057 m/s² (0.00058 g)',
      composition: 'Carbonaceous Chondrite Regolith'
    },
    missions: ['Mars Express', 'MRO HiRISE', 'MMX (JAXA)']
  },
  {
    id: 'deimos',
    name: 'DEIMOS',
    subtitle: 'OUTER MARTIAN MOON • SMOOTH REGOLITH BLANKET',
    category: 'Planets & Moons',
    distanceAU: 1.52015,
    distanceDisplay: '1.52 AU (23,463 km from Mars)',
    lightTime: '12.67 light-min',
    gravityG: 0.0003,
    radiusKm: 6.2,
    baseRadius: 10,
    yOffset: -1,
    colorHex: '#d6d3d1',
    accentHex: '#a8a29e',
    nasaId: 'PIA11826',
    image: 'https://images-assets.nasa.gov/image/PIA11826/PIA11826~medium.jpg',
    description:
      'The smaller and outermost of Mars’s two natural satellites, Deimos has a remarkably smooth surface buried beneath up to 100 meters of fine impact ejecta dust.',
    telemetry: {
      distanceFromSun: '1.52 AU (23,463 km from Mars)',
      mass: '1.476 × 10¹⁵ kg',
      surfaceTemp: '-40 °C (Mean)',
      gravity: '0.003 m/s² (0.0003 g)',
      composition: 'D-Type Asteroid Carbonaceous Rock'
    },
    missions: ['Hope Mars Mission', 'MRO', 'Viking 2']
  },
  {
    id: 'mangalyaan',
    name: 'MANGALYAAN — MOM (ISRO)',
    subtitle: 'INDIA’S MAIDEN INTERPLANETARY PROBE • MARS ORBIT',
    category: 'ISRO Missions',
    distanceAU: 1.52,
    distanceDisplay: '1.52 AU (Mars Orbit)',
    lightTime: '12.67 light-min',
    gravityG: 0,
    radiusKm: 0.002,
    baseRadius: 11,
    yOffset: 1,
    isIsro: true,
    isSpacecraft: true,
    spacecraftArchetype: 'orbiter_dish',
    colorHex: '#f97316',
    accentHex: '#ef4444',
    nasaId: 'ISRO_MANGALYAAN',
    image: VERIFIED_SATELLITE_PHOTOS.mangalyaan.primary,
    description:
      'Launched on PSLV-C25, ISRO’s Mars Orbiter Mission (Mangalyaan) made India the first Asian nation to reach Martian orbit and the first in the world on its maiden attempt—operating for 8 years instead of 6 months.',
    telemetry: {
      distanceFromSun: '1.52 AU (372 × 71,000 km Mars Orbit)',
      mass: '1,337.2 kg (Launch Mass)',
      surfaceTemp: '15 °C (Bus Nominal)',
      gravity: '72.9-Hour Martian Elliptical Orbit',
      composition: 'MCC, MENCA, MSM, TIS, LAP'
    },
    missions: ['PSLV-C25', 'Mars Colour Camera (MCC)', 'IDSN 32m Byalalu']
  },
  {
    id: 'vesta',
    name: '4 VESTA',
    subtitle: 'MAIN ASTEROID BELT PROTOPLANET • RHEASILVIA BASIN',
    category: 'Planets & Moons',
    distanceAU: 2.36,
    distanceDisplay: '2.36 AU (353M km)',
    lightTime: '19.63 light-min',
    gravityG: 0.025,
    radiusKm: 262.7,
    baseRadius: 11,
    yOffset: -1,
    colorHex: '#a1a1aa',
    accentHex: '#e4e4e7',
    nasaId: 'PIA15678',
    image: 'https://images-assets.nasa.gov/image/PIA15678/PIA15678~medium.jpg',
    description:
      'The second-most massive body in the Main Asteroid Belt, Vesta possesses an iron-nickel core and a colossal south-polar impact mountain rising 22 km above its basin floor.',
    telemetry: {
      distanceFromSun: '2.36 AU (353M km)',
      mass: '2.59 × 10²⁰ kg',
      surfaceTemp: '-188 °C to -20 °C',
      gravity: '0.25 m/s² (0.025 g)',
      composition: 'Basaltic Eucrite & Howardite Crust'
    },
    missions: ['Dawn Orbiter']
  },
  {
    id: 'ceres',
    name: 'CERES',
    subtitle: 'MAIN-BELT DWARF PLANET • OCCATOR BRIGHT SPOTS',
    category: 'Planets & Moons',
    distanceAU: 2.77,
    distanceDisplay: '2.77 AU (414M km)',
    lightTime: '23.04 light-min',
    gravityG: 0.029,
    radiusKm: 473,
    baseRadius: 11.5,
    yOffset: 0,
    colorHex: '#78716c',
    accentHex: '#d6d3d1',
    nasaId: 'PIA21906',
    image: 'https://images-assets.nasa.gov/image/PIA21906/PIA21906~medium.jpg',
    description:
      'Comprising a third of the Main Asteroid Belt’s total mass, Ceres harbors a briny subsurface ocean reservoir that erupted sodium carbonate deposits inside Occator Crater.',
    telemetry: {
      distanceFromSun: '2.77 AU (414M km)',
      mass: '9.38 × 10²⁰ kg',
      surfaceTemp: '-105 °C (Mean)',
      gravity: '0.28 m/s² (0.029 g)',
      composition: 'Water Ice Mantle & Phyllosilicates'
    },
    missions: ['Dawn Orbiter']
  },
  {
    id: 'jupiter',
    name: 'JUPITER',
    subtitle: '5TH PLANET FROM THE SUN • GREAT RED SPOT & MOONS',
    category: 'Planets & Moons',
    distanceAU: 5.2,
    distanceDisplay: '5.20 AU (778.5M km)',
    lightTime: '43.25 light-min',
    gravityG: 2.53,
    radiusKm: 69911,
    baseRadius: 23,
    yOffset: 0,
    hasAtmosphere: true,
    atmosphereColor: '#fdba74',
    colorHex: '#d97706',
    accentHex: '#fbbf24',
    nasaId: 'PIA22946',
    image: 'https://images-assets.nasa.gov/image/PIA22946/PIA22946~medium.jpg',
    description:
      'More than twice as massive as all other Solar System planets combined, Jupiter hosts 95 known moons, a metallic hydrogen dynamo, and the centuries-old Great Red Spot anticyclone.',
    telemetry: {
      distanceFromSun: '5.20 AU (778.5M km)',
      mass: '1.898 × 10²⁷ kg (318 Earths)',
      surfaceTemp: '-110 °C (1-bar Cloud Top)',
      gravity: '24.79 m/s² (2.53 g)',
      composition: '90% Hydrogen, 10% Helium'
    },
    missions: ['Juno', 'Europa Clipper', 'JUICE', 'Galileo']
  },
  {
    id: 'io',
    name: 'IO',
    subtitle: 'VOLCANIC GALILEAN MOON • LOKI PATERA',
    category: 'Planets & Moons',
    distanceAU: 5.203,
    distanceDisplay: '5.203 AU (421,700 km)',
    lightTime: '43.27 light-min',
    gravityG: 0.183,
    radiusKm: 1821.6,
    baseRadius: 11,
    yOffset: 1,
    colorHex: '#facc15',
    accentHex: '#fef08a',
    nasaId: 'PIA02308',
    image: 'https://images-assets.nasa.gov/image/PIA02308/PIA02308~medium.jpg',
    description:
      'Caught in a Laplace orbital resonance with Europa and Ganymede, Io experiences intense tidal flexing that drives over 400 active silicate-sulfur volcanoes.',
    telemetry: {
      distanceFromSun: '5.203 AU (421,700 km from Jupiter)',
      mass: '8.93 × 10²² kg',
      surfaceTemp: '-143 °C (Lavas: 1,600 °C)',
      gravity: '1.796 m/s² (0.183 g)',
      composition: 'Silicate Rock & Sulfur Dioxide Frost'
    },
    missions: ['Juno Flybys', 'Galileo', 'Voyager 1']
  },
  {
    id: 'europa',
    name: 'EUROPA',
    subtitle: 'SUBSURFACE SALTWATER OCEAN MOON',
    category: 'Planets & Moons',
    distanceAU: 5.205,
    distanceDisplay: '5.205 AU (671,100 km)',
    lightTime: '43.29 light-min',
    gravityG: 0.134,
    radiusKm: 1560.8,
    baseRadius: 11,
    yOffset: -1,
    colorHex: '#e2e8f0',
    accentHex: '#bae6fd',
    nasaId: 'PIA19048',
    image: 'https://images-assets.nasa.gov/image/PIA19048/PIA19048~medium.jpg',
    description:
      'Beneath Europa’s fractured 15–25 km water-ice crust lies a global liquid ocean holding twice the water of all Earth’s oceans combined—a premier astrobiology target.',
    telemetry: {
      distanceFromSun: '5.205 AU (671,100 km from Jupiter)',
      mass: '4.80 × 10²² kg',
      surfaceTemp: '-171 °C (Surface Ice)',
      gravity: '1.315 m/s² (0.134 g)',
      composition: 'Water-Ice Shell over Global Ocean'
    },
    missions: ['Europa Clipper', 'JUICE', 'Galileo']
  },
  {
    id: 'ganymede',
    name: 'GANYMEDE',
    subtitle: 'LARGEST MOON IN THE SOLAR SYSTEM',
    category: 'Planets & Moons',
    distanceAU: 5.207,
    distanceDisplay: '5.207 AU (1.07M km)',
    lightTime: '43.31 light-min',
    gravityG: 0.146,
    radiusKm: 2634.1,
    baseRadius: 12.5,
    yOffset: 0,
    colorHex: '#94a3b8',
    accentHex: '#cbd5e1',
    nasaId: 'PIA00716',
    image: 'https://images-assets.nasa.gov/image/PIA00716/PIA00716~medium.jpg',
    description:
      'Larger than the planet Mercury, Ganymede is the only moon known to generate its own intrinsic dipole magnetosphere from a liquid iron core.',
    telemetry: {
      distanceFromSun: '5.207 AU (1.07M km from Jupiter)',
      mass: '1.48 × 10²³ kg',
      surfaceTemp: '-163 °C',
      gravity: '1.428 m/s² (0.146 g)',
      composition: 'Silicate Rock, Ice & Subsurface Brine'
    },
    missions: ['ESA JUICE', 'Juno', 'Galileo']
  },
  {
    id: 'callisto',
    name: 'CALLISTO',
    subtitle: 'OUTERMOST GALILEAN MOON • VALHALLA MULTI-RING BASIN',
    category: 'Planets & Moons',
    distanceAU: 5.212,
    distanceDisplay: '5.212 AU (1.88M km from Jupiter)',
    lightTime: '43.35 light-min',
    gravityG: 0.126,
    radiusKm: 2410.3,
    baseRadius: 12,
    yOffset: 1,
    colorHex: '#64748b',
    accentHex: '#cbd5e1',
    nasaId: 'PIA03456',
    image: 'https://images-assets.nasa.gov/image/PIA03456/PIA03456~medium.jpg',
    description:
      'The most heavily cratered object in the Solar System, Callisto orbits outside Jupiter’s main radiation belt and harbors a deep subsurface liquid water ocean.',
    telemetry: {
      distanceFromSun: '5.212 AU (1.88M km from Jupiter)',
      mass: '1.076 × 10²³ kg',
      surfaceTemp: '-139 °C',
      gravity: '1.235 m/s² (0.126 g)',
      composition: 'Equal Parts Rock & Water Ice'
    },
    missions: ['ESA JUICE', 'Galileo', 'Voyager 1 & 2']
  },
  {
    id: 'saturn',
    name: 'SATURN',
    subtitle: '6TH PLANET FROM THE SUN • RINGED JEWEL & HEXAGON',
    category: 'Planets & Moons',
    distanceAU: 9.58,
    distanceDisplay: '9.58 AU (1.43B km)',
    lightTime: '79.68 light-min',
    gravityG: 1.065,
    radiusKm: 58232,
    baseRadius: 20,
    yOffset: 0,
    hasRings: true,
    hasAtmosphere: true,
    atmosphereColor: '#fde047',
    colorHex: '#eab308',
    accentHex: '#fef08a',
    nasaId: 'PIA11141',
    image: 'https://images-assets.nasa.gov/image/PIA11141/PIA11141~medium.jpg',
    description:
      'Adorned by a 282,000-km-wide ring system composed of 99.9% pure water ice chunks, Saturn has a bulk density lower than water and 146 confirmed moons.',
    telemetry: {
      distanceFromSun: '9.58 AU (1.43B km)',
      mass: '5.683 × 10²⁶ kg (95 Earths)',
      surfaceTemp: '-140 °C (Cloud Tops)',
      gravity: '10.44 m/s² (1.065 g)',
      composition: '96% Hydrogen, 3% Helium, Ice Rings'
    },
    missions: ['Cassini-Huygens', 'Voyager 1 & 2', 'Pioneer 11']
  },
  {
    id: 'enceladus',
    name: 'ENCELADUS',
    subtitle: 'CRYOVOLCANIC TIGER-STRIPE PLUME MOON',
    category: 'Planets & Moons',
    distanceAU: 9.582,
    distanceDisplay: '9.582 AU (238,000 km)',
    lightTime: '79.70 light-min',
    gravityG: 0.011,
    radiusKm: 252.1,
    baseRadius: 10.5,
    yOffset: -1,
    colorHex: '#f8fafc',
    accentHex: '#38bdf8',
    nasaId: 'PIA17184',
    image: 'https://images-assets.nasa.gov/image/PIA17184/PIA17184~medium.jpg',
    description:
      'Reflecting nearly 100% of sunlight, Enceladus vents supersonic geysers of water vapor, molecular hydrogen, and complex organic molecules into Saturn’s E-ring.',
    telemetry: {
      distanceFromSun: '9.582 AU (238,000 km from Saturn)',
      mass: '1.08 × 10²⁰ kg',
      surfaceTemp: '-198 °C',
      gravity: '0.113 m/s² (0.011 g)',
      composition: 'Pure Water Ice & Hydrothermal Ocean'
    },
    missions: ['Cassini Plume Sampling']
  },
  {
    id: 'titan',
    name: 'TITAN',
    subtitle: 'METHANE LAKES & DENSE NITROGEN ATMOSPHERE',
    category: 'Planets & Moons',
    distanceAU: 9.588,
    distanceDisplay: '9.588 AU (1.22M km)',
    lightTime: '79.75 light-min',
    gravityG: 0.138,
    radiusKm: 2574.7,
    baseRadius: 12.5,
    yOffset: 1,
    hasAtmosphere: true,
    atmosphereColor: '#f59e0b',
    colorHex: '#d97706',
    accentHex: '#fbbf24',
    nasaId: 'PIA20016',
    image: 'https://images-assets.nasa.gov/image/PIA20016/PIA20016~medium.jpg',
    description:
      'The only moon with a thick atmosphere (1.45 bar) and stable surface seas of liquid methane and ethane (Kraken Mare), making it a prebiotic chemistry laboratory.',
    telemetry: {
      distanceFromSun: '9.588 AU (1.22M km from Saturn)',
      mass: '1.345 × 10²³ kg',
      surfaceTemp: '-179.5 °C',
      gravity: '1.352 m/s² (0.138 g)',
      composition: '95% N₂, 5% CH₄, Hydrocarbon Seas'
    },
    missions: ['Huygens Lander', 'Cassini', 'Dragonfly Rotorcraft']
  },
  {
    id: 'cassini',
    name: 'CASSINI–HUYGENS',
    subtitle: 'SATURN SYSTEM ORBITER & TITAN LANDER',
    category: 'Spacecraft',
    distanceAU: 9.59,
    distanceDisplay: '9.59 AU (Saturn System)',
    lightTime: '79.77 light-min',
    gravityG: 0,
    radiusKm: 0.007,
    baseRadius: 11,
    yOffset: 0,
    isSpacecraft: true,
    spacecraftArchetype: 'cassini',
    colorHex: '#eab308',
    accentHex: '#38bdf8',
    nasaId: 'PIA08329',
    image: VERIFIED_SATELLITE_PHOTOS.cassini.primary,
    description:
      'Orbiting Saturn for 13 years (2004–2017), Cassini discovered Enceladus’s water plumes, landed Huygens on Titan, and concluded with its daring Grand Finale ring-gap dives.',
    telemetry: {
      distanceFromSun: '9.59 AU (Saturn System)',
      mass: '5,712 kg (With Huygens)',
      surfaceTemp: '15 °C (RTG Heated)',
      gravity: 'Saturnian Polar Orbit',
      composition: '3 RTGs + 4m High-Gain Dish'
    },
    missions: ['ISS Cameras', 'INMS', 'VIMS', 'Huygens Probe']
  },
  {
    id: 'halley',
    name: 'COMET 1P/HALLEY',
    subtitle: 'PERIODIC SHORT-PERIOD COMET • 75.3-YEAR ORBIT',
    category: 'Planets & Moons',
    distanceAU: 17.83,
    distanceDisplay: '17.83 AU (0.59–35.1 AU)',
    lightTime: '2.47 light-hrs',
    gravityG: 0.0002,
    radiusKm: 5.5,
    baseRadius: 11,
    yOffset: 1,
    isComet: true,
    colorHex: '#38bdf8',
    accentHex: '#bae6fd',
    nasaId: 'PIA01349',
    image: 'https://images-assets.nasa.gov/image/PIA01349/PIA01349~medium.jpg',
    description:
      'Observed since 240 BCE, Halley’s peanut-shaped icy nucleus sublimates dramatic blue ion and white dust tails as it plunges inside Venus’s orbit every 75–76 years (next perihelion: 2061).',
    telemetry: {
      distanceFromSun: '17.83 AU Semi-Major (0.59–35.1 AU)',
      mass: '2.2 × 10¹⁴ kg',
      surfaceTemp: '-100 °C to +77 °C',
      gravity: '0.002 m/s²',
      composition: 'Water Ice, CO, CO₂ & Carbonaceous Dust'
    },
    missions: ['Giotto', 'Vega 1 & 2', 'Suisei']
  },
  {
    id: 'uranus',
    name: 'URANUS',
    subtitle: '7TH PLANET FROM THE SUN • AXIAL-TILTED ICE GIANT',
    category: 'Planets & Moons',
    distanceAU: 19.2,
    distanceDisplay: '19.20 AU (2.87B km)',
    lightTime: '2.52 light-hrs',
    gravityG: 0.886,
    radiusKm: 25362,
    baseRadius: 18,
    yOffset: 0,
    hasRings: true,
    hasAtmosphere: true,
    atmosphereColor: '#67e8f9',
    colorHex: '#38bdf8',
    accentHex: '#a5f3fc',
    nasaId: 'PIA18182',
    image: 'https://images-assets.nasa.gov/image/PIA18182/PIA18182~medium.jpg',
    description:
      'Knocked onto a 97.77° axial tilt by a primordial mega-impact, Uranus rolls around the Sun with 42-year-long polar seasons and a supercritical water-ammonia mantle.',
    telemetry: {
      distanceFromSun: '19.20 AU (2.87B km)',
      mass: '8.681 × 10²⁵ kg (14.5 Earths)',
      surfaceTemp: '-224 °C (Minimum)',
      gravity: '8.69 m/s² (0.886 g)',
      composition: 'Water, Ammonia & Methane Ices'
    },
    missions: ['Voyager 2', 'Uranus Orbiter & Probe (Proposed)']
  },
  {
    id: 'neptune',
    name: 'NEPTUNE',
    subtitle: '8TH PLANET FROM THE SUN • SUPERSONIC WIND ICE GIANT',
    category: 'Planets & Moons',
    distanceAU: 30.05,
    distanceDisplay: '30.05 AU (4.50B km)',
    lightTime: '4.17 light-hrs',
    gravityG: 1.14,
    radiusKm: 24622,
    baseRadius: 18,
    yOffset: 0,
    hasAtmosphere: true,
    atmosphereColor: '#3b82f6',
    colorHex: '#2563eb',
    accentHex: '#93c5fd',
    nasaId: 'PIA01492',
    image: 'https://images-assets.nasa.gov/image/PIA01492/PIA01492~medium.jpg',
    description:
      'The outermost major planet, predicted mathematically before visual discovery, radiates 2.6 times more internal heat than it receives from the distant Sun, fueling supersonic methane storms.',
    telemetry: {
      distanceFromSun: '30.05 AU (4.50B km)',
      mass: '1.024 × 10²⁶ kg (17.1 Earths)',
      surfaceTemp: '-214 °C',
      gravity: '11.15 m/s² (1.14 g)',
      composition: 'H₂, He, CH₄ & Superionic Water Mantle'
    },
    missions: ['Voyager 2']
  },
  {
    id: 'triton',
    name: 'TRITON',
    subtitle: 'CAPTURED KUIPER-BELT RETROGRADE MOON',
    category: 'Planets & Moons',
    distanceAU: 30.052,
    distanceDisplay: '30.052 AU (354,759 km)',
    lightTime: '4.17 light-hrs',
    gravityG: 0.079,
    radiusKm: 1353.4,
    baseRadius: 11,
    yOffset: 1,
    colorHex: '#cbd5e1',
    accentHex: '#fda4af',
    nasaId: 'PIA00317',
    image: 'https://images-assets.nasa.gov/image/PIA00317/PIA00317~medium.jpg',
    description:
      'Orbiting Neptune backwards in a retrograde inclination, Triton is a captured Kuiper Belt world featuring cantaloupe terrain and 8-km-high nitrogen geysers.',
    telemetry: {
      distanceFromSun: '30.052 AU (354,759 km from Neptune)',
      mass: '2.14 × 10²² kg',
      surfaceTemp: '-235 °C (Coldest Measured Surface)',
      gravity: '0.779 m/s² (0.079 g)',
      composition: 'Nitrogen Ice Crust & Water-Ice Mantle'
    },
    missions: ['Voyager 2']
  },
  {
    id: 'pluto',
    name: 'PLUTO',
    subtitle: 'KUIPER BELT DWARF PLANET • SPUTNIK PLANITIA',
    category: 'Planets & Moons',
    distanceAU: 39.48,
    distanceDisplay: '39.48 AU (5.91B km)',
    lightTime: '5.47 light-hrs',
    gravityG: 0.063,
    radiusKm: 1188.3,
    baseRadius: 11,
    yOffset: -1,
    colorHex: '#d6d3d1',
    accentHex: '#fed7aa',
    nasaId: 'PIA19952',
    image: 'https://images-assets.nasa.gov/image/PIA19952/PIA19952~medium.jpg',
    description:
      'Revealed by New Horizons to be geologically active, Pluto boasts a 1,000-km convecting nitrogen-ice glacier (Tombaugh Regio), water-ice mountains, and blue atmospheric haze layers.',
    telemetry: {
      distanceFromSun: '39.48 AU (5.91B km)',
      mass: '1.303 × 10²² kg',
      surfaceTemp: '-229 °C',
      gravity: '0.62 m/s² (0.063 g)',
      composition: 'Nitrogen, Methane & CO Ices'
    },
    missions: ['New Horizons']
  },
  {
    id: 'charon',
    name: 'CHARON',
    subtitle: 'PLUTO’S BINARY COMPANION • MORDOR MACULA',
    category: 'Planets & Moons',
    distanceAU: 39.48,
    distanceDisplay: '39.48 AU (19,591 km)',
    lightTime: '5.47 light-hrs',
    gravityG: 0.029,
    radiusKm: 606,
    baseRadius: 10,
    yOffset: 1,
    colorHex: '#78716c',
    accentHex: '#a8a29e',
    nasaId: 'PIA19968',
    image: 'https://images-assets.nasa.gov/image/PIA19968/PIA19968~medium.jpg',
    description:
      'Half the diameter of Pluto, Charon and Pluto orbit a common barycenter outside Pluto’s surface—forming a true double-planet system with canyons four times deeper than the Grand Canyon.',
    telemetry: {
      distanceFromSun: '39.48 AU (19,591 km from Pluto)',
      mass: '1.586 × 10²¹ kg',
      surfaceTemp: '-220 °C',
      gravity: '0.288 m/s² (0.029 g)',
      composition: 'Water Ice & Tholin Polar Cap'
    },
    missions: ['New Horizons']
  },
  {
    id: 'haumea',
    name: 'HAUMEA',
    subtitle: 'FAST-SPINNING ELLIPSOIDAL KUIPER DWARF PLANET & RINGS',
    category: 'Planets & Moons',
    distanceAU: 43.13,
    distanceDisplay: '43.13 AU (6.45B km)',
    lightTime: '5.98 light-hrs',
    gravityG: 0.044,
    radiusKm: 780,
    baseRadius: 11,
    yOffset: 0,
    hasRings: true,
    colorHex: '#e2e8f0',
    accentHex: '#38bdf8',
    nasaId: 'PIA19952',
    image: 'https://images-assets.nasa.gov/image/PIA19952/PIA19952~medium.jpg',
    description:
      'Rotating once every 3.9 hours—the fastest spin of any large body in the Solar System—Haumea is stretched into a rugby-ball triaxial ellipsoid encircled by a narrow ring and two moons.',
    telemetry: {
      distanceFromSun: '43.13 AU (6.45B km)',
      mass: '4.006 × 10²¹ kg',
      surfaceTemp: '-241 °C',
      gravity: '0.401 m/s² (0.044 g)',
      composition: 'Crystalline Water Ice Shell over Rocky Core'
    },
    missions: ['JWST NIRSpec', 'Hubble Space Telescope']
  },
  {
    id: 'makemake',
    name: 'MAKEMAKE',
    subtitle: 'BRIGHT KUIPER BELT DWARF PLANET • MK2 MOON',
    category: 'Planets & Moons',
    distanceAU: 45.79,
    distanceDisplay: '45.79 AU (6.85B km)',
    lightTime: '6.35 light-hrs',
    gravityG: 0.05,
    radiusKm: 715,
    baseRadius: 11,
    yOffset: -1,
    colorHex: '#f59e0b',
    accentHex: '#fed7aa',
    nasaId: 'PIA03034',
    image: 'https://images-assets.nasa.gov/image/PIA03034/PIA03034~medium.jpg',
    description:
      'The second-brightest object in the Kuiper Belt after Pluto, Makemake’s reddish-brown surface is carpeted in frozen methane, ethane, and nitrogen pellets.',
    telemetry: {
      distanceFromSun: '45.79 AU (6.85B km)',
      mass: '~3.1 × 10²¹ kg',
      surfaceTemp: '-243 °C',
      gravity: '0.50 m/s² (0.05 g)',
      composition: 'Frozen Methane & Tholin Ice'
    },
    missions: ['Hubble WFC3', 'JWST']
  },
  {
    id: 'eris',
    name: 'ERIS',
    subtitle: 'SCATTERED-DISC DWARF PLANET • DYSNOMIA',
    category: 'Planets & Moons',
    distanceAU: 67.8,
    distanceDisplay: '67.8 AU (10.1B km)',
    lightTime: '9.40 light-hrs',
    gravityG: 0.084,
    radiusKm: 1163,
    baseRadius: 11,
    yOffset: 0,
    colorHex: '#e2e8f0',
    accentHex: '#f8fafc',
    nasaId: 'PIA03034',
    image: 'https://images-assets.nasa.gov/image/PIA03034/PIA03034~medium.jpg',
    description:
      'The most massive known dwarf planet in the Solar System, Eris’s discovery in 2005 prompted the IAU to formally define the term "planet".',
    telemetry: {
      distanceFromSun: '67.8 AU (10.1B km)',
      mass: '1.646 × 10²² kg (27% > Pluto)',
      surfaceTemp: '-243 °C',
      gravity: '0.82 m/s² (0.084 g)',
      composition: 'Methane Ice & Rocky Core'
    },
    missions: ['Keck / Hubble / JWST']
  },
  {
    id: 'sedna',
    name: '90377 SEDNA',
    subtitle: 'INNER OORT CLOUD DETACHED TRANS-NEPTUNIAN WORLD',
    category: 'Planets & Moons',
    distanceAU: 84.0,
    distanceDisplay: '84.0 AU (Aphelion: 937 AU)',
    lightTime: '11.64 light-hrs',
    gravityG: 0.034,
    radiusKm: 497,
    baseRadius: 10.5,
    yOffset: 1,
    colorHex: '#dc2626',
    accentHex: '#fb923c',
    nasaId: 'PIA05566',
    image: 'https://images-assets.nasa.gov/image/PIA05566/PIA05566~medium.jpg',
    description:
      'Following an extraordinary 11,400-year elliptical orbit stretching out to 937 AU, Sedna is one of the reddest objects in the Solar System and bridges the Kuiper Belt and Oort Cloud.',
    telemetry: {
      distanceFromSun: '84.0 AU Current (76–937 AU Orbit)',
      mass: '~1.0 × 10²¹ kg',
      surfaceTemp: '-261 °C',
      gravity: '~0.33 m/s² (0.034 g)',
      composition: 'Tholin Hydrocarbon Sludge & Nitrogen Ice'
    },
    missions: ['Palomar / Spitzer / Hubble']
  },
  {
    id: 'voyager1',
    name: 'VOYAGER 1',
    subtitle: 'INTERSTELLAR SPACE EXPLORER • GOLDEN RECORD',
    category: 'Spacecraft',
    distanceAU: 166.4,
    distanceDisplay: '166.4 AU (24.9B km)',
    lightTime: '23.07 light-hrs',
    gravityG: 0,
    radiusKm: 0.004,
    baseRadius: 11,
    yOffset: -1,
    isSpacecraft: true,
    spacecraftArchetype: 'voyager',
    colorHex: '#eab308',
    accentHex: '#38bdf8',
    nasaId: 'PIA17462',
    image: VERIFIED_SATELLITE_PHOTOS.voyager1.primary,
    description:
      'Launched in 1977 and traveling at 61,200 km/h, Voyager 1 crossed the heliopause into interstellar medium in 2012—carrying humanity’s Golden Record across the stars.',
    telemetry: {
      distanceFromSun: '166.4 AU (24.9B km)',
      mass: '721.9 kg',
      surfaceTemp: '-79 °C (Instrument Bus)',
      gravity: 'Hyperbolic Solar Escape',
      composition: '3 MHW-RTGs + 3.7m Dish + Golden Record'
    },
    missions: ['Interstellar Mission', 'Pale Blue Dot', 'CRS / PWS']
  },
  {
    id: 'proxima_centauri',
    name: 'PROXIMA CENTAURI',
    subtitle: 'NEAREST STAR TO THE SUN • M5.5Ve RED DWARF',
    category: 'Stars & Nebulae',
    distanceAU: 268550,
    distanceDisplay: '4.246 LY (1.30 pc)',
    lightTime: '4.246 light-yrs',
    gravityG: 160,
    radiusKm: 107280,
    baseRadius: 17,
    yOffset: 0,
    colorHex: '#ef4444',
    accentHex: '#fca5a5',
    nasaId: 'PIA20690',
    image: 'https://images-assets.nasa.gov/image/PIA20690/PIA20690~medium.jpg',
    description:
      'A flare-active red dwarf bound to the Alpha Centauri triple system, Proxima Centauri is the closest known stellar neighbor to Earth at 4.246 light-years.',
    telemetry: {
      distanceFromSun: '4.246 Light-Years (1.30 pc)',
      mass: '0.122 Solar Masses',
      surfaceTemp: '3,042 K',
      gravity: '1,580 m/s² (160 g)',
      composition: 'Fully Convective Hydrogen Plasma'
    },
    missions: ['ESO HARPS', 'VLT ESPRESSO', 'JWST']
  },
  {
    id: 'proxima_b',
    name: 'PROXIMA CENTAURI B',
    subtitle: 'NEAREST TEMPERATE TERRESTRIAL EXOPLANET',
    category: 'Exoplanets',
    distanceAU: 268550,
    distanceDisplay: '4.246 LY (0.0485 AU)',
    lightTime: '4.246 light-yrs',
    gravityG: 1.1,
    radiusKm: 6800,
    baseRadius: 14,
    yOffset: 0,
    hasAtmosphere: true,
    atmosphereColor: '#f87171',
    colorHex: '#dc2626',
    accentHex: '#fdba74',
    nasaId: 'PIA20692',
    image: 'https://images-assets.nasa.gov/image/PIA20692/PIA20692~medium.jpg',
    description:
      'Orbiting inside Proxima Centauri’s habitable zone every 11.2 days, this 1.07-Earth-mass rocky world is the closest known exoplanet to our Solar System.',
    telemetry: {
      distanceFromSun: '4.246 Light-Years (0.0485 AU from Star)',
      mass: '1.07 Earth Masses (Min)',
      surfaceTemp: '-39 °C (Equilibrium)',
      gravity: '~10.8 m/s² (~1.10 g)',
      composition: 'Silicate-Iron Terrestrial'
    },
    missions: ['ESO 3.6m HARPS', 'JWST NIRSpec']
  },
  {
    id: 'sirius',
    name: 'SIRIUS A & B',
    subtitle: 'BRIGHTEST STAR IN EARTH’S NIGHT SKY • BINARY SYSTEM',
    category: 'Stars & Nebulae',
    distanceAU: 543900,
    distanceDisplay: '8.60 LY (2.64 pc)',
    lightTime: '8.60 light-yrs',
    gravityG: 22.8,
    radiusKm: 1190000,
    baseRadius: 20,
    yOffset: 0,
    colorHex: '#93c5fd',
    accentHex: '#eff6ff',
    nasaId: 'GSFC_20171208_Archive_e001933',
    image: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001933/GSFC_20171208_Archive_e001933~medium.jpg',
    description:
      'Twenty-five times more luminous than the Sun, blue-white Sirius A is orbited every 50.1 years by Sirius B—an Earth-sized white dwarf remnant with a density 200,000 times that of Earth.',
    telemetry: {
      distanceFromSun: '8.60 Light-Years (2.64 pc)',
      mass: '2.06 M☉ (A) + 1.02 M☉ (B)',
      surfaceTemp: '9,940 K (A) / 25,200 K (B)',
      gravity: '224 m/s² (A) / 3.5M m/s² (B)',
      composition: 'A1V Main Sequence + DA2 White Dwarf'
    },
    missions: ['Hubble Space Telescope', 'Chandra X-Ray']
  },
  {
    id: 'trappist1e',
    name: 'TRAPPIST-1E',
    subtitle: 'HABITABLE-ZONE EARTH-SIZED EXOPLANET',
    category: 'Exoplanets',
    distanceAU: 2574000,
    distanceDisplay: '40.7 LY (Aquarius)',
    lightTime: '40.7 light-yrs',
    gravityG: 0.93,
    radiusKm: 5861,
    baseRadius: 14,
    yOffset: 0,
    hasAtmosphere: true,
    atmosphereColor: '#38bdf8',
    colorHex: '#0284c7',
    accentHex: '#7dd3fc',
    nasaId: 'PIA21428',
    image: 'https://images-assets.nasa.gov/image/PIA21428/PIA21428~medium.jpg',
    description:
      'One of seven Earth-sized worlds packed around an ultra-cool red dwarf, TRAPPIST-1e sits squarely in the conservative habitable zone where liquid water oceans can persist.',
    telemetry: {
      distanceFromSun: '40.7 Light-Years (Aquarius)',
      mass: '0.692 Earth Masses',
      surfaceTemp: '-22 °C (Equilibrium)',
      gravity: '9.12 m/s² (0.93 g)',
      composition: 'Dense Iron-Silicate Core & Volatile Shell'
    },
    missions: ['JWST Transmission Spectroscopy', 'Spitzer']
  },
  {
    id: 'hd189733b',
    name: 'HD 189733B',
    subtitle: 'COBALT-BLUE HOT JUPITER • GLASS RAIN WINDS',
    category: 'Exoplanets',
    distanceAU: 4079000,
    distanceDisplay: '64.5 LY (Vulpecula)',
    lightTime: '64.5 light-yrs',
    gravityG: 2.2,
    radiusKm: 81300,
    baseRadius: 18,
    yOffset: 0,
    hasAtmosphere: true,
    atmosphereColor: '#2563eb',
    colorHex: '#1d4ed8',
    accentHex: '#60a5fa',
    nasaId: 'PIA17005',
    image: 'https://images-assets.nasa.gov/image/PIA17005/PIA17005~medium.jpg',
    description:
      'A tidally locked gas giant whipping 8,700 km/h winds laden with molten silicate droplets that scatter deep azure light.',
    telemetry: {
      distanceFromSun: '64.5 Light-Years (Vulpecula)',
      mass: '1.13 Jupiter Masses',
      surfaceTemp: '930 °C (Dayside)',
      gravity: '21.6 m/s² (2.20 g)',
      composition: 'H₂, He, H₂O & Silicate Aerosols'
    },
    missions: ['Hubble STIS', 'Spitzer', 'JWST']
  },
  {
    id: 'betelgeuse',
    name: 'BETELGEUSE',
    subtitle: 'RED SUPERGIANT IN ORION • SUPERNOVA PROGENITOR',
    category: 'Stars & Nebulae',
    distanceAU: 34656000,
    distanceDisplay: '548 LY (Orion)',
    lightTime: '548 light-yrs',
    gravityG: 0.0003,
    radiusKm: 617000000,
    baseRadius: 26,
    yOffset: 0,
    colorHex: '#ea580c',
    accentHex: '#fdba74',
    nasaId: 'heic2002a',
    image: 'https://images-assets.nasa.gov/image/heic2002a/heic2002a~medium.jpg',
    description:
      'If placed at the center of our Solar System, Betelgeuse’s boiling convective photosphere would engulf Mercury, Venus, Earth, Mars, and reach Jupiter’s orbit.',
    telemetry: {
      distanceFromSun: '548 Light-Years (Orion)',
      mass: '16.5–19 Solar Masses',
      surfaceTemp: '3,500 K',
      gravity: '0.003 m/s²',
      composition: 'Helium-Burning Red Supergiant'
    },
    missions: ['Hubble', 'ESO VLT SPHERE', 'ALMA']
  },
  {
    id: 'helix_nebula',
    name: 'HELIX NEBULA (NGC 7293)',
    subtitle: 'PLANETARY NEBULA • THE EYE OF GOD',
    category: 'Stars & Nebulae',
    distanceAU: 41423000,
    distanceDisplay: '655 LY (Aquarius)',
    lightTime: '655 light-yrs',
    gravityG: 0,
    radiusKm: 2.7e13,
    baseRadius: 21,
    yOffset: 0,
    isNebula: true,
    colorHex: '#06b6d4',
    accentHex: '#f43f5e',
    nasaId: 'PIA09178',
    image: 'https://images-assets.nasa.gov/image/PIA09178/PIA09178~medium.jpg',
    description:
      'One of the closest planetary nebulae to Earth, formed as a Sun-like star shed its outer ionized shells around a 120,000 K central white dwarf.',
    telemetry: {
      distanceFromSun: '655 Light-Years (Aquarius)',
      mass: '~0.65 Solar Masses (Central WD)',
      surfaceTemp: '10,000 K (Ionized Gas)',
      gravity: 'Expanding Shell (31 km/s)',
      composition: 'Ionized Hydrogen, Oxygen & Nitrogen'
    },
    missions: ['Hubble', 'Spitzer', 'GALEX']
  },
  {
    id: 'orion_nebula',
    name: 'ORION NEBULA (M42)',
    subtitle: 'STELLAR NURSERY & TRAPEZIUM CLUSTER',
    category: 'Stars & Nebulae',
    distanceAU: 84995000,
    distanceDisplay: '1,344 LY (Orion)',
    lightTime: '1,344 light-yrs',
    gravityG: 0,
    radiusKm: 1.1e14,
    baseRadius: 22,
    yOffset: 0,
    isNebula: true,
    colorHex: '#ec4899',
    accentHex: '#8b5cf6',
    nasaId: 'PIA08653',
    image: 'https://images-assets.nasa.gov/image/PIA08653/PIA08653~medium.jpg',
    description:
      'Visible to the naked eye below Orion’s Belt, M42 is a 24-light-year-wide H II star-forming region forging over 700 protostars and protoplanetary disks.',
    telemetry: {
      distanceFromSun: '1,344 Light-Years (Orion)',
      mass: '~2,000 Solar Masses',
      surfaceTemp: '10,000 K (H II Region)',
      gravity: 'Turbulent Molecular Cloud',
      composition: 'Ionized H, He, C, N, O & PAHs'
    },
    missions: ['JWST NIRCam', 'Hubble ACS', 'Chandra']
  },
  {
    id: 'horsehead_nebula',
    name: 'HORSEHEAD NEBULA (BARNARD 33)',
    subtitle: 'DARK MOLECULAR CLOUD IN ORION B',
    category: 'Stars & Nebulae',
    distanceAU: 86955000,
    distanceDisplay: '1,375 LY (Orion)',
    lightTime: '1,375 light-yrs',
    gravityG: 0,
    radiusKm: 3.3e13,
    baseRadius: 21,
    yOffset: 0,
    isNebula: true,
    colorHex: '#e11d48',
    accentHex: '#fda4af',
    nasaId: 'heic1307a',
    image: 'https://images-assets.nasa.gov/image/heic1307a/heic1307a~medium.jpg',
    description:
      'A dense, cold pillar of interstellar dust and molecular hydrogen silhouetted against the glowing crimson H-alpha emission of IC 434.',
    telemetry: {
      distanceFromSun: '1,375 Light-Years (Orion)',
      mass: '~27 Solar Masses (Pillar)',
      surfaceTemp: '10–20 K (Dense Core)',
      gravity: 'Collapsing Protostellar Clumps',
      composition: 'Molecular H₂, Carbon Monoxide & Silicate Dust'
    },
    missions: ['JWST MIRI', 'Hubble WFC3', 'Euclid']
  },
  {
    id: 'kepler452b',
    name: 'KEPLER-452B',
    subtitle: 'SUPER-EARTH ORBITING A G2V SOLAR TWIN',
    category: 'Exoplanets',
    distanceAU: 113834000,
    distanceDisplay: '1,800 LY (Cygnus)',
    lightTime: '1,800 light-yrs',
    gravityG: 1.9,
    radiusKm: 9550,
    baseRadius: 15,
    yOffset: 0,
    hasAtmosphere: true,
    atmosphereColor: '#34d399',
    colorHex: '#059669',
    accentHex: '#6ee7b7',
    nasaId: 'PIA19832',
    image: 'https://images-assets.nasa.gov/image/PIA19832/PIA19832~medium.jpg',
    description:
      'Completing a 385-day orbit in the habitable zone of a Sun-like G2 star, Kepler-452b is 60% wider than Earth and represents an older, warmer cousin of our homeworld.',
    telemetry: {
      distanceFromSun: '1,800 Light-Years (Cygnus)',
      mass: '~5 Earth Masses (Est.)',
      surfaceTemp: '-8 °C (Equilibrium)',
      gravity: '~18.6 m/s² (~1.9 g)',
      composition: 'Silicate-Iron Super-Earth'
    },
    missions: ['Kepler Space Telescope']
  },
  {
    id: 'pulsar_b1919',
    name: 'PSR B1919+21 PULSAR',
    subtitle: 'FIRST DISCOVERED RADIO PULSAR • NEUTRON STAR',
    category: 'Stars & Nebulae',
    distanceAU: 144379000,
    distanceDisplay: '2,283 LY (Vulpecula)',
    lightTime: '2,283 light-yrs',
    gravityG: 1.4e11,
    radiusKm: 10,
    baseRadius: 14,
    yOffset: 0,
    isPulsar: true,
    colorHex: '#38bdf8',
    accentHex: '#e0f2fe',
    nasaId: 'PIA23865',
    image: 'https://images-assets.nasa.gov/image/PIA23865/PIA23865~medium.jpg',
    description:
      'Discovered by Jocelyn Bell Burnell in 1967, this city-sized collapsed stellar core packs 1.4 solar masses into a 20-km sphere, sweeping relativistic radio beams every 1.337 seconds.',
    telemetry: {
      distanceFromSun: '2,283 Light-Years (Vulpecula)',
      mass: '1.40 Solar Masses',
      surfaceTemp: '600,000 K',
      gravity: '1.4 × 10¹² m/s² (140B g)',
      composition: 'Superfluid Neutron Degenerate Matter'
    },
    missions: ['XPoSat (ISRO)', 'NICER', 'Jodrell Bank']
  },
  {
    id: 'ring_nebula',
    name: 'RING NEBULA (M57)',
    subtitle: 'BIPOLAR IONIZED SHELL IN LYRA',
    category: 'Stars & Nebulae',
    distanceAU: 145454000,
    distanceDisplay: '2,300 LY (Lyra)',
    lightTime: '2,300 light-yrs',
    gravityG: 0,
    radiusKm: 1.2e13,
    baseRadius: 20,
    yOffset: 0,
    isNebula: true,
    colorHex: '#10b981',
    accentHex: '#f43f5e',
    nasaId: 'weic2320a',
    image: 'https://images-assets.nasa.gov/image/weic2320a/weic2320a~medium.jpg',
    description:
      'Imaged in unprecedented detail by JWST, M57’s glowing emerald-and-crimson ring consists of 20,000 dense molecular hydrogen globules sculpted by UV radiation.',
    telemetry: {
      distanceFromSun: '2,300 Light-Years (Lyra)',
      mass: '0.62 Solar Masses (White Dwarf)',
      surfaceTemp: '125,000 K (Central Star)',
      gravity: 'Expanding Bipolar Lobes',
      composition: 'H₂, Doubly Ionized Oxygen [O III], He'
    },
    missions: ['JWST NIRCam & MIRI', 'Hubble']
  },
  {
    id: 'crab_nebula',
    name: 'CRAB NEBULA (M1)',
    subtitle: 'SUPERNOVA REMNANT OF SN 1054 & PULSAR WIND NEBULA',
    category: 'Stars & Nebulae',
    distanceAU: 411066000,
    distanceDisplay: '6,500 LY (Taurus)',
    lightTime: '6,500 light-yrs',
    gravityG: 0,
    radiusKm: 5.2e13,
    baseRadius: 21,
    yOffset: 0,
    isNebula: true,
    colorHex: '#f97316',
    accentHex: '#38bdf8',
    nasaId: 'PIA17563',
    image: 'https://images-assets.nasa.gov/image/PIA17563/PIA17563~medium.jpg',
    description:
      'Expanding at 1,500 km/s since Chinese and Arab astronomers recorded the guest star of 1054 CE, M1 is powered at its core by a pulsar spinning 30.2 times per second.',
    telemetry: {
      distanceFromSun: '6,500 Light-Years (Taurus)',
      mass: '4.6 Solar Masses',
      surfaceTemp: '10,000–1,000,000 K (X-Ray)',
      gravity: 'Relativistic Synchrotron Wind',
      composition: 'Ionized H, He, S, Fe & Pulsar Jets'
    },
    missions: ['AstroSat CZTI (ISRO)', 'JWST', 'Chandra', 'IXPE']
  },
  {
    id: 'pillars_of_creation',
    name: 'PILLARS OF CREATION (M16)',
    subtitle: 'EAGLE NEBULA STAR-FORMING ELEPHANT TRUNKS',
    category: 'Stars & Nebulae',
    distanceAU: 442687000,
    distanceDisplay: '7,000 LY (Serpens)',
    lightTime: '7,000 light-yrs',
    gravityG: 0,
    radiusKm: 4.7e13,
    baseRadius: 21,
    yOffset: 0,
    isNebula: true,
    colorHex: '#d97706',
    accentHex: '#38bdf8',
    nasaId: 'GSFC_20171208_Archive_e000842',
    image: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000842/GSFC_20171208_Archive_e000842~medium.jpg',
    description:
      'Towering 5 light-years tall inside the Eagle Nebula, these cold columns of molecular hydrogen and dust are slowly photo-evaporated by ultraviolet light from nearby O-type stars.',
    telemetry: {
      distanceFromSun: '7,000 Light-Years (Serpens)',
      mass: '~200 Solar Masses',
      surfaceTemp: '10–30 K (Protostellar Cores)',
      gravity: 'Gravitational Collapse',
      composition: 'Molecular H₂, Dust & Embedded Protostars'
    },
    missions: ['JWST NIRCam', 'Hubble WFC3']
  },
  {
    id: 'eta_carinae',
    name: 'ETA CARINAE',
    subtitle: 'LUMINOUS BLUE VARIABLE HYPERGIANT & HOMUNCULUS NEBULA',
    category: 'Stars & Nebulae',
    distanceAU: 474307000,
    distanceDisplay: '7,500 LY (Carina)',
    lightTime: '7,500 light-yrs',
    gravityG: 0.01,
    radiusKm: 1.67e8,
    baseRadius: 21,
    yOffset: 0,
    isNebula: true,
    colorHex: '#fb7185',
    accentHex: '#fde047',
    nasaId: 'PIA18842',
    image: 'https://images-assets.nasa.gov/image/PIA18842/PIA18842~medium.jpg',
    description:
      'Shining 5 million times brighter than the Sun, this 100-solar-mass binary hypergiant erupted in the 1843 Great Eruption, ejecting twin expanding lobes of gas and dust.',
    telemetry: {
      distanceFromSun: '7,500 Light-Years (Carina)',
      mass: '~100 M☉ + ~30 M☉ Companion',
      surfaceTemp: '9,400–35,000 K',
      gravity: 'Eddington-Limit Radiation Wind',
      composition: 'Nitrogen-Enriched Ejecta & CNO Plasma'
    },
    missions: ['Hubble', 'Chandra', 'VLTI GRAVITY']
  },
  {
    id: 'carina_nebula',
    name: 'CARINA NEBULA (NGC 3372)',
    subtitle: 'COSMIC CLIFFS • NGC 3324 STARBURST COMPLEX',
    category: 'Stars & Nebulae',
    distanceAU: 480631000,
    distanceDisplay: '7,600 LY (Carina)',
    lightTime: '7,600 light-yrs',
    gravityG: 0,
    radiusKm: 2.2e15,
    baseRadius: 22,
    yOffset: 0,
    isNebula: true,
    colorHex: '#f59e0b',
    accentHex: '#38bdf8',
    nasaId: 'weic2205a',
    image: 'https://images-assets.nasa.gov/image/weic2205a/weic2205a~medium.jpg',
    description:
      'Spanning over 460 light-years, the Carina Nebula is one of the largest and brightest diffuse nebulae in our sky, home to dozens of massive O-type stars and the 7-light-year-tall Cosmic Cliffs.',
    telemetry: {
      distanceFromSun: '7,600 Light-Years (Carina)',
      mass: '~900,000 Solar Masses',
      surfaceTemp: '10,000 K (Ionized Cavern)',
      gravity: 'Massive Star Cluster Complex',
      composition: 'Ionized Hydrogen, Sulfur, Oxygen & Dust'
    },
    missions: ['JWST First Light', 'Hubble', 'Chandra']
  },
  {
    id: 'sagittarius_a',
    name: 'SAGITTARIUS A*',
    subtitle: 'MILKY WAY CENTRAL SUPERMASSIVE BLACK HOLE',
    category: 'Galaxies',
    distanceAU: 1686830000,
    distanceDisplay: '26,673 LY (Galactic Center)',
    lightTime: '26,673 light-yrs',
    gravityG: 4.3e12,
    radiusKm: 12000000,
    baseRadius: 21,
    yOffset: 0,
    isBlackHole: true,
    colorHex: '#f97316',
    accentHex: '#fde047',
    nasaId: 'weic2208a',
    image: 'https://images-assets.nasa.gov/image/weic2208a/weic2208a~medium.jpg',
    description:
      'Anchoring the gravitational center of the Milky Way, Sagittarius A* packs 4.297 million solar masses inside an event horizon smaller than Mercury’s orbit.',
    telemetry: {
      distanceFromSun: '26,673 Light-Years (Galactic Center)',
      mass: '4.297 × 10⁶ Solar Masses',
      surfaceTemp: '1.4 × 10⁻¹⁴ K (Hawking) / 10¹⁰ K Ring',
      gravity: 'Infinite at Singularity',
      composition: 'Relativistic Magnetized Accretion Plasma'
    },
    missions: ['Event Horizon Telescope (EHT)', 'VLTI GRAVITY']
  },
  {
    id: 'milky_way',
    name: 'MILKY WAY GALAXY',
    subtitle: 'BARRED SPIRAL HOME GALAXY • 100–400 BILLION STARS',
    category: 'Galaxies',
    distanceAU: 1686830000,
    distanceDisplay: '105,700 LY Across',
    lightTime: '26,673 light-yrs',
    gravityG: 0,
    radiusKm: 5e17,
    baseRadius: 22,
    yOffset: 0,
    isGalaxy: true,
    colorHex: '#60a5fa',
    accentHex: '#fde68a',
    nasaId: 'weic2209a',
    image: 'https://images-assets.nasa.gov/image/weic2209a/weic2209a~medium.jpg',
    description:
      'Our home barred spiral galaxy (SBbc), containing 100 to 400 billion stars and a supermassive dark matter halo, through which the Sun completes one galactic orbit every 230 million years.',
    telemetry: {
      distanceFromSun: '26,673 LY to Core (Diameter: 105,700 LY)',
      mass: '1.15 × 10¹² Solar Masses',
      surfaceTemp: '10–10⁷ K (Multiphase ISM)',
      gravity: '~2.0 × 10⁻¹⁰ m/s² (Solar Orbit)',
      composition: 'Barred Spiral (SBbc) • 100–400B Stars'
    },
    missions: ['Gaia Astrometry', 'Event Horizon Telescope', 'JWST']
  },
  {
    id: 'andromeda',
    name: 'ANDROMEDA GALAXY (M31)',
    subtitle: 'NEAREST MAJOR SPIRAL GALAXY • LOCAL GROUP GIANT',
    category: 'Galaxies',
    distanceAU: 1.604e11,
    distanceDisplay: '2.537M LY (Andromeda)',
    lightTime: '2.537M light-yrs',
    gravityG: 0,
    radiusKm: 1.04e18,
    baseRadius: 23,
    yOffset: 0,
    isGalaxy: true,
    isBinaryOrbitsGalaxy: true,
    colorHex: '#a5b4fc',
    accentHex: '#fefce8',
    nasaId: 'PIA15416',
    image: 'https://images-assets.nasa.gov/image/PIA15416/PIA15416~medium.jpg',
    description:
      'Spanning 220,000 light-years across and containing roughly one trillion stars, Andromeda is the largest galaxy in the Local Group and is approaching the Milky Way at 110 km/s.',
    telemetry: {
      distanceFromSun: '2.537 Million Light-Years',
      mass: '~1.5 × 10¹² Solar Masses',
      surfaceTemp: 'Active Star-Forming Spiral Arms',
      gravity: 'Local Group Dominant Tilted Spiral',
      composition: '~1 Trillion Stars & 450 Globular Clusters'
    },
    missions: ['Hubble PHAT Survey', 'GALEX', 'Euclid']
  },
  {
    id: 'tarantula_nebula',
    name: 'TARANTULA NEBULA (30 DORADUS)',
    subtitle: 'LARGE MAGELLANIC CLOUD HYPER-STARBURST REGION',
    category: 'Stars & Nebulae',
    distanceAU: 1.011e10,
    distanceDisplay: '160,000 LY (LMC)',
    lightTime: '160,000 light-yrs',
    gravityG: 0,
    radiusKm: 4.5e15,
    baseRadius: 22,
    yOffset: 0,
    isNebula: true,
    colorHex: '#f43f5e',
    accentHex: '#38bdf8',
    nasaId: 'weic2212a',
    image: 'https://images-assets.nasa.gov/image/weic2212a/weic2212a~medium.jpg',
    description:
      'The most active and luminous starburst region in the entire Local Group of galaxies, housing R136a1—one of the most massive stars ever discovered at ~200 solar masses.',
    telemetry: {
      distanceFromSun: '160,000 Light-Years (Large Magellanic Cloud)',
      mass: '~450,000 Solar Masses (R136 Core)',
      surfaceTemp: '10,000–50,000 K (Ionized Filaments)',
      gravity: 'Local Group’s Brightest Stellar Nursery',
      composition: 'Ionized Hydrogen, Helium & Wolf-Rayet Winds'
    },
    missions: ['JWST NIRCam & MIRI', 'Hubble', 'Chandra']
  },
  {
    id: 'triangulum',
    name: 'TRIANGULUM GALAXY (M33)',
    subtitle: 'THIRD-LARGEST LOCAL GROUP SPIRAL • NGC 604',
    category: 'Galaxies',
    distanceAU: 1.726e11,
    distanceDisplay: '2.73M LY (Triangulum)',
    lightTime: '2.73M light-yrs',
    gravityG: 0,
    radiusKm: 2.8e17,
    baseRadius: 21,
    yOffset: 0,
    isGalaxy: true,
    colorHex: '#38bdf8',
    accentHex: '#f472b6',
    nasaId: 'heic1901a',
    image: 'https://images-assets.nasa.gov/image/heic1901a/heic1901a~medium.jpg',
    description:
      'A pristine unbarred spiral galaxy 60,000 light-years across that lacks a central bulge, housing NGC 604—one of the largest known H II star-forming regions in the Local Group.',
    telemetry: {
      distanceFromSun: '2.73 Million Light-Years',
      mass: '~5 × 10¹⁰ Solar Masses',
      surfaceTemp: 'Active Starburst Arms',
      gravity: '40 Billion Stars',
      composition: 'SA(s)cd Spiral & Giant H II Regions'
    },
    missions: ['Hubble 665-Megapixel Mosaic']
  },
  {
    id: 'centaurus_a',
    name: 'CENTAURUS A (NGC 5128)',
    subtitle: 'PECULIAR LENTICULAR RADIO GALAXY & RELATIVISTIC JETS',
    category: 'Galaxies',
    distanceAU: 7.589e11,
    distanceDisplay: '12.0M LY (Centaurus)',
    lightTime: '12.0M light-yrs',
    gravityG: 0,
    radiusKm: 4.5e17,
    baseRadius: 21,
    yOffset: 0,
    isGalaxy: true,
    colorHex: '#f59e0b',
    accentHex: '#38bdf8',
    nasaId: 'PIA14102',
    image: 'https://images-assets.nasa.gov/image/PIA14102/PIA14102~medium.jpg',
    description:
      'The closest active galactic nucleus to Earth, warped by a past collision between an elliptical and a spiral galaxy, launching million-light-year relativistic jets from a 55-million-solar-mass black hole.',
    telemetry: {
      distanceFromSun: '12.0 Million Light-Years (Centaurus)',
      mass: '~1 × 10¹² Solar Masses (SMBH: 55M M☉)',
      surfaceTemp: 'Relativistic X-Ray / Radio Jets',
      gravity: 'Active Galactic Nucleus (AGN)',
      composition: 'Elliptical Halo + Warped Dust Lane'
    },
    missions: ['Event Horizon Telescope', 'Chandra', 'Hubble']
  },
  {
    id: 'pinwheel_m101',
    name: 'PINWHEEL GALAXY (M101)',
    subtitle: 'FACE-ON GRAND-DESIGN SPIRAL IN URSA MAJOR',
    category: 'Galaxies',
    distanceAU: 1.322e12,
    distanceDisplay: '20.9M LY (Ursa Major)',
    lightTime: '20.9M light-yrs',
    gravityG: 0,
    radiusKm: 8.0e17,
    baseRadius: 21,
    yOffset: 0,
    isGalaxy: true,
    colorHex: '#60a5fa',
    accentHex: '#f472b6',
    nasaId: 'GSFC_20171208_Archive_e001916',
    image: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001916/GSFC_20171208_Archive_e001916~medium.jpg',
    description:
      'Nearly twice the diameter of the Milky Way at 170,000 light-years across, M101 contains over 3,000 dazzling H II star-birth knots studded along asymmetric spiral arms.',
    telemetry: {
      distanceFromSun: '20.9 Million Light-Years (Ursa Major)',
      mass: '~1 × 10¹² Solar Masses',
      surfaceTemp: '~1 Trillion Stars',
      gravity: 'SAB(rs)cd Face-On Spiral',
      composition: '3,000+ Giant Star-Forming Regions'
    },
    missions: ['Hubble', 'Spitzer', 'Chandra']
  },
  {
    id: 'whirlpool_m51',
    name: 'WHIRLPOOL GALAXY (M51)',
    subtitle: 'BINARY ORBITS GRAND-DESIGN SPIRAL & NGC 5195',
    category: 'Galaxies',
    distanceAU: 1.96e12,
    distanceDisplay: '31.0M LY (Canes Venatici)',
    lightTime: '31.0M light-yrs',
    gravityG: 0,
    radiusKm: 3.6e17,
    baseRadius: 23,
    yOffset: 0,
    isGalaxy: true,
    isBinaryOrbitsFaceOn: true,
    colorHex: '#c084fc',
    accentHex: '#ffffff',
    nasaId: 'GSFC_20171208_Archive_e001955',
    image: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001955/GSFC_20171208_Archive_e001955~medium.jpg',
    description:
      'The first galaxy recognized to have spiral structure (Lord Rosse, 1845), M51’s two grand-design logarithmic spiral arms stream with thousands of lavender-violet and white stars sculpted by companion galaxy NGC 5195.',
    telemetry: {
      distanceFromSun: '31.0 Million Light-Years (Canes Venatici)',
      mass: '~1.6 × 10¹¹ Solar Masses',
      surfaceTemp: 'Seyfert 2 Active Core',
      gravity: 'Tidal Spiral Density Waves',
      composition: 'Grand-Design Two-Arm Spiral + NGC 5195'
    },
    missions: ['JWST', 'Hubble ACS', 'Chandra']
  },
  {
    id: 'sombrero_m104',
    name: 'SOMBRERO GALAXY (M104)',
    subtitle: 'SYMMETRIC DUST-LANE RING & 1B-SOLAR-MASS SMBH',
    category: 'Galaxies',
    distanceAU: 1.967e12,
    distanceDisplay: '31.1M LY (Virgo Border)',
    lightTime: '31.1M light-yrs',
    gravityG: 0,
    radiusKm: 2.4e17,
    baseRadius: 21,
    yOffset: 0,
    isGalaxy: true,
    colorHex: '#fbbf24',
    accentHex: '#e2e8f0',
    nasaId: 'opo0328a',
    image: 'https://images-assets.nasa.gov/image/opo0328a/opo0328a~medium.jpg',
    description:
      'Viewed nearly edge-on, M104 combines a luminous spheroidal stellar bulge, nearly 2,000 globular clusters, and a razor-sharp ring of cold molecular dust harboring a 1-billion-solar-mass black hole.',
    telemetry: {
      distanceFromSun: '31.1 Million Light-Years (Virgo Border)',
      mass: '~8 × 10¹¹ Solar Masses (SMBH: 1B M☉)',
      surfaceTemp: '~2,000 Globular Clusters',
      gravity: 'SA(s)a Unbarred Spiral / Elliptical',
      composition: 'Symmetric PAH & Cold Dust Ring'
    },
    missions: ['JWST MIRI', 'Hubble Heritage', 'Spitzer']
  },
  {
    id: 'antennae_galaxies',
    name: 'ANTENNAE GALAXIES (NGC 4038/39)',
    subtitle: 'COLLIDING SPIRALS & TIDAL STARBURST TAILS',
    category: 'Galaxies',
    distanceAU: 2.846e12,
    distanceDisplay: '45.0M LY (Corvus)',
    lightTime: '45.0M light-yrs',
    gravityG: 0,
    radiusKm: 2.3e18,
    baseRadius: 21,
    yOffset: 0,
    isGalaxy: true,
    colorHex: '#f43f5e',
    accentHex: '#38bdf8',
    nasaId: 'GSFC_20171208_Archive_e001926',
    image: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001926/GSFC_20171208_Archive_e001926~medium.jpg',
    description:
      'Locked in a cosmic merger in Corvus, NGC 4038 and NGC 4039 have flung out 500,000-light-year-long tidal tails of stars while igniting billions of new stars in super star clusters.',
    telemetry: {
      distanceFromSun: '45.0 Million Light-Years (Corvus)',
      mass: 'Merging Spiral Pair',
      surfaceTemp: 'Hyper-Luminous Starburst Knots',
      gravity: '500,000-LY Tidal Tails',
      composition: 'Colliding Giant Molecular Clouds'
    },
    missions: ['Hubble', 'ALMA', 'Chandra']
  },
  {
    id: 'messier_87',
    name: 'MESSIER 87* (POWEHI)',
    subtitle: 'VIRGO A GIANT ELLIPTICAL & 6.5B-SOLAR-MASS BLACK HOLE',
    category: 'Galaxies',
    distanceAU: 3.383e12,
    distanceDisplay: '53.5M LY (Virgo Cluster)',
    lightTime: '53.5M light-yrs',
    gravityG: 6.5e15,
    radiusKm: 1.9e10,
    baseRadius: 21,
    yOffset: 0,
    isBlackHole: true,
    colorHex: '#ea580c',
    accentHex: '#fde047',
    nasaId: 'PIA23122',
    image: 'https://images-assets.nasa.gov/image/PIA23122/PIA23122~medium.jpg',
    description:
      'The first black hole ever directly imaged by humanity (Event Horizon Telescope, 2019), M87* weighs 6.5 billion suns and blasts a 5,000-light-year relativistic plasma jet.',
    telemetry: {
      distanceFromSun: '53.5 Million Light-Years (Virgo Cluster)',
      mass: '6.5 × 10⁹ Solar Masses',
      surfaceTemp: '10¹⁰ K Relativistic Photon Ring',
      gravity: '38-Billion-km Shadow Diameter',
      composition: 'Supermassive Kerr Black Hole + Jet'
    },
    missions: ['Event Horizon Telescope (EHT)', 'Hubble', 'Chandra']
  },
  {
    id: 'stephans_quintet',
    name: 'STEPHAN’S QUINTET (HCG 92)',
    subtitle: 'COMPACT GALAXY GROUP & INTERGALACTIC SHOCKWAVE',
    category: 'Galaxies',
    distanceAU: 1.834e13,
    distanceDisplay: '290M LY (Pegasus)',
    lightTime: '290M light-yrs',
    gravityG: 0,
    radiusKm: 9.4e17,
    baseRadius: 21,
    yOffset: 0,
    isGalaxy: true,
    colorHex: '#fb923c',
    accentHex: '#60a5fa',
    nasaId: 'weic2205a',
    image: 'https://images-assets.nasa.gov/image/weic2205a/weic2205a~medium.jpg',
    description:
      'Four galaxies locked in a repeated gravitational dance (with foreground NGC 7320 at 40M LY), where galaxy NGC 7318b is smashing through the cluster at 3.2 million km/h, generating a colossal shockwave.',
    telemetry: {
      distanceFromSun: '290 Million Light-Years (Pegasus)',
      mass: '4 Interacting Galaxies + 1 Foreground',
      surfaceTemp: 'X-Ray & H₂ Shock Front',
      gravity: 'Hickson Compact Group 92',
      composition: 'Active Quasar Core (NGC 7319)'
    },
    missions: ['JWST 150-Megapixel Mosaic', 'Chandra']
  },
  {
    id: 'cartwheel_galaxy',
    name: 'CARTWHEEL GALAXY (ESO 350-40)',
    subtitle: 'COLLISIONAL RING GALAXY • 150,000 LY ACROSS',
    category: 'Galaxies',
    distanceAU: 3.162e13,
    distanceDisplay: '500M LY (Sculptor)',
    lightTime: '500M light-yrs',
    gravityG: 0,
    radiusKm: 7.1e17,
    baseRadius: 21,
    yOffset: 0,
    isGalaxy: true,
    colorHex: '#ec4899',
    accentHex: '#38bdf8',
    nasaId: 'weic2211a',
    image: 'https://images-assets.nasa.gov/image/weic2211a/weic2211a~medium.jpg',
    description:
      'Sculpted when a smaller intruder galaxy plunged straight through a large spiral galaxy’s core, sending an expanding shockwave ring outward at 320,000 km/h that triggers massive star birth.',
    telemetry: {
      distanceFromSun: '500 Million Light-Years (Sculptor)',
      mass: '~4 × 10¹¹ Solar Masses',
      surfaceTemp: 'Expanding Starburst Outer Ring',
      gravity: '150,000-LY Diameter',
      composition: 'Inner Bright Ring + Spokes + Outer Ring'
    },
    missions: ['JWST NIRCam & MIRI', 'Hubble']
  },
  {
    id: 'hoags_object',
    name: 'HOAG’S OBJECT',
    subtitle: 'NEARLY PERFECT RING GALAXY IN SERPENS CAPUT',
    category: 'Galaxies',
    distanceAU: 3.875e13,
    distanceDisplay: '612.8M LY (Serpens)',
    lightTime: '612.8M light-yrs',
    gravityG: 0,
    radiusKm: 5.7e17,
    baseRadius: 21,
    yOffset: 0,
    isGalaxy: true,
    colorHex: '#38bdf8',
    accentHex: '#fbbf24',
    nasaId: 'opo0221a',
    image: 'https://images-assets.nasa.gov/image/opo0221a/opo0221a~medium.jpg',
    description:
      'A rare non-typical ring galaxy featuring a nearly symmetrical ring of young blue stars encircling an older yellow-red spheroidal core—with another distant ring galaxy visible right through the gap.',
    telemetry: {
      distanceFromSun: '612.8 Million Light-Years (Serpens)',
      mass: '~7 × 10¹¹ Solar Masses',
      surfaceTemp: 'Blue OB Ring + Old Yellow Core',
      gravity: '121,000-LY Outer Ring',
      composition: '10-Billion-Year-Old Core + Young Ring'
    },
    missions: ['Hubble WFPC2']
  },
  {
    id: 'smacs_0723',
    name: 'SMACS 0723 DEEP FIELD',
    subtitle: 'WEBB’S FIRST DEEP FIELD • GRAVITATIONAL LENSING',
    category: 'Galaxies',
    distanceAU: 2.909e14,
    distanceDisplay: '4.6B LY (13.1B LY Lensed)',
    lightTime: '4.6B light-yrs',
    gravityG: 0,
    radiusKm: 9.4e18,
    baseRadius: 22,
    yOffset: 0,
    isGalaxy: true,
    colorHex: '#f59e0b',
    accentHex: '#38bdf8',
    nasaId: 'weic2205a',
    image: 'https://images-assets.nasa.gov/image/weic2205a/weic2205a~medium.jpg',
    description:
      'Covering a patch of sky the size of a grain of sand held at arm’s length, galaxy cluster SMACS 0723 acts as a natural gravitational lens magnifying galaxies from 13.1 billion years ago.',
    telemetry: {
      distanceFromSun: '4.6B LY Cluster (13.1B LY Background Arcs)',
      mass: '~8 × 10¹⁴ Solar Masses (Cluster)',
      surfaceTemp: 'Cosmic Dawn Redshift z > 8.5',
      gravity: 'Einstein Gravitational Lensing',
      composition: 'Thousands of Primordial Galaxies'
    },
    missions: ['JWST NIRCam Deep Exposure (12.5 hrs)']
  }
];

const CELESTIAL_DATA = RAW_CELESTIAL_DATA.map((item, idx) => ({
  ...item,
  zPos: -idx * SECTOR_STEP_Z,
  xOffset: idx % 2 === 0 ? -26 : 26
}));

// ============================================================================
// 6. NASA EYES 3D DAYLIGHT PLANETARY GLOBE ENGINE + SPACECRAFT BUILDERS
// ============================================================================
function createStarGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.22, 'rgba(255, 250, 235, 0.92)');
  grad.addColorStop(0.5, 'rgba(186, 230, 253, 0.35)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  return new THREE.CanvasTexture(canvas);
}

function createSolarCellTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0c2340';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.2;
  for (let x = 0; x <= 256; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 128);
    ctx.stroke();
  }
  for (let y = 0; y <= 128; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Deterministic noise helpers shared across all NASA Eyes 3D planetary surfaces
const eyesHash2 = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
};

const eyesVnoise = (x, y) => {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = eyesHash2(ix, iy);
  const b = eyesHash2(ix + 1, iy);
  const c = eyesHash2(ix, iy + 1);
  const d = eyesHash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};

const eyesFbm = (x, y, octaves = 5) => {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    val += amp * eyesVnoise(x * freq, y * freq);
    freq *= 2.04;
    amp *= 0.5;
  }
  return val;
};

// High-resolution NASA Eyes 3D Daytime Earth Albedo, Relief & Swirling Cloud Maps
function createEyesDaylightEarthMaps() {
  const W = 512;
  const H = 256;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = W;
  albedoCanvas.height = H;
  const aCtx = albedoCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = W;
  bumpCanvas.height = H;
  const bCtx = bumpCanvas.getContext('2d');

  const specCanvas = document.createElement('canvas');
  specCanvas.width = W;
  specCanvas.height = H;
  const sCtx = specCanvas.getContext('2d');

  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = W;
  cloudCanvas.height = H;
  const cCtx = cloudCanvas.getContext('2d');

  if (!aCtx || !bCtx || !sCtx || !cCtx) return null;

  // Crisp NASA Blue Marble ocean bathymetry
  const oceanGrad = aCtx.createLinearGradient(0, 0, 0, H);
  oceanGrad.addColorStop(0.0, '#104982');
  oceanGrad.addColorStop(0.25, '#0b5ca8');
  oceanGrad.addColorStop(0.5, '#0d6bc4');
  oceanGrad.addColorStop(0.75, '#0b5ca8');
  oceanGrad.addColorStop(1.0, '#104982');
  aCtx.fillStyle = oceanGrad;
  aCtx.fillRect(0, 0, W, H);

  bCtx.fillStyle = '#181818';
  bCtx.fillRect(0, 0, W, H);

  sCtx.fillStyle = '#e6e6e6';
  sCtx.fillRect(0, 0, W, H);

  const lonToX = lon => ((lon + 180) / 360) * W;
  const latToY = lat => ((90 - lat) / 180) * H;

  const continents = [
    {
      coords: [
        [-168, 66], [-152, 71], [-130, 70], [-110, 74], [-82, 73], [-64, 62],
        [-55, 48], [-67, 44], [-75, 36], [-81, 25], [-90, 29], [-97, 26],
        [-96, 19], [-84, 10], [-78, 8], [-88, 15], [-105, 20], [-114, 30],
        [-123, 38], [-125, 49], [-138, 58], [-162, 60]
      ]
    },
    { coords: [[-56, 60], [-44, 60], [-22, 70], [-18, 81], [-45, 83], [-68, 77], [-58, 68]] },
    {
      coords: [
        [-78, 10], [-62, 11], [-50, 1], [-35, -6], [-38, -15], [-42, -23],
        [-53, -33], [-64, -42], [-68, -54], [-74, -53], [-73, -38], [-71, -18],
        [-81, -5], [-79, 3]
      ]
    },
    {
      coords: [
        [-9, 37], [-9, 43], [-4, 48], [2, 51], [8, 55], [10, 58], [5, 62],
        [16, 69], [28, 71], [42, 67], [58, 68], [60, 52], [44, 45], [30, 46],
        [26, 40], [16, 38], [12, 44], [5, 43], [-2, 36]
      ]
    },
    { coords: [[-8, 51], [-5, 58], [1, 58], [2, 51], [-5, 50]] },
    {
      coords: [
        [-17, 15], [-13, 28], [-6, 35], [10, 37], [25, 32], [33, 31], [43, 12],
        [51, 11], [41, -2], [40, -15], [35, -25], [28, -33], [18, -34], [14, -22],
        [12, -6], [9, 4], [2, 6], [-8, 5]
      ]
    },
    { coords: [[44, -25], [49, -13], [50, -16], [47, -25]] },
    {
      coords: [
        [28, 41], [42, 43], [60, 52], [60, 68], [75, 73], [105, 77], [140, 73],
        [170, 66], [162, 55], [142, 53], [135, 35], [122, 40], [122, 31],
        [114, 22], [108, 16], [104, 2], [98, 16], [92, 22], [86, 20], [80, 8],
        [77, 8], [72, 21], [67, 25], [56, 26], [58, 21], [44, 13], [35, 29], [36, 36]
      ]
    },
    { coords: [[130, 31], [136, 34], [141, 41], [145, 44], [140, 39], [132, 33]] },
    { coords: [[109, -3], [117, 6], [125, 1], [141, -3], [148, -9], [136, -8], [116, -4]] },
    {
      coords: [
        [114, -22], [122, -16], [131, -12], [136, -13], [142, -11], [150, -22],
        [153, -28], [150, -37], [140, -38], [131, -32], [116, -34], [113, -26]
      ]
    },
    { coords: [[167, -46], [174, -41], [178, -37], [173, -35], [170, -43]] },
    {
      coords: [
        [-180, -72], [-120, -74], [-60, -64], [-30, -76], [20, -70], [80, -68],
        [140, -67], [180, -73], [180, -90], [-180, -90]
      ]
    }
  ];

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = W;
  maskCanvas.height = H;
  const mCtx = maskCanvas.getContext('2d');
  if (mCtx) {
    mCtx.fillStyle = '#000000';
    mCtx.fillRect(0, 0, W, H);
    mCtx.fillStyle = '#ffffff';
    continents.forEach(cont => {
      mCtx.beginPath();
      cont.coords.forEach(([lon, lat], idx) => {
        const px = lonToX(lon);
        const py = latToY(lat);
        if (idx === 0) mCtx.moveTo(px, py);
        else mCtx.lineTo(px, py);
      });
      mCtx.closePath();
      mCtx.fill();
    });

    const maskData = mCtx.getImageData(0, 0, W, H).data;
    const aImg = aCtx.getImageData(0, 0, W, H);
    const bImg = bCtx.getImageData(0, 0, W, H);
    const sImg = sCtx.getImageData(0, 0, W, H);

    for (let y = 0; y < H; y++) {
      const lat = 90 - (y / H) * 180;
      const absLat = Math.abs(lat);
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        const lon = (x / W) * 360 - 180;
        const nCoast = eyesFbm(x * 0.045, y * 0.045, 4);
        const nBiome = eyesFbm(x * 0.025 + 11.3, y * 0.025 + 7.1, 5);
        const nDetail = eyesFbm(x * 0.12, y * 0.12, 3);

        const baseLand = maskData[idx] > 128;
        const coastalWave = (nCoast - 0.5) * 28;
        const isLand = baseLand || (coastalWave > 8.5 && absLat < 72);

        if (isLand) {
          sImg.data[idx] = 20;
          sImg.data[idx + 1] = 20;
          sImg.data[idx + 2] = 24;

          const elev = gxClamp(nBiome * 0.7 + nDetail * 0.3, 0, 1);
          const bumpVal = Math.round(70 + elev * 185);
          bImg.data[idx] = bumpVal;
          bImg.data[idx + 1] = bumpVal;
          bImg.data[idx + 2] = bumpVal;

          const isPolarIce =
            absLat > 71 ||
            (lon > -65 && lon < -18 && lat > 61) ||
            lat < -64;

          const inSaharaArabia = lat > 14 && lat < 33 && lon > -16 && lon < 62;
          const inOutback = lat < -18 && lat > -32 && lon > 115 && lon < 144;
          const inSubtropicalArid =
            (absLat > 16 && absLat < 33 && nBiome < 0.48) || inSaharaArabia || inOutback;

          let r = 42;
          let g = 104;
          let b = 48;

          if (isPolarIce) {
            r = 242 + nDetail * 13;
            g = 247 + nDetail * 8;
            b = 252 + nDetail * 3;
          } else if (inSubtropicalArid) {
            r = 186 + nDetail * 38;
            g = 146 + nDetail * 30;
            b = 96 + nDetail * 22;
          } else if (absLat > 56) {
            r = 66 + nDetail * 26;
            g = 102 + nDetail * 26;
            b = 62 + nDetail * 20;
          } else {
            r = 34 + elev * 68 + nDetail * 18;
            g = 98 + (1 - elev * 0.45) * 48 + nDetail * 20;
            b = 42 + elev * 34 + nDetail * 14;
          }

          aImg.data[idx] = gxClamp(Math.round(r), 0, 255);
          aImg.data[idx + 1] = gxClamp(Math.round(g), 0, 255);
          aImg.data[idx + 2] = gxClamp(Math.round(b), 0, 255);
        } else if (coastalWave > 3.2 && absLat < 68) {
          // Turquoise shallow continental shelves like NASA Eyes on the Earth
          aImg.data[idx] = 24;
          aImg.data[idx + 1] = 128;
          aImg.data[idx + 2] = 188;
        }
      }
    }

    aCtx.putImageData(aImg, 0, 0);
    bCtx.putImageData(bImg, 0, 0);
    sCtx.putImageData(sImg, 0, 0);
  }

  // Global Daytime Cloud Deck
  const cImg = cCtx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const latNorm = (y / H) * 2 - 1;
    const bandDensity =
      0.22 * Math.exp(-Math.pow(latNorm * 5.5, 2)) +
      0.28 * Math.exp(-Math.pow((Math.abs(latNorm) - 0.52) * 4.2, 2));

    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const wx = eyesFbm(x * 0.014, y * 0.018, 3);
      const wy = eyesFbm(x * 0.014 + 5.2, y * 0.018 + 3.4, 3);
      const n = eyesFbm(x * 0.022 + wx * 3.2, y * 0.032 + wy * 2.6, 5);
      const rawCloud = n + bandDensity - 0.52;
      const alpha = gxClamp(rawCloud * 3.1, 0, 1);

      cImg.data[idx] = 252;
      cImg.data[idx + 1] = 254;
      cImg.data[idx + 2] = 255;
      cImg.data[idx + 3] = Math.round(Math.pow(alpha, 1.15) * 235);
    }
  }
  cCtx.putImageData(cImg, 0, 0);

  const albedoTex = new THREE.CanvasTexture(albedoCanvas);
  albedoTex.colorSpace = THREE.SRGBColorSpace;
  albedoTex.wrapS = THREE.RepeatWrapping;
  albedoTex.wrapT = THREE.ClampToEdgeWrapping;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.ClampToEdgeWrapping;

  const specTex = new THREE.CanvasTexture(specCanvas);
  specTex.wrapS = THREE.RepeatWrapping;
  specTex.wrapT = THREE.ClampToEdgeWrapping;

  const cloudTex = new THREE.CanvasTexture(cloudCanvas);
  cloudTex.colorSpace = THREE.SRGBColorSpace;
  cloudTex.wrapS = THREE.RepeatWrapping;
  cloudTex.wrapT = THREE.ClampToEdgeWrapping;

  return { albedoTex, bumpTex, specTex, cloudTex };
}

// High-resolution NASA Eyes 3D Daylight Maps for every Solar System Planet, Dwarf Planet, Moon & Exoplanet
function createEyesPlanetaryMaps(item) {
  if (item.id === 'earth') return createEyesDaylightEarthMaps();

  const W = 384;
  const H = 192;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = W;
  albedoCanvas.height = H;
  const aCtx = albedoCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = W;
  bumpCanvas.height = H;
  const bCtx = bumpCanvas.getContext('2d');

  if (!aCtx || !bCtx) return null;

  let seed = 0;
  for (let i = 0; i < item.id.length; i++) seed += item.id.charCodeAt(i) * (i + 13);
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const baseColor = new THREE.Color(item.colorHex || '#94a3b8');
  const accentColor = new THREE.Color(item.accentHex || '#e2e8f0');
  const aImg = aCtx.createImageData(W, H);
  const bImg = bCtx.createImageData(W, H);

  const isBandedGasOrIceGiant = ['hd189733b'].includes(item.id);
  const isStar = ['sun', 'betelgeuse', 'proxima_centauri', 'sirius'].includes(item.id);

  for (let y = 0; y < H; y++) {
    const v = y / H;
    const lat = 90 - v * 180;
    const absLat = Math.abs(lat);

    for (let x = 0; x < W; x++) {
      const u = x / W;
      const idx = (y * W + x) * 4;

      const n1 = eyesFbm(u * 9 + seed * 0.01, v * 6, 4);
      const n2 = eyesFbm(u * 22 + 4.1, v * 16 + 2.3, 4);
      const nFine = eyesFbm(u * 48, v * 36, 3);

      let r = baseColor.r * 255;
      let g = baseColor.g * 255;
      let b = baseColor.b * 255;
      let bump = 128;

      if (item.id === 'mars') {
        // NASA Eyes Mars: Iron-oxide rust highlands, dark basaltic Syrtis/Valles regions, polar CO2 ice caps
        const isPolarCap = absLat > 78 + (n1 - 0.5) * 6;
        if (isPolarCap) {
          r = 244;
          g = 242;
          b = 240;
          bump = 190;
        } else {
          const darkBasalt = n1 < 0.43 ? (0.43 - n1) * 1.9 : 0;
          r = 212 - darkBasalt * 88 + (n2 - 0.5) * 28;
          g = 104 - darkBasalt * 48 + (n2 - 0.5) * 22;
          b = 62 - darkBasalt * 28 + (n2 - 0.5) * 16;
          bump = Math.round(95 + n1 * 90 + nFine * 65);
        }
      } else if (item.id === 'venus') {
        // NASA Eyes Venus: Golden sulfuric super-rotating V-chevron cloud bands
        const chevron = Math.sin(v * 20 + Math.cos(u * Math.PI * 2) * 1.6 + n1 * 3.2) * 0.5 + 0.5;
        r = 228 + chevron * 22 + (n2 - 0.5) * 14;
        g = 186 + chevron * 28 + (n2 - 0.5) * 14;
        b = 106 + chevron * 26 + (n2 - 0.5) * 12;
        bump = Math.round(115 + chevron * 40);
      } else if (item.id === 'jupiter') {
        // NASA Eyes Jupiter: Equatorial zone, North/South Equatorial Belts, turbulent eddies
        const turb = (n1 - 0.5) * 0.055 + (n2 - 0.5) * 0.025;
        const bandPhase = (v + turb) * Math.PI * 14;
        const belt = Math.sin(bandPhase);
        if (belt > 0.25) {
          // Creamy-white ammonia cloud zone
          r = 236 + (nFine - 0.5) * 16;
          g = 224 + (nFine - 0.5) * 16;
          b = 202 + (nFine - 0.5) * 16;
        } else if (belt < -0.25) {
          // Ochre-terracotta equatorial belt
          r = 188 + (n2 - 0.5) * 26;
          g = 118 + (n2 - 0.5) * 22;
          b = 76 + (n2 - 0.5) * 18;
        } else {
          // Golden-tan temperate zone
          r = 216 + (n2 - 0.5) * 20;
          g = 184 + (n2 - 0.5) * 18;
          b = 142 + (n2 - 0.5) * 18;
        }
        bump = Math.round(120 + belt * 22);
      } else if (item.id === 'saturn') {
        // NASA Eyes Saturn: Silky butterscotch-gold zonal bands & polar hexagon tint
        const turb = (n1 - 0.5) * 0.022;
        const band = Math.sin((v + turb) * Math.PI * 18) * 0.5 + 0.5;
        const polarTint = absLat > 68 ? (absLat - 68) / 22 : 0;
        r = 226 + band * 22 - polarTint * 48;
        g = 202 + band * 22 - polarTint * 30;
        b = 148 + band * 24 + polarTint * 12;
        bump = Math.round(124 + band * 14);
      } else if (item.id === 'uranus') {
        // NASA Eyes Uranus: Serene cyan-aquamarine methane haze with subtle polar hood
        const band = Math.sin(v * Math.PI * 8 + n1 * 1.2) * 0.5 + 0.5;
        const polarHood = absLat > 62 ? (absLat - 62) / 28 : 0;
        r = 128 + band * 22 + polarHood * 42;
        g = 214 + band * 18 + polarHood * 22;
        b = 228 + band * 16 + polarHood * 14;
        bump = 128;
      } else if (item.id === 'neptune') {
        // NASA Eyes Neptune: Deep cobalt-azure methane atmosphere with high-altitude white cirrus streaks
        const band = Math.sin(v * Math.PI * 10 + n1 * 2.0) * 0.5 + 0.5;
        const streak = n2 > 0.72 && absLat < 55 ? (n2 - 0.72) * 3.4 : 0;
        r = 46 + band * 24 + streak * 170;
        g = 102 + band * 34 + streak * 140;
        b = 224 + band * 24 + streak * 30;
        bump = Math.round(124 + streak * 40);
      } else if (item.id === 'pluto') {
        // NASA Eyes Pluto: Bright heart-shaped Tombaugh Regio nitrogen glacier & dark reddish Cthulhu tholins
        const dxHeart = (u - 0.52) / 0.16;
        const dyHeart = (v - 0.54) / 0.18;
        const inHeart = dxHeart * dxHeart + dyHeart * dyHeart < 1.0;
        if (inHeart) {
          r = 238 + (nFine - 0.5) * 14;
          g = 224 + (nFine - 0.5) * 14;
          b = 208 + (nFine - 0.5) * 14;
          bump = 112;
        } else {
          const darkTholin = n1 < 0.45 ? 1 : 0;
          r = darkTholin ? 132 + n2 * 35 : 196 + n2 * 32;
          g = darkTholin ? 88 + n2 * 28 : 168 + n2 * 28;
          b = darkTholin ? 72 + n2 * 22 : 146 + n2 * 24;
          bump = Math.round(100 + n1 * 85);
        }
      } else if (item.id === 'io') {
        // NASA Eyes Io: Vibrant sulfur-yellow, orange & volcanic caldera plains
        r = 235 + (n1 - 0.5) * 32;
        g = 196 + (n2 - 0.5) * 48;
        b = 58 + (n1 - 0.5) * 40;
        bump = Math.round(100 + n2 * 95);
      } else if (item.id === 'europa' || item.id === 'enceladus') {
        // NASA Eyes Europa / Enceladus: Bright water-ice shell with reddish-amber lineae fractures
        const crack = Math.abs(Math.sin((u * 14 + n1 * 2.4) * Math.PI) * Math.cos((v * 10 - n2 * 2.1) * Math.PI));
        const isLineae = crack < 0.08 && item.id === 'europa';
        r = isLineae ? 176 : 232 + (nFine - 0.5) * 20;
        g = isLineae ? 116 : 238 + (nFine - 0.5) * 18;
        b = isLineae ? 86 : 246 + (nFine - 0.5) * 12;
        bump = isLineae ? 92 : Math.round(135 + nFine * 45);
      } else if (item.id === 'titan') {
        // NASA Eyes Titan: Golden-amber organic tholin haze
        const band = Math.sin(v * Math.PI * 6 + n1 * 1.5) * 0.5 + 0.5;
        r = 218 + band * 24;
        g = 156 + band * 26;
        b = 68 + band * 22;
        bump = 128;
      } else if (isStar) {
        // Radiant solar/stellar granulation cells
        const gran = n1 * 0.55 + n2 * 0.45;
        r = gxClamp(baseColor.r * 220 + gran * 65, 0, 255);
        g = gxClamp(baseColor.g * 220 + gran * 65, 0, 255);
        b = gxClamp(baseColor.b * 220 + gran * 65, 0, 255);
        bump = 128;
      } else if (isBandedGasOrIceGiant) {
        const band = Math.sin((v + (n1 - 0.5) * 0.04) * Math.PI * 12) * 0.5 + 0.5;
        const mixed = baseColor.clone().lerp(accentColor, band * 0.7 + n2 * 0.3);
        r = mixed.r * 255;
        g = mixed.g * 255;
        b = mixed.b * 255;
        bump = 128;
      } else {
        // Mercury, Moon, Ceres, Vesta, Ganymede, Triton, Charon, Eris & Rocky Exoplanets
        const mixed = baseColor.clone().lerp(accentColor, n1 * 0.65 + nFine * 0.35);
        const shade = 0.78 + n2 * 0.42;
        r = mixed.r * 255 * shade;
        g = mixed.g * 255 * shade;
        b = mixed.b * 255 * shade;
        bump = Math.round(80 + n1 * 90 + nFine * 75);
      }

      aImg.data[idx] = gxClamp(Math.round(r), 0, 255);
      aImg.data[idx + 1] = gxClamp(Math.round(g), 0, 255);
      aImg.data[idx + 2] = gxClamp(Math.round(b), 0, 255);
      aImg.data[idx + 3] = 255;

      bImg.data[idx] = bump;
      bImg.data[idx + 1] = bump;
      bImg.data[idx + 2] = bump;
      bImg.data[idx + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);

  // Add Jupiter's Great Red Spot anticyclone
  if (item.id === 'jupiter') {
    const grsX = W * 0.62;
    const grsY = H * 0.63;
    const grsGrad = aCtx.createRadialGradient(grsX, grsY, 2, grsX, grsY, 34);
    grsGrad.addColorStop(0, 'rgba(194, 65, 36, 0.95)');
    grsGrad.addColorStop(0.55, 'rgba(217, 96, 54, 0.85)');
    grsGrad.addColorStop(1, 'rgba(236, 224, 202, 0)');
    aCtx.fillStyle = grsGrad;
    aCtx.beginPath();
    aCtx.ellipse(grsX, grsY, 34, 20, 0, 0, Math.PI * 2);
    aCtx.fill();
  }

  // Add realistic impact craters & ejecta rays onto airless rocky/icy bodies
  const isCrateredBody = [
    'mercury',
    'moon',
    'vesta',
    'ceres',
    'ganymede',
    'triton',
    'charon',
    'eris'
  ].includes(item.id);
  if (isCrateredBody) {
    for (let c = 0; c < 95; c++) {
      const cx = rand() * W;
      const cy = 24 + rand() * (H - 48);
      const cr = 3 + Math.pow(rand(), 1.8) * 22;

      aCtx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      aCtx.fillStyle = 'rgba(15, 23, 42, 0.18)';
      aCtx.lineWidth = 1.6;
      aCtx.beginPath();
      aCtx.arc(cx, cy, cr, 0, Math.PI * 2);
      aCtx.fill();
      aCtx.stroke();

      bCtx.strokeStyle = 'rgba(235, 235, 235, 0.65)';
      bCtx.fillStyle = 'rgba(45, 45, 45, 0.55)';
      bCtx.lineWidth = 2;
      bCtx.beginPath();
      bCtx.arc(cx, cy, cr, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.stroke();
    }
  }

  const albedoTex = new THREE.CanvasTexture(albedoCanvas);
  albedoTex.colorSpace = THREE.SRGBColorSpace;
  albedoTex.wrapS = THREE.RepeatWrapping;
  albedoTex.wrapT = THREE.ClampToEdgeWrapping;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.ClampToEdgeWrapping;

  return { albedoTex, bumpTex, specTex: null, cloudTex: null };
}

// ============================================================================
// 6B. NASA EYES 3D DAY-MODE PLANET & MOON ASSEMBLY BUILDER
//     (Axial Obliquity, Full Daylight Globe Illumination, Clouds & Fresnel Rim)
// ============================================================================
const PLANET_OBLIQUITY_DEG = {
  mercury: 0.03,
  venus: 177.36,
  earth: 23.44,
  moon: 6.68,
  mars: 25.19,
  jupiter: 3.13,
  saturn: 26.73,
  uranus: 97.77,
  neptune: 28.32,
  pluto: 122.53
};

function buildEyesDaylightPlanetAssembly(
  item,
  baseRadius,
  disposables,
  planetCloudRotators,
  moonPivots
) {
  const planetTiltGroup = new THREE.Group();
  const tiltDeg = PLANET_OBLIQUITY_DEG[item.id] ?? 8.0;
  planetTiltGroup.rotation.z = THREE.MathUtils.degToRad(tiltDeg);
  if (item.id === 'saturn' || item.id === 'uranus') {
    planetTiltGroup.rotation.x = THREE.MathUtils.degToRad(14);
  }

  const maps = createEyesPlanetaryMaps(item);
  if (!maps) return planetTiltGroup;
  disposables.push(maps.albedoTex, maps.bumpTex);
  if (maps.specTex) disposables.push(maps.specTex);
  if (maps.cloudTex) disposables.push(maps.cloudTex);

  const isStar = ['sun', 'betelgeuse', 'proxima_centauri', 'sirius'].includes(item.id);
  const sphereGeo = new THREE.SphereGeometry(baseRadius, 72, 72);

  let sphereMat;
  if (isStar) {
    sphereMat = new THREE.MeshBasicMaterial({
      map: maps.albedoTex,
      color: new THREE.Color('#ffffff')
    });
  } else {
    // Full-Daylight NASA Eyes 3D Globe Material (100% illuminated day mode with subtle limb shading & emissive fill)
    sphereMat = new THREE.MeshStandardMaterial({
      map: maps.albedoTex,
      emissiveMap: maps.albedoTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.62,
      bumpMap: maps.bumpTex,
      bumpScale: item.id === 'earth' ? 0.28 : 0.35,
      roughnessMap: maps.specTex || undefined,
      roughness: item.id === 'earth' ? 0.42 : 0.68,
      metalness: item.id === 'earth' ? 0.12 : 0.04
    });
  }

  const surfaceMesh = new THREE.Mesh(sphereGeo, sphereMat);
  if (item.id === 'earth') {
    surfaceMesh.rotation.y = -0.55;
  }
  planetTiltGroup.add(surfaceMesh);
  disposables.push(sphereGeo, sphereMat);

  // Separate Animated Daytime Cloud Layer for Earth (NASA Eyes on the Earth cloud deck)
  let cloudMesh = null;
  if (item.id === 'earth' && maps.cloudTex) {
    const cloudGeo = new THREE.SphereGeometry(baseRadius * 1.015, 64, 64);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: maps.cloudTex,
      emissiveMap: maps.cloudTex,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      roughness: 0.9
    });
    cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.rotation.y = -0.35;
    planetTiltGroup.add(cloudMesh);
    disposables.push(cloudGeo, cloudMat);
  }

  planetCloudRotators.push({
    surfaceMesh,
    cloudMesh,
    spinRate: item.id === 'jupiter' || item.id === 'saturn' ? 0.24 : 0.15
  });

  // Crisp Daylight Atmospheric Fresnel Rim Halo (NASA Eyes 3D globe limb glow)
  if (item.hasAtmosphere || isStar) {
    const atmoColor = new THREE.Color(item.atmosphereColor || item.colorHex || '#38bdf8');
    const atmoGeo = new THREE.SphereGeometry(baseRadius * (isStar ? 1.18 : 1.055), 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: atmoColor },
        uIntensity: { value: isStar ? 0.88 : 0.68 }
      },
      vertexShader: `
        varying vec3 vNormalView;
        void main() {
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormalView;
        uniform vec3 uColor;
        uniform float uIntensity;
        void main() {
          float fresnel = pow(0.68 - dot(vNormalView, vec3(0.0, 0.0, 1.0)), 2.5);
          gl_FragColor = vec4(uColor, clamp(fresnel * uIntensity, 0.0, 0.92));
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    planetTiltGroup.add(new THREE.Mesh(atmoGeo, atmoMat));
    disposables.push(atmoGeo, atmoMat);
  }

  // Multi-Band Translucent Ring System (Saturn & Uranus)
  if (item.hasRings) {
    const bandCount = item.id === 'uranus' ? 7 : 6;
    for (let b = 0; b < bandCount; b++) {
      const inner = baseRadius * (1.26 + b * 0.135);
      const outer = inner + baseRadius * 0.095;
      const ringGeo = new THREE.RingGeometry(inner, outer, 80);
      const ringMat = new THREE.MeshStandardMaterial({
        color: item.id === 'saturn' ? 0xfde68a : 0x7dd3fc,
        emissive: item.id === 'saturn' ? 0xf59e0b : 0x0284c7,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: item.id === 'saturn' ? 0.76 - b * 0.04 : 0.52 - b * 0.03,
        side: THREE.DoubleSide,
        roughness: 0.55
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI * 0.5;
      planetTiltGroup.add(ringMesh);
      disposables.push(ringGeo, ringMat);
    }

    const moonPivot = new THREE.Group();
    const moonGeo = new THREE.SphereGeometry(baseRadius * 0.21, 24, 24);
    const moonMat = new THREE.MeshStandardMaterial({
      color: item.id === 'uranus' ? 0x93c5fd : 0xfbbf24,
      emissive: item.id === 'uranus' ? 0x3b82f6 : 0xd97706,
      emissiveIntensity: 0.45,
      roughness: 0.5
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(baseRadius * 2.15, 0, 0);
    moonPivot.add(moonMesh);
    planetTiltGroup.add(moonPivot);
    moonPivots.push(moonPivot);
    disposables.push(moonGeo, moonMat);
  }

  return planetTiltGroup;
}

function buildDetailedSpacecraftModel(item, disposables, solarTex, roverPivots, realImageUrl) {
  const craftGroup = new THREE.Group();

  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0x78350f,
    emissiveIntensity: 0.25,
    metalness: 0.92,
    roughness: 0.22
  });
  const silverBusMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.85,
    roughness: 0.25
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.55,
    roughness: 0.45
  });
  const whiteShieldMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x334155,
    emissiveIntensity: 0.2,
    metalness: 0.2,
    roughness: 0.35
  });
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    color: 0x1d4ed8,
    emissive: 0x1e3a8a,
    emissiveIntensity: 0.4,
    metalness: 0.75,
    roughness: 0.22
  });
  const blueIonGlowMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85
  });

  disposables.push(goldFoilMat, silverBusMat, carbonMat, whiteShieldMat, solarMat, blueIonGlowMat);

  const arch = item.spacecraftArchetype || 'orbiter_dish';

  if (arch === 'parker') {
    // PARKER SOLAR PROBE: Hexagonal Carbon-Composite Thermal Protection System + White Ceramic Front + Angled Solar Wings
    const shieldGeo = new THREE.CylinderGeometry(5.6, 5.2, 0.85, 6);
    const shieldFront = new THREE.Mesh(shieldGeo, whiteShieldMat);
    shieldFront.rotation.x = Math.PI * 0.5;
    shieldFront.position.z = 3.2;
    craftGroup.add(shieldFront);

    const backingGeo = new THREE.CylinderGeometry(5.1, 4.7, 0.65, 6);
    const shieldBack = new THREE.Mesh(backingGeo, carbonMat);
    shieldBack.rotation.x = Math.PI * 0.5;
    shieldBack.position.z = 2.45;
    craftGroup.add(shieldBack);

    const bodyGeo = new THREE.CylinderGeometry(2.1, 2.5, 4.4, 8);
    const body = new THREE.Mesh(bodyGeo, goldFoilMat);
    body.rotation.x = Math.PI * 0.5;
    body.position.z = 0;
    craftGroup.add(body);

    const wingGeo = new THREE.BoxGeometry(5.2, 0.16, 1.8);
    const leftWing = new THREE.Mesh(wingGeo, solarMat);
    leftWing.position.set(-4.3, -1.1, -0.4);
    leftWing.rotation.z = 0.42;
    leftWing.rotation.y = 0.25;
    craftGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, solarMat);
    rightWing.position.set(4.3, -1.1, -0.4);
    rightWing.rotation.z = -0.42;
    rightWing.rotation.y = -0.25;
    craftGroup.add(rightWing);

    // FIELDS 4 Whip Antennas extending forward past heat shield
    const whipGeo = new THREE.CylinderGeometry(0.06, 0.06, 5.2, 8);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      const whip = new THREE.Mesh(whipGeo, silverBusMat);
      whip.rotation.x = Math.PI * 0.5;
      whip.position.set(Math.cos(a) * 3.8, Math.sin(a) * 3.8, 4.6);
      craftGroup.add(whip);
    }

    // Faraday Cup (SWEAP)
    const cupGeo = new THREE.CylinderGeometry(0.45, 0.55, 1.4, 16);
    const cup = new THREE.Mesh(cupGeo, silverBusMat);
    cup.position.set(3.2, 2.8, 3.1);
    craftGroup.add(cup);

    disposables.push(shieldGeo, backingGeo, bodyGeo, wingGeo, whipGeo, cupGeo);
  } else if (arch === 'jwst') {
    // JAMES WEBB SPACE TELESCOPE: 18 Gold Hexagonal Beryllium Mirror Segments + 5-Layer Kapton Sunshield
    const mirrorGroup = new THREE.Group();
    const hexGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.25, 6);
    const coords = [
      [0, 0],
      [0, 2.05], [0, -2.05], [1.78, 1.02], [-1.78, 1.02], [1.78, -1.02], [-1.78, -1.02],
      [0, 4.1], [0, -4.1], [1.78, 3.07], [-1.78, 3.07], [1.78, -3.07], [-1.78, -3.07],
      [3.56, 2.05], [-3.56, 2.05], [3.56, 0], [-3.56, 0], [3.56, -2.05], [-3.56, -2.05]
    ];
    coords.forEach(([cx, cy], idx) => {
      if (idx === 0) return; // Central baffle hole
      const seg = new THREE.Mesh(hexGeo, goldFoilMat);
      seg.rotation.x = Math.PI * 0.5;
      seg.position.set(cx, cy, 1.6);
      mirrorGroup.add(seg);
    });

    // Secondary Mirror Tripod
    const secGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.25, 16);
    const secMirror = new THREE.Mesh(secGeo, goldFoilMat);
    secMirror.rotation.x = Math.PI * 0.5;
    secMirror.position.set(0, 0, 6.2);
    mirrorGroup.add(secMirror);

    const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8);
    const strutTop = new THREE.Mesh(strutGeo, carbonMat);
    strutTop.position.set(0, 2.2, 3.9);
    strutTop.rotation.x = 0.45;
    mirrorGroup.add(strutTop);

    const strutL = new THREE.Mesh(strutGeo, carbonMat);
    strutL.position.set(-2.1, -1.5, 3.9);
    strutL.rotation.set(-0.35, 0, -0.45);
    mirrorGroup.add(strutL);

    const strutR = new THREE.Mesh(strutGeo, carbonMat);
    strutR.position.set(2.1, -1.5, 3.9);
    strutR.rotation.set(-0.35, 0, 0.45);
    mirrorGroup.add(strutR);

    craftGroup.add(mirrorGroup);

    // 5-Layer Tennis-Court Kapton Sunshield
    for (let l = 0; l < 5; l++) {
      const scale = 1 - l * 0.05;
      const layerGeo = new THREE.BoxGeometry(11.5 * scale, 0.08, 16.5 * scale);
      const layerMat = l === 0 ? whiteShieldMat : silverBusMat;
      const layer = new THREE.Mesh(layerGeo, layerMat);
      layer.position.set(0, -3.4 - l * 0.34, 0.5);
      layer.rotation.y = Math.PI * 0.25;
      craftGroup.add(layer);
      disposables.push(layerGeo);
    }

    disposables.push(hexGeo, secGeo, strutGeo);
  } else if (arch === 'hubble') {
    // HUBBLE SPACE TELESCOPE: Cylindrical Aft Shroud + Optical Tube + Hinged Aperture Door + Twin Solar Wings
    const mainTubeGeo = new THREE.CylinderGeometry(2.3, 2.3, 9.2, 28);
    const mainTube = new THREE.Mesh(mainTubeGeo, silverBusMat);
    mainTube.rotation.z = Math.PI * 0.5;
    craftGroup.add(mainTube);

    const aftGeo = new THREE.CylinderGeometry(2.75, 2.75, 3.4, 28);
    const aftShroud = new THREE.Mesh(aftGeo, silverBusMat);
    aftShroud.rotation.z = Math.PI * 0.5;
    aftShroud.position.x = -3.8;
    craftGroup.add(aftShroud);

    const doorGeo = new THREE.CylinderGeometry(2.3, 2.3, 0.25, 28);
    const door = new THREE.Mesh(doorGeo, silverBusMat);
    door.position.set(4.9, 1.9, 0);
    door.rotation.z = 0.65;
    craftGroup.add(door);

    const wingGeo = new THREE.BoxGeometry(2.4, 0.14, 14.5);
    const wings = new THREE.Mesh(wingGeo, solarMat);
    wings.position.x = 0.6;
    craftGroup.add(wings);

    disposables.push(mainTubeGeo, aftGeo, doorGeo, wingGeo);
  } else if (arch === 'chandrayaan3') {
    // CHANDRAYAAN-3: Lunar South Pole Terrain + Vikram Lander + Deployed Ramp + Pragyan 6-Wheel Rover
    const moonGeo = new THREE.SphereGeometry(baseRadiusOrFallback(item.baseRadius, 12) * 0.92, 36, 36);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.92 });
    const moonSphere = new THREE.Mesh(moonGeo, moonMat);
    craftGroup.add(moonSphere);

    const landerGroup = new THREE.Group();
    landerGroup.position.set(0, baseRadiusOrFallback(item.baseRadius, 12) * 0.96, 0);

    const vikramBodyGeo = new THREE.BoxGeometry(2.8, 2.2, 2.8);
    const vikramBody = new THREE.Mesh(vikramBodyGeo, goldFoilMat);
    vikramBody.position.y = 1.4;
    landerGroup.add(vikramBody);

    const legGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.8, 8);
    [
      [-1.4, -1.4],
      [1.4, -1.4],
      [-1.4, 1.4],
      [1.4, 1.4]
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, silverBusMat);
      leg.position.set(lx, 0.6, lz);
      leg.rotation.z = lx > 0 ? -0.35 : 0.35;
      leg.rotation.x = lz > 0 ? 0.35 : -0.35;
      landerGroup.add(leg);
    });
    craftGroup.add(landerGroup);

    // Orbiting Pragyan Rover around Lunar South Pole
    const roverPivot = new THREE.Group();
    const roverBodyGeo = new THREE.BoxGeometry(1.7, 0.85, 1.2);
    const roverBody = new THREE.Mesh(roverBodyGeo, goldFoilMat);
    roverBody.position.set(0, baseRadiusOrFallback(item.baseRadius, 12) * 0.97, 0);
    const roverPanelGeo = new THREE.BoxGeometry(1.65, 0.1, 1.15);
    const roverPanel = new THREE.Mesh(roverPanelGeo, solarMat);
    roverPanel.position.set(0, baseRadiusOrFallback(item.baseRadius, 12) * 0.97 + 0.5, 0);
    roverPivot.add(roverBody, roverPanel);
    craftGroup.add(roverPivot);
    roverPivots.push(roverPivot);

    disposables.push(moonGeo, moonMat, vikramBodyGeo, legGeo, roverBodyGeo, roverPanelGeo);
  } else if (arch === 'nisar') {
    // NISAR (ISRO-NASA): I-3K Spacecraft Bus + 9m Deployable Boom + 12m Gold Mesh Reflector Dish
    const busGeo = new THREE.BoxGeometry(3.4, 3.8, 3.4);
    const bus = new THREE.Mesh(busGeo, goldFoilMat);
    bus.position.y = -2.2;
    craftGroup.add(bus);

    const solarGeo = new THREE.BoxGeometry(13.5, 0.16, 2.6);
    const solar = new THREE.Mesh(solarGeo, solarMat);
    solar.position.y = -2.2;
    craftGroup.add(solar);

    const boomGeo = new THREE.CylinderGeometry(0.18, 0.22, 6.8, 12);
    const boom = new THREE.Mesh(boomGeo, carbonMat);
    boom.position.set(0, 1.4, 0);
    craftGroup.add(boom);

    const dishGeo = new THREE.CylinderGeometry(4.6, 1.8, 1.5, 24, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0x92400e,
      emissiveIntensity: 0.3,
      metalness: 0.9,
      roughness: 0.25,
      side: THREE.DoubleSide,
      wireframe: false
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0, 4.9, 1.2);
    dish.rotation.x = 0.55;
    craftGroup.add(dish);

    disposables.push(busGeo, solarGeo, boomGeo, dishGeo, dishMat);
  } else if (arch === 'gaganyaan') {
    // GAGANYAAN ORBITAL MODULE: Conical Crew Module + Cylindrical Service Module + Twin Solar Arrays
    const cmGeo = new THREE.CylinderGeometry(1.4, 2.7, 3.2, 24);
    const cm = new THREE.Mesh(cmGeo, whiteShieldMat);
    cm.position.y = 2.4;
    craftGroup.add(cm);

    const smGeo = new THREE.CylinderGeometry(2.7, 2.7, 3.6, 24);
    const sm = new THREE.Mesh(smGeo, silverBusMat);
    sm.position.y = -1.0;
    craftGroup.add(sm);

    const wingGeo = new THREE.BoxGeometry(13.5, 0.16, 2.4);
    const wings = new THREE.Mesh(wingGeo, solarMat);
    wings.position.y = -1.2;
    craftGroup.add(wings);

    const nozzleGeo = new THREE.ConeGeometry(0.95, 1.5, 20);
    const nozzle = new THREE.Mesh(nozzleGeo, carbonMat);
    nozzle.rotation.x = Math.PI;
    nozzle.position.y = -3.4;
    craftGroup.add(nozzle);

    disposables.push(cmGeo, smGeo, wingGeo, nozzleGeo);
  } else if (arch === 'voyager' || arch === 'cassini') {
    // VOYAGER 1 / CASSINI-HUYGENS: 3.7m-4m Parabolic High-Gain Dish + Decagonal Bus + RTG Boom + Magnetometer Boom
    const dishGeo = new THREE.CylinderGeometry(4.4, 0.9, 1.4, 32, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.7,
      roughness: 0.25,
      side: THREE.DoubleSide
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.rotation.x = Math.PI * 0.5;
    dish.position.z = 1.6;
    craftGroup.add(dish);

    const feedGeo = new THREE.CylinderGeometry(0.28, 0.45, 2.4, 16);
    const feed = new THREE.Mesh(feedGeo, goldFoilMat);
    feed.rotation.x = Math.PI * 0.5;
    feed.position.z = 2.4;
    craftGroup.add(feed);

    const busGeo = new THREE.CylinderGeometry(2.1, 2.1, 1.8, 10);
    const bus = new THREE.Mesh(busGeo, arch === 'cassini' ? goldFoilMat : carbonMat);
    bus.rotation.x = Math.PI * 0.5;
    bus.position.z = 0.2;
    craftGroup.add(bus);

    const rtgBoomGeo = new THREE.CylinderGeometry(0.14, 0.22, 7.8, 10);
    const rtgBoom = new THREE.Mesh(rtgBoomGeo, carbonMat);
    rtgBoom.position.set(-3.8, -2.6, -0.5);
    rtgBoom.rotation.z = 0.95;
    craftGroup.add(rtgBoom);

    const magBoomGeo = new THREE.CylinderGeometry(0.09, 0.14, 9.2, 8);
    const magBoom = new THREE.Mesh(magBoomGeo, silverBusMat);
    magBoom.position.set(4.4, 2.4, -0.3);
    magBoom.rotation.z = -0.52;
    craftGroup.add(magBoom);

    if (arch === 'cassini') {
      // Gold Huygens Titan Probe attached to side
      const huygensGeo = new THREE.SphereGeometry(1.45, 20, 14);
      const huygens = new THREE.Mesh(huygensGeo, goldFoilMat);
      huygens.scale.set(1, 1, 0.55);
      huygens.position.set(0, -2.4, 0.4);
      craftGroup.add(huygens);
      disposables.push(huygensGeo);
    }

    disposables.push(dishGeo, dishMat, feedGeo, busGeo, rtgBoomGeo, magBoomGeo);
  } else {
    // ADITYA-L1 / MANGALYAAN / ASTROSAT / XPOSAT / CHANDRAYAAN-2: Gold-MLI Bus + High-Gain Dish + Twin Solar Wings + Payload Optics
    const busGeo = new THREE.BoxGeometry(3.4, 3.6, 3.4);
    const bus = new THREE.Mesh(busGeo, item.isIsro ? goldFoilMat : silverBusMat);
    craftGroup.add(bus);

    const wingGeo = new THREE.BoxGeometry(14.8, 0.16, 2.8);
    const wings = new THREE.Mesh(wingGeo, solarMat);
    craftGroup.add(wings);

    const dishGeo = new THREE.CylinderGeometry(1.6, 0.35, 0.75, 24, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.75,
      roughness: 0.25,
      side: THREE.DoubleSide
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(2.1, 1.2, 1.5);
    dish.rotation.set(0.7, 0.4, -0.5);
    craftGroup.add(dish);

    // Payload Optical / X-Ray Barrel (VELC / UVIT / POLIX)
    const opticsGeo = new THREE.CylinderGeometry(0.65, 0.75, 2.4, 18);
    const optics = new THREE.Mesh(opticsGeo, silverBusMat);
    optics.position.set(0, 2.5, 0.3);
    craftGroup.add(optics);

    const thrusterGeo = new THREE.ConeGeometry(0.55, 0.9, 16);
    const thruster = new THREE.Mesh(thrusterGeo, blueIonGlowMat);
    thruster.rotation.x = Math.PI;
    thruster.position.y = -2.25;
    craftGroup.add(thruster);

    disposables.push(busGeo, wingGeo, dishGeo, dishMat, opticsGeo, thrusterGeo);
  }

  // Attach subtle NASA/ISRO telemetry plate behind spacecraft if real image is provided
  if (realImageUrl) {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      realImageUrl,
      tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
        disposables.push(tex);
      },
      undefined,
      () => {}
    );
  }

  return craftGroup;
}

function baseRadiusOrFallback(r, fb) {
  return typeof r === 'number' && r > 0 ? r : fb;
}

// ============================================================================
// 6C. REACT BITS <ModelViewer /> FOR INTERACTIVE MERCURY INSPECTION IN VOYAGE
// ============================================================================
const MV_FOV = 30;
const MV_INTRO_SECONDS = 1.3;
const MV_DRAG_SPEED = 0.0065;
const MV_PITCH_LIMIT = (65 * Math.PI) / 180;
const mvToRadians = degrees => (degrees * Math.PI) / 180;

function MercuryReactBitsModelViewer({
  mercuryItem,
  environmentIntensity = 1.15,
  exposure = 1.15,
  autoRotate = true,
  autoRotateSpeed = 0.45,
  autoRotateDelay = 2,
  dragRotate = true,
  turntable = false,
  zoom = true,
  minZoom = 0.7,
  maxZoom = 2.2,
  hoverTilt = 0.15,
  float = 0.3,
  shadow = true,
  shadowOpacity = 0.48,
  intro = 'rise',
  startAngle = -30,
  tilt = 10,
  offsetX = 0,
  offsetY = 0,
  fit = 0.82,
  resetOnDoubleClick = true,
  onWheelScroll
}) {
  const stageHostRef = useRef(null);
  const onWheelScrollRef = useRef(onWheelScroll);
  onWheelScrollRef.current = onWheelScroll;

  const settingsRef = useRef({
    environmentIntensity,
    exposure,
    autoRotate,
    autoRotateSpeed,
    autoRotateDelay: Math.max(0, autoRotateDelay),
    dragRotate,
    turntable,
    zoom,
    minZoom: Math.min(minZoom, maxZoom),
    maxZoom: Math.max(minZoom, maxZoom),
    hoverTilt: Math.max(0, hoverTilt),
    float: Math.max(0, float),
    shadow,
    shadowOpacity,
    intro,
    startAngle,
    tilt,
    offsetX,
    offsetY,
    fit,
    resetOnDoubleClick,
    reducedMotion:
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  });

  useEffect(() => {
    const host = stageHostRef.current;
    if (!host) return undefined;

    const getSize = () => ({
      width: Math.max(1, Math.floor(host.clientWidth || 440)),
      height: Math.max(1, Math.floor(host.clientHeight || 440))
    });

    const { width, height } = getSize();
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(MV_FOV, width / height, 0.01, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.NeutralToneMapping || THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = settingsRef.current.exposure;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'pan-y';
    renderer.domElement.style.cursor = settingsRef.current.dragRotate ? 'grab' : 'default';

    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xf8fafc, 0x334155, 1.35 * settingsRef.current.environmentIntensity);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.85);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.75);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const disposables = [];
    const mercuryMaps = createEyesPlanetaryMaps(mercuryItem);
    if (mercuryMaps) {
      disposables.push(mercuryMaps.albedoTex, mercuryMaps.bumpTex);
    }

    const sphereGeo = new THREE.SphereGeometry(1, 96, 96);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: mercuryMaps?.albedoTex || null,
      bumpMap: mercuryMaps?.bumpTex || null,
      bumpScale: 0.045,
      color: new THREE.Color('#d6d3d1'),
      roughness: 0.84,
      metalness: 0.14
    });
    const mercuryMesh = new THREE.Mesh(sphereGeo, sphereMat);
    disposables.push(sphereGeo, sphereMat);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 4, 64, 64, 62);
      grad.addColorStop(0, `rgba(0, 0, 0, ${settingsRef.current.shadowOpacity})`);
      grad.addColorStop(0.55, `rgba(0, 0, 0, ${settingsRef.current.shadowOpacity * 0.45})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI * 0.5;
    shadowMesh.position.set(0, -1.18, 0);
    shadowMesh.visible = settingsRef.current.shadow;
    disposables.push(shadowTex, shadowGeo, shadowMat);

    const placeGroup = new THREE.Group();
    const floatGroup = new THREE.Group();
    const tiltGroup = new THREE.Group();
    const spinGroup = new THREE.Group();

    spinGroup.add(mercuryMesh);
    tiltGroup.add(spinGroup);
    floatGroup.add(tiltGroup);
    placeGroup.add(floatGroup);
    placeGroup.add(shadowMesh);
    scene.add(placeGroup);

    const bounds = { radius: 1.0, floor: 1.0 };
    const s0 = settingsRef.current;
    const motion = {
      yaw: mvToRadians(s0.startAngle),
      pitch: mvToRadians(s0.tilt),
      yawVelocity: 0,
      pitchVelocity: 0,
      zoom: 1,
      zoomGoal: 1,
      tiltX: 0,
      tiltY: 0,
      tiltGoalX: 0,
      tiltGoalY: 0,
      spinSpeed: 0,
      idle: 0,
      dragging: false,
      intro: s0.intro === 'none' ? 1 : 0,
      clock: 0,
      reset: null
    };

    const element = renderer.domElement;
    const pointers = new Map();
    let pinchStart = 0;
    let zoomStart = 1;

    const onDown = event => {
      event.stopPropagation();
      const s = settingsRef.current;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, t: event.timeStamp });
      if (pointers.size === 2 && s.zoom) {
        const [a, b] = [...pointers.values()];
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
        zoomStart = motion.zoomGoal;
        motion.dragging = false;
      } else if (
        pointers.size === 1 &&
        s.dragRotate &&
        (event.pointerType !== 'mouse' || event.button === 0)
      ) {
        motion.dragging = true;
        motion.yawVelocity = 0;
        motion.pitchVelocity = 0;
        try {
          element.setPointerCapture?.(event.pointerId);
        } catch {}
        element.style.cursor = 'grabbing';
      }
      motion.idle = 0;
    };

    const onMove = event => {
      const s = settingsRef.current;
      const rect = element.getBoundingClientRect();
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        const nx = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
        const ny = ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
        motion.tiltGoalX = ny * s.hoverTilt * 0.6;
        motion.tiltGoalY = nx * s.hoverTilt;
      }
      const last = pointers.get(event.pointerId);
      if (last) {
        const dx = event.clientX - last.x;
        const dy = event.clientY - last.y;
        const elapsed = Math.max((event.timeStamp - last.t) / 1000, 1 / 240);
        last.x = event.clientX;
        last.y = event.clientY;
        last.t = event.timeStamp;
        if (pointers.size === 2 && s.zoom && pinchStart > 0) {
          const [a, b] = [...pointers.values()];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          motion.zoomGoal = gxClamp((zoomStart * distance) / pinchStart, s.minZoom, s.maxZoom);
        } else if (motion.dragging) {
          motion.yaw += dx * MV_DRAG_SPEED;
          motion.yawVelocity = motion.yawVelocity * 0.4 + ((dx * MV_DRAG_SPEED) / elapsed) * 0.6;
          if (!s.turntable) {
            motion.pitch = gxClamp(motion.pitch + dy * MV_DRAG_SPEED, -MV_PITCH_LIMIT, MV_PITCH_LIMIT);
            motion.pitchVelocity =
              motion.pitchVelocity * 0.4 + ((dy * MV_DRAG_SPEED) / elapsed) * 0.6;
          }
          motion.idle = 0;
        }
      }
    };

    const onUp = event => {
      const last = pointers.get(event.pointerId);
      if (last && event.timeStamp - last.t > 80) {
        motion.yawVelocity = 0;
        motion.pitchVelocity = 0;
      }
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinchStart = 0;
      if (pointers.size === 0) {
        motion.dragging = false;
        element.style.cursor = settingsRef.current.dragRotate ? 'grab' : 'default';
      }
    };

    const onLeave = () => {
      motion.tiltGoalX = 0;
      motion.tiltGoalY = 0;
    };

    const onWheel = event => {
      const s = settingsRef.current;
      if (s.zoom && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.stopPropagation();
        motion.zoomGoal = gxClamp(
          motion.zoomGoal * Math.exp(-event.deltaY * 0.01),
          s.minZoom,
          s.maxZoom
        );
        motion.idle = 0;
      } else {
        event.preventDefault();
        onWheelScrollRef.current?.(event.deltaY);
      }
    };

    const onDoubleClick = () => {
      const s = settingsRef.current;
      if (!s.resetOnDoubleClick) return;
      const turns = Math.round((motion.yaw - mvToRadians(s.startAngle)) / (Math.PI * 2));
      motion.reset = {
        yaw: mvToRadians(s.startAngle) + turns * Math.PI * 2,
        pitch: mvToRadians(s.tilt)
      };
      motion.zoomGoal = 1;
      motion.yawVelocity = 0;
      motion.pitchVelocity = 0;
      motion.idle = 0;
    };

    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerup', onUp);
    element.addEventListener('pointercancel', onUp);
    element.addEventListener('pointerleave', onLeave);
    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('dblclick', onDoubleClick);

    const resizeObserver = new ResizeObserver(() => {
      const next = getSize();
      camera.aspect = next.width / next.height;
      camera.updateProjectionMatrix();
      renderer.setSize(next.width, next.height);
    });
    resizeObserver.observe(host);

    let rafId = 0;
    let lastNow = performance.now();

    const animate = now => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;

      const s = settingsRef.current;
      const m = motion;
      m.clock += dt;
      m.idle += dt;
      const reduce = s.reducedMotion;

      if (m.intro < 1) m.intro = reduce ? 1 : Math.min(1, m.intro + dt / MV_INTRO_SECONDS);
      const eased = 1 - Math.pow(1 - m.intro, 3);

      if (m.reset) {
        m.yaw += (m.reset.yaw - m.yaw) * (1 - Math.exp(-dt * 7));
        m.pitch += (m.reset.pitch - m.pitch) * (1 - Math.exp(-dt * 7));
        if (Math.abs(m.reset.yaw - m.yaw) < 0.001 && Math.abs(m.reset.pitch - m.pitch) < 0.001) {
          m.reset = null;
        }
      } else if (!m.dragging) {
        const decay = Math.exp(-dt * 4.5);
        m.yaw += m.yawVelocity * dt;
        m.pitch = gxClamp(m.pitch + m.pitchVelocity * dt, -MV_PITCH_LIMIT, MV_PITCH_LIMIT);
        m.yawVelocity *= decay;
        m.pitchVelocity *= decay;
        if (s.turntable) m.pitch += (mvToRadians(s.tilt) - m.pitch) * (1 - Math.exp(-dt * 4));
      }

      const spinning = s.autoRotate && !reduce && !m.dragging && m.idle > s.autoRotateDelay;
      m.spinSpeed += ((spinning ? s.autoRotateSpeed : 0) - m.spinSpeed) * (1 - Math.exp(-dt * 2));
      m.yaw += m.spinSpeed * dt;

      m.zoom += (m.zoomGoal - m.zoom) * (1 - Math.exp(-dt * 8));
      m.tiltX += (m.tiltGoalX - m.tiltX) * (1 - Math.exp(-dt * 6));
      m.tiltY += (m.tiltGoalY - m.tiltY) * (1 - Math.exp(-dt * 6));

      const curSize = getSize();
      const aspect = curSize.width / Math.max(curSize.height, 1);
      const halfView = Math.tan(mvToRadians(MV_FOV) / 2);
      const fitDistance = bounds.radius / (Math.max(s.fit, 0.05) * halfView * Math.min(1, aspect));
      const distance = fitDistance / m.zoom;
      camera.position.set(0, 0, distance);
      camera.near = distance / 50;
      camera.far = distance * 50;
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      const halfHeight = fitDistance * halfView;
      placeGroup.position.set(s.offsetX * halfHeight * aspect, s.offsetY * halfHeight, 0);

      const rise = s.intro === 'rise' ? (1 - eased) * -0.45 : 0;
      const grow = s.intro === 'rise' ? 0.9 + 0.1 * eased : 1;
      const twist =
        s.intro === 'spin'
          ? (1 - eased) * -Math.PI * 1.2
          : s.intro === 'rise'
          ? (1 - eased) * -0.5
          : 0;
      const bob = reduce ? 0 : Math.sin(m.clock * 1.3) * s.float * 0.06;

      floatGroup.position.y = rise + bob;
      floatGroup.scale.setScalar(grow);
      tiltGroup.rotation.set(m.tiltX, m.tiltY, 0);
      spinGroup.rotation.set(m.pitch, m.yaw + twist, 0, 'YXZ');

      renderer.render(scene, camera);
    };

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onUp);
      element.removeEventListener('pointerleave', onLeave);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('dblclick', onDoubleClick);
      disposables.forEach(d => d?.dispose?.());
      renderer.dispose();
      if (element.parentNode === host) host.removeChild(element);
    };
  }, [mercuryItem]);

  return (
    <div
      className="hidden md:flex absolute left-4 sm:left-10 top-1/2 -translate-y-1/2 z-20 flex-col items-center pointer-events-auto"
      style={{ width: 'min(390px, 42vw)', height: 'min(420px, 64vh)' }}
    >
      <div className="mb-2 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-amber-500/35 text-[10px] font-mono tracking-wider text-amber-300 uppercase flex items-center gap-2 shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span>MERCURY • INTERACTIVE 3D GLOBE</span>
      </div>

      <div
        ref={stageHostRef}
        className="w-full flex-1 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-sm shadow-[0_0_60px_rgba(245,158,11,0.12)]"
        title="Drag to rotate with momentum • Ctrl/Cmd + Scroll to zoom • Double-click to reset"
      />

      <div className="mt-2 px-3 py-1 rounded-full bg-black/75 border border-white/10 text-[9px] font-mono text-slate-400 uppercase tracking-wider">
        DRAG TO SPIN • CTRL+SCROLL ZOOM • DBL-CLICK RESET
      </div>
    </div>
  );
}

function getFallbackOrbDataUrl(item) {
  const c1 = encodeURIComponent(item.colorHex || '#f59e0b');
  const c2 = encodeURIComponent(item.accentHex || '#38bdf8');
  let seed = 0;
  for (let i = 0; i < (item.id || '').length; i++) {
    seed += item.id.charCodeAt(i) * (i + 7);
  }
  const rot = seed % 360;

  if (item.isGalaxy || item.isBinaryOrbitsGalaxy || item.isBinaryOrbitsFaceOn) {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%2303050a"/><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%23ffffff"/><stop offset="25%" stop-color="${c2}"/><stop offset="65%" stop-color="${c1}" stop-opacity="0.7"/><stop offset="100%" stop-color="%2303050a" stop-opacity="0"/></radialGradient></defs><g transform="translate(60 60) rotate(${rot}) scale(1 0.56)"><ellipse cx="0" cy="0" rx="52" ry="44" fill="url(%23g)"/><path d="M-42,0 C-30,-32 30,-32 42,0 C30,32 -30,32 -42,0" fill="none" stroke="${c2}" stroke-width="2.5" stroke-opacity="0.75"/><path d="M-28,0 C-18,-20 18,-20 28,0 C18,20 -18,20 -28,0" fill="none" stroke="%23ffffff" stroke-width="1.8" stroke-opacity="0.85"/></g><circle cx="60" cy="60" r="7" fill="%23ffffff"/></svg>`;
  }

  if (item.isBlackHole) {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23020306"/><ellipse cx="60" cy="60" rx="50" ry="15" transform="rotate(-18 60 60)" fill="none" stroke="${c1}" stroke-width="6"/><ellipse cx="60" cy="60" rx="44" ry="12" transform="rotate(-18 60 60)" fill="none" stroke="${c2}" stroke-width="2.5"/><circle cx="60" cy="60" r="22" fill="none" stroke="${c1}" stroke-width="4"/><circle cx="60" cy="60" r="19" fill="%23000000"/></svg>`;
  }

  if (item.isNebula) {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%2304060c"/><defs><radialGradient id="n1" cx="38%" cy="42%" r="55%"><stop offset="0%" stop-color="${c2}" stop-opacity="0.9"/><stop offset="55%" stop-color="${c1}" stop-opacity="0.55"/><stop offset="100%" stop-color="%2304060c" stop-opacity="0"/></radialGradient><radialGradient id="n2" cx="68%" cy="62%" r="50%"><stop offset="0%" stop-color="${c1}" stop-opacity="0.85"/><stop offset="100%" stop-color="%2304060c" stop-opacity="0"/></radialGradient></defs><circle cx="52" cy="52" r="54" fill="url(%23n1)"/><circle cx="72" cy="68" r="46" fill="url(%23n2)"/><circle cx="48" cy="46" r="2" fill="%23ffffff"/><circle cx="74" cy="58" r="1.8" fill="%23ffffff"/><circle cx="60" cy="72" r="1.5" fill="%23ffffff"/></svg>`;
  }

  if (item.isSpacecraft) {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23050811"/><g transform="translate(60 56) rotate(${(rot % 40) - 20})"><rect x="-46" y="-8" width="32" height="16" rx="2" fill="%231d4ed8" stroke="%2338bdf8" stroke-width="1.2"/><rect x="14" y="-8" width="32" height="16" rx="2" fill="%231d4ed8" stroke="%2338bdf8" stroke-width="1.2"/><rect x="-12" y="-12" width="24" height="24" rx="4" fill="${c1}" stroke="%23ffffff" stroke-width="1.4"/><circle cx="0" cy="-18" r="6" fill="none" stroke="${c2}" stroke-width="1.8"/></g></svg>`;
  }

  if (item.hasRings) {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%2303050a"/><defs><radialGradient id="g" cx="35%" cy="35%" r="65%"><stop offset="0%" stop-color="${c2}"/><stop offset="60%" stop-color="${c1}"/><stop offset="100%" stop-color="%230a0d14"/></radialGradient></defs><circle cx="60" cy="56" r="24" fill="url(%23g)"/><ellipse cx="60" cy="56" rx="48" ry="13" transform="rotate(-22 60 56)" fill="none" stroke="${c2}" stroke-width="4.5" stroke-opacity="0.85"/><ellipse cx="60" cy="56" rx="41" ry="10.5" transform="rotate(-22 60 56)" fill="none" stroke="${c1}" stroke-width="2.5"/></svg>`;
  }

  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%2303050a"/><defs><radialGradient id="g" cx="35%" cy="35%" r="65%"><stop offset="0%" stop-color="${c2}"/><stop offset="58%" stop-color="${c1}"/><stop offset="100%" stop-color="%2306080f"/></radialGradient></defs><circle cx="60" cy="55" r="34" fill="url(%23g)"/></svg>`;
}

// ============================================================================
// 7. MAIN COSMOS 3D PRO OBSERVATORY
// ============================================================================
export default function App() {
  const [activeView, setActiveView] = useState('voyage'); // 'voyage' | 'eyes' | 'portal'
  const [activeIndex, setActiveIndex] = useState(0); // Starts directly at THE SUN (Index 0)
  const [cardFlipped, setCardFlipped] = useState(false);
  const [portalSubTab, setPortalSubTab] = useState('Overview');
  const [autoPilot, setAutoPilot] = useState(false);
  const [warpMultiplier, setWarpMultiplier] = useState(1);
  const [showReticles, setShowReticles] = useState(true);

  const [savedIds, setSavedIds] = useState([
    'sun',
    'earth',
    'mars',
    'jupiter',
    'saturn',
    'chandrayaan3',
    'sagittarius_a'
  ]);

  const [portalCategory, setPortalCategory] = useState('All');
  const [portalSearch, setPortalSearch] = useState('');

  // Continuous Non-Stop Elliptical Ring Rotation Refs (Planet Portal)
  const ringAngleRef = useRef(0);
  const ringNodeRefs = useRef([]);
  const orbitStageRef = useRef(null);
  const orbitHoverRef = useRef(false);

  useEffect(() => {
    if (activeView !== 'portal') return undefined;

    let rafId = 0;
    let lastTime = performance.now();

    const updateOrbitPositions = now => {
      rafId = requestAnimationFrame(updateOrbitPositions);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const stage = orbitStageRef.current;
      if (!stage) return;

      const speed = orbitHoverRef.current ? 0.04 : 0.14;
      ringAngleRef.current = (ringAngleRef.current + dt * speed) % (Math.PI * 2);

      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (width <= 0 || height <= 0) return;

      const cx = width * 0.5;
      const cy = height * 0.5;
      const rx = width * 0.43;
      const ry = height * 0.355;
      const total = CELESTIAL_DATA.length;

      for (let i = 0; i < total; i++) {
        const node = ringNodeRefs.current[i];
        if (!node) continue;

        const theta = ringAngleRef.current + (i / total) * Math.PI * 2;
        const x = cx + Math.cos(theta) * rx;
        const y = cy + Math.sin(theta) * ry;
        const depth = (Math.sin(theta) + 1) * 0.5; // 0 (back) -> 1 (front)
        const scale = 0.72 + depth * 0.42;

        node.style.left = `${x.toFixed(1)}px`;
        node.style.top = `${y.toFixed(1)}px`;
        node.style.transform = `translate3d(-50%, -50%, 0) scale(${scale.toFixed(3)})`;
        node.style.zIndex = `${Math.round(10 + depth * 35)}`;
        node.style.opacity = `${(0.58 + depth * 0.42).toFixed(2)}`;
      }
    };

    rafId = requestAnimationFrame(updateOrbitPositions);
    return () => cancelAnimationFrame(rafId);
  }, [activeView]);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiMessages, setAiMessages] = useState([
    {
      role: 'ai',
      text: 'COSMOS AI Mission Control online. Voyage initialized at THE SUN (0.00 AU). Scroll to travel outward through every real-textured planet, ISRO/NASA spacecraft, star, and galaxy.'
    }
  ]);

  const [resolvedImages, setResolvedImages] = useState({});
  const [galleryAssets, setGalleryAssets] = useState({});
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const handleRealImageError = useCallback(async (item, imgEl) => {
    const attempt = Number(imgEl.dataset.fallbackStage || '0');
    const photoCfg = VERIFIED_SATELLITE_PHOTOS[item.id];

    // Stage 1: Try verified secondary NASA/ISRO photograph
    if (attempt === 0 && photoCfg?.backup && imgEl.src !== photoCfg.backup) {
      imgEl.dataset.fallbackStage = '1';
      imgEl.src = photoCfg.backup;
      return;
    }

    // Stage 2: Query live NASA Images API for an authentic mission photograph
    if (attempt <= 1) {
      imgEl.dataset.fallbackStage = '2';
      try {
        const searchTerm =
          photoCfg?.query ||
          item.name.replace(/^THE\s+/i, '').replace(/\(.*?\)/g, '').trim();
        const res = await fetch(
          `https://images-api.nasa.gov/search?q=${encodeURIComponent(searchTerm)}&media_type=image&page_size=4`
        );
        if (res.ok) {
          const json = await res.json();
          const hit = (json?.collection?.items || []).find(entry => entry?.links?.[0]?.href);
          if (hit?.links?.[0]?.href) {
            const safeUrl = sanitizeHttpsUrl(hit.links[0].href, '');
            if (safeUrl) {
              setResolvedImages(prev => ({ ...prev, [item.id]: safeUrl }));
              imgEl.src = safeUrl;
              return;
            }
          }
        }
      } catch {
        // Proceed to final fallback if offline
      }
    }

    imgEl.onerror = null;
    imgEl.src = getFallbackOrbDataUrl(item);
  }, []);

  const toggleSpaceAudio = useCallback(() => {
    if (audioEnabled) {
      if (audioRef.current?.ctx) {
        audioRef.current.ctx.close().catch(() => {});
        audioRef.current = null;
      }
      setAudioEnabled(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.65;
      master.connect(ctx.destination);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 140;
      filter.Q.value = 3.2;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const droneGain = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.value = 55;
      osc2.type = 'sawtooth';
      osc2.frequency.value = 82.41;
      droneGain.gain.value = 0.04;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(droneGain);
      droneGain.connect(master);
      osc1.start();
      osc2.start();

      audioRef.current = { ctx, master, filter, droneGain };
      setAudioEnabled(true);
    } catch {
      setAudioEnabled(false);
    }
  }, [audioEnabled]);

  const playUiChime = useCallback((freq = 640, duration = 0.08) => {
    const nodes = audioRef.current;
    if (!nodes?.ctx) return;
    try {
      const { ctx, master } = nodes;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.35, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Ignore transient Web Audio scheduling errors
    }
  }, []);

  // Three.js & Scroll-Linked Conveyor Card Refs
  const mountRef = useRef(null);
  const cardWrapperRef = useRef(null);
  const audioRef = useRef(null);
  const targetZRef = useRef(CELESTIAL_DATA[0].zPos + 135);
  const currentZRef = useRef(CELESTIAL_DATA[0].zPos + 135);
  const activeIndexRef = useRef(0);
  const autoPilotRef = useRef(false);
  const warpRef = useRef(1);
  const reticlesRef = useRef(true);
  const dragOrbitRef = useRef({ active: false, startX: 0, startY: 0, rotX: 0, rotY: 0 });
  const touchStartYRef = useRef(0);
  const inFlightMediaRef = useRef(new Set());

  activeIndexRef.current = activeIndex;
  autoPilotRef.current = autoPilot;
  warpRef.current = warpMultiplier;
  reticlesRef.current = showReticles;

  const activeBody = CELESTIAL_DATA[activeIndex] || CELESTIAL_DATA[0];
  const isCardOnLeft = activeIndex % 2 === 1;

  // Dynamic NASA Science Hero Metadata for Active Planet/Body
  const nasaHeroInfo = useMemo(() => {
    const preset = NASA_SCIENCE_HERO_META[activeBody.id];
    const cleanTitle = activeBody.name.replace(/^THE\s+/i, '');
    const formattedTitle =
      preset?.displayTitle ||
      cleanTitle
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
    return {
      displayTitle: formattedTitle,
      tagline: preset?.tagline || activeBody.subtitle,
      nasaUrl:
        preset?.nasaUrl ||
        `https://science.nasa.gov/?search=${encodeURIComponent(formattedTitle)}`
    };
  }, [activeBody]);

  // ==========================================================================
  // 10. DEDUPLICATED NASA IMAGE & GALLERY RESOLVER
  // ==========================================================================
  useEffect(() => {
    if (!activeBody || resolvedImages[activeBody.id] || inFlightMediaRef.current.has(activeBody.id)) {
      return;
    }
    inFlightMediaRef.current.add(activeBody.id);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    (async () => {
      try {
        if (activeBody.nasaId && !activeBody.nasaId.startsWith('ISRO_')) {
          const res = await fetch(
            `https://images-api.nasa.gov/asset/${encodeURIComponent(activeBody.nasaId)}`,
            { signal: controller.signal }
          );
          if (res.ok) {
            const data = await res.json();
            const items = data?.collection?.items || [];
            const match =
              items.find(i => i.href?.includes('~large.jpg')) ||
              items.find(i => i.href?.includes('~medium.jpg')) ||
              items.find(i => i.href?.endsWith('.jpg'));
            if (match?.href) {
              const safe = sanitizeHttpsUrl(match.href, activeBody.image);
              setResolvedImages(prev => ({ ...prev, [activeBody.id]: safe }));
            }
          }
        }

        const cleanSearch = activeBody.name.replace(/^THE\s+/i, '').replace(/\(.*?\)/g, '').trim();
        const searchRes = await fetch(
          `https://images-api.nasa.gov/search?q=${encodeURIComponent(cleanSearch)}&media_type=image&page_size=6`,
          { signal: controller.signal }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const collectionItems = searchData?.collection?.items || [];
          const parsedGallery = collectionItems
            .map(entry => {
              const imgLink = entry.links?.find(l => l.render === 'image')?.href;
              const meta = entry.data?.[0];
              if (!imgLink) return null;
              return {
                title: meta?.title || activeBody.name,
                date: meta?.date_created ? meta.date_created.slice(0, 10) : 'NASA Archive',
                center: meta?.center || 'NASA / JPL',
                url: sanitizeHttpsUrl(imgLink, activeBody.image)
              };
            })
            .filter(Boolean)
            .slice(0, 4);

          if (parsedGallery.length > 0) {
            setGalleryAssets(prev => ({ ...prev, [activeBody.id]: parsedGallery }));
          }
        }
      } catch {
        // Keep curated fallback
      } finally {
        clearTimeout(timer);
        inFlightMediaRef.current.delete(activeBody.id);
      }
    })();
  }, [activeBody, resolvedImages]);

  // ==========================================================================
  // 11. WARP JUMP, BOOKMARKS & KEYBOARD CONTROLS
  // ==========================================================================
  const jumpToBody = useCallback(
    index => {
      const clamped = gxClamp(index, 0, CELESTIAL_DATA.length - 1);
      const target = CELESTIAL_DATA[clamped];
      setActiveIndex(clamped);
      setCardFlipped(false);
      targetZRef.current = target.zPos + 135;
      playUiChime(520 + clamped * 6, 0.08);
    },
    [playUiChime]
  );

  const toggleBookmark = useCallback(
    id => {
      playUiChime(740, 0.07);
      setSavedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
    },
    [playUiChime]
  );

  useEffect(() => {
    const onKeyDown = e => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setAutoPilot(false);
        jumpToBody(activeIndexRef.current + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setAutoPilot(false);
        jumpToBody(activeIndexRef.current - 1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setAutoPilot(prev => !prev);
      } else if (e.key === 'Escape') {
        setAiOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [jumpToBody]);

  // ==========================================================================
  // 12. THREE.JS 3D SCROLL VOYAGE ENGINE (NASA EYES 3D DAY-MODE PLANETS & MODELS)
  // ==========================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container || activeView !== 'voyage') return;

    const getViewportSize = () => {
      const rect = container.getBoundingClientRect();
      return {
        width: Math.max(1, Math.floor(rect.width || container.clientWidth || window.innerWidth)),
        height: Math.max(1, Math.floor(rect.height || container.clientHeight || window.innerHeight - 104))
      };
    };

    const initialSize = getViewportSize();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020306);
    scene.fog = new THREE.FogExp2(0x020306, 0.0021);

    const camera = new THREE.PerspectiveCamera(
      48,
      initialSize.width / initialSize.height,
      0.1,
      1600
    );
    camera.position.set(18, 2, currentZRef.current);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      renderer = new THREE.WebGLRenderer({ antialias: false });
    }
    renderer.setSize(initialSize.width, initialSize.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Full-Daylight Omnidirectional Hemisphere & Camera-Coupled Fill Lighting
    // Ensures every planet & moon across all 51 stops remains brightly lit in Day Mode
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 2.35);
    scene.add(hemiLight);

    const dayKeyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    dayKeyLight.position.set(45, 35, 90);
    scene.add(dayKeyLight);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.75);
    rimLight.position.set(-45, -25, 60);
    scene.add(rimLight);

    const disposables = [];
    const starGlowTex = createStarGlowTexture();
    const solarCellTex = createSolarCellTexture();
    if (starGlowTex) disposables.push(starGlowTex);
    if (solarCellTex) disposables.push(solarCellTex);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    const totalVoyageDepth = CELESTIAL_DATA.length * SECTOR_STEP_Z + 1800;
    const starPalette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#fef3c7'),
      new THREE.Color('#bae6fd'),
      new THREE.Color('#fde68a'),
      new THREE.Color('#e0e7ff'),
      new THREE.Color('#fed7aa')
    ];

    // Layer 1: Dense Deep-Space Background Starfield (14,000 Crisp Stars)
    const bgStarCount = 14000;
    const bgStarGeo = new THREE.BufferGeometry();
    const bgStarPos = new Float32Array(bgStarCount * 3);
    const bgStarCol = new Float32Array(bgStarCount * 3);
    for (let i = 0; i < bgStarCount; i++) {
      bgStarPos[i * 3] = (Math.random() - 0.5) * 2400;
      bgStarPos[i * 3 + 1] = (Math.random() - 0.5) * 2200;
      bgStarPos[i * 3 + 2] = 600 - Math.random() * totalVoyageDepth;
      const c = starPalette[i % starPalette.length];
      const brightness = 0.55 + Math.random() * 0.45;
      bgStarCol[i * 3] = c.r * brightness;
      bgStarCol[i * 3 + 1] = c.g * brightness;
      bgStarCol[i * 3 + 2] = c.b * brightness;
    }
    bgStarGeo.setAttribute('position', new THREE.BufferAttribute(bgStarPos, 3));
    bgStarGeo.setAttribute('color', new THREE.BufferAttribute(bgStarCol, 3));
    const bgStarMat = new THREE.PointsMaterial({
      size: 2.2,
      map: starGlowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    scene.add(new THREE.Points(bgStarGeo, bgStarMat));
    disposables.push(bgStarGeo, bgStarMat);

    // Layer 2: Bright Radiant Beacon Stars (3,200 Larger Luminous Stars)
    const brightStarCount = 3200;
    const brightStarGeo = new THREE.BufferGeometry();
    const brightStarPos = new Float32Array(brightStarCount * 3);
    const brightStarCol = new Float32Array(brightStarCount * 3);
    for (let i = 0; i < brightStarCount; i++) {
      brightStarPos[i * 3] = (Math.random() - 0.5) * 2000;
      brightStarPos[i * 3 + 1] = (Math.random() - 0.5) * 1800;
      brightStarPos[i * 3 + 2] = 500 - Math.random() * totalVoyageDepth;
      const c = starPalette[(i * 3) % starPalette.length];
      brightStarCol[i * 3] = c.r;
      brightStarCol[i * 3 + 1] = c.g;
      brightStarCol[i * 3 + 2] = c.b;
    }
    brightStarGeo.setAttribute('position', new THREE.BufferAttribute(brightStarPos, 3));
    brightStarGeo.setAttribute('color', new THREE.BufferAttribute(brightStarCol, 3));
    const brightStarMat = new THREE.PointsMaterial({
      size: 5.2,
      map: starGlowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    scene.add(new THREE.Points(brightStarGeo, brightStarMat));
    disposables.push(brightStarGeo, brightStarMat);

    // Layer 3: Subtle Galactic Dust & Diagonal Milky Way Star Band (5,500 Fine Stars)
    const bandStarCount = 5500;
    const bandStarGeo = new THREE.BufferGeometry();
    const bandStarPos = new Float32Array(bandStarCount * 3);
    const bandStarCol = new Float32Array(bandStarCount * 3);
    for (let i = 0; i < bandStarCount; i++) {
      const bx = (Math.random() - 0.5) * 2200;
      const by = bx * 0.42 + (Math.random() - 0.5) * 380;
      const bz = 500 - Math.random() * totalVoyageDepth;
      bandStarPos[i * 3] = bx;
      bandStarPos[i * 3 + 1] = by;
      bandStarPos[i * 3 + 2] = bz;
      const c = i % 2 === 0 ? new THREE.Color('#93c5fd') : new THREE.Color('#fde68a');
      bandStarCol[i * 3] = c.r * 0.65;
      bandStarCol[i * 3 + 1] = c.g * 0.65;
      bandStarCol[i * 3 + 2] = c.b * 0.65;
    }
    bandStarGeo.setAttribute('position', new THREE.BufferAttribute(bandStarPos, 3));
    bandStarGeo.setAttribute('color', new THREE.BufferAttribute(bandStarCol, 3));
    const bandStarMat = new THREE.PointsMaterial({
      size: 2.8,
      map: starGlowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    scene.add(new THREE.Points(bandStarGeo, bandStarMat));
    disposables.push(bandStarGeo, bandStarMat);

    const createdMeshes = [];
    const createdReticles = [];
    const lensingMats = [];
    const moonPivots = [];
    const roverPivots = [];
    const binaryOrbitSystems = [];
    const planetCloudRotators = [];

    CELESTIAL_DATA.forEach(item => {
      const group = new THREE.Group();
      group.position.set(item.xOffset, item.yOffset, item.zPos);
      const baseRadius = item.baseRadius || 14;

      if (item.isBinaryOrbitsGalaxy || item.isBinaryOrbitsFaceOn) {
        const isFaceOn = Boolean(item.isBinaryOrbitsFaceOn);
        const galaxyContainer = new THREE.Group();
        galaxyContainer.rotation.x = isFaceOn ? 0.36 : 0.72;
        galaxyContainer.rotation.z = isFaceOn ? -0.18 : -0.34;

        const cPureWhite = new THREE.Color('#ffffff');
        const cCoreTint = new THREE.Color(item.accentHex || '#fefce8');
        const cMidArm = new THREE.Color(item.colorHex || '#a5b4fc');
        const cOuterArm = new THREE.Color(isFaceOn ? '#818cf8' : '#a5b4fc');
        const cDeepEdge = new THREE.Color(isFaceOn ? '#4f46e5' : '#6366f1');

        const maxGalRadius = baseRadius * (isFaceOn ? 2.15 : 2.25);

        const streamCount = 13000;
        const streamGeo = new THREE.BufferGeometry();
        const streamPos = new Float32Array(streamCount * 3);
        const streamCol = new Float32Array(streamCount * 3);
        const streamParams = new Float32Array(streamCount * 3);

        const armCount = 2;
        const spiralTurns = isFaceOn ? Math.PI * 4.4 : Math.PI * 6.8;

        for (let i = 0; i < streamCount; i++) {
          const u = Math.pow(Math.random(), isFaceOn ? 1.25 : 1.38);
          const r = 0.22 + u * maxGalRadius;

          const armIdx = i % armCount;
          const armBaseAngle = (armIdx / armCount) * Math.PI * 2;
          const spiralTwist = Math.pow(r / maxGalRadius, isFaceOn ? 0.68 : 0.62) * spiralTurns;

          const isInterArmHalo = isFaceOn && Math.random() < 0.28;
          const gaussianScatter = (Math.random() + Math.random() + Math.random() - 1.5) * (isFaceOn ? 0.34 : 0.42);
          const scatter = isInterArmHalo
            ? (Math.random() - 0.5) * Math.PI * 2
            : gaussianScatter * (0.28 + u * 0.85);
          const theta = armBaseAngle + spiralTwist + scatter;

          const angularSpeed = (0.36 / Math.pow(r * 0.16 + 0.45, 0.72)) * (0.82 + Math.random() * 0.36);

          const bulgeHeight = Math.exp(-Math.pow(r / (maxGalRadius * 0.2), 2)) * (isFaceOn ? 2.2 : 3.8);
          const diskThickness = 0.38 + bulgeHeight;
          const yOff = (Math.random() + Math.random() - 1.0) * diskThickness;

          streamPos[i * 3] = Math.cos(theta) * r;
          streamPos[i * 3 + 1] = yOff;
          streamPos[i * 3 + 2] = Math.sin(theta) * r;

          streamParams[i * 3] = r;
          streamParams[i * 3 + 1] = theta;
          streamParams[i * 3 + 2] = angularSpeed;

          let starColor;
          if (u < 0.14) {
            starColor = cPureWhite.clone().lerp(cCoreTint, u / 0.14);
          } else if (u < 0.42) {
            const t = (u - 0.14) / 0.28;
            starColor = cCoreTint.clone().lerp(cMidArm, t);
          } else if (u < 0.75) {
            const t = (u - 0.42) / 0.33;
            starColor = cMidArm.clone().lerp(cOuterArm, t);
          } else {
            const t = (u - 0.75) / 0.25;
            starColor = cOuterArm.clone().lerp(cDeepEdge, t);
          }

          const radialFade = Math.pow(1 - u * 0.86, 0.72);
          const haloDim = isInterArmHalo ? 0.42 : 1.0;
          const lum = (0.5 + Math.random() * 0.5) * radialFade * haloDim;
          streamCol[i * 3] = starColor.r * lum;
          streamCol[i * 3 + 1] = starColor.g * lum;
          streamCol[i * 3 + 2] = starColor.b * lum;
        }

        streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPos, 3));
        streamGeo.setAttribute('color', new THREE.BufferAttribute(streamCol, 3));

        const streamMat = new THREE.PointsMaterial({
          size: 0.78,
          map: starGlowTex,
          vertexColors: true,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        galaxyContainer.add(new THREE.Points(streamGeo, streamMat));
        disposables.push(streamGeo, streamMat);

        const knotCount = 2400;
        const knotGeo = new THREE.BufferGeometry();
        const knotPos = new Float32Array(knotCount * 3);
        const knotCol = new Float32Array(knotCount * 3);
        const knotParams = new Float32Array(knotCount * 3);

        for (let i = 0; i < knotCount; i++) {
          const isHaloPlume = !isFaceOn && i < 420;
          const u = Math.pow(Math.random(), 1.15);
          const r = isHaloPlume ? 1.5 + Math.random() * maxGalRadius * 0.58 : 0.6 + u * maxGalRadius * 0.94;
          const armIdx = i % armCount;
          const spiralTwist = Math.pow(r / maxGalRadius, isFaceOn ? 0.68 : 0.62) * spiralTurns;
          const theta = (armIdx / armCount) * Math.PI * 2 + spiralTwist + (Math.random() - 0.5) * 0.45;
          const angularSpeed = (0.34 / Math.pow(r * 0.16 + 0.45, 0.72)) * (0.85 + Math.random() * 0.3);

          const yOff = isHaloPlume ? -(2.5 + Math.random() * 14.5) : (Math.random() - 0.5) * 0.9;

          knotPos[i * 3] = Math.cos(theta) * r;
          knotPos[i * 3 + 1] = yOff;
          knotPos[i * 3 + 2] = Math.sin(theta) * r;

          knotParams[i * 3] = r;
          knotParams[i * 3 + 1] = theta;
          knotParams[i * 3 + 2] = angularSpeed;

          const c = isHaloPlume
            ? cOuterArm.clone().multiplyScalar(0.55)
            : u < 0.28
            ? cPureWhite
            : cMidArm.clone().lerp(cOuterArm, u);
          const lum = isHaloPlume ? 0.45 + Math.random() * 0.35 : 0.78 + Math.random() * 0.22;
          knotCol[i * 3] = c.r * lum;
          knotCol[i * 3 + 1] = c.g * lum;
          knotCol[i * 3 + 2] = c.b * lum;
        }

        knotGeo.setAttribute('position', new THREE.BufferAttribute(knotPos, 3));
        knotGeo.setAttribute('color', new THREE.BufferAttribute(knotCol, 3));

        const knotMat = new THREE.PointsMaterial({
          size: 1.35,
          map: starGlowTex,
          vertexColors: true,
          transparent: true,
          opacity: 0.96,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        galaxyContainer.add(new THREE.Points(knotGeo, knotMat));
        disposables.push(knotGeo, knotMat);

        if (starGlowTex) {
          const coreSpriteMat = new THREE.SpriteMaterial({
            map: starGlowTex,
            color: isFaceOn ? 0xf5d0fe : 0xfefce8,
            transparent: true,
            opacity: 0.74,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          const coreSprite = new THREE.Sprite(coreSpriteMat);
          coreSprite.scale.set(
            baseRadius * (isFaceOn ? 1.15 : 1.45),
            baseRadius * (isFaceOn ? 1.15 : 0.72),
            1
          );
          galaxyContainer.add(coreSprite);
          disposables.push(coreSpriteMat);
        }

        group.add(galaxyContainer);

        binaryOrbitSystems.push({
          streamGeo,
          streamParams,
          streamCount,
          knotGeo,
          knotParams,
          knotCount
        });
      } else if (item.isBlackHole) {
        const bhGeo = new THREE.SphereGeometry(baseRadius * 0.48, 36, 36);
        const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        group.add(new THREE.Mesh(bhGeo, bhMat));
        disposables.push(bhGeo, bhMat);

        const diskGeo = new THREE.RingGeometry(baseRadius * 0.54, baseRadius * 1.85, 64);
        const diskMat = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uColorA: { value: new THREE.Color(item.colorHex) },
            uColorB: { value: new THREE.Color(item.accentHex) }
          },
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec2 vUv;
            uniform float uTime;
            uniform vec3 uColorA;
            uniform vec3 uColorB;
            void main() {
              vec2 p = vUv - 0.5;
              float r = length(p) * 2.0;
              float a = atan(p.y, p.x);
              float swirl = sin(a * 3.0 - uTime * 2.6 + r * 14.0) * 0.5 + 0.5;
              vec3 col = mix(uColorA, uColorB, swirl) * 1.45;
              float alpha = smoothstep(0.25, 0.42, r) * (1.0 - smoothstep(0.65, 1.0, r));
              gl_FragColor = vec4(col, alpha * 0.94);
            }
          `,
          side: THREE.DoubleSide,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const disk = new THREE.Mesh(diskGeo, diskMat);
        disk.rotation.x = Math.PI * 0.36;
        group.add(disk);
        lensingMats.push(diskMat);
        disposables.push(diskGeo, diskMat);
      } else if (item.isGalaxy || item.isNebula) {
        // Real NASA Deep-Space Image Volume + Volumetric Particle Cloud
        const pCount = 850;
        const pGeo = new THREE.BufferGeometry();
        const pPos = new Float32Array(pCount * 3);
        const pCol = new Float32Array(pCount * 3);
        const c1 = new THREE.Color(item.colorHex);
        const c2 = new THREE.Color(item.accentHex);

        for (let i = 0; i < pCount; i++) {
          const frac = i / pCount;
          const arm = (i % 3) * ((Math.PI * 2) / 3);
          const radius = frac * baseRadius * 1.25;
          const spin = item.isGalaxy ? frac * 4.8 + arm : Math.random() * Math.PI * 2;
          const spread = item.isGalaxy ? (1 - frac * 0.5) * 2.6 : baseRadius * 0.52;
          pPos[i * 3] = Math.cos(spin) * radius + (Math.random() - 0.5) * spread;
          pPos[i * 3 + 1] = (Math.random() - 0.5) * (item.isGalaxy ? 2.4 : baseRadius * 0.72);
          pPos[i * 3 + 2] = Math.sin(spin) * radius + (Math.random() - 0.5) * spread;
          const mixed = c1.clone().lerp(c2, Math.random());
          pCol[i * 3] = mixed.r;
          pCol[i * 3 + 1] = mixed.g;
          pCol[i * 3 + 2] = mixed.b;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
        pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
        const pMat = new THREE.PointsMaterial({
          size: item.isNebula ? 1.8 : 1.4,
          map: starGlowTex,
          vertexColors: true,
          transparent: true,
          opacity: 0.88,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const cloud = new THREE.Points(pGeo, pMat);
        cloud.rotation.x = 0.48;
        group.add(cloud);
        disposables.push(pGeo, pMat);

        // Map real Hubble / JWST image onto curved volumetric core
        if (item.image) {
          textureLoader.load(
            item.image,
            realTex => {
              realTex.colorSpace = THREE.SRGBColorSpace;
              const coreGeo = new THREE.SphereGeometry(baseRadius * 0.78, 32, 32);
              const coreMat = new THREE.MeshBasicMaterial({
                map: realTex,
                transparent: true,
                opacity: 0.78,
                blending: THREE.AdditiveBlending,
                depthWrite: false
              });
              group.add(new THREE.Mesh(coreGeo, coreMat));
              disposables.push(realTex, coreGeo, coreMat);
            },
            undefined,
            () => {}
          );
        }
      } else if (item.isSpacecraft) {
        // Detailed Multi-Part 3D NASA / ISRO Spacecraft Model
        const spacecraftModel = buildDetailedSpacecraftModel(
          item,
          disposables,
          solarCellTex,
          roverPivots,
          item.image
        );
        group.add(spacecraftModel);
      } else {
        // NASA Eyes 3D Day-Mode Planetary & Lunar Globe Assembly
        // (High-resolution surface maps, bump relief, clouds, rings, obliquity & full daylight illumination)
        const eyesPlanetAssembly = buildEyesDaylightPlanetAssembly(
          item,
          baseRadius,
          disposables,
          planetCloudRotators,
          moonPivots
        );
        group.add(eyesPlanetAssembly);
      }

      if (!item.isBinaryOrbitsGalaxy && !item.isBinaryOrbitsFaceOn) {
        const reticleGroup = new THREE.Group();
        const retGeo = new THREE.RingGeometry(baseRadius * 1.42, baseRadius * 1.44, 64);
        const retMat = new THREE.MeshBasicMaterial({
          color: 0xd97706,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const retMesh = new THREE.Mesh(retGeo, retMat);
        retMesh.rotation.x = 0.55;
        retMesh.rotation.y = -0.35;
        reticleGroup.add(retMesh);
        group.add(reticleGroup);
        createdReticles.push(reticleGroup);
        disposables.push(retGeo, retMat);
      } else {
        createdReticles.push(null);
      }

      scene.add(group);
      createdMeshes.push(group);
    });

    const handleResize = () => {
      if (!container) return;
      const { width, height } = getViewportSize();
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);
    requestAnimationFrame(handleResize);

    const handleWheel = e => {
      e.preventDefault();
      setAutoPilot(false);
      const minCamZ = CELESTIAL_DATA[CELESTIAL_DATA.length - 1].zPos + 135;
      const maxCamZ = CELESTIAL_DATA[0].zPos + 135;
      targetZRef.current = gxClamp(
        targetZRef.current - e.deltaY * 0.68 * warpRef.current,
        minCamZ,
        maxCamZ
      );
    };
    container.addEventListener('wheel', handleWheel, { passive: false });

    let rafId = 0;
    let lastTime = performance.now();

    const animate = now => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const minCamZ = CELESTIAL_DATA[CELESTIAL_DATA.length - 1].zPos + 135;
      const maxCamZ = CELESTIAL_DATA[0].zPos + 135;

      if (autoPilotRef.current) {
        targetZRef.current -= 75 * warpRef.current * dt;
        if (targetZRef.current < minCamZ) targetZRef.current = maxCamZ;
      }

      currentZRef.current += (targetZRef.current - currentZRef.current) * (1 - Math.exp(-7.5 * dt));
      camera.position.z = currentZRef.current;

      const focusZ = currentZRef.current - 135;
      const continuousIdx = gxClamp(-focusZ / SECTOR_STEP_Z, 0, CELESTIAL_DATA.length - 1);
      let desiredCamX = Math.cos(continuousIdx * Math.PI) * 16;
      let desiredCamY = Math.sin(continuousIdx * Math.PI * 0.5) * 2.0;

      for (let i = 0; i < CELESTIAL_DATA.length; i++) {
        const body = CELESTIAL_DATA[i];
        const dz = camera.position.z - body.zPos;
        if (Math.abs(dz) > 220) continue;

        const safeEnvelope = (body.baseRadius || 16) * (body.hasRings ? 2.5 : 1.9) + 32;
        const dx = desiredCamX - body.xOffset;
        const dy = desiredCamY - body.yOffset;
        const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist3D < safeEnvelope) {
          const lateralNeed = Math.sqrt(Math.max(0, safeEnvelope * safeEnvelope - dz * dz));
          const pushSign = body.xOffset <= 0 ? 1 : -1;
          desiredCamX = body.xOffset + pushSign * lateralNeed;
        }
      }

      camera.position.x += (desiredCamX - camera.position.x) * (1 - Math.exp(-5.5 * dt));
      camera.position.y += (desiredCamY - camera.position.y) * (1 - Math.exp(-5.5 * dt));
      camera.lookAt(camera.position.x * 0.25, 0, camera.position.z - 150);

      // Keep frontal daylight key light traveling with the observer so every planet is in Day Mode
      dayKeyLight.position.set(camera.position.x + 42, camera.position.y + 32, camera.position.z + 85);

      const tSec = now * 0.001;
      brightStarMat.opacity = 0.8 + Math.sin(tSec * 2.4) * 0.16;

      for (let l = 0; l < lensingMats.length; l++) {
        lensingMats[l].uniforms.uTime.value = tSec;
      }

      for (let b = 0; b < binaryOrbitSystems.length; b++) {
        const sys = binaryOrbitSystems[b];

        const posAttr = sys.streamGeo.attributes.position;
        const arr = posAttr.array;
        const params = sys.streamParams;
        for (let i = 0; i < sys.streamCount; i++) {
          const rad = params[i * 3];
          const nextTheta = params[i * 3 + 1] + params[i * 3 + 2] * dt * warpRef.current;
          params[i * 3 + 1] = nextTheta;
          arr[i * 3] = Math.cos(nextTheta) * rad;
          arr[i * 3 + 2] = Math.sin(nextTheta) * rad;
        }
        posAttr.needsUpdate = true;

        const kPosAttr = sys.knotGeo.attributes.position;
        const kArr = kPosAttr.array;
        const kParams = sys.knotParams;
        for (let i = 0; i < sys.knotCount; i++) {
          const rad = kParams[i * 3];
          const nextTheta = kParams[i * 3 + 1] + kParams[i * 3 + 2] * dt * warpRef.current;
          kParams[i * 3 + 1] = nextTheta;
          kArr[i * 3] = Math.cos(nextTheta) * rad;
          kArr[i * 3 + 2] = Math.sin(nextTheta) * rad;
        }
        kPosAttr.needsUpdate = true;
      }

      const nearestIdx = Math.round(continuousIdx);
      if (nearestIdx !== activeIndexRef.current) {
        setActiveIndex(nearestIdx);
        setCardFlipped(false);
      }

      if (cardWrapperRef.current) {
        const deltaProgress = continuousIdx - nearestIdx;
        const vh = container.clientHeight || 720;
        const travelPx = -deltaProgress * vh * 1.15;
        const edgeFade = gxClamp(1 - Math.pow(Math.abs(deltaProgress) * 1.95, 3), 0.12, 1);
        cardWrapperRef.current.style.transform = `translate3d(0, calc(-50% + ${travelPx.toFixed(1)}px), 0)`;
        cardWrapperRef.current.style.opacity = edgeFade.toFixed(3);
      }

      const rotSpeed = 0.25 * dt * warpRef.current;
      for (let i = 0; i < createdMeshes.length; i++) {
        const grp = createdMeshes[i];
        const isFocused = i === nearestIdx;
        const bodyItem = CELESTIAL_DATA[i];
        const isBinaryGal =
          bodyItem.isBinaryOrbitsGalaxy || bodyItem.isBinaryOrbitsFaceOn;
        const isEyesPlanet =
          !bodyItem.isSpacecraft &&
          !bodyItem.isGalaxy &&
          !bodyItem.isNebula &&
          !bodyItem.isBlackHole;

        if (isEyesPlanet) {
          // Axial rotation is driven inside planetCloudRotators along true planetary obliquity
          grp.rotation.y = isFocused ? dragOrbitRef.current.rotY * 0.65 : 0;
          grp.rotation.x = isFocused ? dragOrbitRef.current.rotX * 0.45 : 0;
        } else if (isBinaryGal) {
          grp.rotation.y = isFocused ? dragOrbitRef.current.rotY * 0.45 : 0;
          grp.rotation.x = isFocused ? dragOrbitRef.current.rotX * 0.35 : 0;
        } else {
          grp.rotation.y += rotSpeed + (isFocused ? dragOrbitRef.current.rotY * 0.03 : 0);
          grp.rotation.x = isFocused ? dragOrbitRef.current.rotX * 0.35 : 0;
        }

        const ret = createdReticles[i];
        if (ret) {
          ret.visible = reticlesRef.current;
          ret.rotation.z -= dt * 0.22;
        }
      }

      for (let p = 0; p < planetCloudRotators.length; p++) {
        const itemRot = planetCloudRotators[p];
        itemRot.surfaceMesh.rotation.y += dt * itemRot.spinRate * warpRef.current;
        if (itemRot.cloudMesh) {
          itemRot.cloudMesh.rotation.y += dt * (itemRot.spinRate * 1.48) * warpRef.current;
        }
      }

      for (let m = 0; m < moonPivots.length; m++) {
        moonPivots[m].rotation.y += dt * 0.35;
      }

      for (let r = 0; r < roverPivots.length; r++) {
        roverPivots[r].rotation.z += dt * 0.55;
        roverPivots[r].rotation.x += dt * 0.25;
      }

      renderer.render(scene, camera);
    };

    // Render initial frame immediately before animation loop ticks
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('wheel', handleWheel);
      disposables.forEach(res => {
        if (res && typeof res.dispose === 'function') res.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeView]);

  // ==========================================================================
  // 13. FILTERED PORTAL CATALOG
  // ==========================================================================
  const filteredPortalCatalog = useMemo(() => {
    return CELESTIAL_DATA.filter(item => {
      const catOk =
        portalCategory === 'All' ||
        (portalCategory === 'ISRO' ? item.isIsro : item.category === portalCategory);
      const q = portalSearch.trim().toLowerCase();
      const textOk =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.missions.some(m => m.toLowerCase().includes(q));
      return catOk && textOk;
    });
  }, [portalCategory, portalSearch]);

  const handleAskAi = e => {
    e?.preventDefault();
    const prompt = aiQuery.trim();
    if (!prompt) return;
    playUiChime(760, 0.08);
    const reply = `[${activeBody.name}] Distance: ${activeBody.telemetry.distanceFromSun} • Light Delay: ${activeBody.lightTime} • Gravity: ${activeBody.telemetry.gravity} • Temperature: ${activeBody.telemetry.surfaceTemp} • Missions: ${activeBody.missions.join(', ')}.`;
    setAiMessages(prev => [...prev, { role: 'user', text: prompt }, { role: 'ai', text: reply }]);
    setAiQuery('');
  };

  const isBookmarked = savedIds.includes(activeBody.id);

  // Front Face of React Bits <FlipCard />
  const dossierCardFront = (
    <div className="w-full h-full p-5 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-[10px] font-mono font-bold tracking-widest text-amber-300 uppercase">
            STOP {activeIndex + 1} / {CELESTIAL_DATA.length} • {activeBody.category}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                toggleBookmark(activeBody.id);
              }}
              className={`p-2 rounded-lg border transition cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                  : 'bg-white/5 border-white/15 text-slate-400 hover:text-white'
              }`}
              title="Bookmark Target"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="relative h-32 rounded-xl overflow-hidden border border-white/10 bg-black">
          <img
            src={resolvedImages[activeBody.id] || activeBody.image}
            alt={activeBody.name}
            onError={e => handleRealImageError(activeBody, e.currentTarget)}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono">
            <span className="text-amber-300 font-bold">{activeBody.distanceDisplay}</span>
            <span className="text-sky-300">{activeBody.lightTime}</span>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black tracking-wide text-white uppercase leading-tight">
            {activeBody.name}
          </h2>
          <p className="text-[10px] font-mono text-amber-400/90 uppercase mt-0.5 line-clamp-1">
            {activeBody.subtitle}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed mt-2 line-clamp-3">
            {activeBody.description}
          </p>
        </div>
      </div>

      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
        <span className="text-[9px] font-mono text-slate-500 uppercase">CLICK OR DRAG TO FLIP</span>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            playUiChime(620, 0.08);
            setCardFlipped(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-[10px] font-mono font-bold tracking-wider text-amber-300 uppercase transition cursor-pointer"
        >
          <RotateCw className="w-3 h-3" />
          <span>TELEMETRY</span>
        </button>
      </div>
    </div>
  );

  // Back Face of React Bits <FlipCard />
  const dossierCardBack = (
    <div className="w-full h-full p-5 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-400/35 text-[10px] font-mono font-bold tracking-widest text-sky-300 uppercase">
            SCIENTIFIC TELEMETRY
          </span>
          <span className="text-[10px] font-mono text-slate-400">{activeBody.nasaId}</span>
        </div>

        <h3 className="text-lg font-black text-white uppercase tracking-wide">
          {activeBody.name}
        </h3>

        <div className="grid grid-cols-1 gap-2 text-[11px] font-mono">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between gap-2">
            <span className="text-slate-400">DISTANCE</span>
            <span className="text-amber-300 font-bold text-right">{activeBody.telemetry.distanceFromSun}</span>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between gap-2">
            <span className="text-slate-400">MASS</span>
            <span className="text-slate-100 font-bold text-right">{activeBody.telemetry.mass}</span>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between gap-2">
            <span className="text-slate-400">TEMPERATURE</span>
            <span className="text-slate-100 font-bold text-right">{activeBody.telemetry.surfaceTemp}</span>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between gap-2">
            <span className="text-slate-400">GRAVITY</span>
            <span className="text-sky-300 font-bold text-right">{activeBody.telemetry.gravity}</span>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex justify-between gap-2">
            <span className="text-slate-400">COMPOSITION</span>
            <span className="text-slate-200 font-bold text-right truncate">{activeBody.telemetry.composition}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {activeBody.missions.slice(0, 4).map(mission => (
            <span
              key={mission}
              className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-[9px] font-mono text-amber-200"
            >
              {mission}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-2.5 border-t border-white/10 flex items-center justify-between">
        <span className="text-[9px] font-mono text-slate-500 uppercase">DRAG OR CLICK TO FLIP BACK</span>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            playUiChime(620, 0.08);
            setCardFlipped(false);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-[10px] font-mono font-bold tracking-wider text-amber-300 uppercase transition cursor-pointer"
        >
          <RotateCw className="w-3 h-3" />
          <span>FRONT FACE</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-screen bg-[#000000] text-slate-100 overflow-hidden select-none font-sans flex flex-col">
      <style>{`${FLIP_CARD_CSS}\n${PILL_NAV_CSS}`}</style>

      {/* ====================================================================
          TOP EDITORIAL OBSERVATORY HEADER (CLEAN UNDERLINE TABS & PILL CTA)
         ==================================================================== */}
      <header className="relative z-30 bg-[#070910]/95 backdrop-blur-md border-b border-white/[0.08] px-5 sm:px-10 h-16 flex items-center justify-between gap-4 shrink-0">
        {/* Minimal Brand Mark */}
        <button
          type="button"
          onClick={() => {
            setActiveView('voyage');
            jumpToBody(0);
          }}
          className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
          title="Return to Origin (The Sun)"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
          <span className="font-semibold tracking-[0.18em] text-sm text-white uppercase">
            COSMOS
          </span>
          <span className="hidden sm:inline-block text-[10px] font-medium tracking-widest text-slate-400 uppercase border-l border-white/15 pl-2.5">
            Observatory
          </span>
        </button>

        {/* Clean Horizontal Text Links with Sliding Bottom Underline + Primary Pill CTA */}
        <nav aria-label="Primary Navigation" className="flex items-center gap-5 sm:gap-9 h-full">
          {[
            { id: 'voyage', label: 'Voyage' },
            { id: 'eyes', label: 'Live Eyes' },
            { id: 'portal', label: 'Planets' }
          ].map(navItem => {
            const isActive = activeView === navItem.id;
            return (
              <button
                key={navItem.id}
                type="button"
                onClick={() => {
                  setActiveView(navItem.id);
                  playUiChime(640, 0.07);
                }}
                className={`relative h-full inline-flex items-center text-[13px] sm:text-sm font-medium tracking-wide transition-colors cursor-pointer focus:outline-none ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <span>{navItem.label}</span>
                <span
                  className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-sky-200 transition-all duration-300 ${
                    isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50'
                  }`}
                />
              </button>
            );
          })}

          <div className="flex items-center gap-2.5 pl-1">
            <button
              type="button"
              onClick={() => setAiOpen(prev => !prev)}
              className="px-4 sm:px-5 py-1.5 rounded-full bg-[#eef4ff] hover:bg-white text-[#070910] text-[13px] font-semibold tracking-wide transition-all shadow-sm cursor-pointer"
            >
              Cosmos AI
            </button>

            <button
              type="button"
              onClick={toggleSpaceAudio}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                audioEnabled
                  ? 'text-sky-300 bg-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title={audioEnabled ? 'Mute Space Audio' : 'Enable Space Audio'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </nav>
      </header>

      {/* ====================================================================
          VIEW 1: 3D SCROLL VOYAGE WITH NASA EYES 3D DAY-MODE PLANETS
         ==================================================================== */}
      {activeView === 'voyage' && (
        <main className="relative flex-1 overflow-hidden">
          <div
            ref={mountRef}
            onMouseDown={e => {
              dragOrbitRef.current = {
                active: true,
                startX: e.clientX,
                startY: e.clientY,
                rotX: dragOrbitRef.current.rotX,
                rotY: dragOrbitRef.current.rotY
              };
            }}
            onMouseMove={e => {
              if (!dragOrbitRef.current.active) return;
              const dx = (e.clientX - dragOrbitRef.current.startX) * 0.012;
              const dy = (e.clientY - dragOrbitRef.current.startY) * 0.012;
              dragOrbitRef.current.rotY = gxClamp(dx, -2.5, 2.5);
              dragOrbitRef.current.rotX = gxClamp(dy, -1.2, 1.2);
            }}
            onMouseUp={() => {
              dragOrbitRef.current.active = false;
            }}
            onMouseLeave={() => {
              dragOrbitRef.current.active = false;
            }}
            onTouchStart={e => {
              if (e.touches[0]) touchStartYRef.current = e.touches[0].clientY;
            }}
            onTouchMove={e => {
              if (!e.touches[0]) return;
              const dy = touchStartYRef.current - e.touches[0].clientY;
              touchStartYRef.current = e.touches[0].clientY;
              setAutoPilot(false);
              const minCamZ = CELESTIAL_DATA[CELESTIAL_DATA.length - 1].zPos + 135;
              const maxCamZ = CELESTIAL_DATA[0].zPos + 135;
              targetZRef.current = gxClamp(targetZRef.current - dy * 2.1, minCamZ, maxCamZ);
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          />

          {activeBody.id === 'mercury' && (
            <MercuryReactBitsModelViewer
              mercuryItem={activeBody}
              onWheelScroll={deltaY => {
                setAutoPilot(false);
                const minCamZ = CELESTIAL_DATA[CELESTIAL_DATA.length - 1].zPos + 135;
                const maxCamZ = CELESTIAL_DATA[0].zPos + 135;
                targetZRef.current = gxClamp(
                  targetZRef.current - deltaY * 0.68 * warpRef.current,
                  minCamZ,
                  maxCamZ
                );
              }}
            />
          )}

          <div
            ref={cardWrapperRef}
            style={{ transform: 'translate3d(0, -50%, 0)' }}
            className={`absolute top-1/2 z-20 will-change-transform ${
              isCardOnLeft ? 'left-4 sm:left-10 right-auto' : 'right-4 sm:right-10 left-auto'
            }`}
          >
            <FlipCard
              front={dossierCardFront}
              back={dossierCardBack}
              flipped={cardFlipped}
              onFlipChange={next => setCardFlipped(next)}
              axis="y"
              flipOnClick
              draggable
              tilt
              tiltMax={10}
              glare
              glareOpacity={0.22}
              hoverScale={1.02}
              perspective={1100}
              stiffness={170}
              damping={20}
              width={370}
              height={445}
              radius={22}
              background="rgba(11, 13, 18, 0.94)"
              color="#f5f5f5"
              shadow
              shadowColor="#000000"
              shadowOpacity={0.55}
            />
          </div>

          <footer className="absolute bottom-0 left-0 right-0 z-20 bg-[#08090c]/95 border-t border-white/10 px-4 sm:px-8 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto">
              <div>
                <div className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                  ACTIVE TARGET ({activeIndex + 1}/{CELESTIAL_DATA.length})
                </div>
                <select
                  aria-label="Jump to Celestial Body"
                  value={activeIndex}
                  onChange={e => {
                    setAutoPilot(false);
                    jumpToBody(Number(e.target.value));
                  }}
                  className="mt-0.5 bg-[#0d0f14] border border-amber-500/40 rounded-md px-2 py-0.5 text-xs font-mono font-bold text-amber-300 uppercase focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {CELESTIAL_DATA.map((body, idx) => (
                    <option key={body.id} value={idx} className="bg-[#08090c] text-slate-100">
                      {idx + 1}. {body.name} ({body.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAutoPilot(false);
                    jumpToBody(activeIndex - 1);
                  }}
                  disabled={activeIndex === 0}
                  className="px-2.5 py-1 rounded-md bg-[#0d0f14] border border-white/15 hover:border-amber-400/50 disabled:opacity-40 text-[10px] font-mono font-bold text-slate-200 cursor-pointer"
                  title="Previous Celestial Body (Up/Left Arrow)"
                >
                  ◀ PREV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutoPilot(false);
                    jumpToBody(activeIndex + 1);
                  }}
                  disabled={activeIndex === CELESTIAL_DATA.length - 1}
                  className="px-2.5 py-1 rounded-md bg-[#0d0f14] border border-white/15 hover:border-amber-400/50 disabled:opacity-40 text-[10px] font-mono font-bold text-slate-200 cursor-pointer"
                  title="Next Celestial Body (Down/Right Arrow)"
                >
                  NEXT ▶
                </button>
              </div>

              <div>
                <div className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">
                  LIGHT TRAVEL DELAY
                </div>
                <div className="text-xs font-mono font-bold text-sky-400 mt-0.5">{activeBody.lightTime}</div>
              </div>

              <div className="hidden lg:block">
                <div className="text-[9px] font-mono tracking-widest text-slate-400 uppercase">DISTANCE</div>
                <div className="text-xs font-mono font-bold text-slate-200 mt-0.5">{activeBody.distanceDisplay}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAutoPilot(prev => !prev)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold tracking-wider uppercase transition cursor-pointer ${
                  autoPilot
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : 'bg-[#0d0f14] border-white/15 text-slate-200 hover:border-amber-400/40'
                }`}
              >
                {autoPilot ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-amber-400" />}
                <span>{autoPilot ? 'CRUISING' : 'AUTO-PILOT'}</span>
              </button>

              <button
                type="button"
                onClick={() => setWarpMultiplier(prev => (prev === 1 ? 2 : prev === 2 ? 5 : 1))}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#0d0f14] border border-sky-400/35 hover:border-sky-400/60 text-sky-300 text-[10px] font-mono font-bold tracking-wider uppercase transition cursor-pointer"
              >
                {warpMultiplier}X WARP
              </button>

              <button
                type="button"
                onClick={() => setShowReticles(prev => !prev)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-[10px] font-mono font-bold tracking-wider uppercase transition cursor-pointer ${
                  showReticles
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-[#0d0f14] border-white/15 text-slate-400 hover:text-white'
                }`}
              >
                <Crosshair className="w-3 h-3" />
                <span className="hidden sm:inline">RETICLES</span>
              </button>
            </div>
          </footer>
        </main>
      )}

      {/* ====================================================================
          VIEW 2: LIVE EYES 3D
         ==================================================================== */}
      {activeView === 'eyes' && (
        <main className="relative flex-1 bg-black flex flex-col">
          <div className="bg-[#08090c] border-b border-white/10 px-6 py-2.5 flex items-center justify-end">
            <a
              href="https://eyes.nasa.gov/apps/solar-system/#/home"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0d0f14] border border-sky-400/35 hover:border-sky-400/60 text-sky-300 text-[11px] font-mono uppercase transition"
            >
              <span>OPEN FULLSCREEN</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <iframe
            title="NASA Eyes on the Solar System"
            src="https://eyes.nasa.gov/apps/solar-system/#/home"
            className="w-full flex-1 border-0"
            allowFullScreen
          />
        </main>
      )}

      {/* ====================================================================
          VIEW 3: PLANET PORTAL WITH REACT BITS PRO <BlinkingDots /> BACKGROUND
         ==================================================================== */}
      {activeView === 'portal' && (
        <main className="relative flex-1 overflow-y-auto bg-[#000000]">
          <BlinkingDots
            spacing={24}
            dotRadius={1.35}
            backgroundColor="#000000"
            className="fixed inset-0 z-0"
          />

          <div className="relative z-10 space-y-8">
            <section className="w-full bg-[#070910] border-b border-white/15">
              <div className="bg-[#070910]/95 backdrop-blur-md border-b border-white/[0.08] px-5 sm:px-10 h-14 flex items-center justify-between gap-4">
                <div className="flex items-center gap-5 sm:gap-8 h-full overflow-x-auto">
                  <span className="text-white font-semibold tracking-wide text-sm whitespace-nowrap pr-2 border-r border-white/15">
                    {nasaHeroInfo.displayTitle}
                  </span>
                  {['Overview', 'Science at Work', 'Multimedia', 'Telemetry Data'].map(tab => {
                    const isSubActive = portalSubTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setPortalSubTab(tab);
                          playUiChime(640, 0.06);
                        }}
                        className={`relative h-full inline-flex items-center text-[13px] font-medium tracking-wide whitespace-nowrap transition-colors cursor-pointer focus:outline-none ${
                          isSubActive ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                        }`}
                      >
                        <span>{tab}</span>
                        <span
                          className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-sky-200 transition-all duration-300 ${
                            isSubActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-slate-400 uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                    NASA / ISRO Science Portal
                  </span>
                  <a
                    href={nasaHeroInfo.nasaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#eef4ff] hover:bg-white text-[#070910] text-xs font-semibold tracking-wide transition-all shadow-sm"
                  >
                    <span>Official Mission</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="relative w-full min-h-[380px] sm:min-h-[450px] overflow-hidden flex items-center bg-[#000000]">
                <div className="absolute inset-y-0 right-0 w-full md:w-[66%] overflow-hidden pointer-events-none">
                  <img
                    key={activeBody.id}
                    src={resolvedImages[activeBody.id] || activeBody.image}
                    alt={nasaHeroInfo.displayTitle}
                    onError={e => handleRealImageError(activeBody, e.currentTarget)}
                    className="w-full h-full object-cover object-center scale-105 transition-all duration-700"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(90deg, #000000 0%, rgba(0,0,0,0.92) 18%, rgba(0,0,0,0.62) 46%, rgba(0,0,0,0.08) 78%, rgba(0,0,0,0.35) 100%)'
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(0deg, #000000 0%, transparent 26%, transparent 85%, rgba(0,0,0,0.6) 100%)'
                    }}
                  />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-14 py-10">
                  <div className="max-w-xl space-y-4">
                    <div className="inline-flex items-center gap-2 text-[11px] font-mono tracking-widest text-amber-400 uppercase">
                      <span>STOP {activeIndex + 1} / {CELESTIAL_DATA.length}</span>
                      <span>•</span>
                      <span>{activeBody.category}</span>
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-white leading-[1.02]">
                      {nasaHeroInfo.displayTitle}
                    </h1>

                    <p className="text-base sm:text-xl text-slate-200 font-normal leading-relaxed">
                      {nasaHeroInfo.tagline}
                    </p>

                    {portalSubTab === 'Overview' && (
                      <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pt-1">
                        {activeBody.description}
                      </p>
                    )}

                    {portalSubTab === 'Science at Work' && (
                      <div className="pt-1 space-y-2">
                        <div className="text-[10px] font-mono tracking-widest text-amber-300 uppercase">
                          ACTIVE & ARCHIVAL SPACECRAFT MISSIONS
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {activeBody.missions.map(mission => (
                            <span
                              key={mission}
                              className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-mono text-white"
                            >
                              {mission}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {portalSubTab === 'Multimedia' && (
                      <div className="pt-2 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium tracking-wider text-sky-200 uppercase">
                            Featured Archival Gallery
                          </span>
                          <a
                            href={`https://images.nasa.gov/search?q=${encodeURIComponent(nasaHeroInfo.displayTitle)}&page=1&media=image`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white transition"
                          >
                            <span>Browse Full Archive</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          {(
                            galleryAssets[activeBody.id]?.slice(0, 3) || [
                              {
                                title: `${nasaHeroInfo.displayTitle} — Primary Capture`,
                                center: activeBody.isIsro ? 'ISRO Space Archive' : 'NASA / JPL',
                                date: 'Verified Observation',
                                url: resolvedImages[activeBody.id] || activeBody.image
                              }
                            ]
                          ).map((media, idx) => (
                            <button
                              key={`${media.url}-${idx}`}
                              type="button"
                              onClick={() => setLightboxMedia(media)}
                              className="group relative aspect-[16/10] rounded-xl overflow-hidden border border-white/15 hover:border-sky-200/70 bg-black text-left transition cursor-pointer"
                            >
                              <img
                                src={media.url}
                                alt={media.title}
                                onError={e => handleRealImageError(activeBody, e.currentTarget)}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                              <div className="absolute bottom-1.5 left-2 right-2">
                                <div className="text-[10px] font-medium text-white truncate">
                                  {media.title}
                                </div>
                                <div className="text-[9px] text-slate-400 truncate">
                                  {media.center}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {portalSubTab === 'Telemetry Data' && (
                      <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs font-mono">
                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                          <div className="text-[9px] text-slate-400">DISTANCE FROM SUN</div>
                          <div className="text-amber-300 font-bold mt-0.5">{activeBody.telemetry.distanceFromSun}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                          <div className="text-[9px] text-slate-400">SURFACE TEMPERATURE</div>
                          <div className="text-white font-bold mt-0.5">{activeBody.telemetry.surfaceTemp}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                          <div className="text-[9px] text-slate-400">SURFACE GRAVITY</div>
                          <div className="text-sky-300 font-bold mt-0.5">{activeBody.telemetry.gravity}</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                          <div className="text-[9px] text-slate-400">MASS</div>
                          <div className="text-white font-bold mt-0.5">{activeBody.telemetry.mass}</div>
                        </div>
                      </div>
                    )}
                    <div className="pt-4 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          jumpToBody(activeIndex);
                          setActiveView('voyage');
                        }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#eef4ff] hover:bg-white text-[#070910] text-xs font-semibold tracking-wide transition-all shadow-sm cursor-pointer"
                      >
                        <span>Launch 3D Flyby</span>
                        <span aria-hidden="true">→</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleBookmark(activeBody.id)}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs font-medium tracking-wide transition-all cursor-pointer ${
                          isBookmarked
                            ? 'bg-sky-200/15 border-sky-200/45 text-white'
                            : 'bg-white/[0.04] border-white/15 text-slate-300 hover:text-white hover:border-white/30'
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CONTINUOUSLY ROTATING 51-OBJECT ELLIPTICAL ORBIT RING OVER <BlinkingDots /> */}
            <div className="px-4 sm:px-8 space-y-8">
              <section
                ref={orbitStageRef}
                onMouseEnter={() => {
                  orbitHoverRef.current = true;
                }}
                onMouseLeave={() => {
                  orbitHoverRef.current = false;
                }}
                className="relative w-full h-[440px] sm:h-[500px] rounded-3xl bg-black/55 border border-white/10 overflow-hidden shadow-2xl"
              >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[86%] h-[71%] rounded-[100%] border border-dashed border-amber-500/25 pointer-events-none" />

                <div className="absolute top-4 right-5 z-50 flex items-center gap-2 px-3 py-1 rounded-full bg-black/85 border border-white/10 text-[10px] font-mono text-emerald-300 pointer-events-none">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>CONTINUOUS ORBIT • {CELESTIAL_DATA.length} BODIES</span>
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[230px] sm:w-[290px] px-5 py-4 rounded-2xl bg-black/90 backdrop-blur-md border border-amber-500/45 shadow-[0_0_45px_rgba(245,158,11,0.2)] text-center pointer-events-none">
                  <div className="text-[9px] font-mono tracking-widest text-amber-400/90 uppercase">
                    LOCKED TARGET • STOP {activeIndex + 1}/{CELESTIAL_DATA.length}
                  </div>
                  <div className="text-sm sm:text-lg font-black tracking-wider text-white uppercase mt-0.5 truncate">
                    {activeBody.name}
                  </div>
                  <div className="text-[10px] font-mono text-sky-400 mt-0.5 truncate">{activeBody.distanceDisplay}</div>
                </div>

                {CELESTIAL_DATA.map((item, idx) => {
                  const isLocked = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      ref={el => {
                        ringNodeRefs.current[idx] = el;
                      }}
                      type="button"
                      onClick={() => jumpToBody(idx)}
                      onDoubleClick={() => {
                        jumpToBody(idx);
                        setActiveView('voyage');
                      }}
                      title={`${item.name} (${item.distanceDisplay}) — Click to preview • Double-click to warp`}
                      style={{ left: '50%', top: '50%', transform: 'translate3d(-50%, -50%, 0)' }}
                      className={`group absolute w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border bg-[#000000] shadow-xl will-change-transform transition-colors duration-200 cursor-pointer ${
                        isLocked
                          ? 'border-amber-400 ring-2 ring-amber-400/80'
                          : 'border-white/20 hover:border-amber-300'
                      }`}
                    >
                      <img
                        src={resolvedImages[item.id] || item.image}
                        alt={item.name}
                        onError={e => handleRealImageError(item, e.currentTarget)}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent px-1 py-0.5">
                        <div className="text-[7px] font-mono font-bold text-amber-200 truncate text-center uppercase">
                          {item.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </section>

              {/* FILTERABLE 51-OBJECT CATALOG GRID */}
              <section className="max-w-7xl mx-auto space-y-5 pb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-3">
                  <div className="flex flex-wrap items-center gap-5 sm:gap-7">
                    {['All', 'ISRO', 'Planets & Moons', 'Spacecraft', 'Exoplanets', 'Stars & Nebulae', 'Galaxies'].map(
                      cat => {
                        const isCatActive = portalCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setPortalCategory(cat)}
                            className={`relative pb-2.5 -mb-[13px] text-[13px] font-medium tracking-wide transition-colors cursor-pointer focus:outline-none ${
                              isCatActive ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                            }`}
                          >
                            <span>{cat === 'ISRO' ? 'ISRO Missions' : cat}</span>
                            <span
                              className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-sky-200 transition-all duration-300 ${
                                isCatActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50'
                              }`}
                            />
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div className="relative w-full md:w-72">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={portalSearch}
                      onChange={e => setPortalSearch(e.target.value)}
                      placeholder="Filter cosmic objects..."
                      className="w-full pl-9 pr-4 py-1.5 rounded-full bg-[#070910]/90 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-200/60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredPortalCatalog.map(item => {
                    const globalIdx = CELESTIAL_DATA.findIndex(d => d.id === item.id);
                    const isSelected = globalIdx === activeIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => jumpToBody(globalIdx)}
                        className={`cursor-pointer rounded-2xl bg-black/85 backdrop-blur-md border overflow-hidden flex flex-col justify-between transition group ${
                          isSelected
                            ? 'border-amber-400 ring-1 ring-amber-400/50'
                            : 'border-white/10 hover:border-amber-500/45'
                        }`}
                      >
                        <div>
                          <div className="relative h-36 bg-black overflow-hidden">
                            <img
                              src={resolvedImages[item.id] || item.image}
                              alt={item.name}
                              onError={e => handleRealImageError(item, e.currentTarget)}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-transparent to-transparent" />
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-amber-300 border border-white/10">
                              {item.lightTime}
                            </div>
                            {item.isIsro && (
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-orange-500 text-[9px] font-mono font-bold text-black">
                                ISRO
                              </div>
                            )}
                          </div>

                          <div className="p-4 space-y-1.5">
                            <div className="text-[10px] font-mono text-slate-400 uppercase">
                              STOP {globalIdx + 1} • {item.category}
                            </div>
                            <h3 className="text-base font-black text-white uppercase">{item.name}</h3>
                            <p className="text-[10px] font-mono text-amber-400/90 uppercase line-clamp-1">
                              {item.subtitle}
                            </p>
                            <p className="text-xs text-slate-400 line-clamp-2 pt-1">{item.description}</p>
                          </div>
                        </div>

                        <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              jumpToBody(globalIdx);
                              setActiveView('voyage');
                            }}
                            className="flex-1 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/45 text-amber-300 text-[10px] font-mono font-bold tracking-wider uppercase transition cursor-pointer"
                          >
                            WARP IN 3D VOYAGE →
                          </button>

                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              toggleBookmark(item.id);
                            }}
                            className={`p-2 rounded-lg border transition cursor-pointer ${
                              savedIds.includes(item.id)
                                ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            }`}
                            title="Bookmark Target"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </main>
      )}

      {/* ====================================================================
          MULTIMEDIA LIGHTBOX VIEWER
         ==================================================================== */}
      {lightboxMedia && (
        <div
          onClick={() => setLightboxMedia(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-4xl w-full rounded-2xl bg-[#070910] border border-white/15 overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <div>
                <h4 className="text-sm font-semibold text-white">{lightboxMedia.title}</h4>
                <p className="text-xs text-slate-400">
                  {lightboxMedia.center} • {lightboxMedia.date}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxMedia(null)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[72vh] overflow-hidden">
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.title}
                onError={e => handleRealImageError(activeBody, e.currentTarget)}
                className="w-full h-full max-h-[72vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          COSMOS AI MISSION CONTROL DRAWER
         ==================================================================== */}
      {aiOpen && (
        <aside className="fixed right-4 top-16 bottom-16 z-50 w-[calc(100%-2rem)] sm:w-96 rounded-2xl bg-[#000000]/95 backdrop-blur-2xl border border-amber-500/35 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-mono text-xs font-bold tracking-wider text-amber-300 uppercase">
                COSMOS AI • {activeBody.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAiOpen(false)}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 text-xs">
            {aiMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-100 ml-6'
                    : 'bg-white/5 border border-white/10 text-slate-200 mr-4'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleAskAi} className="p-3 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              placeholder={`Ask COSMOS AI about ${activeBody.name}...`}
              className="flex-1 px-3 py-2 rounded-lg bg-black border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
    )}
  </div>
  );
}