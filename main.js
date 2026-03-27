// 联机状态管理
const multiState = {
    roomId: null,
    playerId: null,
    isHost: false,
    enemyConnected: false,
    playerReady: false,
    enemyReady: false,
    lastSyncTime: 0
};

// 游戏状态
const gameState = {
    round: 1,
    phase: '等待联机', 
    energy: 5,
    maxEnergy: 10,
    shop: [],
    hand: Array(8).fill(null),
    board: Array(6).fill(null),
    enemyBoard: Array(6).fill(null),
    playerPower: 0,
    enemyPower: 0,
    playerGlobalHp: 200,
    enemyGlobalHp: 200,
    isBattleRunning: false
};

let draggedItem = null;
let draggedSource = null;
let draggedIndex = null;

// 初始化
function init() {
    initMultiplayer();
    refreshShop(true);
    updateUI();
    bindEvents();
}

// 联机同步逻辑 (基于 LocalStorage 模拟 WebSocket)
function initMultiplayer() {
    const urlParams = new URLSearchParams(window.location.search);
    multiState.roomId = urlParams.get('room');
    
    if (!multiState.roomId) {
        // 创建新房间 (作为主机)
        multiState.roomId = Math.random().toString(36).substring(2, 8);
        multiState.playerId = 'host';
        multiState.isHost = true;
        window.history.replaceState({}, '', `?room=${multiState.roomId}`);
        document.getElementById('connection-status').innerText = "等待对手加入...";
    } else {
        // 加入房间 (作为客机)
        multiState.playerId = 'guest';
        multiState.isHost = false;
        document.getElementById('connection-status').innerText = "已连接！";
        multiState.enemyConnected = true;
        gameState.phase = '准备阶段';
        document.getElementById('btn-ready').disabled = false;
    }

    // 启动轮询同步
    setInterval(syncState, 500);
}

function syncState() {
    const roomKey = `pkmn_room_${multiState.roomId}`;
    
    // 读取当前房间状态
    let roomData = JSON.parse(localStorage.getItem(roomKey) || '{}');
    
    if (multiState.isHost) {
        // 主机逻辑
        if (!roomData.host) roomData.host = {};
        
        // 检查客机是否加入
        if (roomData.guest && roomData.guest.connected && !multiState.enemyConnected) {
            multiState.enemyConnected = true;
            document.getElementById('connection-status').innerText = "对手已连接！";
            gameState.phase = '准备阶段';
            document.getElementById('btn-ready').disabled = false;
            updateUI();
        }

        // 写入主机状态
        roomData.host = {
            connected: true,
            ready: multiState.playerReady,
            board: gameState.board,
            globalHp: gameState.playerGlobalHp
        };
        
        // 读取客机状态
        if (roomData.guest) {
            multiState.enemyReady = roomData.guest.ready || false;
            if (multiState.enemyReady && !gameState.isBattleRunning) {
                // 客机传来的板子需要反转一下显示（让对面从上往下看也是正常的，但对战双方位置是对称的）
                gameState.enemyBoard = roomData.guest.board.map(c => c ? {...c} : null);
                gameState.enemyGlobalHp = roomData.guest.globalHp || 200;
            }
        }
        
    } else {
        // 客机逻辑
        if (!roomData.guest) roomData.guest = {};
        
        // 写入客机状态
        roomData.guest = {
            connected: true,
            ready: multiState.playerReady,
            board: gameState.board,
            globalHp: gameState.playerGlobalHp
        };
        
        // 读取主机状态
        if (roomData.host) {
            multiState.enemyReady = roomData.host.ready || false;
            if (multiState.enemyReady && !gameState.isBattleRunning) {
                gameState.enemyBoard = roomData.host.board.map(c => c ? {...c} : null);
                gameState.enemyGlobalHp = roomData.host.globalHp || 200;
            }
        }
    }
    
    localStorage.setItem(roomKey, JSON.stringify(roomData));

    // 检查双方是否都准备好
    if (multiState.playerReady && multiState.enemyReady && !gameState.isBattleRunning && gameState.phase === '等待对手...') {
        startBattle();
    }
}

