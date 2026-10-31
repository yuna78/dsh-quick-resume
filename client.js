/**
 * Browser half of the Quick Phrases bundle.
 *
 * A row of solid-color quick-phrase buttons inside the composer card, in its
 * bottom tool row (`conversation.input.left`, right after the permission and
 * plan controls). Clicking one sends its phrase into the current Session
 * through the public `conversation.send()` face, without touching the user's
 * draft. A gear at the end of the row opens a settings popover (anchored above
 * the row, inside the composer card) for the button count, labels, phrases,
 * and icons; the layout lives in this browser's localStorage.
 *
 * Session addressing stays the same as the single-button version: the slot is
 * session-scoped, so every open conversation renders its own row and the
 * Session scope is resolved at click time (never cached across generations).
 *
 * @module dsh-plugin-quick-resume/client
 */

window.__ModuleLoader__.load({
  id: 'dsh-plugin-quick-resume',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Locale namespace owned by this plugin. */
    const NS = 'quick-resume';

    /** localStorage key for the user's button layout. */
    const STORAGE_KEY = 'dsh.quick-resume.buttons.v1';

    /** Upper bound for the row; more buttons stop reading as a toolbar. */
    const MAX_BUTTONS = 8;

    /** Minimum time one click spends in flight, so a fast round trip still feels deliberate. */
    const SEND_MS = 420;

    /** How long the sent/error paint stays on the clicked pill. */
    const SENT_MS = 1000;
    const ERROR_MS = 2400;

    /** Icon ids the settings picker offers. */
    const ICON_NAMES = ['rocket', 'chat', 'translate', 'refresh', 'check', 'bulb', 'bug', 'search', 'doc', 'bolt'];

    /** Factory defaults: exactly the phrases asked for, all editable. */
    const DEFAULT_BUTTONS = [
      { id: 'default-continue', icon: 'rocket', label: '继续', phrase: '请继续' },
      { id: 'default-plain', icon: 'chat', label: '说人话', phrase: '说人话，我看不懂' },
      { id: 'default-translate', icon: 'translate', label: '翻译', phrase: '翻译成中文' },
    ];

    /** Chinese dictionary (key source). */
    const zh = {
      group: '快捷语按钮',
      hint: '点一下即发送该按钮的快捷语，不会覆盖输入框里已有的草稿。',
      settings: '设置快捷按钮',
      settingsTitle: '快捷按钮设置',
      close: '收起设置',
      add: '添加按钮',
      atMax: '最多 8 个按钮',
      reset: '恢复默认',
      remove: '删除这个按钮',
      label: '按钮文字',
      phrase: '发送内容',
      phrasePlaceholder: '点一下要发出去的话',
      icon: '图标',
      empty: '还没有快捷按钮，点齿轮添加一个',
      sent: '已发送',
      failed: '发送失败：没能送达，请检查连接后重试',
      'icon.rocket': '发射 / 继续',
      'icon.chat': '说话 / 解释',
      'icon.translate': '翻译',
      'icon.refresh': '重来',
      'icon.check': '完成',
      'icon.bulb': '想办法',
      'icon.bug': '修 bug',
      'icon.search': '查找',
      'icon.doc': '总结',
      'icon.bolt': '通用',
    };

    /** English dictionary. */
    const en = {
      group: 'Quick phrase buttons',
      hint: 'One click sends that phrase. Your draft in the composer stays untouched.',
      settings: 'Configure quick buttons',
      settingsTitle: 'Quick button settings',
      close: 'Close settings',
      add: 'Add button',
      atMax: '8 buttons maximum',
      reset: 'Restore defaults',
      remove: 'Remove this button',
      label: 'Button text',
      phrase: 'Message to send',
      phrasePlaceholder: 'What one click sends',
      icon: 'Icon',
      empty: 'No quick buttons yet — add one with the gear',
      sent: 'Sent',
      failed: 'Send failed: the message did not go through. Check the connection and retry.',
      'icon.rocket': 'Launch / continue',
      'icon.chat': 'Speak / explain',
      'icon.translate': 'Translate',
      'icon.refresh': 'Retry',
      'icon.check': 'Done',
      'icon.bulb': 'Ideate',
      'icon.bug': 'Fix bug',
      'icon.search': 'Search',
      'icon.doc': 'Summarize',
      'icon.bolt': 'Generic',
    };

    /**
     * Solid-color single-stroke glyph paths (24x24) drawn with `currentColor`.
     * Deliberately plain: the row follows the host's control palette.
     */
    const GLYPHS = {
      rocket: [
        'M12 3.3c2.3 2 3.7 4.9 3.7 8.1v3.2L12 17.2l-3.7-2.6v-3.2c0-3.2 1.4-6.1 3.7-8.1Z',
        'M8.3 11.6 5.7 13.8l.9 3.2 1.9-1.3',
        'M15.7 11.6l2.6 2.2-.9 3.2-1.9-1.3',
        'M12 18.4c.9 1.2 1.4 2.4 1.4 3.6',
        'M12 7.9a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z',
      ],
      chat: [
        'M5 18.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9.5L5 18.5Z',
        'M8.5 8.5h7',
        'M8.5 11.5h5',
      ],
      translate: [
        'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z',
        'M4 12h16',
        'M12 4c2.2 2.1 3.4 4.8 3.4 8s-1.2 5.9-3.4 8c-2.2-2.1-3.4-4.8-3.4-8S9.8 6.1 12 4Z',
      ],
      refresh: [
        'M19.5 9.5A8 8 0 0 0 6 7.4L4.5 9',
        'M4.5 5v4h4',
        'M4.5 14.5A8 8 0 0 0 18 16.6l1.5-1.6',
        'M19.5 19v-4h-4',
      ],
      check: ['M5 12.5l4.4 4.2L19 7.2'],
      bulb: [
        'M12 3.5a6 6 0 0 1 3.6 10.8c-.7.5-1 1.1-1 1.9v.3h-5.2v-.3c0-.8-.3-1.4-1-1.9A6 6 0 0 1 12 3.5Z',
        'M9.8 19.5h4.4',
        'M10.6 21.8h2.8',
      ],
      bug: [
        'M8.5 8h7A3.5 3.5 0 0 1 19 11.5v2A3.5 3.5 0 0 1 15.5 17h-7A3.5 3.5 0 0 1 5 13.5v-2A3.5 3.5 0 0 1 8.5 8Z',
        'M12 8v9',
        'M5 11H3M5 14H3.4M19 11h2M19 14h1.6',
        'M8.5 8 7 5.5M15.5 8 17 5.5',
      ],
      search: [
        'M11 5.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z',
        'M15.3 15.3 20 20',
      ],
      doc: [
        'M6 4.5A1.5 1.5 0 0 1 7.5 3h6L19 8.5v12A1.5 1.5 0 0 1 17.5 22h-10A1.5 1.5 0 0 1 6 20.5v-16Z',
        'M13 3v5.5h6',
        'M9 13h6',
        'M9 16.5h4',
      ],
      bolt: ['M13 2.5 5.5 14H11l-1 7.5L18 10h-5.5l1.5-7.5Z'],
      settings: [
        'M4 7h16M4 12h16M4 17h16',
        'M9 5.6v2.8M15 10.6v2.8M10 15.6v2.8',
      ],
      trash: [
        'M5 7h14',
        'M9 7V5h6v2',
        'M7 7l.9 13h8.2L17 7',
      ],
      close: ['M6 6l12 12M18 6 6 18'],
    };

    /** Render one solid-color glyph from {@link GLYPHS}. */
    function Glyph(props) {
      const size = props.size === undefined ? 14 : props.size;
      const paths = GLYPHS[props.name] === undefined ? GLYPHS.bolt : GLYPHS[props.name];
      return h('svg', {
        className: 'qr-glyph',
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: false,
      }, paths.map((d, index) => h('path', { key: index, d })));
    }

    /** One stable identity for a newly added button. */
    let idSequence = 0;
    const makeId = () => `qr-${Date.now().toString(36)}-${(idSequence += 1)}`;

    /** Coerce persisted (possibly hand-edited) input into the supported shape. */
    const sanitizeButton = (raw) => {
      if (raw === null || typeof raw !== 'object') return undefined;
      const phrase = typeof raw.phrase === 'string' ? raw.phrase : '';
      if (phrase.trim() === '') return undefined;
      const icon = ICON_NAMES.includes(raw.icon) ? raw.icon : 'bolt';
      const label = typeof raw.label === 'string' ? raw.label.slice(0, 24) : '';
      const id = typeof raw.id === 'string' && raw.id !== '' ? raw.id : makeId();
      return { id, icon, label, phrase: phrase.slice(0, 2000) };
    };

    /** Read the saved layout, falling back to the shipped defaults. */
    const readButtons = () => {
      const fallback = () => DEFAULT_BUTTONS.map((button) => ({ ...button }));
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw === null) return fallback();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return fallback();
        return parsed.map(sanitizeButton).filter((button) => button !== undefined).slice(0, MAX_BUTTONS);
      } catch (error) {
        return fallback();
      }
    };

    /** Persist the layout; storage failures are non-fatal. */
    const writeButtons = (buttons) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buttons));
      } catch (error) {
        /* private mode or quota: keep the in-memory copy only */
      }
    };

    /** Module-level shared store so every open composer and its settings panel agree. */
    let storedButtons = null;
    const storeListeners = new Set();
    const getButtons = () => {
      if (storedButtons === null) storedButtons = readButtons();
      return storedButtons;
    };
    const setButtons = (next) => {
      storedButtons = next.slice(0, MAX_BUTTONS);
      writeButtons(storedButtons);
      for (const listener of storeListeners) listener();
    };
    /** Subscribe one component to the shared layout. */
    const useButtons = () => {
      const [buttons, setLocal] = React.useState(getButtons);
      React.useEffect(() => {
        const listener = () => setLocal(getButtons());
        storeListeners.add(listener);
        return () => { storeListeners.delete(listener); };
      }, []);
      return buttons;
    };
    const defaultButtons = () => DEFAULT_BUTTONS.map((button) => ({ ...button }));

    /** Component-scoped stylesheet; rendered as an element so unmounting removes it. */
    const CSS = `
.qr-root {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--dsw-alias-label-secondary, #6b7280);
  font-size: 12px;
  line-height: 1;
}
.qr-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  min-width: 0;
}
.qr-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  height: 26px;
  padding: 0 9px 0 8px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #6b7280);
  font: inherit;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease, transform 120ms ease;
  -webkit-tap-highlight-color: transparent;
}
.qr-pill:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.14));
  color: var(--dsw-alias-label-primary, #111827);
}
.qr-pill:active:not(:disabled) { transform: translateY(1px); }
.qr-pill:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #3b82f6);
  outline-offset: 1px;
}
.qr-pill:disabled { cursor: default; }
.qr-pill[data-phase="sending"] { opacity: 0.6; cursor: progress; }
.qr-pill[data-phase="sent"] { color: var(--dsw-alias-state-success-primary, #16a34a); }
.qr-pill[data-phase="error"] {
  color: var(--dsw-alias-state-error-primary, #dc2626);
  animation: qr-shake 320ms ease;
}
.qr-pill--icon { padding: 0 7px; }
.qr-pill--gear { color: var(--dsw-alias-label-tertiary, #9ca3af); }
.qr-pill--gear[data-open="true"] {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.14));
  color: var(--dsw-alias-label-primary, #111827);
}
.qr-glyph { display: block; flex: none; }
.qr-spin { animation: qr-spin 900ms linear infinite; display: block; }
.qr-empty {
  color: var(--dsw-alias-label-tertiary, #9ca3af);
  font-size: 11px;
  padding: 4px 2px;
}
.qr-panel {
  box-sizing: border-box;
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 60;
  width: min(440px, 58vw);
  max-width: calc(100vw - 24px);
  max-height: min(420px, 62vh);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 0.5px solid var(--dsw-alias-border-l1, rgba(127, 127, 127, 0.3));
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1, #ffffff);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  color: var(--dsw-alias-label-primary, #111827);
  text-align: left;
  animation: qr-pop 160ms ease-out;
}
.qr-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
}
.qr-panel__hint {
  color: var(--dsw-alias-label-tertiary, #9ca3af);
  font-size: 11px;
  line-height: 1.5;
}
.qr-panel__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}
.qr-item {
  display: grid;
  grid-template-columns: 28px minmax(48px, 0.7fr) minmax(0, 1.6fr) 26px;
  align-items: center;
  gap: 6px;
  padding: 6px;
  border: 0.5px solid var(--dsw-alias-border-l1, rgba(127, 127, 127, 0.3));
  border-radius: 10px;
  background: var(--dsw-alias-bg-base, transparent);
}
.qr-field {
  box-sizing: border-box;
  min-width: 0;
  width: 100%;
  height: 26px;
  padding: 0 8px;
  border: 0.5px solid var(--dsw-alias-border-l1, rgba(127, 127, 127, 0.3));
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font: inherit;
  font-size: 12px;
  outline: none;
}
.qr-field:focus { border-color: var(--dsw-alias-brand-primary, #3b82f6); }
.qr-item__icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0.5px solid var(--dsw-alias-border-l1, rgba(127, 127, 127, 0.3));
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-secondary, #6b7280);
  cursor: pointer;
}
.qr-item__icon:hover,
.qr-item__icon[aria-expanded="true"] {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.14));
  color: var(--dsw-alias-label-primary, #111827);
}
.qr-item__icon:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #3b82f6);
  outline-offset: 1px;
}
.qr-icons {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding-top: 8px;
  margin-top: 2px;
  border-top: 0.5px solid var(--dsw-alias-border-l1, rgba(127, 127, 127, 0.3));
}
.qr-icons__option {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0.5px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #6b7280);
  cursor: pointer;
}
.qr-icons__option:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.14));
  color: var(--dsw-alias-label-primary, #111827);
}
.qr-icons__option[data-selected="true"] {
  border-color: var(--dsw-alias-brand-primary, #3b82f6);
  color: var(--dsw-alias-brand-primary, #3b82f6);
}
.qr-icons__option:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #3b82f6);
  outline-offset: 1px;
}
.qr-icon-btn {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #9ca3af);
  cursor: pointer;
}
.qr-icon-btn:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.14));
  color: var(--dsw-alias-state-error-primary, #dc2626);
}
.qr-panel__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.qr-link {
  height: 26px;
  padding: 0 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-brand-primary, #3b82f6);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.qr-link:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.14)); }
.qr-link:disabled { color: var(--dsw-alias-label-tertiary, #9ca3af); cursor: default; }
.qr-link--muted { color: var(--dsw-alias-label-secondary, #6b7280); }
@keyframes qr-spin { to { transform: rotate(360deg); } }
@keyframes qr-pop { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes qr-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
@container (max-width: 660px) {
  .qr-pill__label { display: none; }
  .qr-pill { padding: 0 7px; }
}
@media (prefers-reduced-motion: reduce) {
  .qr-panel,
  .qr-pill[data-phase="error"],
  .qr-spin { animation: none; }
}
`;

    /**
     * The quick-phrase row plus its inline settings panel.
     *
     * @param props.t - locale binder for the `quick-resume` namespace.
     * @param props.launch - sends one phrase into this Session; resolves to `{ ok, error? }`, never rejects.
     * @param props.notifyError - surfaces a failure through the composer notice channel.
     */
    function QuickPhraseRow(props) {
      const t = props.t;
      const launch = props.launch;
      const notifyError = props.notifyError;
      const buttons = useButtons();
      const [editing, setEditing] = React.useState(false);
      const [iconPickerFor, setIconPickerFor] = React.useState(null);
      const [pendingId, setPendingId] = React.useState(null);
      const [flash, setFlash] = React.useState(null);
      const timers = React.useRef([]);
      const mounted = React.useRef(false);

      const clearTimers = () => {
        for (const id of timers.current) clearTimeout(id);
        timers.current = [];
      };
      /** Track one timeout that removes itself when it fires. */
      const later = (fn, ms) => {
        const id = setTimeout(() => {
          timers.current = timers.current.filter((pending) => pending !== id);
          fn();
        }, ms);
        timers.current.push(id);
        return id;
      };

      React.useEffect(() => {
        mounted.current = true;
        return () => {
          mounted.current = false;
          clearTimers();
        };
      }, []);

      /** Popover dismissal: any click outside the row, or Escape. */
      const rootRef = React.useRef(null);
      React.useEffect(() => {
        if (!editing) return undefined;
        const onPointerDown = (event) => {
          const root = rootRef.current;
          if (root !== null && event.target instanceof Node && root.contains(event.target)) return;
          setEditing(false);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setEditing(false);
        };
        document.addEventListener('mousedown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
          document.removeEventListener('mousedown', onPointerDown, true);
          document.removeEventListener('keydown', onKeyDown);
        };
      }, [editing]);

      const sendPhrase = (button) => {
        const phrase = button.phrase.trim();
        if (phrase === '' || pendingId !== null) return;
        clearTimers();
        setFlash(null);
        setPendingId(button.id);
        Promise.all([
          Promise.resolve()
            .then(() => launch(phrase))
            .catch((error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) })),
          new Promise((resolve) => { later(resolve, SEND_MS); }),
        ]).then(([result]) => {
          if (!mounted.current) return;
          setPendingId(null);
          if (result !== null && typeof result === 'object' && result.ok === true) {
            setFlash({ id: button.id, kind: 'sent' });
            later(() => { if (mounted.current) setFlash(null); }, SENT_MS);
            return;
          }
          setFlash({ id: button.id, kind: 'error' });
          later(() => { if (mounted.current) setFlash(null); }, ERROR_MS);
          try { notifyError(t('failed')); } catch (error) { /* local state already shows the failure */ }
        });
      };

      /** The paint state this pill owns, if any. */
      const phaseOf = (button) => {
        if (pendingId === button.id) return 'sending';
        if (flash !== null && flash.id === button.id) return flash.kind;
        return 'idle';
      };

      const updateButton = (id, patch) => {
        setButtons(getButtons().map((button) => (button.id === id ? { ...button, ...patch } : button)));
      };
      const addButton = () => {
        const list = getButtons();
        if (list.length >= MAX_BUTTONS) return;
        setButtons([...list, { id: makeId(), icon: 'bolt', label: '新按钮', phrase: '请继续' }]);
      };
      const removeButton = (id) => {
        setButtons(getButtons().filter((button) => button.id !== id));
      };
      const resetButtons = () => {
        setButtons(defaultButtons());
      };

      const row = h('div', { className: 'qr-row', role: 'group', 'aria-label': t('group') },
        buttons.length === 0 ? h('span', { className: 'qr-empty' }, t('empty')) : null,
        buttons.map((button) => {
          const phase = phaseOf(button);
          const label = button.label.trim();
          return h('button', {
            key: button.id,
            type: 'button',
            className: label === '' ? 'qr-pill qr-pill--icon' : 'qr-pill',
            'data-phase': phase,
            title: phase === 'sent' ? t('sent') : button.phrase,
            'aria-label': label === '' ? button.phrase : label,
            disabled: pendingId !== null,
            onClick: () => sendPhrase(button),
          },
            phase === 'sending'
              ? h('span', { className: 'qr-spin' }, h(Glyph, { name: 'refresh' }))
              : phase === 'sent'
                ? h(Glyph, { name: 'check' })
                : h(Glyph, { name: button.icon }),
            label === '' ? null : h('span', { className: 'qr-pill__label' }, label));
        }),
        h('button', {
          type: 'button',
          className: 'qr-pill qr-pill--icon qr-pill--gear',
          'data-open': editing ? 'true' : 'false',
          title: t('settings'),
          'aria-label': t('settings'),
          'aria-expanded': editing ? 'true' : 'false',
          onClick: () => {
            setEditing(!editing);
            setIconPickerFor(null);
          },
        }, h(Glyph, { name: 'settings', size: 15 })));

      const panel = editing
        ? h('div', { className: 'qr-panel', role: 'dialog', 'aria-label': t('settingsTitle') },
            h('div', { className: 'qr-panel__head' },
              h('span', null, t('settingsTitle')),
              h('button', {
                type: 'button',
                className: 'qr-icon-btn',
                title: t('close'),
                'aria-label': t('close'),
                onClick: () => setEditing(false),
              }, h(Glyph, { name: 'close' }))),
            h('div', { className: 'qr-panel__hint' }, t('hint')),
            h('div', { className: 'qr-panel__list' },
              buttons.map((button) => h('div', { key: button.id, className: 'qr-item' },
                h('button', {
                  type: 'button',
                  className: 'qr-item__icon',
                  title: t('icon'),
                  'aria-label': `${t('icon')}: ${t(`icon.${button.icon}`)}`,
                  'aria-expanded': iconPickerFor === button.id ? 'true' : 'false',
                  onClick: () => setIconPickerFor(iconPickerFor === button.id ? null : button.id),
                }, h(Glyph, { name: button.icon, size: 16 })),
                h('input', {
                  className: 'qr-field',
                  value: button.label,
                  placeholder: t('label'),
                  'aria-label': t('label'),
                  maxLength: 24,
                  onChange: (event) => updateButton(button.id, { label: event.target.value }),
                }),
                h('input', {
                  className: 'qr-field',
                  value: button.phrase,
                  placeholder: t('phrasePlaceholder'),
                  'aria-label': t('phrase'),
                  maxLength: 2000,
                  onChange: (event) => updateButton(button.id, { phrase: event.target.value }),
                }),
                h('button', {
                  type: 'button',
                  className: 'qr-icon-btn',
                  title: t('remove'),
                  'aria-label': t('remove'),
                  onClick: () => removeButton(button.id),
                }, h(Glyph, { name: 'trash' })),
                iconPickerFor === button.id
                  ? h('div', { className: 'qr-icons', role: 'group', 'aria-label': t('icon') },
                      ICON_NAMES.map((name) => h('button', {
                        key: name,
                        type: 'button',
                        className: 'qr-icons__option',
                        'data-selected': name === button.icon ? 'true' : 'false',
                        title: t(`icon.${name}`),
                        'aria-label': t(`icon.${name}`),
                        onClick: () => {
                          updateButton(button.id, { icon: name });
                          setIconPickerFor(null);
                        },
                      }, h(Glyph, { name, size: 16 }))))
                  : null))),
            h('div', { className: 'qr-panel__foot' },
              h('button', {
                type: 'button',
                className: 'qr-link',
                disabled: buttons.length >= MAX_BUTTONS,
                title: buttons.length >= MAX_BUTTONS ? t('atMax') : undefined,
                onClick: addButton,
              }, `+ ${t('add')}`),
              h('button', {
                type: 'button',
                className: 'qr-link qr-link--muted',
                onClick: resetButtons,
              }, t('reset'))))
        : null;

      return h(React.Fragment, null,
        h('style', { key: 'style' }, CSS),
        h('div', { key: 'root', className: 'qr-root', ref: rootRef },
          panel,
          row));
    }

    /**
     * Build the injected action face for one Session entry.
     * @param sessions - the Client Sessions service.
     * @returns the slot `inject` face.
     */
    function createInjectFace(sessions) {
      return (sessionId) => {
        /** Resolve this Session's live Agent-scoped Context (never cache across generations). */
        const resolveScope = () => {
          const scope = sessions.scope(sessionId) ?? sessions.binding(sessionId)?.ctx;
          if (scope === undefined) throw new Error('quick-resume: this conversation is not open right now');
          return scope;
        };

        /** Send one phrase through the public conversation face, with the session face as fallback. */
        const send = async (text) => {
          const scope = resolveScope();
          const conversation = scope.get('conversation');
          if (conversation !== undefined && typeof conversation.send === 'function') {
            await conversation.send(text);
            return;
          }
          const binding = sessions.binding(sessionId);
          if (binding === undefined) throw new Error('quick-resume: this conversation is not open right now');
          const result = await binding.session.prompt([{ type: 'text', text }], 'queue');
          if (!result.ok) throw new Error(`quick-resume: ${result.error.code}: ${result.error.message}`);
        };

        return {
          /** @returns settlement of one send attempt; never rejects. */
          launch: async (text) => {
            try {
              await send(text);
              return { ok: true };
            } catch (error) {
              return { ok: false, error: error instanceof Error ? error.message : String(error) };
            }
          },
          /** Surface a failure through the composer's own notice channel when it is reachable. */
          notifyError: (message) => {
            try {
              const scope = resolveScope();
              const conversation = scope.get('conversation');
              const input = conversation === undefined ? undefined : conversation.input;
              if (input === undefined) return;
              input.for(scope).notify('error', message);
            } catch (error) {
              /* notification is best effort; the row itself shows the failure */
            }
          },
        };
      };
    }

    return {
      inject: ['slots', 'sessions', 'locale'],
      apply(ctx) {
        const injectFace = createInjectFace(ctx.sessions);

        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'quick-resume: dictionaries');

        ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
          name: 'conversation.input.left',
          id: 'quick-resume',
          order: 100,
          locale: NS,
          inject: injectFace,
        }, QuickPhraseRow));
      },
    };
  },
});
