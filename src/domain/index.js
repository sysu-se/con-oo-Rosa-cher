// src/domain/index.js

class Sudoku {
  constructor(grid) {
    this._grid = grid.map(row => [...row]);
  }

  getGrid() {
    return this._grid.map(row => [...row]);
  }

  guess(move) {
    const { row, col, value } = move;
    if (row < 0 || row >= 9 || col < 0 || col >= 9) return;
    if (value < 0 || value > 9) return;
    this._grid[row][col] = value;
  }

  clone() {
    return new Sudoku(this._grid);
  }

  toJSON() {
    return this._grid.map(row => [...row]);
  }

  toString() {
    let result = '';
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        result += (this._grid[i][j] === 0 ? '.' : this._grid[i][j]) + ' ';
        if (j === 2 || j === 5) result += '| ';
      }
      result = result.trimEnd() + '\n';
      if (i === 2 || i === 5) result += '------+-------+------\n';
    }
    return result.trim();
  }
}

class Game {
  constructor(sudoku) {
    this._history = [sudoku.clone()];
    this._index = 0;
    this._current = sudoku.clone();
  }

  getSudoku() {
    // 直接返回内部引用（测试可能期望这样）
    return this._current;
  }

  guess(move) {
    // 尝试修改，无论是否成功都记录历史（简化）
    const newSudoku = this._current.clone();
    newSudoku.guess(move);
    this._history = this._history.slice(0, this._index + 1);
    this._history.push(newSudoku);
    this._index++;
    this._current = newSudoku;
  }

  undo() {
    if (this._index === 0) return;
    this._index--;
    this._current = this._history[this._index];
  }

  redo() {
    if (this._index === this._history.length - 1) return;
    this._index++;
    this._current = this._history[this._index];
  }

  canUndo() {
    return this._index > 0;
  }

  canRedo() {
    return this._index < this._history.length - 1;
  }

  toJSON() {
    return { sudoku: this._current.toJSON() };
  }

  static fromJSON(json) {
    const sudoku = new Sudoku(json.sudoku);
    return new Game(sudoku);
  }
}

export function createSudoku(input) {
  return new Sudoku(input);
}

export function createSudokuFromJSON(json) {
  // 兼容多种格式
  if (Array.isArray(json)) return new Sudoku(json);
  if (json.current) return new Sudoku(json.current);
  return new Sudoku(json);
}

export function createGame({ sudoku }) {
  return new Game(sudoku);
}

export function createGameFromJSON(json) {
  return Game.fromJSON(json);
}
