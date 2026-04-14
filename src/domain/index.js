// src/domain/index.js

class Sudoku {
  // ... 之前的构造函数、fromInitial、getGrid、guess、clone、toJSON、toString 保持不变

  /**
   * 获取当前所有冲突单元格的坐标列表
   * @returns {string[]} 例如 ["0,0", "0,1"]
   */
  getInvalidCells() {
    const conflicts = new Set();
    const size = 9;
    const boxSize = 3;
    const grid = this._current;

    const add = (x, y) => conflicts.add(`${x},${y}`);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const val = grid[y][x];
        if (val === 0) continue;

        // 检查行
        for (let i = 0; i < size; i++) {
          if (i !== x && grid[y][i] === val) add(x, y);
        }
        // 检查列
        for (let i = 0; i < size; i++) {
          if (i !== y && grid[i][x] === val) add(x, i);
        }
        // 检查宫
        const startRow = Math.floor(y / boxSize) * boxSize;
        const startCol = Math.floor(x / boxSize) * boxSize;
        for (let r = startRow; r < startRow + boxSize; r++) {
          for (let c = startCol; c < startCol + boxSize; c++) {
            if ((r !== y || c !== x) && grid[r][c] === val) {
              add(c, r);
            }
          }
        }
      }
    }
    return Array.from(conflicts);
  }

  /**
   * 检查是否胜利（无空格且无冲突）
   */
  isComplete() {
    const size = 9;
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (this._current[i][j] === 0) return false;
      }
    }
    return this.getInvalidCells().length === 0;
  }
}

class Game {
  // ... 之前的构造、getSudoku、guess、undo、redo、canUndo、canRedo、toJSON、fromJSON 保持不变

  /**
   * 获取当前胜利状态（供 UI 使用）
   */
  isWon() {
    return this._current.isComplete();
  }

  /**
   * 获取冲突格（供 UI 高亮）
   */
  getInvalidCells() {
    return this._current.getInvalidCells();
  }
}

// 导出函数保持不变
export function createSudoku(input) { return Sudoku.fromInitial(input); }
export function createSudokuFromJSON(json) { return new Sudoku(json.current, json.fixed); }
export function createGame({ sudoku }) { return new Game(sudoku); }
export function createGameFromJSON(json) { return Game.fromJSON(json); }
