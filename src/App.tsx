import { COLS, ROWS, initialBoard, toSquare } from './engine';

const NAME = {
  elephant: '象', lion: '獅', tiger: '虎', leopard: '豹',
  wolf: '狼', dog: '狗', cat: '貓', rat: '鼠',
} as const;

// M1 暫時的畫面：只把初始盤面印出來，確認規則引擎接得上。M2 會換成正式棋盤。
export function App() {
  const board = initialBoard();
  return (
    <main style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h1>動物棋（開發中）</h1>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {Array.from({ length: ROWS }, (_, row) => (
            <tr key={row}>
              {Array.from({ length: COLS }, (_, col) => {
                const p = board[row]![col];
                return (
                  <td
                    key={col}
                    title={toSquare({ row, col })}
                    style={{
                      width: 40, height: 40, textAlign: 'center', border: '1px solid #ccc',
                      color: p?.side === 'red' ? '#e4574a' : '#3b7be0',
                    }}
                  >
                    {p ? NAME[p.type] : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
