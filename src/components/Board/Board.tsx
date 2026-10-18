import { memo, useMemo } from 'react';
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
import { placeAt as at, registerPiece, stage, toView } from '../../animation/registry';
import { useGame } from '../../session/store';
import { FULL, SIDE, TERRAIN, ui } from '../../copy/zh-TW';
import { Animal, type AnimalState, type Face } from '../Animal/Animal';
import { Marks } from '../Marks/Marks';
import './board.css';

function terrainOf(pos: Pos) {
  if (isWater(pos)) return { cls: 'water', label: TERRAIN.water, owner: null };
  const den = denOwner(pos);
  if (den) return { cls: 'den', label: TERRAIN.den, owner: den };
  const trap = trapOwner(pos);
  if (trap) return { cls: 'trap', label: TERRAIN.trap, owner: trap };
  return { cls: (pos.row + pos.col) % 2 ? 'alt' : '', label: TERRAIN.grass, owner: null };
}

const Cells = memo(function Cells({ board, flipped }: { board: (Piece | null)[][]; flipped: boolean }) {
  const clickCell = useGame(s => s.clickCell);
  const cells = [];
  // 依畫面上的順序排格子（鍵盤 Tab 也照這個順序）。
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const pos = toView({ row: r, col: c }, flipped);
      const { row, col } = pos;
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
  flipped: boolean;
  ghost?: boolean;
}

const PieceView = memo(function PieceView({ piece, pos, state, face, rank, inWater, flipped, ghost }: PieceViewProps) {
  return (
    <div
      className={`piece${inWater ? ' in-water' : ''}`}
      ref={el => registerPiece(piece.id, el)}
      style={{ ...at(pos, flipped), zIndex: ghost ? 1 : undefined }}
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
  const { game, flipped, selected, thinking, ghosts, faces, dry, resultText, newGame, openSetup } = useGame(
    useShallow(s => ({
      game: s.game,
      flipped: s.flipped,
      thinking: s.thinking,
      selected: s.selected,
      ghosts: s.ghosts,
      faces: s.faces,
      dry: s.dry,
      resultText: s.resultText,
      newGame: s.newGame,
      openSetup: s.openSetup,
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
          flipped={flipped}
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
        flipped={flipped}
        ghost
      />,
    );
  }

  return (
    <div className="board-wrap">
      <div className="board" ref={el => void (stage.board = el)}>
        <Cells board={game.board} flipped={flipped} />
      </div>
      {selected && <span className="sel-glow" style={at(selected, flipped)} />}
      <div className="layer pieces">{pieces}</div>
      <Marks moves={moves} flipped={flipped} />
      <div className="layer fx" ref={el => void (stage.fx = el)} />
      {resultText && (
        <div className="result" role="dialog" aria-modal="true" aria-labelledby="result-title">
          <div className="result-card">
            <p className="result-title" id="result-title">{resultText}</p>
            <div className="result-actions">
              <button type="button" className="btn" onClick={openSetup}>
                {ui.changeSetup}
              </button>
              <button type="button" className="btn primary" autoFocus onClick={newGame}>
                {ui.playAgain}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
