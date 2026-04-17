# con-oo-Rosa-cher - Review

## Review 结论

当前提交有基础的类封装、clone 和快照式 undo/redo，但领域模型没有真正承担数独业务规则，Svelte 侧也没有形成可工作的单一路径。整体更像“新增了一套尚未落地的 domain 代码”，未满足作业要求中“真实界面必须消费领域对象”的核心目标。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | poor |
| Sudoku Business | poor |
| OOD | poor |

## 缺点

### 1. 真实游戏流程仍绕过 Game/Sudoku 直接走旧逻辑

- 严重程度：core
- 位置：src/components/Controls/Keyboard.svelte:10-25, src/components/Header/Dropdown.svelte:11-23, src/components/Modal/Types/Welcome.svelte:16-24
- 原因：用户输入、开始新局、加载自定义题目等关键流程仍直接调用 `userGrid.set(...)`、`startNew(...)`、`startCustom(...)` 这一套旧 API，而不是统一经由 `Game` / `Sudoku`。这说明领域对象没有成为 UI 的核心入口，直接违反作业最重要的接入要求。

### 2. 领域模型没有吸收数独业务约束和校验职责

- 严重程度：core
- 位置：src/domain/index.js:12-17, src/domain/index.js:41-88
- 原因：`Sudoku.guess(...)` 只是盲写单元格，没有建模题面 givens、行列宫冲突校验、胜利判定，也没有向外提供无效格信息。相反，校验/胜负逻辑仍散落在旧 store 中，导致数独业务规则没有落在领域对象里，OOP 和业务建模都偏空心化。

### 3. Game 与 Store Adapter 的接口契约不一致

- 严重程度：core
- 位置：src/domain/index.js:52-59, src/stores/gameStore.js:28-47
- 原因：`createGameStore()` 调用了 `game.getInvalidCells()` 和 `game.isWon()`，但 `Game` 类并没有这些方法；同时 `gameStore.guess()` 依赖 `game.guess()` 返回 success 布尔值，而当前 `Game.guess()` 没有返回值。按这条调用链静态分析，adapter 既拿不到完整视图状态，也无法在猜测后正确刷新 UI。

### 4. 新的 Svelte 接入层本身静态上就不成立

- 严重程度：core
- 位置：src/App.svelte:4-24, src/stores/gameStore.js:13-20, src/stores/gameStore.js:76-80
- 原因：`App.svelte` 引入了仓库中不存在的 `./components/Grid.svelte` 和 `./stores/difficulty`；`createGameStore()` 又在 ESM 模块里使用 `require(...)` 去加载并不存在的相对路径；更关键的是它返回的对象虽然声明了 `subscribe`，但实现是空的，却又在 `App.svelte` 里被当作可 `$gameStore` 消费的标准 store 使用。当前这条“新接入”路径在模块解析、store contract 和响应式消费三个层面都不稳固。

### 5. Game 暴露了可变的当前 Sudoku，破坏职责边界

- 严重程度：major
- 位置：src/domain/index.js:48-59
- 原因：`getSudoku()` 直接返回内部 `_current` 对象，而 `Sudoku` 本身又是可变的；调用方完全可以通过 `game.getSudoku().guess(...)` 绕过 `Game.guess()`，从而跳过历史管理。这样会让 undo/redo 的一致性依赖“调用方自觉”，不是一个稳健的 OOD 边界。

### 6. 序列化协议不清晰，反序列化逻辑带有猜测性

- 严重程度：minor
- 位置：src/domain/index.js:81-98
- 原因：`Game.toJSON()` 输出 `{ sudoku }`，而 `createSudokuFromJSON()` 却同时接受原始数组、`json.current` 和其他不明结构。领域对象对外的数据契约不够明确，后续一旦要扩展历史、题面初始状态或元数据，兼容性会比较差。

## 优点

### 1. 基础状态做了防御性复制

- 位置：src/domain/index.js:4-10, src/domain/index.js:19-20
- 原因：`Sudoku` 在构造、`getGrid()` 和 `clone()` 时都复制二维数组，避免了最直接的外部引用污染，这是领域对象封装的一个正确起点。

### 2. Undo/Redo 的快照流转基本正确

- 位置：src/domain/index.js:52-79
- 原因：`Game.guess()` 在新操作前截断 redo 分支，再追加新快照；`undo()` / `redo()` 与 `canUndo()` / `canRedo()` 的配套关系也比较清晰，基本时序语义是成立的。

### 3. 提供了最小可测试的外表化和工厂边界

- 位置：src/domain/index.js:23-37, src/domain/index.js:81-106
- 原因：领域层具备 `toJSON()`、`toString()`、`createSudoku*`、`createGame*` 这一组 API，至少形成了一个清楚的模块入口，便于测试和序列化往返。

## 补充说明

- 本次结论仅基于静态阅读，未运行测试、未运行构建、也未实际打开页面；关于“无法编译”“不会刷新”“流程未接线”的判断来自导入关系、store contract 和调用链的静态分析。
- 评审范围按要求限定在 `src/domain/*` 及其直接相关的 Svelte 接入代码，主要包括 `src/stores/gameStore.js`、`src/App.svelte`，以及当前仍承担游戏流程的相关 Svelte 组件。
- 仓库里同时存在“新 domain + gameStore”和“旧 `@sudoku/*` store/game”两套并行方案；当前代码状态更接近未完成整合，而不是已经完成切换。
