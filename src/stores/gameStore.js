// src/stores/gameStore.js
import { writable, derived } from 'svelte/store';
import { createSudoku, createGame } from '../domain/index.js';
import { generateSudoku } from '../sudoku.js'; // 原有生成函数

/**
 * 创建游戏 Store
 * @param {Object} options
 * @param {('veryeasy'|'easy'|'medium'|'hard')} options.difficulty - 难度
 * @param {string} [options.sencode] - 可选自定义编码
 * @returns {Object} store 对象
 */
export function createGameStore({ difficulty = 'easy', sencode = null } = {}) {
  // 1. 创建领域对象
  let initialGrid;
  if (sencode) {
    // 从 sencode 解码（需要导入原有 decodeSencode）
    // 这里假设你已有 decodeSencode 函数
    const { decodeSencode } = require('../sencode.js'); // 根据实际路径
    initialGrid = decodeSencode(sencode);
  } else {
    initialGrid = generateSudoku(difficulty);
  }
  const sudoku = createSudoku(initialGrid);
  let game = createGame({ sudoku });

  // 2. 响应式状态
  const grid = writable(game.getSudoku().getGrid());
  const invalidCells = writable(game.getInvalidCells());
  const won = writable(game.isWon());
  const canUndo = writable(game.canUndo());
  const canRedo = writable(game.canRedo());

  // 辅助函数：刷新所有派生状态
  function refresh() {
    grid.set(game.getSudoku().getGrid());
    invalidCells.set(game.getInvalidCells());
    won.set(game.isWon());
    canUndo.set(game.canUndo());
    canRedo.set(game.canRedo());
  }

  // 3. 对外暴露的动作
  function guess(row, col, value) {
    const success = game.guess({ row, col, value });
    if (success) refresh();
    return success;
  }

  function undo() {
    game.undo();
    refresh();
  }

  function redo() {
    game.redo();
    refresh();
  }

  function newGame(diff) {
    const newGrid = generateSudoku(diff);
    const newSudoku = createSudoku(newGrid);
    game = createGame({ sudoku: newSudoku });
    refresh();
  }

  function newCustomGame(sencode) {
    // 需要引入 decodeSencode
    const { decodeSencode } = require('../sencode.js');
    const newGrid = decodeSencode(sencode);
    const newSudoku = createSudoku(newGrid);
    game = createGame({ sudoku: newSudoku });
    refresh();
  }

  return {
    subscribe: (callback) => {
      // 可以订阅复合状态，或者返回单独 store 的订阅
      // 简便做法：让组件分别订阅 grid, invalidCells 等
    },
    // 直接暴露各个 store 供组件使用
    grid,
    invalidCells,
    won,
    canUndo,
    canRedo,
    guess,
    undo,
    redo,
    newGame,
    newCustomGame
  };
}