// 刷新商店
function refreshShop(isFree = false) {
    if (!isFree) {
        if (gameState.energy < 1) return;
        gameState.energy -= 1;
    }
    
    gameState.shop = [];
    const tierPool = PokemonData.filter(p => {
        if (gameState.round < 3) return p.tier === 1;
        if (gameState.round < 6) return p.tier <= 2;
        return p.tier <= 3;
    });

    for (let i = 0; i < 5; i++) {
        let randCard = tierPool[Math.floor(Math.random() * tierPool.length)];
        // 防御力即为血量，这里用 currentDef 记录当前防御力（血量）
        gameState.shop.push({ ...randCard, instanceId: Math.random().toString(36).substr(2, 9), currentDef: randCard.defense });
    }
    updateUI();
}

// 生成卡牌DOM
function createCardDOM(card, source, index) {
    if (!card) return null;
    
    const div = document.createElement('div');
    div.className = `card ${source === 'shop' ? 'shop-card' : ''}`;
    div.draggable = source !== 'enemyBoard' && !gameState.isBattleRunning;
    div.dataset.source = source;
    div.dataset.index = index;
    
    // 显示当前的防御力（血量）
    const displayDef = card.currentDef !== undefined ? card.currentDef : card.defense;
    
    div.innerHTML = `
        <div class="header">
            <span class="name">${card.name}</span>
            <span class="cost-badge">${card.cost}</span>
        </div>
        <div class="image-box">
            <img src="${card.image}" alt="${card.name}">
        </div>
        <div class="info">
            <span class="type-badge">${card.typeName}</span>
            <div class="stats-row">
                <span>⚔️ ${card.attack}</span>
                <span>🛡️ ${displayDef}</span>
            </div>
        </div>
    `;
    
    if (div.draggable) {
        div.addEventListener('dragstart', () => {
            draggedItem = card;
            draggedSource = source;
            draggedIndex = index;
        });
    }

    if (source === 'shop') {
        div.onclick = () => buyFromShop(index);
    }
    
    return div;
}

// 购买逻辑
function buyFromShop(shopIdx) {
    const card = gameState.shop[shopIdx];
    if (!card || gameState.energy < card.cost) return;

    let emptyIdx = gameState.hand.findIndex(s => s === null);
    if (emptyIdx === -1) {
        alert("备战席已满！");
        return;
    }

    gameState.energy -= card.cost;
    gameState.hand[emptyIdx] = { ...card };
    gameState.shop[shopIdx] = null;
    
    checkSynthesis();
    updateUI();
}

// 更新UI
function updateUI() {
    document.getElementById('energy-val').innerText = gameState.energy;
    document.getElementById('current-round').innerText = gameState.round;
    document.getElementById('game-phase').innerText = gameState.phase;
    
    // 更新全局血量
    document.getElementById('player-global-hp').innerText = gameState.playerGlobalHp;
    document.getElementById('enemy-global-hp').innerText = gameState.enemyGlobalHp;
    
    // 计算战力
    gameState.playerPower = gameState.board.reduce((s, c) => s + (c ? c.attack + c.defense : 0), 0);
    gameState.enemyPower = gameState.enemyBoard.reduce((s, c) => s + (c ? c.attack + c.defense : 0), 0);
    document.getElementById('player-power').innerText = gameState.playerPower;
    document.getElementById('enemy-power').innerText = gameState.enemyPower;
    
    // 渲染各个区域
    renderContainer('.shop-row', gameState.shop, 'shop');
    renderContainer('.bench-slots', gameState.hand, 'hand');
    renderContainer('#player-field .slot-row', gameState.board, 'board');
    renderContainer('#enemy-field .slot-row', gameState.enemyBoard, 'enemyBoard');
}

function renderContainer(selector, data, source) {
    const container = document.querySelector(selector);
    if (!container) return;
    const slots = container.querySelectorAll('.slot');
    
    slots.forEach((slot, i) => {
        slot.innerHTML = '';
        if (data[i]) {
            const cardDOM = createCardDOM(data[i], source, i);
            if (cardDOM) slot.appendChild(cardDOM);
        }
    });
}

