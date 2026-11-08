// so-window.jsx — Floating Control Window (W2 + W3 layouts)

const NAV_ITEMS = [
  { id: 'modes',   icon: '▤', label: 'VISUALS'  },
  { id: 'signal',  icon: '⊞', label: 'SIGNAL'   },
  { id: 'device',  icon: '⟐', label: 'DEVICE'   },
  { id: 'stats',   icon: '◫', label: 'STATS'    },
  { id: 'presets', icon: '☰', label: 'PRESETS'  },
];

function FloatWindow({ activeMode, onModeChange, params, onParamChange, activeDevice, onDeviceChange, stats, layout, onLayoutToggle }) {
  const [screen, setScreen] = React.useState('modes');
  const [pos, setPos]       = React.useState({ x: null, y: null });
  const [size, setSize]     = React.useState({ w: 420, h: 520 });
  const [minimized, setMinimized] = React.useState(false);
  const winRef  = React.useRef(null);
  const dragRef = React.useRef(null);
  const resRef  = React.useRef(null);

  // Default position: right side, vertically centered
  React.useLayoutEffect(() => {
    const place = () => {
      const vw = window.innerWidth || document.documentElement.clientWidth || 1200;
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      const margin = 20;
      const x = vw > size.w + margin * 2 ? vw - size.w - margin : margin;
      const y = Math.max(60, (vh - size.h) / 2);
      setPos({ x, y });
    };
    place();
    // re-place on first resize in case iframe dimensions settle late
    const t = setTimeout(place, 100);
    return () => clearTimeout(t);
  }, []);

  // Drag
  const onTitleMouseDown = React.useCallback(e => {
    if (e.target.closest('[data-no-drag]')) return;
    e.preventDefault();
    const rect = winRef.current.getBoundingClientRect();
    dragRef.current = { ox: e.clientX - rect.left, oy: e.clientY - rect.top };
    const onMove = ev => {
      const nx = Math.max(0, Math.min(window.innerWidth - size.w, ev.clientX - dragRef.current.ox));
      const ny = Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - dragRef.current.oy));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [size]);

  // Resize (bottom-right handle)
  const onResizeMouseDown = React.useCallback(e => {
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, sw = size.w, sh = size.h;
    const onMove = ev => {
      setSize({ w: Math.max(340, sw + ev.clientX - sx), h: Math.max(320, sh + ev.clientY - sy) });
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [size]);

  if (pos.x === null) return null;

  const screenMap = {
    modes:   React.createElement(ModesScreen,   { activeMode, onModeChange }),
    signal:  React.createElement(SignalScreen,  { params, onChange: onParamChange }),
    device:  React.createElement(DeviceScreen,  { activeDevice, onDeviceChange }),
    stats:   React.createElement(StatsScreen,   { stats }),
    presets: React.createElement(PresetsScreen, {}),
  };

  return React.createElement('div', {
    ref: winRef,
    style: {
      position: 'fixed', left: pos.x, top: pos.y,
      width: minimized ? 260 : size.w,
      height: minimized ? 'auto' : size.h,
      background: 'rgba(13,13,20,0.97)',
      border: '1px solid var(--border-medium)',
      borderRadius: '6px',
      display: 'flex', flexDirection: 'column',
      backdropFilter: 'blur(24px)',
      boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(194,68,255,0.06)',
      zIndex: 100,
      overflow: 'hidden',
      userSelect: 'none',
      fontFamily: 'var(--font-ui)',
    }
  },

    // ── Title bar ──
    React.createElement('div', {
      onMouseDown: onTitleMouseDown,
      style: winStyles.titleBar
    },
      React.createElement('div', { style: winStyles.titleLeft },
        React.createElement('span', { style: winStyles.diamond }, '◆'),
        React.createElement('div', null,
          React.createElement('div', { style: winStyles.appName }, 'SONIC OBSIDIAN'),
          React.createElement('div', { style: winStyles.version }, 'V2.4.0 High-Performance')
        )
      ),
      React.createElement('div', { style: winStyles.titleRight, 'data-no-drag': true },
        // Layout toggle
        React.createElement('button', {
          onClick: onLayoutToggle,
          title: layout === 'W2' ? 'Switch to Compact' : 'Switch to Full',
          style: winStyles.titleBtn
        }, layout === 'W2' ? '⊟' : '⊞'),
        React.createElement('button', { onClick: () => setMinimized(m => !m), style: winStyles.titleBtn }, minimized ? '▽' : '—'),
        React.createElement('button', { style: { ...winStyles.titleBtn, color: '#ff5555' } }, '×')
      )
    ),

    // ── Body (W2 or W3) ──
    !minimized && (layout === 'W2'
      ? React.createElement(W2Layout, { screen, setScreen, screenMap })
      : React.createElement(W3Layout, { activeMode, onModeChange, params, onParamChange, activeDevice, onDeviceChange, stats })
    ),

    // ── Status bar ──
    !minimized && React.createElement('div', { style: winStyles.statusBar },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 5 } },
        React.createElement('div', { style: { width: 6, height: 6, borderRadius: '50%', background: '#50fa7b', boxShadow: '0 0 5px #50fa7b' } }),
        React.createElement('span', { style: winStyles.statusText }, 'ENGINE LIVE')
      ),
      React.createElement('span', { style: winStyles.statusSep }),
      React.createElement('span', { style: winStyles.statusItem }, `FPS: ${stats.fps}`),
      React.createElement('span', { style: winStyles.statusSep }),
      React.createElement('span', { style: winStyles.statusItem }, `SR: ${stats.sr} HZ`),
      React.createElement('span', { style: winStyles.statusSep }),
      React.createElement('span', { style: winStyles.statusItem }, `${stats.latency}ms`),
    ),

    // ── Resize handle ──
    !minimized && React.createElement('div', {
      onMouseDown: onResizeMouseDown,
      style: winStyles.resizeHandle
    })
  );
}

