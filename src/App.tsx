import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { canUndo, useGame } from './session/store';
import { levelOf } from './ai/levels';
import { SIDE, setupSummary, ui } from './copy/zh-TW';
import { Board } from './components/Board/Board';
import { Bubble } from './components/Bubble/Bubble';
import { Setup } from './components/Setup/Setup';
import { audio } from './audio/manager';
import './App.css';

export function App() {
  const s = useGame(
    useShallow(s => ({
      turn: s.game.turn,
      // 還沒開始（設定視窗剛打開）或已經結束，就不顯示輪到誰。
      showTurn: s.started && s.game.result === null,
      canUndo: canUndo(s),
      busy: s.busy,
      settings: s.settings,
      setupOpen: s.setupOpen,
      reduceMotion: s.reduceMotion,
      openSetup: s.openSetup,
      undo: s.undo,
      setReduceMotion: s.setReduceMotion,
      sound: s.audio,
      setAudio: s.setAudio,
    })),
  );
  const preview = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(preview.current), []);
  const { mode, level, humanSide } = s.settings;
  const turnName = mode === 'ai' ? (s.turn === humanSide ? ui.you : ui.computer) : SIDE[s.turn];

  return (
    <>
      <main className="app" inert={s.setupOpen}>
        <header className="top">
          <h1>{ui.title}</h1>
          {s.showTurn && (
            <p className="turn" data-side={s.turn}>
              {ui.turnLabel} <b>{turnName}</b>
            </p>
          )}
          <button
            type="button"
            className="sound-btn"
            aria-pressed={s.sound.on}
            aria-label={ui.sound}
            title={s.sound.on ? ui.soundOn : ui.soundOff}
            onClick={() => {
              const on = !s.sound.on;
              s.setAudio({ on });
              // 打開時響一聲確認；關掉本身不發聲。
              if (on) audio.play('ui.tap');
            }}
          >
            <SpeakerIcon on={s.sound.on} />
          </button>
        </header>

        <Bubble />
        <Board />

        <footer className="controls">
          <div className="actions">
            <button type="button" className="btn" onClick={s.undo} disabled={!s.canUndo}>
              {ui.undo}
            </button>
            <button type="button" className="btn" onClick={s.openSetup} disabled={s.busy}>
              {ui.newGame}
            </button>
            <span className="summary">{setupSummary(mode, levelOf(level).name, humanSide)}</span>
          </div>
          <div className="prefs">
            <label className="toggle volume">
              {ui.volume}
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(s.sound.volume * 100)}
                disabled={!s.sound.on}
                onChange={e => {
                  s.setAudio({ volume: Number(e.target.value) / 100 });
                  // 調整停下來後播一聲預覽。
                  clearTimeout(preview.current);
                  preview.current = setTimeout(() => audio.play('piece.select'), 250);
                }}
              />
            </label>
            <div className="music">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={s.sound.music}
                  disabled={!s.sound.on}
                  onChange={e => {
                    s.setAudio({ music: e.target.checked });
                    audio.play('ui.tap');
                  }}
                />
                {ui.music}
              </label>
              <input
                type="range"
                className="slider"
                min={0}
                max={100}
                step={5}
                aria-label={ui.musicVolume}
                value={Math.round(s.sound.musicVolume * 100)}
                disabled={!s.sound.on || !s.sound.music}
                onChange={e => s.setAudio({ musicVolume: Number(e.target.value) / 100 })}
              />
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={s.sound.calls}
                disabled={!s.sound.on}
                onChange={e => {
                  s.setAudio({ calls: e.target.checked });
                  audio.play('ui.tap');
                }}
              />
              {ui.animalCalls}
            </label>
            <label className="toggle">
              <input type="checkbox" checked={s.reduceMotion} onChange={e => s.setReduceMotion(e.target.checked)} />
              {ui.reduceMotion}
            </label>
          </div>
          <ul className="legend">
            <li><span className="sw w" />{ui.legendWater}</li>
            <li><span className="sw t" />{ui.legendTrap}</li>
            <li><span className="sw d" />{ui.legendDen}</li>
          </ul>
        </footer>
      </main>
      <Setup />
    </>
  );
}

/** 喇叭圖示：開著有聲波，關掉打叉。 */
function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      {on ? (
        <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}