// 合成逻辑
function checkSynthesis() {
    let all = [];
    gameState.hand.forEach((c, i) => c && all.push({c, s:'hand', i}));
    gameState.board.forEach((c, i) => c && all.push({c, s:'board', i}));
    
    let groups = {};
    all.forEach(item => {
        groups[item.c.id] = groups[item.c.id] || [];
        groups[item.c.id].push(item);
    });
    
    for (let id in groups) {
        if (groups[id].length >= 3) {
            let items = groups[id].slice(0, 3);
            let first = items[0];
            let base = first.c;
            if (base.next) {
                let nextData = PokemonData.find(p => p.id === base.next);
                items.forEach(it => gameState[it.s][it.i] = null);
                gameState[first.s][first.i] = { ...nextData, instanceId: Math.random().toString(36).substr(2, 9), currentDef: nextData.defense };
                checkSynthesis(); // 递归
                return;
            }
        }
    }
}

// 绑定事件
function bindEvents() {
    document.getElementById('btn-refresh').onclick = () => refreshShop();
    
    document.getElementById('btn-ready').onclick = () => {
        if (!gameState.isBattleRunning && multiState.enemyConnected) {
            if (gameState.board.every(p => !p)) {
                alert("请先将宝可梦拖拽到上方的战斗区域（蓝线格子）再准备！");
                return;
            }
            multiState.playerReady = true;
            gameState.phase = '等待对手...';
            document.getElementById('btn-ready').disabled = true;
            document.getElementById('btn-refresh').disabled = true;
            updateUI();
        } else if (!multiState.enemyConnected) {
            alert("请先等待对手加入！");
        }
    };

    document.getElementById('btn-copy-link').onclick = () => {
        const url = window.location.href;
        
        // 最可靠的保底方式：通过 prompt 弹窗让用户自己复制
        // 这在任何浏览器、任何安全上下文下都不会被拦截
        window.prompt("请复制以下邀请链接，发送给朋友即可加入对战：", url);
    };

    const dropZones = document.querySelectorAll('.slot:not(.enemy-slot)');
    dropZones.forEach(zone => {
        zone.ondragover = e => e.preventDefault();
        zone.ondrop = e => {
            if (gameState.isBattleRunning || multiState.playerReady) return; // 准备后不可更改阵容
            const toSource = zone.classList.contains('hand-slot') ? 'hand' : 'board';
            const toIdx = parseInt(zone.dataset.index);
            
            if (draggedSource === 'shop') return; // 商店走点击购买

            let temp = gameState[toSource][toIdx];
            gameState[toSource][toIdx] = draggedItem;
            gameState[draggedSource][draggedIndex] = temp;
            
            updateUI();
        };
    });
}

// 战斗逻辑
async function startBattle() {
    gameState.isBattleRunning = true;
    gameState.phase = "对战阶段";
    
    // 不再生成随机对手，对手阵容已经通过 syncState 从 localStorage 同步过来了
    updateUI();
    
    // 给玩家一点时间看清敌人阵容
    await new Promise(r => setTimeout(r, 1000));

    let maxRounds = 20; // 防止死循环
    let currentBattleRound = 0;

    while (gameState.isBattleRunning && currentBattleRound < maxRounds) {
        currentBattleRound++;
        let actionOccurred = false;

        // 玩家和敌人交替攻击
        for (let i = 0; i < 6; i++) {
            if (!gameState.isBattleRunning) break;
            
            // 玩家攻击（只有主机执行逻辑，客机只看或者各自执行各自的）
            // 为了简单，由于双方阵容一致，各自执行相同的战斗逻辑（确定性）
            if (gameState.board[i] && gameState.board[i].currentDef > 0) {
                let targetIdx = gameState.enemyBoard.findIndex(e => e && e.currentDef > 0);
                if (targetIdx !== -1) {
                    await performAttack(i, targetIdx, true);
                    actionOccurred = true;
                    if (checkBattleEnd()) return;
                }
            }
            
            // 敌人攻击
            if (gameState.enemyBoard[i] && gameState.enemyBoard[i].currentDef > 0) {
                let targetIdx = gameState.board.findIndex(p => p && p.currentDef > 0);
                if (targetIdx !== -1) {
                    await performAttack(i, targetIdx, false);
                    actionOccurred = true;
                    if (checkBattleEnd()) return;
                }
            }
        }
        
        if (!actionOccurred) break; // 没有人能攻击了
    }
    
    // 超时平局算输
    if (gameState.isBattleRunning) {
        alert("回合超时，你输了本轮！");
        endBattle(false);
    }
}

