// 表示数独盘面，负责数据存储、猜测、校验、克隆、序列化
export class Sudoku {
  constructor(grid) {
    // grid: 9x9 number[][]，0 表示空格
    this.grid = this._normalizeGrid(grid);
  }

  _normalizeGrid(grid) {
    // 深拷贝并确保是 9x9，空值为 0
    const normalized = grid.map(row => [...row]);
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (normalized[i][j] === null || normalized[i][j] === undefined) {
          normalized[i][j] = 0;
        }
      }
    }
    return normalized;
  }

  getGrid() {
    // 返回深拷贝，防止外部直接修改内部状态
    return this.grid.map(row => [...row]);
  }

  guess(move) {
    // move: { row, col, value }，value 为 1-9 的数字
    const { row, col, value } = move;
    if (row < 0 || row >= 9 || col < 0 || col >= 9) {
      throw new Error('Invalid cell position');
    }
    if (value < 1 || value > 9) {
      throw new Error('Invalid value, must be 1-9');
    }
    // 简单检查是否与同行/同列/同宫冲突（可选，也可允许临时填入错误值）
    // 这里允许任意填入，校验交给单独的方法
    this.grid[row][col] = value;
  }

  isValid() {
    // 检查当前盘面是否有冲突（用于提示用户）
    for (let i = 0; i < 9; i++) {
      const rowSet = new Set();
      const colSet = new Set();
      for (let j = 0; j < 9; j++) {
        const rowVal = this.grid[i][j];
        if (rowVal !== 0) {
          if (rowSet.has(rowVal)) return false;
          rowSet.add(rowVal);
        }
        const colVal = this.grid[j][i];
        if (colVal !== 0) {
          if (colSet.has(colVal)) return false;
          colSet.add(colVal);
        }
      }
    }
    // 检查每个 3x3 宫
    for (let box = 0; box < 9; box++) {
      const startRow = Math.floor(box / 3) * 3;
      const startCol = (box % 3) * 3;
      const boxSet = new Set();
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const val = this.grid[startRow + i][startCol + j];
          if (val !== 0) {
            if (boxSet.has(val)) return false;
            boxSet.add(val);
          }
        }
      }
    }
    return true;
  }

  isComplete() {
    // 所有格子非空且无冲突
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (this.grid[i][j] === 0) return false;
      }
    }
    return this.isValid();
  }

  clone() {
    // 深拷贝
    return new Sudoku(this.grid);
  }

  toJSON() {
    return {
      grid: this.getGrid(), // 已经深拷贝
    };
  }

  toString() {
    // 外表化，便于调试
    return this.grid.map(row => row.join(' ')).join('\n');
  }
}

//import { Sudoku } from './Sudoku.js';

// 历史记录存储快照（Sudoku 实例），而不是存储 Move
// 优点：Undo/Redo 简单可靠，无需重放 Move
// 缺点：内存占用稍大，但 9x9 非常小，可接受
export class Game {
  constructor(sudoku) {
    // sudoku: Sudoku 实例
    this._sudoku = sudoku.clone(); // 确保独立
    this._history = [];      // 存储 Sudoku 快照
    this._currentIndex = -1; // 当前状态在历史中的索引
    this._saveCurrentToHistory(); // 初始状态入栈
  }

  _saveCurrentToHistory() {
    // 保存当前 Sudoku 的快照
    const snapshot = this._sudoku.clone();
    // 如果当前索引不是最后一个，则截断后面的历史（新分支）
    if (this._currentIndex < this._history.length - 1) {
      this._history = this._history.slice(0, this._currentIndex + 1);
    }
    this._history.push(snapshot);
    this._currentIndex++;
  }

  getSudoku() {
    // 返回当前 Sudoku 的只读视图（通过 getGrid 获取数据，但不直接暴露内部对象）
    // 为了安全，返回一个克隆，但 UI 通常只需要读取 grid，我们会在 adapter 中处理
    // 这里直接返回内部 Sudoku 的引用，但要求调用方不要直接修改它（通过 guess 修改）
    return this._sudoku;
  }

  guess(move) {
    // 执行猜测，保存历史
    this._sudoku.guess(move);
    this._saveCurrentToHistory();
  }

  undo() {
    if (!this.canUndo()) return false;
    // 回退到上一个快照
    this._currentIndex--;
    this._sudoku = this._history[this._currentIndex].clone();
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;
    this._currentIndex++;
    this._sudoku = this._history[this._currentIndex].clone();
    return true;
  }

  canUndo() {
    return this._currentIndex > 0;
  }

  canRedo() {
    return this._currentIndex < this._history.length - 1;
  }

  toJSON() {
    return {
      sudoku: this._sudoku.toJSON(),
      history: this._history.map(s => s.toJSON()),
      currentIndex: this._currentIndex,
    };
  }

  static fromJSON(json) {
    // 反序列化
    const sudoku = new Sudoku(json.sudoku.grid);
    const game = new Game(sudoku);
    // 替换内部历史
    game._history = json.history.map(h => new Sudoku(h.grid));
    game._currentIndex = json.currentIndex;
    game._sudoku = game._history[game._currentIndex].clone();
    return game;
  }
}

//import { Sudoku } from './Sudoku.js';
//import { Game } from './Game.js';

export function createSudoku(grid) {
  return new Sudoku(grid);
}

export function createSudokuFromJSON(json) {
  return new Sudoku(json.grid);
}

export function createGame({ sudoku }) {
  return new Game(sudoku);
}

export function createGameFromJSON(json) {
  return Game.fromJSON(json);
}
