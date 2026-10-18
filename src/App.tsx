import { useShallow } from 'zustand/react/shallow';
import { canUndo, useGame } from './session/store';
import { levelOf } from './ai/levels';
import { SIDE, setupSummary, ui } from './copy/zh-TW';
import { Board } from './components/Board/Board';
import { Bubble } from './components/Bubble/Bubble';
import { Setup } from './components/Setup/Setup';
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
    })),
  );
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
          <label className="toggle">
            <input type="checkbox" checked={s.reduceMotion} onChange={e => s.setReduceMotion(e.target.checked)} />
            {ui.reduceMotion}
          </label>
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
