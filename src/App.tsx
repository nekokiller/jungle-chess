import { useShallow } from 'zustand/react/shallow';
import { useGame } from './session/store';
import { SIDE, ui } from './copy/zh-TW';
import { Board } from './components/Board/Board';
import { Bubble } from './components/Bubble/Bubble';
import './App.css';

export function App() {
  const { turn, over, busy, reduceMotion, newGame, setReduceMotion } = useGame(
    useShallow(s => ({
      turn: s.game.turn,
      over: s.game.result !== null,
      busy: s.busy,
      reduceMotion: s.reduceMotion,
      newGame: s.newGame,
      setReduceMotion: s.setReduceMotion,
    })),
  );

  return (
    <main className="app">
      <header className="top">
        <h1>{ui.title}</h1>
        {!over && (
          <p className="turn" data-side={turn}>
            {ui.turnLabel} <b>{SIDE[turn]}</b>
          </p>
        )}
      </header>

      <Bubble />
      <Board />

      <footer className="controls">
        <ul className="legend">
          <li><span className="sw w" />{ui.legendWater}</li>
          <li><span className="sw t" />{ui.legendTrap}</li>
          <li><span className="sw d" />{ui.legendDen}</li>
        </ul>
        <div className="actions">
          <button type="button" className="btn" onClick={newGame} disabled={busy}>
            {ui.newGame}
          </button>
          <label className="toggle">
            <input type="checkbox" checked={reduceMotion} onChange={e => setReduceMotion(e.target.checked)} />
            {ui.reduceMotion}
          </label>
        </div>
      </footer>
    </main>
  );
}
