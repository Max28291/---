// --- Чистый автономный онлайн (без внешних библиотек) ---
let conn = null;
let mySymbol = '';     // 'X' або 'O'
let myTurn = false;    // Чи можна зараз ходити онлайн
let myId = Math.random().toString(36).substring(2, 8).toUpperCase(); // Генерируем ID сами!

// --- Элементы интерфейса ---
const boardElement = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('game-status'); 
const netStatusEl = document.getElementById('net-status'); 
const menu = document.getElementById('menu');
const gameArea = document.getElementById('game-area');
const aiSettings = document.getElementById('ai-settings');

let board = ["", "", "", "", "", "", "", "", ""];
let currentPlayer = "X";
let gameActive = true;
let mode = ""; 
let difficulty = "easy";

const winningConditions = [, [3, 4, 5], [6, 7, 8],
, [1, 4, 7], [2, 5, 8],
, [2, 4, 6]
];

// Показываем сгенерированный ID на экране сразу!
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('my-id').innerText = myId;
    netStatusEl.innerText = "ID успішно створено. Надішліть його другу!";
});

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
    if (mode === 'online') return alert("В онлайн-режимі перезапуск недоступний.");
    resetBoard();
});
document.getElementById('btn-back').addEventListener('click', showMenu);

cells.forEach(cell => cell.addEventListener('click', handleCellClick));

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

function handleCellClick(e) {
    const clickedCell = e.target;
    const clickedIndex = parseInt(clickedCell.getAttribute('data-index'));

    if (board[clickedIndex] !== "" || !gameActive) return;

    if (mode === 'online') {
        if (!myTurn || !conn) return;

        makeMove(clickedIndex, mySymbol);
        
        // Отправляем ход через бесплатный веб-канал
        fetch(`https://kvdb.io{myId}-move`, {
            method: 'POST',
            body: JSON.stringify({ index: clickedIndex, symbol: mySymbol })
        });

        myTurn = false; 
        netStatusEl.innerText = "Очікування ходу суперника...";
        checkResult();
    } else {
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
        let winner = mode === 'online' ? (myTurn ? (mySymbol === 'X' ? 'O' : 'X') : mySymbol) : (currentPlayer === "X" ? "O" : "X");
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

// --- Логика ИИ (Твой Минимакс) ---
function makeAIMove() {
    let bestMove;
    const availableEmptyCells = board.map((val, idx) => val === "" ? idx : null).filter(val => val !== null);
    if (difficulty === "easy") {
        bestMove = availableEmptyCells[Math.floor(Math.random() * availableEmptyCells.length)];
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
        if (player === "O") move.score = minimax(newBoard, "X").score;
        else move.score = minimax(newBoard, "O").score;
        newBoard[availSpots[i]] = "";
        moves.push(move);
    }

    let bestMove;
    if (player === "O") {
        let bestScore = -10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score > bestScore) { bestScore = moves[i].score; bestMove = i; }
        }
    } else {
        let bestScore = 10000;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score < bestScore) { bestScore = moves[i].score; bestMove = i; }
        }
    }
    return moves[bestMove];
}

function checkWinning(board, player) {
    return winningConditions.some(cond => board[cond[0]] === player && board[cond[1]] === player && board[cond[2]] === player);
}

// --- НОВАЯ СЕТЕВАЯ ЛОГИКА НА ЧИСТОМ JS ---
let friendId = "";

// Подключение к другу
function connectToFriend() {
    friendId = document.getElementById('friend-id').value.trim().toUpperCase();
    if (!friendId) return alert("Введіть ID!");

    mySymbol = 'O';
    myTurn = false;
    mode = 'online';
    conn = true;

    startGame('online');
    statusText.innerText = "Гра онлайн. Очікування ходу суперника (Х)";
    netStatusEl.innerText = "Підключено до друга!";

    // Сигнализируем другу, что мы зашли
    fetch(`https://kvdb.io{friendId}-join`, { method: 'POST', body: myId });

    // Начинаем слушать ходы
    setInterval(listenForMoves, 1000);
}

// Ожидание подключения друга (для Игрока 1)
setInterval(() => {
    if (mode === 'online' || conn) return;
    
    fetch(`https://kvdb.io{myId}-join`)
    .then(res => res.text())
    .then(data => {
        if (data && data.length === 6) {
            friendId = data;
            mySymbol = 'X';
            myTurn = true;
            mode = 'online';
            conn = true;
            startGame('online');
            statusText.innerText = "Гра онлайн. Ваш хід (Х)";
            netStatusEl.innerText = "Друг підключився!";
            setInterval(listenForMoves, 1000);
        }
    }).catch(() => {});
}, 2000);

// Слушаем входящие ходы
let lastMoveTime = 0;
function listenForMoves() {
    if (!conn || myTurn) return;

    fetch(`https://kvdb.io{friendId}-move`)
    .then(res => res.json())
    .then(data => {
        if (data && data.symbol !== mySymbol && board[data.index] === "") {
            makeMove(data.index, data.symbol);
            myTurn = true;
            statusText.innerText = `Ваш хід (${mySymbol})`;
            netStatusEl.innerText = "Суперник зробив хід.";
            checkResult();
        }
    }).catch(() => {});
}
