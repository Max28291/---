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

// 2. Логика Игрока 1 (Создатель комнаты — ждет подключения друга)
peer.on('connection', (connection) => {
    conn = connection;
    mySymbol = 'X'; // Создатель всегда X
    myTurn = true;  // И ходит первым!
    
    // Принудительно открываем игровое поле у Создателя комнаты
    if(menu) menu.classList.add('hidden');
    if(gameArea) gameArea.classList.remove('hidden');
    
    statusText.innerText = "Гра онлайн. Ваш хід (Х)";
    if(netStatusEl) netStatusEl.innerText = "Друг підключився! Ви граєте за (Х).";
    
    setupNetworkListeners();
});

// 3. Логика Игрока 2 (Кто вводит ID друга и нажимает кнопку)
function connectToFriend() {
    const friendId = document.getElementById('friend-id').value.trim();
    if (!friendId) return alert("Введіть ID друга!");
    
    conn = peer.connect(friendId); 
    mySymbol = 'O'; // Подключившийся всегда O
    myTurn = false; // И ждет первого хода соперника

    // Принудительно открываем игровое поле у Гостя
    if(menu) menu.classList.add('hidden');
    if(gameArea) gameArea.classList.remove('hidden');

    statusText.innerText = "Гра онлайн. Очікування ходу суперника (Х)";
    if(netStatusEl) netStatusEl.innerText = "Підключення до друга... Ви граєте за (О).";
    
    setupNetworkListeners();
}

// 4. Прием ходов по сети
function setupNetworkListeners() {
    // Принимаем ход от соперника
    conn.on('data', (data) => {
        if (data.type === 'move') {
            const idx = parseInt(data.index);
            
            // Записываем ход соперника на своем экране
            board[idx] = data.symbol;
            cells[idx].innerText = data.symbol;
            cells[idx].classList.add(data.symbol.toLowerCase());
            
            // Разблокируем наш ход!
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

        // Проверяем условия перед ходом
        if (!conn) return; // Нет сети
        if (!myTurn) return; // Не наш ход!
        if (board[index] !== '') return; // Клетка уже занята

        // Рисуем свой ход у себя на экране
        board[index] = mySymbol;
        e.target.innerText = mySymbol;
        e.target.classList.add(mySymbol.toLowerCase());
        
        // Моментально отправляем данные о ходе другу по сети
        conn.send({ type: 'move', index: index, symbol: mySymbol });

        // Блокируем свое поле до тех пор, пока друг не ответит ходом
        myTurn = false; 
        statusText.innerText = "Очікування ходу суперника...";
        checkOnlineResult();
    });
});

// Проверка победы или ничьей
function checkOnlineResult() {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Ряды
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Колонки
        [0, 4, 8], [2, 4, 6]             // Диагонали
    ];
    
    let won = false;
    for (let combo of wins) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            won = true;
            statusText.innerText = `Гравець ${board[a]} переміг! 🎉`;
            myTurn = false;
            break;
        }
    }
    if (!won && !board.includes("")) {
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
