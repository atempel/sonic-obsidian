// so-screens.jsx — Screen content components for Sonic Obsidian

// ── MODES SCREEN ──────────────────────────────────────────────
function ModesScreen({ activeMode, onModeChange }) {
  const modes = [
    { id: 'bars',     num: 1, name: 'Classic Bars',    key: 'KEY 1', desc: 'FFT magnitude with gravity decay', renderer: 'CANVAS 2D' },
    { id: 'wave',     num: 2, name: 'Oscilloscope',    key: 'KEY 2', desc: 'Time-domain waveform trace',       renderer: 'CANVAS 2D' },
    { id: 'circular', num: 3, name: 'Circular Radial', key: 'KEY 3', desc: 'Polar 360° frequency iris',        renderer: 'CANVAS 2D' },
    { id: 'trail',    num: 4, name: 'Trail / Decay',   key: 'KEY 4', desc: 'Persistence-of-vision feedback',   renderer: 'CANVAS 2D' },
    { id: 'shader',   num: 5, name: 'Shader Bars',     key: 'KEY 5', desc: 'GPU fragment shader bars',         renderer: 'MODERNGL' },
    { id: 'warp',     num: 6, name: 'Psychedelic Warp',key: 'KEY 6', desc: 'Raymarching SDF + beat refraction',renderer: 'MODERNGL' },
  ];

  return React.createElement('div', { style: modesStyles.wrap },
    React.createElement('div', { style: soScreenStyles.sectionLabel }, 'RENDERING ENVIRONMENT'),
    React.createElement('div', { style: modesStyles.grid },
      modes.map(m => {
        const isActive = activeMode === m.id;
        return React.createElement('div', {
          key: m.id,
          onClick: () => onModeChange(m.id),
          style: {
            ...modesStyles.card,
            ...(isActive ? modesStyles.cardActive : {}),
          }
        },
          React.createElement('div', { style: modesStyles.cardTop },
            React.createElement('span', { style: modesStyles.cardNum }, m.num),
            React.createElement('span', { style: {
              ...modesStyles.renderer,
              color: m.renderer === 'MODERNGL' ? 'var(--accent-violet)' : 'var(--text-ghost)'
            }}, m.renderer)
          ),
          React.createElement('div', { style: modesStyles.cardName }, m.name),
          React.createElement('div', { style: modesStyles.cardDesc }, m.desc),
          React.createElement('div', { style: modesStyles.cardBottom },
            React.createElement('span', { style: modesStyles.keyChip }, m.key),
            isActive && React.createElement('span', { style: modesStyles.activeBadge }, '● ACTIVE ENGINE')
          )
        );
      })
    )
  );
}

