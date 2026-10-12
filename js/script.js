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
    
    // Переключаем экраны меню на игру
    if(menu) menu.classList.add('hidden');
    if(gameArea) gameArea.classList.remove('hidden');
    
    statusText.innerText = "Гра онлайн. Ваш хід (Х)";
    if(netStatusEl) netStatusEl.innerText = "Друг підключився!";
    
    setupNetworkListeners();
});

// 3. Логика Игрока 2 (Кто вводит ID друга и нажимает кнопку)
function connectToFriend() {
    const friendId = document.getElementById('friend-id').value.trim();
    if (!friendId) return alert("Введіть ID друга!");
    
    conn = peer.connect(friendId); 
    mySymbol = 'O'; // Подключившийся всегда O
    myTurn = false; // И ждет первого хода соперника

    if(menu) menu.classList.add('hidden');
    if(gameArea) gameArea.classList.remove('hidden');

    statusText.innerText = "Гра онлайн. Очікування ходу суперника (Х)";
    if(netStatusEl) netStatusEl.innerText = "Підключення до друга...";
    
    setupNetworkListeners();
}

// 4. Прием ходов по сети
function setupNetworkListeners() {
    // Этот код сработает у Игрока 2, когда связь установится полностью
    conn.on('open', () => {
        if(mySymbol === 'O') {
            if(netStatusEl) netStatusEl.innerText = "Успішно підключено до друга!";
        }
    });

    // Принимаем ход от соперника
    conn.on('data', (data) => {
        if (data.type === 'move') {
            const idx = data.index;
            board[idx] = data.symbol;
            cells[idx].innerText = data.symbol;
            cells[idx].classList.add(data.symbol.toLowerCase());
            
            myTurn = true; // Теперь наш ход!
            statusText.innerText = `Ваш хід (${mySymbol})`;
            if(netStatusEl) netStatusEl.innerText = "Суперник зробив хід.";
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

        // Блокируем клик, если:
        // - не наш ход
        // - нет сетевого соединения
        // - клетка уже занята
        if (!myTurn || !conn || board[index] !== '') return;

        // Рисуем свой ход на своем экране
        board[index] = mySymbol;
        e.target.innerText = mySymbol;
        e.target.classList.add(mySymbol.toLowerCase());
        
        // Отправляем данные о ходе другу по сети
        conn.send({ type: 'move', index: index, symbol: mySymbol });

        myTurn = false; // Передаем ход сопернику
        statusText.innerText = "Очікування ходу суперника...";
        checkOnlineResult();
    });
});

// Проверка победы или ничьей
function checkOnlineResult() {
    const wins = [, [3, 4, 5], [6, 7, 8], // Ряды, [1, 4, 7], [2, 5, 8], // Колонки, [2, 4, 6]             // Диагонали
    ];
    let won = false;
    for (let combo of wins) {
        if (board[combo[0]] && board[combo[0]] === board[combo[1]] && board[combo[0]] === board[combo[2]]) {
            won = true;
            statusText.innerText = `Гравець ${board[combo[0]]} переміг! 🎉`;
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
    // Сбрасываем старое соединение, чтобы можно было играть заново
    if(conn) conn.close();
    board = ["", "", "", "", "", "", "", "", ""];
    cells.forEach(c => { c.innerText = ""; c.className = "cell"; });
});
