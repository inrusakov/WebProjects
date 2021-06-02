document.addEventListener('DOMContentLoaded', () => {
  /** Поля с кораблями.*/
  const userGrid = document.querySelector('.grid-user')
  const computerGrid = document.querySelector('.grid-computer')
  const displayGrid = document.querySelector('.grid-display')

  /** Корабли и контрейнеры с кораблями.*/
  const shipsArray = document.querySelectorAll('.ship')
  const destroyerShip = document.querySelector('.destroyer-container')
  const submarineShip = document.querySelector('.submarine-container')
  const cruiserShip = document.querySelector('.cruiser-container')
  const battleShip = document.querySelector('.battleship-container')
  const carrierShip = document.querySelector('.carrier-container')

  /** Информация о количество "живых" кораблей.*/
  const shipInfo = document.querySelector('.shipinfo')

  /** Кнопки.*/
  const startButton = document.querySelector('#start')
  const rotateButton = document.querySelector('#rotate')
  const turnDisplay = document.querySelector('#whose-go')
  const infoDisplay = document.querySelector('#info')
  const setupButtons = document.getElementById('setup-buttons')

  // Информация о кораблях.
  const destroyerInfoUser = document.querySelector('.destroyer-info-user')
  const destroyerInfoComp = document.querySelector('.destroyer-info-comp')
  const submarineInfoUser = document.querySelector('.submarine-info-user')
  const submarineInfoComp = document.querySelector('.submarine-info-comp')
  const cruiserInfoUser = document.querySelector('.cruiser-info-user')
  const cruiserInfoComp = document.querySelector('.cruiser-info-comp')
  const battleshipInfoUser = document.querySelector('.battleship-info-user')
  const battleshipInfoComp = document.querySelector('.battleship-info-comp')
  const carierInfoUser = document.querySelector('.carier-info-user')
  const carierInfoComp = document.querySelector('.carier-info-comp')

  // Массивы с клетками с кораблями.
  const userSquares = []
  const computerSquares = []

  // Флаги.
  let isHorizontal = true
  let isGameOver = false
  let currentPlayer = 'user'
  let ready = false
  let enemyReady = false
  let allShipsPlaced = false

  // Текущий размер поля.
  const width = 10

  // Количество игроков.
  let playerNum = 0
  
  // Количество выстрелов.
  let shotFired = -1

  // Классы кораблей.
  const shipArray = [
    {
      name: 'destroyer',
      directions: [
        [0, 1],
        [0, width]
      ]
    },
    {
      name: 'submarine',
      directions: [
        [0, 1, 2],
        [0, width, width*2]
      ]
    },
    {
      name: 'cruiser',
      directions: [
        [0, 1, 2],
        [0, width, width*2]
      ]
    },
    {
      name: 'battleship',
      directions: [
        [0, 1, 2, 3],
        [0, width, width*2, width*3]
      ]
    },
    {
      name: 'carrier',
      directions: [
        [0, 1, 2, 3, 4],
        [0, width, width*2, width*3, width*4]
      ]
    },
  ]

  // Вызов функции с построением полей пользователя и противника.
  createBoard(userGrid, userSquares)
  createBoard(computerGrid, computerSquares)

  // Выбор режима игры.
  if (gameMode === 'singlePlayer') {
    startSinglePlayer()
  } else {
    startMultiPlayer()
  }

  // Функция с логикой многопользовательского режима игры.
  function startMultiPlayer() {
    const socket = io();
    // Получение количества игроков.
    socket.on('player-number', num => {
      // Если игроки подключились показывается сообщение, что сервер полон.
      if (num === -1) {
        infoDisplay.innerHTML = "Sorry, the server is full"
      } else {
        playerNum = parseInt(num)
        if(playerNum === 1) currentPlayer = "enemy"

        console.log(playerNum)

        // Получение статуса игроков.
        socket.emit('check-players')
      }
    })

    // Сообщения серверу о статусе подключения игроков.
    socket.on('player-connection', num => {
      console.log(`Player number ${num} has connected or disconnected`)
      playerConnectedOrDisconnected(num)
    })

    // Сообщение серверу о готовности игроков.
    socket.on('enemy-ready', num => {
      enemyReady = true
      playerReady(num)
      if (ready) {
        playGameMulti(socket)
        setupButtons.style.display = 'none'
      }
    })

    // Проверка статуса готовности игроков.
    socket.on('check-players', players => {
      players.forEach((p, i) => {
        if(p.connected) playerConnectedOrDisconnected(i)
        if(p.ready) {
          playerReady(i)
          if(i !== playerReady) enemyReady = true
        }
      })
    })

    // Сообщение о том, что время подключения вышло.
    socket.on('timeout', () => {
      infoDisplay.innerHTML = 'You have reached the 10 minute limit'
    })

    // Ответ на нажатие кнопки готовности.
    startButton.addEventListener('click', () => {
      if(allShipsPlaced) {
      shipInfo.style.display = 'none'
      console.log("HI")
      playGameMulti(socket)
      countDown() // Вызов функции с отсчетом.
      }
      else infoDisplay.innerHTML = "Please place all ships"
    })

    // Настройка подписчиков события для начала стрельбы по квадратам.
    computerSquares.forEach(square => {
      square.addEventListener('click', () => {
        if(currentPlayer === 'user' && ready && enemyReady) {
          shotFired = square.dataset.id
          if(computerGrid.querySelector(`div[data-id='${shotFired}']`).classList.contains('miss')||
        computerGrid.querySelector(`div[data-id='${shotFired}']`).classList.contains('boom'))
        return;
          socket.emit('fire', shotFired)
        }
      })
    })

    // Сообщение о том, что был сделан выстрел.
    socket.on('fire', id => {
      enemyGo(id)
      const square = userSquares[id]
      socket.emit('fire-reply', square.classList)
      playGameMulti(socket)
    })

    // Ответ на выстрел.
    socket.on('fire-reply', classList => {
      revealSquare(classList)
      playGameMulti(socket)
    })

    // Ответ на подключение или отключения пользователя.
    function playerConnectedOrDisconnected(num) {
      let player = `.p${parseInt(num) + 1}`
      document.querySelector(`${player} .connected`).classList.toggle('active')
      if(parseInt(num) === playerNum) document.querySelector(player).style.fontWeight = 'bold'
    }
  }

  // Логика одиночной игры.
  function startSinglePlayer() {
    generate(shipArray[0])
    generate(shipArray[1])
    generate(shipArray[2])
    generate(shipArray[3])
    generate(shipArray[4])

    startButton.addEventListener('click', () => {
      console.debug("ships ")
      if(allShipsPlaced){
      shipInfo.style.display = 'none'
      setupButtons.style.display = 'none'
      playGameSingle()
      }
    })
  }

  // Создание доски для игры.
  function createBoard(grid, squares) {
    for (let i = 0; i < width*width; i++) {
      const square = document.createElement('div')
      square.dataset.id = i
      grid.appendChild(square)
      squares.push(square)
    }
  }

  // Построение кораблей противника.
  function generate(ship) {
    let randomDirection = Math.floor(Math.random() * ship.directions.length)
    let current = ship.directions[randomDirection]
    if (randomDirection === 0) direction = 1
    if (randomDirection === 1) direction = 10
    let randomStart = Math.abs(Math.floor(Math.random() * computerSquares.length - (ship.directions[0].length * direction)))

    const isTaken = current.some(index => computerSquares[randomStart + index].classList.contains('taken'))
    const isAtRightEdge = current.some(index => (randomStart + index) % width === width - 1)
    const isAtLeftEdge = current.some(index => (randomStart + index) % width === 0)

    if (!isTaken && !isAtRightEdge && !isAtLeftEdge) current.forEach(index => computerSquares[randomStart + index].classList.add('taken', ship.name))

    else generate(ship)
  }
  

  // Если была нажата кнопка о повороте, идет повород кораблей.
  function rotate() {
    if (isHorizontal) {
      destroyerShip.classList.toggle('destroyer-container-vertical')
      submarineShip.classList.toggle('submarine-container-vertical')
      cruiserShip.classList.toggle('cruiser-container-vertical')
      battleShip.classList.toggle('battleship-container-vertical')
      carrierShip.classList.toggle('carrier-container-vertical')
      isHorizontal = false
      // Логгирование.
      console.log(isHorizontal)
      
      return
    }
    if (!isHorizontal) {
      destroyerShip.classList.toggle('destroyer-container-vertical')
      submarineShip.classList.toggle('submarine-container-vertical')
      cruiserShip.classList.toggle('cruiser-container-vertical')
      battleShip.classList.toggle('battleship-container-vertical')
      carrierShip.classList.toggle('carrier-container-vertical')
      isHorizontal = true
      // Логгирование.
      console.log(isHorizontal)

      return
    }
  }
  rotateButton.addEventListener('click', rotate)

  // События при перемещение корабля.
  shipsArray.forEach(ship => ship.addEventListener('dragstart', dragStart))
  shipsArray.forEach(ship => ship.addEventListener('touchstart', touchStartShip))
  userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragover', dragOver))
  userSquares.forEach(square => square.addEventListener('dragenter', dragEnter))
  userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
  userSquares.forEach(square => square.addEventListener('drop', dragDrop))
  userSquares.forEach(square => square.addEventListener('dragend', dragEnd))
  userSquares.forEach(square => square.addEventListener('touchstart', dragDrop))
  // Временные переменные с информацией о перемещаемом корабле.
  let selectedShipNameWithIndex
  let draggedShip
  let draggedShipLength

  shipsArray.forEach(ship => ship.addEventListener('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id
    // Логгирование информации о корабле.
    console.log(selectedShipNameWithIndex)
  }))

  function dragStart() {
    draggedShip = this
    draggedShipLength = this.childNodes.length
    // Логгирование информации о взятом корабле.
    console.log(draggedShip)
  }

  function touchStartShip(){
    draggedShip = this
    draggedShipLength = this.childNodes.length
    // Логгирование информации о взятом корабле.
    console.log(draggedShip)
  }

  function touchMove(event){
    event.preventDefault()
    console.log('move')
    let touch = event.targetTouches[0];
    draggedShip.style.top = `${touch.pageY}px`
    draggedShip.style.left = `${touch.pageX}px`
  }

  function dragOver(e) {
    e.preventDefault()
  }

  function dragEnter(e) {
    e.preventDefault()
  }

  function dragLeave() {
    
    console.log('drag leave')
  }

  function dragDrop() {
    if(draggedShipLength === 0 || draggedShip === null)
    return
    let shipNameWithLastId = draggedShip.lastChild.id
    let shipClass = shipNameWithLastId.slice(0, -2)
    // Логгирование информации о поставленном на доску корабле.
    console.log(shipClass)
    let lastShipIndex = parseInt(shipNameWithLastId.substr(-1))
    let shipLastId = lastShipIndex + parseInt(this.dataset.id)
    console.log(shipLastId)

    const notAllowedHorizontal = [0,10,20,30,40,50,60,70,80,90,1,11,21,31,41,51,61,71,81,91,2,22,32,42,52,62,72,82,92,3,13,23,33,43,53,63,73,83,93]
    const notAllowedVertical = [99,98,97,96,95,94,93,92,91,90,89,88,87,86,85,84,83,82,81,80,79,78,77,76,75,74,73,72,71,70,69,68,67,66,65,64,63,62,61,60]
    
    let newNotAllowedHorizontal = notAllowedHorizontal.splice(0, 10 * lastShipIndex)
    let newNotAllowedVertical = notAllowedVertical.splice(0, 10 * lastShipIndex)

    selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))

    shipLastId = shipLastId - selectedShipIndex
    console.log(shipLastId)

    if (isHorizontal && !newNotAllowedHorizontal.includes(shipLastId)) {
      for (let i=0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.add('taken', 'horizontal', directionClass, shipClass)
      }
    // Если корабль пытаются поставить на место, которое занято, то он возвращается на доску с неготовыми кораблями.
    } else if (!isHorizontal && !newNotAllowedVertical.includes(shipLastId)) {
      for (let i=0; i < draggedShipLength; i++) {
        let directionClass
        if (i === 0) directionClass = 'start'
        if (i === draggedShipLength - 1) directionClass = 'end'
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + width*i].classList.add('taken', 'vertical', directionClass, shipClass)
      }
    } else return

    displayGrid.removeChild(draggedShip)
    if(!displayGrid.querySelector('.ship')) allShipsPlaced = true
    draggedShip = null
    draggedShipLength = 0
  }

  

  function dragEnd() {
    // Логгирование об окончание перемещения корабля.
    console.log('dragend')
  }

  // Логика многопользовательского режима игры.
  function playGameMulti(socket) {
    setupButtons.style.display = 'none'
    if(isGameOver) return
    if(!ready) {
      socket.emit('player-ready')
      ready = true
      playerReady(playerNum)
    }

    if(enemyReady) {
      if(currentPlayer === 'user') {
        turnDisplay.innerHTML = 'Your Go'
      }
      if(currentPlayer === 'enemy') {
        turnDisplay.innerHTML = "Enemy's Go"
      }
    }
  }

  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`
    document.querySelector(`${player} .ready`).classList.toggle('active')
  }

  // Логика однопользовательского режима игры.
  function playGameSingle() {
    if (isGameOver) return
    if (currentPlayer === 'user') {
      turnDisplay.innerHTML = 'Your Go'
      computerSquares.forEach(square => square.addEventListener('click', function(e) {
        shotFired = square.dataset.id
        if(computerGrid.querySelector(`div[data-id='${shotFired}']`).classList.contains('miss')||
        computerGrid.querySelector(`div[data-id='${shotFired}']`).classList.contains('boom'))
        return;
        revealSquare(square.classList)
      }))
    }
    if (currentPlayer === 'enemy') {
      turnDisplay.innerHTML = 'Computers Go'
      setTimeout(enemyGo, 1000)
    }
  }

  // Информация о подбитых кораблях.
  let destroyerCount = 0
  let submarineCount = 0
  let cruiserCount = 0
  let battleshipCount = 0
  let carrierCount = 0

  // Функция добавления выстрела на карту.
  function revealSquare(classList) {
    const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
    const obj = Object.values(classList)
    if (!enemySquare.classList.contains('boom') && currentPlayer === 'user' && !isGameOver) {
      if (obj.includes('destroyer')) destroyerCount++
      if (obj.includes('submarine')) submarineCount++
      if (obj.includes('cruiser')) cruiserCount++
      if (obj.includes('battleship')) battleshipCount++
      if (obj.includes('carrier')) carrierCount++
    }
    if (obj.includes('taken')) {
      enemySquare.classList.add('boom')
    } else {
      enemySquare.classList.add('miss')
    }
    checkForWins()
    currentPlayer = 'enemy'
    if(gameMode === 'singlePlayer') playGameSingle()
  }

  // Информация о подбитых кораблях компьютера.
  let cpuDestroyerCount = 0
  let cpuSubmarineCount = 0
  let cpuCruiserCount = 0
  let cpuBattleshipCount = 0
  let cpuCarrierCount = 0

  //Функция вражеского хода.
  function enemyGo(square) {
    if (gameMode === 'singlePlayer') square = Math.floor(Math.random() * userSquares.length)
    if (!userSquares[square].classList.contains('boom')&& !userSquares[square].classList.contains('miss')) {
      const hit = userSquares[square].classList.contains('taken')
      userSquares[square].classList.add(hit ? 'boom' : 'miss')
      if (userSquares[square].classList.contains('destroyer')) cpuDestroyerCount++
      if (userSquares[square].classList.contains('submarine')) cpuSubmarineCount++
      if (userSquares[square].classList.contains('cruiser')) cpuCruiserCount++
      if (userSquares[square].classList.contains('battleship')) cpuBattleshipCount++
      if (userSquares[square].classList.contains('carrier')) cpuCarrierCount++
      checkForWins()
    } else if (gameMode === 'singlePlayer') enemyGo()
    currentPlayer = 'user'
    turnDisplay.innerHTML = 'Your Go'
  }

  // Проверка на победу или потопления кораблей.
  function checkForWins() {
    let enemy = 'computer'
    if(gameMode === 'multiPlayer') enemy = 'enemy'
    if (destroyerCount === 2) {
      infoDisplay.innerHTML = `${enemy}'s destroyer destroyed`
      destroyerCount = 10
      destroyerInfoComp.innerHTML='0'
    }
    if (submarineCount === 3) {
      infoDisplay.innerHTML = `${enemy}'s submarine destroyed`
      submarineCount = 10
      submarineInfoComp.innerHTML='0'
    }
    if (cruiserCount === 3) {
      infoDisplay.innerHTML = `${enemy}'s cruiser destroyed`
      cruiserCount = 10
      cruiserInfoComp.innerHTML='0'
    }
    if (battleshipCount === 4) {
      infoDisplay.innerHTML = `${enemy}'s battleship destroyed`
      battleshipCount = 10
      battleshipInfoComp.innerHTML='0'
    }
    if (carrierCount === 5) {
      infoDisplay.innerHTML = `${enemy}'s carrier destroyed`
      carrierCount = 10
      carierInfoComp.innerHTML='0'
    }
    if (cpuDestroyerCount === 2) {
      infoDisplay.innerHTML = `${enemy} destroyed your destroyer`
      cpuDestroyerCount = 10
      destroyerInfoUser.innerHTML='0'
    }
    if (cpuSubmarineCount === 3) {
      infoDisplay.innerHTML = `${enemy} destroyed your submarine`
      cpuSubmarineCount = 10
      submarineInfoUser.innerHTML='0'
    }
    if (cpuCruiserCount === 3) {
      infoDisplay.innerHTML = `${enemy} destroyed your cruiser`
      cpuCruiserCount = 10
      cruiserInfoUser.innerHTML='0'
    }
    if (cpuBattleshipCount === 4) {
      infoDisplay.innerHTML = `${enemy} destroyed your battleship`
      cpuBattleshipCount = 10
      battleshipInfoUser.innerHTML='0'
    }
    if (cpuCarrierCount === 5) {
      infoDisplay.innerHTML = `${enemy} destroyed your carrier`
      cpuCarrierCount = 10
      carierInfoUser.innerHTML='0'
    }

    // Если все корабли потоплены то побеждает один из игроков.
    if ((destroyerCount + submarineCount + cruiserCount + battleshipCount + carrierCount) === 50) {
      infoDisplay.innerHTML = "YOU WIN"
      gameOver()
    }
    if ((cpuDestroyerCount + cpuSubmarineCount + cpuCruiserCount + cpuBattleshipCount + cpuCarrierCount) === 50) {
      infoDisplay.innerHTML = `${enemy.toUpperCase()} WINS`
      gameOver()
    }
  }

  // Окончание игры
  function gameOver() {
    isGameOver = true
    startButton.removeEventListener('click', playGameSingle)
  }

  // Таймер игры
  let timer; 
  let x =600; 
  function countDown(){  
  document.getElementById('rocket').innerHTML = x;
  x--; 
  if (x<0){
    clearTimeout(timer); 
  }
  else {
    timer = setTimeout(countDown, 1000);
  }
}
})
