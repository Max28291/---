// Инициализируем сеть PeerJS
const peer = new Peer(); 
let conn = null;
let mySymbol = '';     // 'X' или 'O'
let myTurn = false;    // Можно ли сейчас ходить онлайн
let board = ["", "", "", "", "", "", "", "", ""];

// Элементы интерфейса
const cells = document.querySelectorAll('.cell');
const statusText = document.getElementById('game-status'); 
const netStatusEl = document.getElementById('net-status'); 
const menu = document.getElementById('menu');
const gameArea = document.getElementById('game-area');

// 1. Получаем уникальный ID от сервера
peer.on('open', (id) => {
    document.getElementById('my-id').innerText = id;
    if(netStatusEl) netStatusEl.innerText = "ID успішно створено! Надішліть його другу.";
});

// 2. Логика Игрока 1 (Создатель комнаты)
peer.on('connection', (connection) => {
    conn = connection;
    mySymbol = 'X'; 
    myTurn = true;  
    
    if(menu) menu.classList.add('hidden');
    if(gameArea) gameArea.classList.remove('hidden');
    
    statusText.innerText = "Гра онлайн. Ваш хід (Х)";
    if(netStatusEl) netStatusEl.innerText = "Друг підключився! Ви граєте за (Х).";
    
    setupNetworkListeners();
});

// 3. Логика Игрока 2 (Кто подключается по кнопке)
function connectToFriend() {
    const friendId = document.getElementById('friend-id').value.trim();
    if (!friendId) return alert("Введіть ID друга!");
    
    conn = peer.connect(friendId); 
    mySymbol = 'O'; 
    myTurn = false; 

    if(menu) menu.classList.add('hidden');
    if(gameArea) gameArea.classList.remove('hidden');

    statusText.innerText = "Гра онлайн. Очікування ходу суперника (Х)";
    if(netStatusEl) netStatusEl.innerText = "Підключення... Ви граєте за (О).";
    
    setupNetworkListeners();
}

// 4. Прием ходов по сети
function setupNetworkListeners() {
    conn.on('data', (data) => {
        if (data.type === 'move') {
            const idx = parseInt(data.index);
            
            board[idx] = data.symbol;
            cells[idx].innerText = data.symbol;
            cells[idx].classList.add(data.symbol.toLowerCase());
            
            myTurn = true; 
            statusText.innerText = `Ваш хід (${mySymbol})`;
            if(netStatusEl) netStatusEl.innerText = "Суперник зробив свій хід.";
            checkOnlineResult(); 
        }
    });

    conn.on('close', () => {
        if(netStatusEl) netStatusEl.innerText = "Суперник відключився 🔌";
        myTurn = false;
    });
}

// 5. Обработка клика по игровому полю
cells.forEach(cell => {
    cell.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));

        if (!conn || !myTurn || board[index] !== '') return;

        board[index] = mySymbol;
        e.target.innerText = mySymbol;
        e.target.classList.add(mySymbol.toLowerCase());
        
        conn.send({ type: 'move', index: index, symbol: mySymbol });

        myTurn = false; 
        statusText.innerText = "Очікування ходу суперника...";
        checkOnlineResult();
    });
});

// Простая и надежная проверка победы без скрытых массивов
function checkOnlineResult() {
    let won = false;

    // Расписываем все 8 комбинаций вручную, чтобы разметка системы ничего не урезала
    if (board[0] !== "" && board[0] === board[1] && board[0] === board[2]) won = true;
    if (board[3] !== "" && board[3] === board[4] && board[3] === board[5]) won = true;
    if (board[6] !== "" && board[6] === board[7] && board[6] === board[8]) won = true;
    if (board[0] !== "" && board[0] === board[3] && board[0] === board[6]) won = true;
    if (board[1] !== "" && board[1] === board[4] && board[1] === board[7]) won = true;
    if (board[2] !== "" && board[2] === board[5] && board[2] === board[8]) won = true;
    if (board[0] !== "" && board[0] === board[4] && board[0] === board[8]) won = true;
    if (board[2] !== "" && board[2] === board[4] && board[2] === board[6]) won = true;

    if (won) {
        // Так как ход переключается после клика, победитель — это тот, кто НЕ ходит сейчас
        let winner = myTurn ? (mySymbol === 'X' ? 'O' : 'X') : mySymbol;
        statusText.innerText = `Гравець ${winner} переміг! 🎉`;
        myTurn = false;
        return;
    }

    if (!board.includes("")) {
        statusText.innerText = "Нічия! 🤝";
    }
}

// Кнопка «До меню»
document.getElementById('btn-back').addEventListener('click', () => {
    if(gameArea) gameArea.classList.add('hidden');
    if(menu) menu.classList.remove('hidden');
    if(conn) conn.close();
    board = ["", "", "", "", "", "", "", "", ""];
    cells.forEach(c => { c.innerText = ""; c.className = "cell"; });
});

