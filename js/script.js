// --- Глобальные переменные для сети ---
const peer = new Peer(); 
let conn = null;
let mySymbol = '';     // 'X' або 'O'
let myTurn = false;    // Чи можна зараз ходити онлайн

// --- Элементы интерфейса ---
const boardElement = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('game-status'); // Для игрового поля
const netStatusEl = document.getElementById('net-status'); // Для панели онлайна
const menu = document.getElementById('menu');
const gameArea = document.getElementById('game-area');
const aiSettings = document.getElementById('ai-settings');

let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameActive = true;
let mode = ""; // "player", "ai" или "online"
let difficulty = "easy";

const winningConditions = [, [3, 4, 5], [6, 7, 8], // Ряды, [1, 4, 7], [2, 5, 8], // Колонки, [2, 4, 6]             // Диагонали
];

// Инициализация кнопок меню
document.getElementById('btn-vs-player').addEventListener('click', () => startGame('player'));
document.getElementById('btn-vs-ai').addEventListener('click', () => {
    aiSettings.classList.remove('hidden');
    document.getElementById('btn-vs-player').classList.add('hidden');
    document.getElementById('btn-vs-ai').classList.add('hidden');
});
document.getElementById('start-ai-game').addEventListener('click', () => {
    difficulty = document.getElementById('difficulty').value;
    startGame('ai');
});
document.getElementById('btn-restart').addEventListener('click', () => {
    if (mode === 'online') {
        // В онлайн-режиме сброс поля синхронизируем (опционально можно добавить отправку события)
        return alert("В онлайн-режимі перезапуск недоступний, створіть нову кімнату.");
    }
    resetBoard();
});
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

// Навешиваем событие клика на клетки
cells.forEach(cell => cell.addEventListener('click', handleCellClick));

function handleCellClick(e) {
    const clickedCell = e.target;
    const clickedIndex = parseInt(clickedCell.getAttribute('data-index'));

    // Если клетка занята или игра окончена — ничего не делаем
    if (board[clickedIndex] !== "" || !gameActive) return;

    // ЕСЛИ ИГРАЕМ ОНЛАЙН С ДРУГОМ
    if (mode === 'online') {
        if (!myTurn || !conn) return; // Если сейчас не наш ход — блокируем клик

        makeMove(clickedIndex, mySymbol);
        
        // Отправляем ход другу по сети
        conn.send({ type: 'move', index: clickedIndex, symbol: mySymbol });

        myTurn = false; 
        netStatusEl.innerText = "Очікування ходу суперника...";
        checkResult();
    } 
    // ЕСЛИ ИГРАЕМ ЛОКАЛЬНО ИЛИ С ИИ
    else {
        makeMove(clickedIndex, currentPlayer);
        checkResult();

        if (gameActive && mode === 'ai' && currentPlayer === "O") {
            setTimeout(makeAIMove, 300); 
        }
    }
}

function makeMove(index, player) {
    board[index] = player;
    cells[index].innerText = player;
    cells[index].classList.add(player.toLowerCase());
    
    // Переключаем игрока для локального режима
    currentPlayer = player === "X" ? "O" : "X";
    if (gameActive && mode !== 'online') {
        statusText.innerText = `Хід гравця ${currentPlayer}`;
    }
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
        // Определяем кто победил, основываясь на режиме
        let winner = "";
        if (mode === 'online') {
            // Если выиграл тот символ, который сходил последним перед проверкой
            winner = myTurn ? (mySymbol === 'X' ? 'O' : 'X') : mySymbol;
        } else {
            winner = currentPlayer === "X" ? "O" : "X";
        }
        statusText.innerText = `Гравець ${winner} переміг! 🎉`;
        gameActive = false;
        return;
    }

    if (!board.includes("")) {
        statusText.innerText = "Нічия! 🤝";
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
        bestMove = availableEmptyCells[Math.floor(Math.random() * availableEmptyCells.length)];
    } else if (difficulty === "medium") {
        if (Math.random() > 0.5) {
            bestMove = minimax(board, "O").index;
        } else {
            bestMove = availableEmptyCells[Math.floor(Math.random() * availableEmptyCells.length)];
        }
    } else {
        bestMove = minimax(board, "O").index;
    }

    makeMove(bestMove, "O");
    checkResult();
}

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

function checkWinning(board, player) {
    return winningConditions.some(condition => 
        board[condition[0]] === player && 
        board[condition[1]] === player && 
        board[condition[2]] === player
    );
}

// --- СЕТЕВАЯ ЛОГИКА PEERJS ---

// 1. Получаем ID от сигнального сервера
peer.on('open', (id) => {
    document.getElementById('my-id').innerText = id;
    netStatusEl.innerText = "Надішліть свій ID другу або введіть ID друга для гри онлайн.";
});

// 2. Игрок 1: К нам подключается друг
peer.on('connection', (connection) => {
    conn = connection;
    mySymbol = 'X'; 
    myTurn = true;  
    mode = 'online';
    
    // Перекидываем игрока сразу в игру
    menu.classList.add('hidden');
    gameArea.classList.remove('hidden');
    resetBoard();

    statusText.innerText = "Гра онлайн. Ваш хід (Х)";
    netStatusEl.innerText = "Друг підключився!";
    setupNetworkListeners();
});

// 3. Игрок 2: Мы сами подключаемся по кнопке
function connectToFriend() {
    const friendId = document.getElementById('friend-id').value.trim();
    if (!friendId) return alert("Будь ласка, введіть ID!");
    
    conn = peer.connect(friendId); 
    mySymbol = 'O'; 
    myTurn = false; 
    mode = 'online';

    menu.classList.add('hidden');
    gameArea.classList.remove('hidden');
    resetBoard();

    statusText.innerText = "Гра онлайн. Очікування ходу суперника (Х)";
    netStatusEl.innerText = "Підключення до друга...";
    setupNetworkListeners();
}

// 4. Слушаем ходы по сети
function setupNetworkListeners() {
    conn.on('data', (data) => {
        if (data.type === 'move') {
            makeMove(data.index, data.symbol); 
            myTurn = true; 
            statusText.innerText = `Ваш хід (${mySymbol})`;
            netStatusEl.innerText = "Суперник зробив хід.";
            checkResult(); 
        }
    });

    conn.on('close', () => {
        netStatusEl.innerText = "Суперник відключився від мережі 🔌";
        gameActive = false;
    });
}

