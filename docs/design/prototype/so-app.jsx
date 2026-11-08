// so-app.jsx — App root, state, tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "defaultLayout": "W2",
  "defaultMode": "bars",
  "showStatusBar": true,
  "windowOpacity": 0.97
}/*EDITMODE-END*/;

function App() {
  const td = TWEAK_DEFAULTS;

  const [vizMode,       setVizMode]       = React.useState(td.defaultMode);
  const [layout,        setLayout]        = React.useState(td.defaultLayout);
  const [activeDevice,  setActiveDevice]  = React.useState('fiio');
  const [fullscreen,    setFullscreen]    = React.useState(false);
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const [edgeHover,     setEdgeHover]     = React.useState(false);
  const hideTimer = React.useRef(null);

  const [params, setParams] = React.useState({
    sensitivity: 85,
    smoothing:   0.85,
    dbFloor:     -80,
    dbCeiling:   0,
  });

  const [stats] = React.useState({
    fps: '144.0', sr: '48000', buffer: '1024', latency: '2.4', smoothing: '0.85'
  });

  const handleParamChange = (key, val) => setParams(p => ({ ...p, [key]: val }));
  const toggleLayout = () => setLayout(l => l === 'W2' ? 'W3' : 'W2');

  // Keyboard shortcuts
  React.useEffect(() => {
    const modeKeys = { '1':'bars','2':'wave','3':'circular','4':'trail','5':'shader','6':'warp' };
    const handler = e => {
      if (modeKeys[e.key]) setVizMode(modeKeys[e.key]);
      if (e.key === 'F11') { e.preventDefault(); setFullscreen(f => !f); }
      if (e.key.toLowerCase() === 'h') setControlsVisible(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fullscreen edge-hover reveal
  const onMouseMove = React.useCallback(e => {
    if (!fullscreen) return;
    const nearEdge = e.clientX > window.innerWidth - 80 && e.clientY > window.innerHeight - 80;
    if (nearEdge) {
      setEdgeHover(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setEdgeHover(false), 2000);
    }
  }, [fullscreen]);

  // Tweaks panel
  React.useEffect(() => {
    const handler = e => {
      if (e.data?.type === '__activate_edit_mode') {
        document.getElementById('tweaks-ui').style.display = 'block';
      } else if (e.data?.type === '__deactivate_edit_mode') {
        document.getElementById('tweaks-ui').style.display = 'none';
      }
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const showControls = fullscreen ? (edgeHover || !fullscreen) : controlsVisible;

  return React.createElement('div', {
    style: { position: 'fixed', inset: 0, background: '#080809', overflow: 'hidden' },
    onMouseMove
  },
    // Visualizer canvas
    React.createElement(Visualizer, { mode: vizMode }),

    // Fullscreen toggle
    React.createElement('button', {
      onClick: () => setFullscreen(f => !f),
      title: 'Toggle Fullscreen (F11)',
      style: appStyles.fsBtn
    }, fullscreen ? '⊡' : '⊞'),

    // H-key hint (fullscreen)
    fullscreen && React.createElement('div', { style: appStyles.hint },
      React.createElement('span', { style: appStyles.hintText }, '1–6 mode  ·  H controls  ·  F11 exit')
    ),

    // Floating control window
    React.createElement('div', {
      style: {
        transition: 'opacity 0.2s, transform 0.2s',
        opacity:   showControls ? 1 : 0,
        transform: showControls ? 'none' : 'translateY(10px)',
        pointerEvents: showControls ? 'auto' : 'none',
      }
    },
      React.createElement(FloatWindow, {
        activeMode:     vizMode,
        onModeChange:   setVizMode,
        params,
        onParamChange:  handleParamChange,
        activeDevice,
        onDeviceChange: setActiveDevice,
        stats,
        layout,
        onLayoutToggle: toggleLayout,
      })
    ),

    // Tweaks UI
    React.createElement('div', { id: 'tweaks-ui', style: appStyles.tweaksPanel },
      React.createElement('div', { style: appStyles.tweaksTitle }, 'Tweaks'),
      React.createElement('div', { style: appStyles.tweaksRow },
        React.createElement('label', { style: appStyles.tweaksLabel }, 'Layout'),
        React.createElement('select', {
          value: layout,
          onChange: e => setLayout(e.target.value),
          style: appStyles.tweaksSelect
        },
          React.createElement('option', { value: 'W2' }, 'W2 — Full'),
          React.createElement('option', { value: 'W3' }, 'W3 — Compact')
        )
      ),
      React.createElement('div', { style: appStyles.tweaksRow },
        React.createElement('label', { style: appStyles.tweaksLabel }, 'Viz Mode'),
        React.createElement('select', {
          value: vizMode,
          onChange: e => setVizMode(e.target.value),
          style: appStyles.tweaksSelect
        },
          ['bars','wave','circular','trail','shader','warp'].map(m =>
            React.createElement('option', { key: m, value: m }, m)
          )
        )
      ),
      React.createElement('div', { style: appStyles.tweaksRow },
        React.createElement('label', { style: appStyles.tweaksLabel }, 'Hide controls'),
        React.createElement('input', {
          type: 'checkbox',
          checked: !controlsVisible,
          onChange: e => setControlsVisible(!e.target.checked),
          style: { accentColor: '#c244ff' }
        })
      )
    )
  );
}

const appStyles = {
  fsBtn: {
    position: 'fixed', top: 14, right: 14, zIndex: 200,
    width: 28, height: 28,
    background: 'rgba(13,13,20,0.7)', border: '1px solid var(--border-medium)',
    borderRadius: '4px', color: 'var(--text-ghost)', fontSize: '14px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(8px)',
  },
  hint: { position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 50, pointerEvents: 'none' },
  hintText: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(60,60,80,0.7)', letterSpacing: '0.1em' },
  tweaksPanel: {
    display: 'none', position: 'fixed', bottom: 24, left: 24, zIndex: 9999,
    background: '#1a1a24', border: '1px solid var(--border-medium)',
    borderRadius: '6px', padding: '14px 16px', minWidth: '200px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  tweaksTitle: { fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' },
  tweaksRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' },
  tweaksLabel: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-ghost)' },
  tweaksSelect: { fontFamily: 'var(--font-mono)', fontSize: '10px', background: 'var(--bg-02)', border: '1px solid var(--border-medium)', borderRadius: '3px', color: 'var(--text-primary)', padding: '3px 6px' },
};

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
