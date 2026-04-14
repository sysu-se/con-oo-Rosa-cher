<!-- src/App.svelte -->
<script>
  import { onMount } from 'svelte';
  import { createGameStore } from './stores/gameStore';
  import Grid from './components/Grid.svelte';
  import { difficulty } from './stores/difficulty'; // 原有难度 store（可保留或替换）

  // 创建游戏 store
  let gameStore;

  // 初始化：根据当前难度创建
  $: currentDifficulty = $difficulty; // 假设 difficulty 是 store
  $: {
    if (currentDifficulty) {
      gameStore = createGameStore({ difficulty: currentDifficulty });
    }
  }

  // 暴露给子组件的状态
  $: grid = $gameStore?.grid || [];
  $: invalidCells = $gameStore?.invalidCells || [];
  $: won = $gameStore?.won || false;
  $: canUndo = $gameStore?.canUndo || false;
  $: canRedo = $gameStore?.canRedo || false;

  function handleGuess(row, col, value) {
    gameStore?.guess(row, col, value);
  }

  function handleUndo() {
    gameStore?.undo();
  }

  function handleRedo() {
    gameStore?.redo();
  }

  function handleNewGame() {
    gameStore?.newGame($difficulty);
  }
</script>

<main>
  {#if gameStore}
    <Grid {grid} {invalidCells} onGuess={handleGuess} />
    <div class="controls">
      <button on:click={handleUndo} disabled={!canUndo}>Undo</button>
      <button on:click={handleRedo} disabled={!canRedo}>Redo</button>
      <button on:click={handleNewGame}>New Game</button>
    </div>
    {#if won}
      <div class="win-message">You won!</div>
    {/if}
  {/if}
</main>
