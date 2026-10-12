// --- ВСТАВИТЬ В САМЫЙ ВЕРХ ФАЙЛА ---
const peer = new Peer(); 
let conn = null;
let mySymbol = '';     // 'X' або 'O'
let myTurn = false;    // Чи можна зараз ходити
const boardElement = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('status');
const menu = document.getElementById('menu');
const gameArea = document.getElementById('game-area');
const aiSettings = document.getElementById('ai-settings');

let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameActive = true;
let mode = ""; // "player" или "ai"
let difficulty = "easy";

const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Ряды
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Колонки
    [0, 4, 8], [2, 4, 6]             // Диагонали
];

// Инициализация кнопок меню
document.getElementById('btn-vs-player').addEventListener('click', () => startGame('player'));
document.getElementById('btn-vs-ai').addEventListener('click', () => {
// Пример вашей функции клика (найдите похожую у себя):
cell.addEventListener('click', (e) => {
    const index = e.target.getAttribute('data-index'); // или id клетки

    // 1. ДОБАВИТЬ ЭТУ СТРОКУ В НАЧАЛО КЛИКА:
    // Если не наш ход, нет сети или клетка занята — игнорируем клик
    if (!myTurn || !conn || gameState[index] !== '') return;

    // ... Тут остается ВАШ старый код, который рисует крестик/нолик на экране ...
    // Например: e.target.innerText = mySymbol;

    // 2. ДОБАВИТЬ ЭТУ СТРОКУ ПОСЛЕ ОТРИСОВКИ ХОДА:
    // Отправляем этот ход другу по сети
    conn.send({ type: 'move', index: index, symbol: mySymbol });

    // 3. ДОБАВИТЬ ЭТИ СТРОКИ:
    myTurn = false; // Передаем ход
    document.getElementById('status').innerText = "Очікування ходу суперника...";
    
    // ... Тут ваш код проверки победы (например, checkWin()) ...
});

    aiSettings.classList.remove('hidden');
    document.getElementById('btn-vs-player').classList.add('hidden');
    document.getElementById('btn-vs-ai').classList.add('hidden');
});
document.getElementById('start-ai-game').addEventListener('click', () => {
    difficulty = document.getElementById('difficulty').value;
    startGame('ai');
});
document.getElementById('btn-restart').addEventListener('click', resetBoard);
document.getElementById('btn-back').addEventListener('click', showMenu);

function startGame(selectedMode) {
    mode = selectedMode;
    menu.classList.add('hidden');
    gameArea.classList.remove('hidden');
    resetBoard();
}

function showMenu() {
    gameArea.classList.add('hidden');
    menu.classList.remove('hidden');
    aiSettings.classList.add('hidden');
    document.getElementById('btn-vs-player').classList.remove('hidden');
    document.getElementById('btn-vs-ai').classList.remove('hidden');
}

cells.forEach(cell => cell.addEventListener('click', handleCellClick));

function handleCellClick(e) {
    const clickedCell = e.target;
    const clickedIndex = parseInt(clickedCell.getAttribute('data-index'));

    if (board[clickedIndex] !== "" || !gameActive) return;

    makeMove(clickedIndex, currentPlayer);
    checkResult();

    if (gameActive && mode === 'ai' && currentPlayer === "O") {
        setTimeout(makeAIMove, 300); // Небольшая задержка для реалистичности
    }
}

function makeMove(index, player) {
    board[index] = player;
    cells[index].innerText = player;
    cells[index].classList.add(player.toLowerCase());
    currentPlayer = player === "X" ? "O" : "X";
    if (gameActive) statusText.innerText = `Хід гравця ${currentPlayer}`;
}

function checkResult() {
    let roundWon = false;
    for (let i = 0; i < winningConditions.length; i++) {
        const [a, b, c] = winningConditions[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            roundWon = true;
            break;
        }
    }

    if (roundWon) {
        statusText.innerText = `Гравець ${currentPlayer === "X" ? "O" : "X"} переміг!`;
        gameActive = false;
        return;
    }

    if (!board.includes("")) {
        statusText.innerText = "Нічия!";
        gameActive = false;
        return;
    }
}

