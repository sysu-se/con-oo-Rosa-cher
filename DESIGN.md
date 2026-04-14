# Sudoku 游戏设计文档 (HW1 + HW1.1)

## 一、领域对象设计

### 1. Sudoku (数独盘面)
- **职责**：持有 9x9 网格数据，提供猜测（guess）、校验（isValid）、完成检查（isComplete）、克隆、序列化、外表化。
- **关键接口**：
  - `getGrid()` 返回深拷贝的网格，防止外部直接修改。
  - `guess(move)` 修改指定格子的值（允许任意值，但校验单独提供）。
  - `clone()` 深拷贝，用于历史快照。
  - `toJSON()` / `toString()` 序列化与调试。

### 2. Game (游戏会话)
- **职责**：管理当前 Sudoku 和历史记录（Undo/Redo），作为 UI 与 Sudoku 之间的协调者。
- **历史存储策略**：存储 `Sudoku` 完整快照（clone），而非存储 Move。理由：
  - 简单可靠，无需重放 Move 序列。
  - 9x9 网格很小，内存开销可忽略。
  - 避免了 Move 应用时的副作用和复杂合并。
- **关键接口**：
  - `guess(move)` 修改当前盘面并自动保存快照。
  - `undo()/redo()` 切换历史索引，替换当前 Sudoku。
  - `canUndo()/canRedo()` 判断是否可用。
  - `toJSON()` 序列化整个游戏（包含历史记录）。

### 3. Move (值对象)
- 只是一个普通对象 `{ row, col, value }`，不作为核心领域对象，因为历史不依赖它。

## 二、Svelte 接入方案 (Store Adapter)

### 1. 为什么需要 Adapter？
- 领域对象 `Game` 和 `Sudoku` 是普通类，不包含 Svelte 响应式机制。
- 直接修改 `game` 内部状态不会触发 UI 更新。
- Adapter 负责将领域对象的状态转换为响应式 store，并暴露操作方法。

### 2. 实现：`createGameStore`
- 内部持有 `Game` 实例。
- 使用 Svelte 的 `writable` store 存储 UI 所需状态（grid, won, canUndo等）。
- 每次调用 `guess/undo/redo` 后，手动调用 `refresh()` 重新读取领域对象状态并更新 store。
- UI 通过 `$gameStore` 自动订阅，store 更新时组件重新渲染。

### 3. 响应式原理
- Svelte 的 `writable` store 在 `set` 或 `update` 时会通知所有订阅者。
- 组件中使用 `$gameStore` 语法自动生成订阅代码，当 store 值变化时，Svelte 重新执行组件的渲染函数。
- 关键点：**必须通过 store 的 set 触发更新**，直接修改领域对象不会通知 Svelte。

### 4. 为什么不能直接 mutate 对象？
- 例如：`game.getSudoku().grid[0][0] = 5` 不会触发任何 store 更新，UI 无变化。
- 必须通过 store 提供的方法（guess/undo/redo）来改变状态，这些方法内部会调用 `refresh()` 更新 store。

## 三、改进说明 (相比 HW1)

### HW1 中的问题
- 领域对象存在但 UI 未真正使用，组件直接操作数组。
- Undo/Redo 逻辑散落在组件中。

### 本次改进
1. **明确职责边界**：Sudoku 只负责盘面数据，Game 负责历史管理，UI 只通过 Adapter 与领域交互。
2. **历史存储改为快照**：原来存储 Move 需要重放，容易出错；现在存储 Sudoku 克隆，简单可靠。
3. **接入方式**：通过 Store Adapter 将领域对象包装为响应式数据，UI 完全不直接接触 Sudoku/Game 内部方法，只调用 adapter 的 guess/undo/redo。
4. **序列化增强**：Game 的 toJSON 包含完整历史，可完全恢复游戏会话。

## 四、响应式边界与 Trade-off

- **对 UI 可见的状态**：grid, won, canUndo, canRedo（由 adapter 派生）。
- **不可见的状态**：history 数组、currentIndex、Sudoku 内部实现细节。
- **Trade-off**：快照存储导致历史记录占用内存稍大，但 9x9 非常小（每快照 ~81 数字），可接受。优点是实现简单，无 bug 风险。

## 五、未来迁移到 Svelte 5 的考虑

- 最稳定层：`Sudoku` 和 `Game` 领域对象（与框架无关）。
- 最可能改动层：`gameStore.js`，Svelte 5 的 runes 可以简化响应式包装，但 adapter 模式依然可以保留。
