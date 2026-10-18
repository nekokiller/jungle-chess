import { memo, useMemo, type CSSProperties } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  COLS,
  RANK,
  ROWS,
  denOwner,
  inEnemyTrap,
  isWater,
  movesFrom,
  samePos,
  toSquare,
  trapOwner,
  type Piece,
  type Pos,
} from '../../engine';
import { registerPiece, stage } from '../../animation/registry';
import { useGame } from '../../session/store';
import { FULL, SIDE, TERRAIN, ui } from '../../copy/zh-TW';
import { Animal, type AnimalState, type Face } from '../Animal/Animal';
import { Marks } from '../Marks/Marks';
import './board.css';

const at = (pos: Pos): CSSProperties => ({ '--r': pos.row, '--c': pos.col }) as CSSProperties;

function terrainOf(pos: Pos) {
  if (isWater(pos)) return { cls: 'water', label: TERRAIN.water, owner: null };
  const den = denOwner(pos);
  if (den) return { cls: 'den', label: TERRAIN.den, owner: den };
  const trap = trapOwner(pos);
  if (trap) return { cls: 'trap', label: TERRAIN.trap, owner: trap };
  return { cls: (pos.row + pos.col) % 2 ? 'alt' : '', label: TERRAIN.grass, owner: null };
}

const Cells = memo(function Cells({ board }: { board: (Piece | null)[][] }) {
  const clickCell = useGame(s => s.clickCell);
  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const pos = { row, col };
      const t = terrainOf(pos);
      const p = board[row]![col];
      const label = `${toSquare(pos)}，${t.owner ? SIDE[t.owner] : ''}${t.label}${p ? `，${SIDE[p.side]}${FULL[p.type]}` : ''}`;
      cells.push(
        <button
          key={`${row}-${col}`}
          type="button"
          className={`cell ${t.cls}`}
          data-owner={t.owner ?? undefined}
          aria-label={label}
          onClick={() => clickCell(pos)}
        >
          {t.cls === 'den' && <span className="cave" />}
          {t.cls === 'trap' && <span className="trap-net" />}
          {t.owner && <span className="tag">{t.label}</span>}
        </button>,
      );
    }
  }
  return <>{cells}</>;
});

interface PieceViewProps {
  piece: Piece;
  pos: Pos;
  state: AnimalState;
  face: Face;
  rank: number;
  inWater: boolean;
  ghost?: boolean;
}

const PieceView = memo(function PieceView({ piece, pos, state, face, rank, inWater, ghost }: PieceViewProps) {
  return (
    <div
      className={`piece${inWater ? ' in-water' : ''}`}
      ref={el => registerPiece(piece.id, el)}
      style={{ ...at(pos), zIndex: ghost ? 1 : undefined }}
    >
      <div className="travel">
        <div className="shadow" />
        <div className="ripple" />
        <Animal type={piece.type} side={piece.side} state={state} face={face} rank={rank} />
      </div>
    </div>
  );
});

export function Board() {
  const { game, selected, thinking, ghosts, faces, dry, resultText, newGame } = useGame(
    useShallow(s => ({
      game: s.game,
      thinking: s.thinking,
      selected: s.selected,
      ghosts: s.ghosts,
      faces: s.faces,
      dry: s.dry,
      resultText: s.resultText,
      newGame: s.newGame,
    })),
  );
  const moves = useMemo(() => (selected ? movesFrom(game.board, selected) : []), [game, selected]);
  const winner = game.result?.winner ?? null;

  const pieces = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const piece = game.board[row]![col];
      if (!piece) continue;
      const pos = { row, col };
      const trapped = inEnemyTrap(pos, piece.side);
      // AI 思考時，輪到的那一方的動物東張西望。
      const state: AnimalState =
        winner === piece.side
          ? 'celebrate'
          : selected && samePos(selected, pos)
            ? 'selected'
            : trapped
              ? 'scared'
              : thinking && piece.side === game.turn
                ? 'thinking'
                : 'idle';
      const face: Face =
        faces[piece.id] ?? (state === 'selected' || state === 'celebrate' ? 'happy' : state === 'scared' ? 'scared' : 'normal');
      pieces.push(
        <PieceView
          key={piece.id}
          piece={piece}
          pos={pos}
          state={state}
          face={face}
          rank={trapped ? 0 : RANK[piece.type]}
          inWater={isWater(pos) && dry !== piece.id}
        />,
      );
    }
  }
  for (const g of ghosts) {
    pieces.push(
      <PieceView
        key={g.piece.id}
        piece={g.piece}
        pos={g.pos}
        state="idle"
        face={faces[g.piece.id] ?? 'hurt'}
        rank={RANK[g.piece.type]}
        inWater={isWater(g.pos)}
        ghost
      />,
    );
  }

  return (
    <div className="board-wrap">
      <div className="board" ref={el => void (stage.board = el)}>
        <Cells board={game.board} />
      </div>
      {selected && <span className="sel-glow" style={at(selected)} />}
      <div className="layer pieces">{pieces}</div>
      <Marks moves={moves} />
      <div className="layer fx" ref={el => void (stage.fx = el)} />
      {resultText && (
        <div className="result" role="dialog" aria-modal="true" aria-labelledby="result-title">
          <div className="result-card">
            <p className="result-title" id="result-title">{resultText}</p>
            <button type="button" className="btn primary" autoFocus onClick={newGame}>
              {ui.playAgain}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
