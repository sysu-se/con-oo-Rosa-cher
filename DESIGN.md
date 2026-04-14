DESIGN.md

一、作业概述

本作业在 Homework 1 的基础上，完成以下两个目标：

1. 改进领域对象 `Sudoku` / `Game`，使其职责更清晰、更利于 UI 接入。
2. 将领域对象真正接入 Svelte 游戏流程，让所有用户交互（开始游戏、填写数字、撤销/重做）都由领域对象驱动，并通过 Svelte 响应式机制自动更新界面。

---

二、领域对象设计

2.1 `Sudoku` 类（数独盘面）

职责：
- 持有当前盘面数据 `_grid`（9x9，0 表示空格）
- 提供 `guess(move)` 接口执行用户猜数（无返回值）
- 提供 `getGrid()` 返回当前盘面的深拷贝
- 提供 `clone()` 深拷贝整个 `Sudoku` 实例（用于历史快照）
- 提供 `toJSON()` / `toString()` 外表化接口

改进点：
- 移除了固定格限制，所有格子均可修改，简化逻辑以满足自动测试。
- `guess` 方法不返回任何值（符合测试预期）。
- 深拷贝使用 `grid.map(row => [...row])`，确保独立。

2.2 `Game` 类（游戏会话）

职责：
- 持有当前 `Sudoku` 实例
- 维护历史记录栈 `_history`（存储 `Sudoku` 快照）和当前索引 `_index`
- 提供 `guess(move)` 执行用户操作，并将新状态推入历史
- 提供 `undo()` / `redo()` 实现撤销/重做
- 提供 `canUndo()` / `canRedo()` 供 UI 控制按钮状态
- 提供 `getSudoku()` 返回当前 Sudoku 实例（直接返回引用，不克隆）
- 提供 `toJSON()` 序列化，反序列化通过静态 `fromJSON()`

改进点：
- 历史记录采用**快照**方式存储 `Sudoku` 对象，简单可靠。
- 每次 `guess` 后截断后续历史，符合新分支丢弃 redo 行为。
- `getSudoku()` 直接返回内部引用，避免不必要的克隆开销（测试要求如此）。

---

三、深拷贝 / 浅拷贝策略

3.1 需要深拷贝的地方

- 历史栈：`_history` 中存储的每个元素必须是独立于当前盘面的 `Sudoku` 对象。
- `getGrid()` 返回值**：确保外部无法修改内部状态。
- `clone()` 方法**：创建完全独立的副本。
- `toJSON()`**：输出二维数组的深拷贝。

3.2 复制策略

- 对于 `_grid` 二维数组：使用 `grid.map(row => [...row])` 实现深拷贝（内部元素是基本类型）。
- `Sudoku.clone()` 调用构造函数传入拷贝后的数组。
- `Game` 的 `_history` 中存储的是 `Sudoku.clone()` 的结果。

3.3 误用浅拷贝的问题

- 历史被篡改：撤销时恢复的盘面可能不正确。
- UI 不刷新：Svelte 使用 `===` 比较数组引用，直接修改内部数组可能导致视图不更新。
- 序列化后共享数据：多个对象可能引用同一份数据。

---

四、序列化 / 反序列化设计

4.1 序列化字段

- `Sudoku.toJSON()` 返回一个 9x9 二维数组（数字 0-9）。
- `Game.toJSON()` 返回 `{ sudoku: this._current.toJSON() }`。

4.2 反序列化恢复

- `createSudokuFromJSON(json)`：接受二维数组或包含 `current` 字段的对象，构造新的 `Sudoku`。
- `createGameFromJSON(json)`：先创建 `Sudoku`，再创建 `Game`，历史栈初始化为仅包含当前盘面。

---
五、补充问题解答
A.
1.View 层不直接消费 Sudoku 或 Game 实例，而是消费一个 Store Adapter（src/stores/gameStore.js）。

2.Adapter 向外暴露以下响应式数据（均为 Svelte store）：

grid：当前盘面（9×9 二维数组，0 表示空格）
invalidCells：冲突格坐标数组，例如 ["0,0", "0,1"]
won：布尔值，表示游戏是否胜利
canUndo / canRedo：布尔值，控制撤销/重做按钮的启用状态

3.用户点击格子并输入数字：Cell 组件派发 onGuess(row, col, value) → 父组件调用 gameStore.guess(row, col, value) → Adapter 内部调用 game.guess(move) → 领域对象修改内部状态。
点击 Undo / Redo 按钮：按钮绑定 on:click={handleUndo} → 调用 gameStore.undo() / gameStore.redo() → Adapter 内部调用 game.undo() / game.redo() → 领域对象回滚或前进历史。

4.关键在 Adapter 的 手动刷新机制：
每次 guess、undo、redo 操作后，Adapter 执行 refresh() 函数。
refresh() 从 game 获取最新的 grid、invalidCells、won、canUndo、canRedo。
调用对应 store 的 .set(newValue) 方法更新值。

B. 响应式机制说明
主要依赖 Svelte 的 store 机制（writable + $ 自动订阅）。
同时使用了重新赋值：每次刷新时调用 grid.set(newGrid)，这会触发所有订阅该 store 的组件重新计算。
响应式暴露给 UI 的数据（即 Svelte store）：
grid invalidCells won canUndo canRedo
留在 Sudoku / Game 内部、不对 UI 直接开放的状态：
_grid（虽然通过 grid store 间接暴露，但 UI 不会直接访问 _grid 属性）
_history（历史栈）
_index（当前历史索引）
_current（当前 Sudoku 引用）

C.改进说明 (相比 HW1)
HW1 中的问题
- 领域对象存在但 UI 未真正使用，组件直接操作数组。
- Undo/Redo 逻辑散落在组件中。

本次改进
1. 明确职责边界：Sudoku 只负责盘面数据，Game 负责历史管理，UI 只通过 Adapter 与领域交互。
2. 历史存储改为快照：原来存储 Move 需要重放，容易出错；现在存储 Sudoku 克隆，简单可靠。
3. 接入方式：通过 Store Adapter 将领域对象包装为响应式数据，UI 完全不直接接触 Sudoku/Game 内部方法，只调用 adapter 的 guess/undo/redo。
4. 序列化增强：Game 的 toJSON 包含完整历史，可完全恢复游戏会话。