// ── W2: Sidebar + Content ──────────────────────────────────────
function W2Layout({ screen, setScreen, screenMap }) {
  return React.createElement('div', { style: { display: 'flex', flex: 1, overflow: 'hidden' } },
    // Sidebar
    React.createElement('div', { style: winStyles.sidebar },
      NAV_ITEMS.map(item =>
        React.createElement('button', {
          key: item.id,
          onClick: () => setScreen(item.id),
          title: item.label,
          style: {
            ...winStyles.navBtn,
            ...(screen === item.id ? winStyles.navBtnActive : {})
          }
        },
          React.createElement('span', { style: { fontSize: '16px', lineHeight: 1 } }, item.icon),
          React.createElement('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '7px', letterSpacing: '0.08em', marginTop: '3px' } }, item.label)
        )
      ),
      React.createElement('div', { style: { flex: 1 } }),
      // New preset
      React.createElement('button', { style: winStyles.newPresetBtn }, '+')
    ),
    // Content area
    React.createElement('div', { style: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' } },
      React.createElement('div', { style: winStyles.screenHeader },
        React.createElement('span', { style: winStyles.breadcrumb },
          `ENGINE_CORE / ${NAV_ITEMS.find(n => n.id === screen)?.label}`
        )
      ),
      React.createElement('div', { style: { flex: 1, overflow: 'hidden' } },
        screenMap[screen]
      )
    )
  );
}

// ── W3: Accordion / Compact ────────────────────────────────────
function W3Layout({ activeMode, onModeChange, params, onParamChange, activeDevice, onDeviceChange, stats }) {
  const [open, setOpen] = React.useState('modes');

  const modeName = {
    bars: 'Classic Bars', wave: 'Oscilloscope', circular: 'Circular Radial',
    trail: 'Trail/Decay', shader: 'Shader Bars', warp: 'Psychedelic Warp'
  }[activeMode] || activeMode;

  const sections = [
    { id: 'modes',  label: 'MODES',  content: React.createElement(ModesScreen,  { activeMode, onModeChange }) },
    { id: 'signal', label: 'SIGNAL', content: React.createElement(SignalScreen, { params, onChange: onParamChange }) },
    { id: 'device', label: 'DEVICE', content: React.createElement(DeviceScreen, { activeDevice, onDeviceChange }) },
    { id: 'stats',  label: 'STATS',  content: React.createElement(StatsScreen,  { stats }) },
  ];

  return React.createElement('div', { style: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' } },
    // Active mode always-visible header
    React.createElement('div', { style: w3Styles.activeHeader },
      React.createElement('div', null,
        React.createElement('div', { style: w3Styles.activeLbl }, 'ACTIVE MODE'),
        React.createElement('div', { style: w3Styles.activeName }, modeName)
      ),
      React.createElement('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700, color: 'rgba(0,229,255,0.25)', lineHeight: 1 } },
        { bars:1, wave:2, circular:3, trail:4, shader:5, warp:6 }[activeMode]
      )
    ),

    // Accordion sections
    React.createElement('div', { style: { flex: 1, overflowY: 'auto' } },
      sections.map(s =>
        React.createElement('div', { key: s.id, style: { borderBottom: '1px solid var(--border-subtle)' } },
          React.createElement('div', {
            onClick: () => setOpen(o => o === s.id ? null : s.id),
            style: w3Styles.sectionHead
          },
            React.createElement('span', { style: w3Styles.sectionLbl }, s.label),
            React.createElement('span', { style: { fontSize: '10px', color: 'var(--text-ghost)', transition: 'transform 0.15s', transform: open === s.id ? 'rotate(180deg)' : 'none', display: 'inline-block' }}, '▼')
          ),
          open === s.id && React.createElement('div', { style: { maxHeight: '200px', overflowY: 'auto' } }, s.content)
        )
      )
    )
  );
}

const winStyles = {
  titleBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-01)', borderBottom: '1px solid var(--border-subtle)', cursor: 'move', flexShrink: 0 },
  titleLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  diamond: { color: 'var(--accent-violet)', fontSize: '16px', lineHeight: 1, flexShrink: 0 },
  appName: { fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em', color: 'var(--text-primary)', fontWeight: 600 },
  version: { fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-ghost)', marginTop: '1px', letterSpacing: '0.08em' },
  titleRight: { display: 'flex', gap: 2 },
  titleBtn: { width: 24, height: 24, background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '3px', cursor: 'pointer', color: 'var(--text-ghost)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 },
  sidebar: { width: 52, background: 'var(--bg-00)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', gap: 2, flexShrink: 0 },
  navBtn: { width: 40, height: 44, background: 'transparent', border: '1px solid transparent', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-ghost)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0, transition: 'all 0.1s', padding: 0 },
  navBtnActive: { background: 'var(--bg-03)', border: '1px solid var(--border-medium)', color: 'var(--accent-violet)' },
  newPresetBtn: { width: 36, height: 36, background: 'rgba(194,68,255,0.1)', border: '1px solid var(--accent-violet)', borderRadius: '4px', cursor: 'pointer', color: 'var(--accent-violet)', fontSize: '18px', lineHeight: 1, marginBottom: 8 },
  screenHeader: { padding: '7px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-01)', flexShrink: 0 },
  breadcrumb: { fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-ghost)', letterSpacing: '0.1em' },
  statusBar: { display: 'flex', alignItems: 'center', padding: '5px 12px', background: 'var(--bg-00)', borderTop: '1px solid var(--border-subtle)', gap: 6, flexShrink: 0 },
  statusText: { fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: '#50fa7b', fontWeight: 600 },
  statusItem: { fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-ghost)', letterSpacing: '0.06em' },
  statusSep: { width: 1, height: 10, background: 'var(--border-subtle)', display: 'inline-block' },
  resizeHandle: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, cursor: 'nwse-resize', opacity: 0.4 },
};

const w3Styles = {
  activeHeader: { padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--bg-01)' },
  activeLbl: { fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.12em', color: 'var(--text-ghost)', marginBottom: 3 },
  activeName: { fontFamily: 'var(--font-ui)', fontSize: '16px', fontWeight: 700, color: 'var(--accent-violet)' },
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', cursor: 'pointer', background: 'var(--bg-01)' },
  sectionLbl: { fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', color: 'var(--text-secondary)' },
};

Object.assign(window, { FloatWindow });