function checkBattleEnd() {
    if (gameState.enemyBoard.every(e => !e || e.currentDef <= 0)) {
        setTimeout(() => { 
            alert("你赢了本轮！"); 
            endBattle(true); 
        }, 500);
        return true;
    }
    if (gameState.board.every(p => !p || p.currentDef <= 0)) {
        setTimeout(() => { 
            alert("你输了本轮！"); 
            endBattle(false); 
        }, 500);
        return true;
    }
    return false;
}

async function performAttack(attackerIdx, targetIdx, isPlayerAttacking) {
    const attackerArr = isPlayerAttacking ? gameState.board : gameState.enemyBoard;
    const targetArr = isPlayerAttacking ? gameState.enemyBoard : gameState.board;
    const attackerSlot = document.querySelector(`${isPlayerAttacking ? '#player-field' : '#enemy-field'} .slot[data-index="${attackerIdx}"]`);
    const targetSlot = document.querySelector(`${isPlayerAttacking ? '#enemy-field' : '#player-field'} .slot[data-index="${targetIdx}"]`);

    if (!attackerSlot || !targetSlot || !attackerSlot.firstChild || !targetSlot.firstChild) return;

    const attacker = attackerArr[attackerIdx];
    const target = targetArr[targetIdx];

    // 攻击动画前摇
    attackerSlot.firstChild.classList.add(isPlayerAttacking ? 'anim-attack-up' : 'anim-attack-down');
    
    // 等待动画到达顶点
    await new Promise(r => setTimeout(r, 250));

    // 计算伤害: 直接用攻击力减去对方防御力（当前血量）
    let dmg = attacker.attack;
    target.currentDef -= dmg;
    
    // 受击特效与飘字
    targetSlot.firstChild.classList.add('anim-hit');
    showDamage(targetSlot, dmg);
    
    // 更新血条(防御力)
    updateUI();
    
    // 等待动画后摇结束
    await new Promise(r => setTimeout(r, 350));
    
    if (attackerSlot.firstChild) attackerSlot.firstChild.classList.remove('anim-attack-up', 'anim-attack-down');
    if (targetSlot.firstChild) targetSlot.firstChild.classList.remove('anim-hit');
    
    // 如果防御力<=0，将其移除（死亡）
    if (target.currentDef <= 0) {
        targetSlot.innerHTML = '';
        targetArr[targetIdx] = null;
    }
    
    // 给下一个攻击者一点缓冲时间
    await new Promise(r => setTimeout(r, 200));
}

function showDamage(slot, dmg) {
    const popup = document.createElement('div');
    popup.className = 'dmg-popup';
    popup.innerText = `-${dmg}`;
    
    // 随机偏移一下飘字位置
    const offsetX = (Math.random() - 0.5) * 40;
    popup.style.left = `calc(50% + ${offsetX}px)`;
    
    slot.appendChild(popup);
    setTimeout(() => {
        if (popup.parentNode) popup.remove();
    }, 800);
}

function endBattle(isWin) {
    gameState.isBattleRunning = false;
    
    // 计算扣血逻辑
    if (isWin) {
        const survivors = gameState.board.filter(p => p && p.currentDef > 0).length;
        gameState.enemyGlobalHp -= survivors * 10;
    } else {
        const survivors = gameState.enemyBoard.filter(e => e && e.currentDef > 0).length;
        gameState.playerGlobalHp -= survivors * 10;
    }
    
    updateUI();

    if (gameState.playerGlobalHp <= 0) {
        alert("很遗憾，你的生命值归零，游戏结束！");
        localStorage.removeItem(`pkmn_room_${multiState.roomId}`);
        window.location.href = window.location.pathname; // 重置并回到大厅
        return;
    }
    if (gameState.enemyGlobalHp <= 0) {
        alert("恭喜你，击败了敌人，获得最终胜利！");
        localStorage.removeItem(`pkmn_room_${multiState.roomId}`);
        window.location.href = window.location.pathname;
        return;
    }

    gameState.round++;
    gameState.phase = "准备阶段";
    multiState.playerReady = false; // 重置准备状态
    
    document.getElementById('btn-ready').disabled = false;
    document.getElementById('btn-refresh').disabled = false;
    
    gameState.energy = Math.min(gameState.maxEnergy, gameState.energy + 5);
    
    gameState.board.forEach(c => { if(c) c.currentDef = c.defense; });
    
    // 不要清空敌人，留着下一轮同步覆盖
    // gameState.enemyBoard = Array(6).fill(null);
    
    refreshShop(true);
    updateUI();
}


init();