function resetBoard() {
    board = ["", "", "", "", "", "", "", "", ""];
    currentPlayer = "X";
    gameActive = true;
    statusText.innerText = `Хід гравця X`;
    cells.forEach(cell => {
        cell.innerText = "";
        cell.classList.remove('x', 'o');
    });
}

// --- Логика ИИ ---
function makeAIMove() {
    let bestMove;
    const availableEmptyCells = board.map((val, idx) => val === "" ? idx : null).filter(val => val !== null);

    if (difficulty === "easy") {
        // Случайный ход
        bestMove = availableEmptyCells[Math.floor(Math.random() * availableEmptyCells.length)];
    } else if (difficulty === "medium") {
        // 50% шанс сделать идеальный ход, 50% - случайный
        if (Math.random() > 0.5) {
            bestMove = minimax(board, "O").index;
        } else {
            bestMove = availableEmptyCells[Math.floor(Math.random() * availableEmptyCells.length)];
        }
    } else {
        // Сложный (Алгоритм Minimax) - всегда идеальный ход
        bestMove = minimax(board, "O").index;
    }

    makeMove(bestMove, "O");
    checkResult();
}

// Алгоритм Minimax для сложного ИИ
function minimax(newBoard, player) {
    const availSpots = newBoard.map((val, idx) => val === "" ? idx : null).filter(val => val !== null);

    if (checkWinning(newBoard, "X")) return { score: -10 };
    else if (checkWinning(newBoard, "O")) return { score: 10 };
    else if (availSpots.length === 0) return { score: 0 };

    const moves = [];
    for (let i = 0; i < availSpots.length; i++) {
        const move = {};
        move.index = availSpots[i];
        newBoard[availSpots[i]] = player;

        if (player === "O") {
            move.score = minimax(newBoard, "X").score;
        } else {
            move.score = minimax(newBoard, "O").score;
        }

        newBoard[availSpots[i]] = "";
        moves.push(move);
    }

    let bestMove;
    if (player === "O") {
        let bestScore = -10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score > bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    } else {
        let bestScore = 10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score < bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    }
    return moves[bestMove];
}

// Вспомогательная функция для Minimax
function checkWinning(board, player) {
    return winningConditions.some(condition => 
        board[condition[0]] === player && 
        board[condition[1]] === player && 
        board[condition[2]] === player
    );
}
// --- ВСТАВИТЬ В САМЫЙ КОНЕЦ ФАЙЛА ---

const statusEl = document.getElementById('status');

// Получаем ваш ID от сервера и выводим на экран
peer.on('open', (id) => {
    document.getElementById('my-id').innerText = id;
    statusEl.innerText = "Надішліть свій ID другу або введіть ID друга для початку гри.";
});

// Логика для Игрока 1 (к вам подключился друг)
peer.on('connection', (connection) => {
    conn = connection;
    mySymbol = 'X'; 
    myTurn = true;  
    statusEl.innerText = "Друг підключився! Ваш хід (Х)";
    setupNetworkListeners();
});

// Логика для Игрока 2 (вы подключаетесь по кнопке)
function connectToFriend() {
    const friendId = document.getElementById('friend-id').value.trim();
    if (!friendId) return alert("Будь ласка, введіть ID!");
    
    conn = peer.connect(friendId); 
    mySymbol = 'O'; 
    myTurn = false; 
    statusEl.innerText = "Підключення... Очікування ходу суперника (Х)";
    setupNetworkListeners();
}

// Прием хода от друга по сети
function setupNetworkListeners() {
    conn.on('data', (data) => {
        if (data.type === 'move') {
            // ВЫЗЫВАЕМ ВАШУ ФУНКЦИЮ ОТРИСОВКИ ХОДА СУПЕРНИКА
            // Передаем индекс клетки data.index и его символ data.symbol
            makeMove(data.index, data.symbol); 
            
            myTurn = true; 
            statusEl.innerText = `Ваш хід (${mySymbol})`;
            
            // ВЫЗЫВАЕМ ВАШУ ФУНКЦИЮ ПРОВЕРКИ КОНЦА ИГРЫ
            checkGameEnd(); 
        }
    });
}
