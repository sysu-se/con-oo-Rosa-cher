// src/domain/index.js

/**
 * Sudoku 领域对象 - 表示数独盘面
 * 职责：持有网格数据、提供猜数操作、克隆、序列化与外表化
 */
class Sudoku {
  /**
   * @param {number[][]} currentGrid - 当前盘面，9x9，0表示空格
   * @param {boolean[][]} fixedGrid - 固定格标识，true表示初始不可修改
   */
  constructor(currentGrid, fixedGrid) {
    // 深拷贝确保内部数据独立
    this._current = currentGrid.map(row => [...row]);
    this._fixed = fixedGrid.map(row => [...row]);
  }

  /**
   * 从初始盘面创建 Sudoku 实例（非零值为固定格）
   * @param {number[][]} initialGrid
   * @returns {Sudoku}
   */
  static fromInitial(initialGrid) {
    const size = 9;
    const current = Array(size).fill().map(() => Array(size).fill(0));
    const fixed = Array(size).fill().map(() => Array(size).fill(false));
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const val = initialGrid[i][j];
        if (val !== 0 && val !== null && val !== undefined) {
          current[i][j] = val;
          fixed[i][j] = true;
        }
      }
    }
    return new Sudoku(current, fixed);
  }

  /**
   * 获取当前盘面的深拷贝
   * @returns {number[][]}
   */
  getGrid() {
    return this._current.map(row => [...row]);
  }

  /**
   * 执行一次猜数操作
   * @param {{row: number, col: number, value: number}} move
   * @returns {boolean} 是否成功（固定格或值无效时返回false）
   */
  guess(move) {
    const { row, col, value } = move;
    // 边界检查
    if (row < 0 || row >= 9 || col < 0 || col >= 9) return false;
    // 值检查：0-9 之间的整数
    if (!Number.isInteger(value) || value < 0 || value > 9) return false;
    // 固定格不可修改
    if (this._fixed[row][col]) return false;
    
    this._current[row][col] = value;
    return true;
  }

  /**
   * 深拷贝当前 Sudoku 实例
   * @returns {Sudoku}
   */
  clone() {
    return new Sudoku(this._current, this._fixed);
  }

  /**
   * 序列化为 JSON 兼容对象
   * @returns {{current: number[][], fixed: boolean[][]}}
   */
  toJSON() {
    return {
      current: this._current.map(row => [...row]),
      fixed: this._fixed.map(row => [...row])
    };
  }

  /**
   * 外表化：返回可读的盘面字符串（用于调试）
   * @returns {string}
   */
  toString() {
    const size = 9;
    const boxSize = 3;
    let out = '╔═══════╤═══════╤═══════╗\n';
    for (let row = 0; row < size; row++) {
      if (row !== 0 && row % boxSize === 0) {
        out += '╟───────┼───────┼───────╢\n';
      }
      for (let col = 0; col < size; col++) {
        if (col === 0) out += '║ ';
        else if (col % boxSize === 0) out += '│ ';
        const val = this._current[row][col];
        out += (val === 0 ? '·' : val) + ' ';
        if (col === size - 1) out += '║';
      }
      out += '\n';
    }
    out += '╚═══════╧═══════╧═══════╝';
    return out;
  }

  /**
   * 检查盘面是否完整且无冲突（辅助方法，非接口要求）
   * @returns {boolean}
   */
  isComplete() {
    // 检查空格
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (this._current[i][j] === 0) return false;
      }
    }
    // 检查冲突（复用冲突检测逻辑）
    return this.getConflicts().length === 0;
  }

  /**
   * 获取所有冲突单元格的坐标字符串数组（辅助）
   * @returns {string[]}
   */
  getConflicts() {
    const conflicts = new Set();
    const addConflict = (x, y) => conflicts.add(`${x},${y}`);
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        const val = this._current[y][x];
        if (val === 0) continue;
        // 行检查
        for (let i = 0; i < 9; i++) {
          if (i !== x && this._current[y][i] === val) addConflict(x, y);
        }
        // 列检查
        for (let i = 0; i < 9; i++) {
          if (i !== y && this._current[i][x] === val) addConflict(x, i);
        }
        // 宫检查
        const startRow = Math.floor(y / 3) * 3;
        const startCol = Math.floor(x / 3) * 3;
        for (let r = startRow; r < startRow + 3; r++) {
          for (let c = startCol; c < startCol + 3; c++) {
            if ((r !== y || c !== x) && this._current[r][c] === val) {
              addConflict(c, r);
            }
          }
        }
      }
    }
    return Array.from(conflicts);
  }
}

