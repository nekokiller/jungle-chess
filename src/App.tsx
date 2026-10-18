import { useShallow } from 'zustand/react/shallow';
import { useGame, type Mode } from './session/store';
import { LEVELS, type LevelId } from './ai/levels';
import { SIDE, ui } from './copy/zh-TW';
import { Board } from './components/Board/Board';
import { Bubble } from './components/Bubble/Bubble';
import './App.css';

export function App() {
  const s = useGame(
    useShallow(s => ({
      turn: s.game.turn,
      over: s.game.result !== null,
      canUndo: s.history.length > 0 && !s.busy,
      busy: s.busy,
      mode: s.mode,
      level: s.level,
      humanSide: s.humanSide,
      reduceMotion: s.reduceMotion,
      newGame: s.newGame,
      undo: s.undo,
      setMode: s.setMode,
      setLevel: s.setLevel,
      setReduceMotion: s.setReduceMotion,
    })),
  );
  const turnName = s.mode === 'ai' ? (s.turn === s.humanSide ? ui.you : ui.computer) : SIDE[s.turn];

  return (
    <main className="app">
      <header className="top">
        <h1>{ui.title}</h1>
        {!s.over && (
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
          <button type="button" className="btn" onClick={s.newGame} disabled={s.busy}>
            {ui.newGame}
          </button>
        </div>
        <div className="settings">
          <label className="field">
            {ui.opponent}
            <select value={s.mode} onChange={e => s.setMode(e.target.value as Mode)}>
              <option value="ai">{ui.vsAi}</option>
              <option value="pvp">{ui.vsHuman}</option>
            </select>
          </label>
          <label className="field">
            {ui.level}
            <select value={s.level} disabled={s.mode !== 'ai'} onChange={e => s.setLevel(e.target.value as LevelId)}>
              {LEVELS.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
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
  );
}
