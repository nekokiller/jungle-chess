import { useEffect, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Side } from '../../engine';
import { LEVELS } from '../../ai/levels';
import { useGame, type Settings } from '../../session/store';
import { SIDE, ui } from '../../copy/zh-TW';
import { Animal } from '../Animal/Animal';
import './setup.css';

interface ChoiceProps<T> {
  label: string;
  value: T;
  options: readonly { value: T; label: ReactNode; aria?: string }[];
  onChange(value: T): void;
  wide?: boolean;
}

/** 一排大按鈕，一次選一個（小朋友點得到）。 */
function Choice<T extends string | boolean>({ label, value, options, onChange, wide }: ChoiceProps<T>) {
  return (
    <fieldset className="choice">
      <legend>{label}</legend>
      <div className={`options${wide ? ' wide' : ''}`}>
        {options.map(o => (
          <button
            key={String(o.value)}
            type="button"
            className="option"
            aria-pressed={o.value === value}
            aria-label={o.aria}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const sideOption = (side: Side, label: string) => ({
  value: side,
  aria: label,
  label: (
    <>
      <span className="option-animal">
        <Animal type="lion" side={side} />
      </span>
      {label}
    </>
  ),
});

/** 開局設定：對手、難度、紅藍、先後手。一打開遊戲、按「新的一局」都會出現。 */
export function Setup() {
  const { open, started, settings, start, closeSetup } = useGame(
    useShallow(s => ({
      open: s.setupOpen,
      started: s.started,
      settings: s.settings,
      start: s.start,
      closeSetup: s.closeSetup,
    })),
  );
  const [draft, setDraft] = useState<Settings>(settings);
  const update = (patch: Partial<Settings>) => setDraft(d => ({ ...d, ...patch }));

  // 每次打開都從目前這一局的設定開始改。
  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  useEffect(() => {
    if (!open || !started) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSetup();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, started, closeSetup]);

  if (!open) return null;
  const ai = draft.mode === 'ai';

  return (
    <div className="setup" role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <form
        className="setup-card"
        onSubmit={e => {
          e.preventDefault();
          start(draft);
        }}
      >
        <h2 id="setup-title">{ui.setupTitle}</h2>

        <Choice
          label={ui.opponent}
          value={draft.mode}
          onChange={mode => update({ mode })}
          options={[
            { value: 'ai', label: ui.vsAi },
            { value: 'pvp', label: ui.vsHuman },
          ]}
        />

        {ai ? (
          <>
            <Choice
              label={ui.level}
              value={draft.level}
              onChange={level => update({ level })}
              wide
              options={LEVELS.map((l, i) => ({
                value: l.id,
                aria: `${l.name}（${i + 1} 顆星）`,
                label: (
                  <>
                    <span>{l.name}</span>
                    <span className="stars" aria-hidden="true">
                      {'★'.repeat(i + 1)}
                    </span>
                  </>
                ),
              }))}
            />
            <Choice
              label={ui.yourSide}
              value={draft.humanSide}
              onChange={humanSide => update({ humanSide })}
              options={[sideOption('red', SIDE.red), sideOption('blue', SIDE.blue)]}
            />
            <Choice
              label={ui.whoFirst}
              value={draft.humanFirst}
              onChange={humanFirst => update({ humanFirst })}
              options={[
                { value: true, label: ui.youFirst },
                { value: false, label: ui.aiFirst },
              ]}
            />
          </>
        ) : (
          <Choice
            label={ui.whoFirst}
            value={draft.pvpFirst}
            onChange={pvpFirst => update({ pvpFirst })}
            options={[sideOption('red', `${SIDE.red}先`), sideOption('blue', `${SIDE.blue}先`)]}
          />
        )}

        <div className="setup-actions">
          {started && (
            <button type="button" className="btn" onClick={closeSetup}>
              {ui.backToBoard}
            </button>
          )}
          <button type="submit" className="btn primary big" autoFocus>
            {ui.start}
          </button>
        </div>
      </form>
    </div>
  );
}