/**
 * Game 领域对象 - 管理游戏会话、历史记录（快照方式）
 * 职责：持有当前 Sudoku，提供 undo/redo，管理历史栈，序列化
 */
class Game {
  /**
   * @param {Sudoku} sudoku - 初始数独对象
   */
  constructor(sudoku) {
    // 历史记录存储 Sudoku 快照（深拷贝）
    this._history = [sudoku.clone()];
    this._currentIndex = 0;
    this._currentSudoku = sudoku.clone();
  }

  /**
   * 获取当前 Sudoku 对象
   * @returns {Sudoku}
   */
  getSudoku() {
    return this._currentSudoku;
  }

  /**
   * 执行一次猜数，并记录历史（可撤销/重做）
   * @param {{row: number, col: number, value: number}} move
   * @returns {boolean} 是否成功应用并记录
   */
  guess(move) {
    // 尝试在当前的 Sudoku 上应用移动
    const success = this._currentSudoku.guess(move);
    if (!success) return false;

    // 清除当前索引之后的所有历史（新分支）
    this._history = this._history.slice(0, this._currentIndex + 1);
    // 保存修改后的状态快照
    this._history.push(this._currentSudoku.clone());
    this._currentIndex++;
    return true;
  }

  /**
   * 撤销上一步操作
   */
  undo() {
    if (!this.canUndo()) return;
    this._currentIndex--;
    this._currentSudoku = this._history[this._currentIndex].clone();
  }

  /**
   * 重做被撤销的操作
   */
  redo() {
    if (!this.canRedo()) return;
    this._currentIndex++;
    this._currentSudoku = this._history[this._currentIndex].clone();
  }

  /**
   * 是否可撤销
   * @returns {boolean}
   */
  canUndo() {
    return this._currentIndex > 0;
  }

  /**
   * 是否可重做
   * @returns {boolean}
   */
  canRedo() {
    return this._currentIndex < this._history.length - 1;
  }

  /**
   * 序列化游戏（只保存当前局面，历史不保存，符合常见需求）
   * @returns {{sudoku: any}}
   */
  toJSON() {
    return { sudoku: this._currentSudoku.toJSON() };
  }

  /**
   * 从 JSON 恢复游戏（不保留原历史）
   * @param {{sudoku: {current: number[][], fixed: boolean[][]}}} json
   * @returns {Game}
   */
  static fromJSON(json) {
    const { current, fixed } = json.sudoku;
    const sudoku = new Sudoku(current, fixed);
    return new Game(sudoku);
  }
}

// ---------- 对外导出函数（符合评分接口）----------

/**
 * 创建 Sudoku 实例
 * @param {number[][]} input - 9x9 数组，非零值视为初始固定数字
 * @returns {Sudoku}
 */
export function createSudoku(input) {
  return Sudoku.fromInitial(input);
}

/**
 * 从 JSON 对象创建 Sudoku
 * @param {{current: number[][], fixed: boolean[][]}} json
 * @returns {Sudoku}
 */
export function createSudokuFromJSON(json) {
  const { current, fixed } = json;
  // 深拷贝确保数据安全
  const currentCopy = current.map(row => [...row]);
  const fixedCopy = fixed.map(row => [...row]);
  return new Sudoku(currentCopy, fixedCopy);
}

/**
 * 创建 Game 实例
 * @param {{ sudoku: Sudoku }} options
 * @returns {Game}
 */
export function createGame({ sudoku }) {
  return new Game(sudoku);
}

/**
 * 从 JSON 对象创建 Game（历史重置）
 * @param {{ sudoku: {current: number[][], fixed: boolean[][]} }} json
 * @returns {Game}
 */
export function createGameFromJSON(json) {
  return Game.fromJSON(json);
}
