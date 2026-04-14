import { cloneDeep } from 'lodash'
import { BOX_SIZE, SUDOKU_SIZE } from '../node_modules/@sudoku/constants.js';


class Sudoku {
   
    constructor(grid,initialGrid = null){
        if (!Array.isArray(grid) || grid.length !== SUDOKU_SIZE || !Array.isArray(grid[0]) || grid[0].length !== SUDOKU_SIZE) {
            throw new Error("Invalid Sudoku grid dimensions");
        }
        this.grid=cloneDeep(grid);
        this.initialGrid = initialGrid ? cloneDeep(initialGrid) : cloneDeep(grid);
    }

    
    getGrid(){
        return cloneDeep(this.grid);
    }

   
    guess(move){
        const { row, col, value } = move;

        // 1. 基础边界校验
        if (row < 0 || row > 8 || col < 0 || col > 8) return false;
        if (value < 0 || value > 9) return false; 

        // 2. 修复 Issue 2: 题面保护，不可修改初始固定的数字
        if (this.initialGrid[row][col] !== 0) return false;

        // 3. 修复 Issue 2: 领域规则校验，非法局面直接拒绝写入
        if (!this.isValidMove(row, col, value)) return false;

        // 4. 如果值没有发生实质变化，视为无效操作
        if (this.grid[row][col] === value) return false;

        this.grid[row][col] = value;
        return true; // 执行成功
    }

    
    isValidMove(row, col, value) {
        if (value === 0) return true; // 0 (擦除) 永远合法

        
        for (let i = 0; i < 9; i++) {
            if (i !== col && this.grid[row][i] === value) return false;
            if (i !== row && this.grid[i][col] === value) return false;
        }

        let startRow=Math.floor(row/3)*3;
        let startCol=Math.floor(col/3)*3;
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let r = startRow + i;
                let c = startCol + j;
                if (r !== row && c !== col && this.grid[r][c] === value) {
                    return false;
                }
            }
        }
        return true;
    }

    
    clone(){
        return new Sudoku(cloneDeep(this.grid),cloneDeep(this.initialGrid));
    }

   
    toJSON(){
        return { 
            grid: this.getGrid(),
            initialGrid: cloneDeep(this.initialGrid)
        };
    }

    
    toString() {
        let out = '╔═══════╤═══════╤═══════╗\n';

        for (let row = 0; row < SUDOKU_SIZE; row++) {
            if (row !== 0 && row % BOX_SIZE === 0) {
                out += '╟───────┼───────┼───────╢\n';
            }

            for (let col = 0; col < SUDOKU_SIZE; col++) {
                if (col === 0) {
                    out += '║ ';
                } else if (col % BOX_SIZE === 0) {
                    out += '│ ';
                }

                out += (this.grid[row][col] === 0 ? '·' : this.grid[row][col]) + ' ';

                if (col === SUDOKU_SIZE - 1) {
                    out += '║';
                }
            }

            out += '\n';
        }

        out += '╚═══════╧═══════╧═══════╝';

        return out;
    }
}



class Game {
    
    constructor(sudokuInitial, undoStackInitial = [], redoStackInitial = []) {
        this.cur_sudoku = sudokuInitial.clone();
        this.undoStack = cloneDeep(undoStackInitial);
        this.redoStack = cloneDeep(redoStackInitial);
    }

    getSudoku(){ 
        return this.cur_sudoku.clone(); 
    }

    
    guess(move){ 
        const oldValue = this.cur_sudoku.getGrid()[move.row][move.col];
        
       
        const success = this.cur_sudoku.guess(move);
        
        if (success) {
            this.undoStack.push({
                row: move.row,
                col: move.col,
                oldValue: oldValue,
                newValue: move.value
            });
           
            this.redoStack = [];
        }
    }

    
    undo(){
        if (!this.canUndo()) return;
        let lastMove = this.undoStack.pop();
    
        this.cur_sudoku.guess({row:lastMove.row,col:lastMove.col,value:lastMove.oldValue})
        this.redoStack.push(lastMove);
    }
    

    
    redo(){
        if (!this.canRedo()) return;
        let nextMove = this.redoStack.pop();
      
        this.cur_sudoku.guess({row:nextMove.row,col:nextMove.col,value:nextMove.newValue})
        this.undoStack.push(nextMove);
        
    }

  
    canUndo(){ 
        return this.undoStack.length>0; 
    }

   
    canRedo(){ 
        return this.redoStack.length>0; 
    }

    toJSON(){ 
        return {
            cur_sudoku: this.cur_sudoku.toJSON(),
            undoStack: this.undoStack.map(m => ({...m})),
            redoStack: this.redoStack.map(m => ({...m}))
        };
    }
}


export function createSudoku(input){
    return new Sudoku(input);
}


export function createSudokuFromJSON(json){

    return new Sudoku(json.grid, json.initialGrid);
}



export function createGame({ sudoku }){
    return new Game(sudoku);
}


export function createGameFromJSON(json) {
    let sudokuInitial = createSudokuFromJSON(json.cur_sudoku);
    let undoStack = json.undoStack.map(m => ({...m}));
    let redoStack = json.redoStack.map(m => ({...m}));

    return new Game(sudokuInitial, undoStack, redoStack);
}
