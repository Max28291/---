// Сетевой движок PeerJS
const peer = new Peer(); 
let conn = null;
let mySymbol = '';     
let myTurn = false;    
let board = ["", "", "", "", "", "", "", "", ""];

// Элементы интерфейса страницы
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('game-status'); 
const netStatusEl = document.getElementById('net-status'); 
const menu = document.getElementById('menu');
const gameArea = document.getElementById('game-area');

// 1. Успешный выход в сеть и генерация ID
peer.on('open', function(id) {
    document.getElementById('my-id').innerText = id;
    if(netStatusEl) netStatusEl.innerText = "ID успішно створено! Надішліть його другу.";
});

// 2. Логика Игрока 1 (Тот, кто создал комнату и ждет друга)
peer.on('connection', function(connection) {
    conn = connection;
    mySymbol = 'X'; 
    myTurn = true;  
    
    if(menu) menu.classList.add('hidden');
    if(gameArea) gameArea.classList.remove('hidden');
    
    if(statusText) statusText.innerText = "Гра онлайн. Ваш хід (Х)";
    if(netStatusEl) netStatusEl.innerText = "Друг підключився! Ви граєте за (Х).";
    
    setupNetworkListeners();
});

// 3. Логика Игрока 2 (Тот, кто вводит ID друга и нажимает кнопку)
function connectToFriend() {
    const friendId = document.getElementById('friend-id').value.trim();
    if (!friendId) return alert("Введіть ID друга!");
    
    conn = peer.connect(friendId); 
    mySymbol = 'O'; 
    myTurn = false; 

    if(menu) menu.classList.add('hidden');
    if(gameArea) gameArea.classList.remove('hidden');

    if(statusText) statusText.innerText = "Гра онлайн. Очікування ходу суперника (Х)";
    if(netStatusEl) netStatusEl.innerText = "Підключення... Ви граєте за (О).";
    
    setupNetworkListeners();
}

// 4. Обработка входящих ходов от соперника
function setupNetworkListeners() {
    conn.on('data', function(data) {
        if (data.type === 'move') {
            const idx = parseInt(data.index);
            
            board[idx] = data.symbol;
            cells[idx].innerText = data.symbol;
            cells[idx].classList.add(data.symbol.toLowerCase());
            
            myTurn = true; 
            if(statusText) statusText.innerText = "Ваш хід (" + mySymbol + ")";
            if(netStatusEl) netStatusEl.innerText = "Суперник зробив свій хід.";
            checkOnlineResult(); 
        }
    });

    conn.on('close', function() {
        if(netStatusEl) netStatusEl.innerText = "Суперник відключився 🔌";
        myTurn = false;
    });
}

// 5. Обработка нажатий на клетки игрового поля
cells.forEach(function(cell) {
    cell.addEventListener('click', function(e) {
        const index = parseInt(e.target.getAttribute('data-index'));

        if (!conn || !myTurn || board[index] !== '') return;

        board[index] = mySymbol;
        e.target.innerText = mySymbol;
        e.target.classList.add(mySymbol.toLowerCase());
        
        conn.send({ type: 'move', index: index, symbol: mySymbol });

        myTurn = false; 
        if(statusText) statusText.innerText = "Очікування ходу суперника...";
        checkOnlineResult();
    });
});

// Простая проверка победы (без массивов и сложных циклов)
function checkOnlineResult() {
    let won = false;

    // Горизонтали
    if (board[0] !== "" && board[0] === board[1] && board[0] === board[2]) won = true;
    if (board[3] !== "" && board[3] === board[4] && board[3] === board[5]) won = true;
    if (board[6] !== "" && board[6] === board[7] && board[6] === board[8]) won = true;
    
    // Вертикали
    if (board[0] !== "" && board[0] === board[3] && board[0] === board[6]) won = true;
    if (board[1] !== "" && board[1] === board[4] && board[1] === board[7]) won = true;
    if (board[2] !== "" && board[2] === board[5] && board[2] === board[8]) won = true;
    
    // Диагонали
    if (board[0] !== "" && board[0] === board[4] && board[0] === board[8]) won = true;
    if (board[2] !== "" && board[2] === board[4] && board[2] === board[6]) won = true;

    if (won) {
        let winner = myTurn ? (mySymbol === 'X' ? 'O' : 'X') : mySymbol;
        if(statusText) statusText.innerText = "Гравець " + winner + " переміг! 🎉";
        myTurn = false;
        return;
    }

    if (!board.includes("")) {
        if(statusText) statusText.innerText = "Нічия! 🤝";
    }
}

// Кнопка выхода в меню
document.getElementById('btn-back').addEventListener('click', function() {
    if(gameArea) gameArea.classList.add('hidden');
    if(menu) menu.classList.remove('hidden');
    if(conn) conn.close();
    board = ["", "", "", "", "", "", "", "", ""];
    cells.forEach(function(c) { c.innerText = ""; c.className = "cell"; });
});