const modesStyles = {
  wrap: { padding: '16px', overflowY: 'auto', height: '100%' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' },
  card: {
    background: 'var(--bg-02)', border: '1px solid var(--border-subtle)',
    borderRadius: '4px', padding: '10px', cursor: 'pointer',
    transition: 'border-color 0.12s, background 0.12s',
  },
  cardActive: {
    background: 'var(--bg-03)', border: '1px solid var(--accent-violet)',
    boxShadow: '0 0 12px rgba(194,68,255,0.15), 0 0 2px rgba(194,68,255,0.4)',
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  cardNum: { fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--text-mono)', lineHeight: 1 },
  renderer: { fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.08em' },
  cardName: { fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' },
  cardDesc: { fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-ghost)', lineHeight: 1.4, marginBottom: '8px' },
  cardBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  keyChip: {
    fontFamily: 'var(--font-mono)', fontSize: '9px', padding: '2px 5px',
    background: 'var(--bg-00)', border: '1px solid var(--border-medium)',
    borderRadius: '3px', color: 'var(--text-secondary)', letterSpacing: '0.06em',
  },
  activeBadge: { fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--accent-violet)', letterSpacing: '0.06em' },
};

// ── SIGNAL SCREEN ──────────────────────────────────────────────
function SignalScreen({ params, onChange }) {
  const [beatOn, setBeatOn] = React.useState(true);
  const [bpm] = React.useState(124);

  const sliders = [
    { key: 'sensitivity', label: 'SENSITIVITY',  min: 0,    max: 100,  step: 1,   unit: '%',  fmt: v => `${v}%` },
    { key: 'smoothing',   label: 'SMOOTHING',    min: 0,    max: 1,    step: 0.01,unit: '',   fmt: v => v.toFixed(2) },
    { key: 'dbFloor',     label: 'DB FLOOR',     min: -120, max: 0,    step: 1,   unit: ' dB',fmt: v => `${v} dB` },
    { key: 'dbCeiling',   label: 'DB CEILING',   min: -60,  max: 0,    step: 1,   unit: ' dB',fmt: v => `${v} dB` },
  ];

  return React.createElement('div', { style: { padding: '14px', overflowY: 'auto', height: '100%' } },
    // Beat Engine
    React.createElement('div', { style: soScreenStyles.sectionLabel }, 'BEAT ENGINE'),
    React.createElement('div', { style: signalStyles.beatPanel },
      React.createElement('div', { style: signalStyles.beatRow },
        React.createElement('span', { style: { fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'var(--text-primary)' }}, 'Beat Detection'),
        React.createElement('div', {
          onClick: () => setBeatOn(b => !b),
          style: { ...signalStyles.toggle, background: beatOn ? 'var(--accent-violet)' : 'var(--border-medium)' }
        },
          React.createElement('div', { style: { ...signalStyles.toggleThumb, transform: beatOn ? 'translateX(14px)' : 'translateX(2px)' }})
        )
      ),
      React.createElement('div', { style: signalStyles.bpmRow },
        React.createElement('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}, 'BPM'),
        React.createElement('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 700, color: beatOn ? 'var(--text-mono)' : 'var(--text-ghost)' }},
          beatOn ? bpm.toFixed(1) : '—'
        ),
        beatOn && React.createElement('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-ghost)', marginLeft: 4 }}, 'AUTO')
      )
    ),

    React.createElement('div', { style: { ...soScreenStyles.sectionLabel, marginTop: '14px' }}, 'SIGNAL DYNAMICS'),
    sliders.map(sl =>
      React.createElement('div', { key: sl.key, style: signalStyles.sliderBlock },
        React.createElement('div', { style: signalStyles.sliderHeader },
          React.createElement('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}, sl.label),
          React.createElement('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text-mono)' }}, sl.fmt(params[sl.key]))
        ),
        React.createElement('div', { style: signalStyles.trackWrap },
          React.createElement('input', {
            type: 'range', min: sl.min, max: sl.max, step: sl.step,
            value: params[sl.key],
            onChange: e => onChange(sl.key, parseFloat(e.target.value)),
            style: signalStyles.range
          })
        )
      )
    ),

    React.createElement('div', { style: signalStyles.footerBtns },
      React.createElement('button', { style: signalStyles.btnGhost }, 'RESET TO DEFAULTS'),
      React.createElement('button', { style: signalStyles.btnPrimary }, 'APPLY CHANGES')
    )
  );
}

const signalStyles = {
  beatPanel: { background: 'var(--bg-02)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '10px 12px', marginBottom: '4px' },
  beatRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  bpmRow: { display: 'flex', alignItems: 'baseline', gap: '8px' },
  toggle: { width: '32px', height: '18px', borderRadius: '9px', cursor: 'pointer', position: 'relative', transition: 'background 0.15s', flexShrink: 0 },
  toggleThumb: { position: 'absolute', top: '2px', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', transition: 'transform 0.15s' },
  sliderBlock: { marginBottom: '12px' },
  sliderHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  trackWrap: { position: 'relative' },
  range: { width: '100%', accentColor: 'var(--accent-violet)', cursor: 'pointer' },
  footerBtns: { display: 'flex', gap: '8px', marginTop: '16px' },
  btnGhost: { flex: 1, padding: '7px', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', background: 'transparent', border: '1px solid var(--border-medium)', borderRadius: '3px', color: 'var(--text-secondary)', cursor: 'pointer' },
  btnPrimary: { flex: 1, padding: '7px', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.08em', background: 'var(--accent-violet)', border: 'none', borderRadius: '3px', color: '#fff', cursor: 'pointer', fontWeight: 600 },
};

// ── DEVICE SCREEN ──────────────────────────────────────────────
function DeviceScreen({ activeDevice, onDeviceChange }) {
  const devices = [
    { id: 'fiio', name: 'Digital Audio Interface', sub: 'FiiO K5 Pro', spec: '24-bit · 192kHz', status: 'CONNECTED', mode: 'DIRECT MODE' },
    { id: 'realtek', name: 'Speakers', sub: 'Realtek High Definition', spec: '16-bit · 48kHz', status: 'idle', mode: null },
    { id: 'hdmi', name: 'HDMI Output', sub: 'NVIDIA High Definition', spec: '24-bit · 48kHz', status: 'Disconnected', mode: null },
  ];

  return React.createElement('div', { style: { padding: '14px', overflowY: 'auto', height: '100%' } },
    React.createElement('div', { style: soScreenStyles.sectionLabel }, 'WASAPI OUTPUT DEVICES'),
    devices.map(d => {
      const isActive = activeDevice === d.id;
      const statusColor = d.status === 'CONNECTED' ? '#50fa7b' : d.status === 'idle' ? 'var(--text-ghost)' : '#ff5555';
      return React.createElement('div', {
        key: d.id,
        onClick: () => onDeviceChange(d.id),
        style: { ...deviceStyles.card, ...(isActive ? deviceStyles.cardActive : {}) }
      },
        React.createElement('div', { style: deviceStyles.row },
          React.createElement('div', { style: deviceStyles.dot(isActive) }),
          React.createElement('div', { style: { flex: 1 } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              React.createElement('span', { style: deviceStyles.name }, d.name),
              d.mode && React.createElement('span', { style: deviceStyles.modeBadge }, d.mode)
            ),
            React.createElement('span', { style: deviceStyles.sub }, d.sub)
          ),
          React.createElement('div', { style: { textAlign: 'right' } },
            React.createElement('div', { style: { ...deviceStyles.status, color: statusColor }}, d.status),
            React.createElement('div', { style: deviceStyles.spec }, d.spec)
          )
        )
      );
    })
  );
}

const deviceStyles = {
  card: { background: 'var(--bg-02)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '10px 12px', marginBottom: '6px', cursor: 'pointer', transition: 'border-color 0.12s' },
  cardActive: { border: '1px solid var(--accent-violet)', background: 'var(--bg-03)', boxShadow: '0 0 8px rgba(194,68,255,0.1)' },
  row: { display: 'flex', alignItems: 'center', gap: '10px' },
  dot: isActive => ({ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isActive ? 'var(--accent-violet)' : 'var(--border-medium)', boxShadow: isActive ? '0 0 6px rgba(194,68,255,0.6)' : 'none' }),
  name: { fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' },
  sub: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)', marginTop: 2, display: 'block' },
  modeBadge: { fontFamily: 'var(--font-mono)', fontSize: '8px', padding: '1px 5px', background: 'rgba(194,68,255,0.12)', border: '1px solid rgba(194,68,255,0.3)', borderRadius: '2px', color: 'var(--accent-violet)', letterSpacing: '0.06em' },
  status: { fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', fontWeight: 600 },
  spec: { fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-ghost)', marginTop: 2 },
};

// ── STATS SCREEN ──────────────────────────────────────────────
function StatsScreen({ stats }) {
  const metrics = [
    { label: 'FPS',     value: stats.fps,     unit: '' },
    { label: 'SR',      value: stats.sr,      unit: ' HZ' },
    { label: 'BUFFER',  value: stats.buffer,  unit: ' SMPL' },
    { label: 'LATENCY', value: stats.latency, unit: ' MS' },
    { label: 'FFT SIZE',value: '2048',        unit: '' },
    { label: 'SMOOTH',  value: stats.smoothing, unit: '' },
  ];
  return React.createElement('div', { style: { padding: '14px' } },
    React.createElement('div', { style: soScreenStyles.sectionLabel }, 'ENGINE METRICS'),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' } },
      metrics.map(m =>
        React.createElement('div', { key: m.label, style: statsStyles.metric },
          React.createElement('div', { style: statsStyles.metricLabel }, m.label),
          React.createElement('div', { style: statsStyles.metricVal }, m.value, React.createElement('span', { style: statsStyles.unit }, m.unit))
        )
      )
    ),
    React.createElement('div', { style: soScreenStyles.sectionLabel }, 'ENGINE STATUS'),
    React.createElement('div', { style: statsStyles.statusRow },
      React.createElement('div', { style: { width: 7, height: 7, borderRadius: '50%', background: '#50fa7b', boxShadow: '0 0 6px #50fa7b', flexShrink: 0 } }),
      React.createElement('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#50fa7b', letterSpacing: '0.1em' }}, 'ENGINE LIVE'),
      React.createElement('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-ghost)', marginLeft: 'auto' }}, 'WASAPI LOOPBACK')
    )
  );
}

const statsStyles = {
  metric: { background: 'var(--bg-02)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '8px 10px' },
  metricLabel: { fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-ghost)', letterSpacing: '0.1em', marginBottom: '4px' },
  metricVal: { fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--text-mono)', lineHeight: 1 },
  unit: { fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '2px' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-02)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '8px 10px' },
};

// ── PRESETS SCREEN ──────────────────────────────────────────────
function PresetsScreen() {
  const [presets] = React.useState([
    { id: 1, name: 'Late Night Session', mode: 'Circular Radial', active: true },
    { id: 2, name: 'Bass Heavy',         mode: 'Classic Bars',    active: false },
    { id: 3, name: 'Ambient Hosting',    mode: 'Psychedelic Warp',active: false },
  ]);

  return React.createElement('div', { style: { padding: '14px', overflowY: 'auto', height: '100%' } },
    React.createElement('div', { style: soScreenStyles.sectionLabel }, 'SAVED PRESETS'),
    presets.map(p =>
      React.createElement('div', { key: p.id, style: { ...presetStyles.item, ...(p.active ? presetStyles.itemActive : {}) } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: p.active ? 'var(--accent-violet)' : 'var(--text-primary)' }}, p.name),
          React.createElement('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-ghost)', marginTop: 3 }}, p.mode)
        ),
        p.active && React.createElement('span', { style: presetStyles.activeDot }, '●')
      )
    ),
    React.createElement('button', { style: presetStyles.newBtn }, '+ NEW PRESET')
  );
}

const presetStyles = {
  item: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-02)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '10px 12px', marginBottom: '6px', cursor: 'pointer' },
  itemActive: { border: '1px solid var(--accent-violet)', background: 'var(--bg-03)' },
  activeDot: { color: 'var(--accent-violet)', fontSize: '14px' },
  newBtn: { width: '100%', marginTop: '8px', padding: '9px', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', background: 'rgba(194,68,255,0.1)', border: '1px solid var(--accent-violet)', borderRadius: '3px', color: 'var(--accent-violet)', cursor: 'pointer', fontWeight: 600 },
};

// ── Shared styles ──────────────────────────────────────────────
const soScreenStyles = {
  sectionLabel: { fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.14em', color: 'var(--text-ghost)', textTransform: 'uppercase', marginBottom: '8px' },
};

Object.assign(window, { ModesScreen, SignalScreen, DeviceScreen, StatsScreen, PresetsScreen });
