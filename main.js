// 多人对战状态
const multiState = {
    roomId: null,
    isHost: false,
    playerId: null,
    enemyConnected: false,
    playerReady: false,
    enemyReady: false,
    battleStarted: false, // 新增：是否已点击开始对战
    peer: null, // PeerJS 实例
    conn: null  // PeerJS 数据连接
};

// 游戏状态
const gameState = {
    round: 1,
    phase: '等待联机', 
    energy: 3,
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

// 联机同步逻辑 (基于 PeerJS)
function initMultiplayer() {
    const urlParams = new URLSearchParams(window.location.search);
    multiState.roomId = urlParams.get('room');
    
    // 初始化 PeerJS
    // 使用公开免费的 PeerJS 服务器
    multiState.peer = new Peer({
        debug: 2
    });

    multiState.peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        
        if (!multiState.roomId) {
            // 没有 roomId，说明我是房主，把自己的 peer ID 作为 roomId
            multiState.roomId = id;
            multiState.isHost = true;
            multiState.playerId = 'host';
            window.history.replaceState({}, '', `?room=${multiState.roomId}`);
            document.getElementById('connection-status').innerText = "等待对手加入...";
            
            // 房主监听连接
            multiState.peer.on('connection', (conn) => {
                console.log('Guest connected!');
                setupConnection(conn);
            });
            
        } else {
            // 有 roomId，说明我是客机，主动连接房主
            multiState.isHost = false;
            multiState.playerId = 'guest';
            document.getElementById('connection-status').innerText = "正在连接房主...";
            
            const conn = multiState.peer.connect(multiState.roomId);
            conn.on('open', () => {
                console.log('Connected to host!');
                setupConnection(conn);
            });
        }
    });
    
    multiState.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        document.getElementById('connection-status').innerText = "连接失败: " + err.type;
        if (err.type === 'peer-unavailable') {
            alert('找不到房主，可能房间已解散！');
        }
    });
}

function setupConnection(conn) {
    multiState.conn = conn;
    multiState.enemyConnected = true;
    document.getElementById('connection-status').innerText = multiState.isHost ? "对手已连接！" : "已连接！";
    gameState.phase = '放牌阶段';
    document.getElementById('btn-ready').disabled = false;
    updateUI();

    // 监听数据接收
    conn.on('data', (data) => {
        handleSyncData(data);
    });
    
    // 连接断开处理
    conn.on('close', () => {
        alert("对手已断开连接！");
        window.location.href = window.location.pathname;
    });
    
    // 开始定时同步心跳（不再依赖 localStorage）
    setInterval(syncState, 500);
}

// 通过 P2P 发送状态
function syncState() {
    if (!multiState.enemyConnected || !multiState.conn) return;

    const myData = {
        ready: multiState.playerReady,
        board: gameState.board,
        globalHp: gameState.playerGlobalHp,
        battleStarted: multiState.battleStarted
    };
    
    multiState.conn.send(myData);
}

// 处理收到的 P2P 状态
function handleSyncData(data) {
    multiState.enemyReady = data.ready || false;
    
    if (data.battleStarted && !multiState.isHost) {
        multiState.battleStarted = true;
    }
    
    // 只要没在战斗中，就实时同步对方的面板
    if (!gameState.isBattleRunning && data.board) {
        // 将对方的板子直接反转过来，确保索引一致
        gameState.enemyBoard = data.board.map(c => c ? {...c} : null);
        gameState.enemyGlobalHp = data.globalHp || 200;
    }
    
    checkPhaseUpdate();
}

function checkPhaseUpdate() {
    // UI上的提示更新
    if (!gameState.isBattleRunning && multiState.enemyConnected) {
        if (multiState.playerReady && !multiState.enemyReady) {
            gameState.phase = '等待对手完成放牌...';
        } else if (!multiState.playerReady && multiState.enemyReady) {
            gameState.phase = '对手已完成放牌！';
        } else if (multiState.playerReady && multiState.enemyReady) {
            gameState.phase = '双方已完成放牌';
            
            // 双方完成放牌后，显示“开始战斗”按钮（仅限主机点击控制节奏，或者双方都能点）
            // 这里设定为主机控制开始
            if (multiState.isHost && !multiState.battleStarted) {
                if (document.getElementById('btn-start-battle')) {
                    document.getElementById('btn-start-battle').style.display = 'block';
                }
                if (document.getElementById('btn-ready')) {
                    document.getElementById('btn-ready').style.display = 'none'; // 隐藏完成放牌按钮，避免重叠
                }
            } else if (!multiState.isHost && !multiState.battleStarted) {
                gameState.phase = '等待房主开始...';
            }
        } else {
            gameState.phase = '放牌阶段';
        }
    }
    
    if (document.getElementById('game-phase')) {
        document.getElementById('game-phase').innerText = gameState.phase;
    }

    // 检查是否收到开始战斗的信号
    if (multiState.battleStarted && !gameState.isBattleRunning) {
        if (document.getElementById('btn-start-battle')) {
            document.getElementById('btn-start-battle').style.display = 'none';
        }
        startBattle();
    } else if (!gameState.isBattleRunning) {
        // 即使没准备好，也要把对方刚放上阵的卡牌渲染出来
        updateUI();
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
        if (gameState.round <= 3) return p.tier === 1; // 前3轮只给1阶卡牌
        if (gameState.round <= 6) return p.tier <= 2;
        if (gameState.round <= 9) return p.tier <= 3;
        return true; // 10轮及以后全开放
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
    
    // 如果是敌方区域的卡牌，且未开始战斗，则渲染卡背
    if (source === 'enemyBoard' && !gameState.isBattleRunning) {
        div.className = 'card card-back';
        div.style.background = 'linear-gradient(135deg, #2c3e50, #34495e)';
        div.style.border = '2px solid #7f8c8d';
        div.innerHTML = `<div style="display:flex; height:100%; align-items:center; justify-content:center; color:#bdc3c7; font-size:30px; font-weight:bold;">?</div>`;
        return div;
    }
    
    // 如果是商店里的卡牌，加一个 cursor: pointer 的提示样式
    div.className = `card ${source === 'shop' ? 'shop-card' : ''}`;
    // 商店里的卡牌不允许拖拽，必须点击购买
    div.draggable = source !== 'shop' && source !== 'enemyBoard' && !gameState.isBattleRunning;
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
    if (document.getElementById('energy-val')) document.getElementById('energy-val').innerText = gameState.energy;
    if (document.getElementById('current-round')) document.getElementById('current-round').innerText = gameState.round;
    if (document.getElementById('game-phase')) document.getElementById('game-phase').innerText = gameState.phase;
    
    // 更新全局血量
    if (document.getElementById('player-global-hp')) document.getElementById('player-global-hp').innerText = gameState.playerGlobalHp;
    if (document.getElementById('enemy-global-hp')) document.getElementById('enemy-global-hp').innerText = gameState.enemyGlobalHp;
    
    // 计算战力
    gameState.playerPower = gameState.board.reduce((s, c) => s + (c ? c.attack + c.defense : 0), 0);
    gameState.enemyPower = gameState.enemyBoard.reduce((s, c) => s + (c ? c.attack + c.defense : 0), 0);
    if (document.getElementById('player-power')) document.getElementById('player-power').innerText = gameState.playerPower;
    if (document.getElementById('enemy-power')) document.getElementById('enemy-power').innerText = gameState.enemyPower;
    
    // 渲染各个区域
    renderContainer('.shop-row', gameState.shop, 'shop');
    renderContainer('.bench-slots', gameState.hand, 'hand');
    renderContainer('#player-field .slot-row', gameState.board, 'board');
    renderContainer('#enemy-field .slot-row', gameState.enemyBoard, 'enemyBoard');
}

function renderContainer(selector, data, source) {
    const container = document.querySelector(selector);
    if (!container) return;
    
    // 针对商店特殊处理
    if (source === 'shop') {
        const slots = container.querySelectorAll('.shop-slot');
        slots.forEach((slot, i) => {
            slot.innerHTML = '';
            if (data[i]) {
                const cardDOM = createCardDOM(data[i], source, i);
                if (cardDOM) {
                    slot.appendChild(cardDOM);
                }
            }
        });
        return;
    }

    // 其他区域
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
    // 任意点击播放背景音乐
    document.body.addEventListener('click', () => {
        const bgm = document.getElementById('bgm');
        if (bgm && bgm.paused) {
            bgm.volume = 0.3; // 音量调低一点
            bgm.play().catch(e => console.log("BGM play failed:", e));
        }
    }, { once: true });

    document.getElementById('btn-refresh').onclick = () => refreshShop();
    
    document.getElementById('btn-ready').onclick = () => {
        if (!gameState.isBattleRunning && multiState.enemyConnected) {
            // 只要不是全空，就可以准备（允许空城计或者放了卡牌）
            multiState.playerReady = true;
            gameState.phase = '等待对手完成放牌...';
            document.getElementById('btn-ready').style.display = 'none';
            document.getElementById('btn-refresh').disabled = true;
            
            // 立即触发一次同步，让对方知道我准备好了
            syncState();
        } else if (!multiState.enemyConnected) {
            alert("请先等待对手加入！");
        }
    };

    document.getElementById('btn-start-battle').onclick = () => {
        if (multiState.isHost && multiState.playerReady && multiState.enemyReady) {
            multiState.battleStarted = true;
            document.getElementById('btn-start-battle').style.display = 'none';
            syncState();
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
            if (gameState.isBattleRunning || multiState.playerReady) return; // 完成放牌后不可更改阵容
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

    // 如果开局两边都是空的，或者有一边是空的，直接结算
    if (checkBattleEnd()) return;

    let maxRounds = 20; // 防止死循环
    let currentBattleRound = 0;

    // 记录双方下一个该攻击的宝可梦索引
    let playerNextAttackerIdx = 0;
    let enemyNextAttackerIdx = 0;

    while (gameState.isBattleRunning && currentBattleRound < maxRounds) {
        currentBattleRound++;
        let actionOccurred = false;

        // 玩家攻击回合
        while (playerNextAttackerIdx < 6) {
            let i = playerNextAttackerIdx;
            playerNextAttackerIdx++;
            if (gameState.board[i] && gameState.board[i].currentDef > 0) {
                let targetIdx = gameState.enemyBoard.findIndex(e => e && e.currentDef > 0);
                if (targetIdx !== -1) {
                    await performAttack(i, targetIdx, true);
                    actionOccurred = true;
                    if (checkBattleEnd()) return;
                    break; // 玩家攻击完毕，轮到敌人
                }
            }
        }
        
        // 敌人攻击回合
        while (enemyNextAttackerIdx < 6) {
            let i = enemyNextAttackerIdx;
            enemyNextAttackerIdx++;
            if (gameState.enemyBoard[i] && gameState.enemyBoard[i].currentDef > 0) {
                let targetIdx = gameState.board.findIndex(p => p && p.currentDef > 0);
                if (targetIdx !== -1) {
                    await performAttack(i, targetIdx, false);
                    actionOccurred = true;
                    if (checkBattleEnd()) return;
                    break; // 敌人攻击完毕，轮到玩家
                }
            }
        }
        
        // 如果双方都遍历完了一轮（0-5），重置索引，开始新一轮的循环
        if (playerNextAttackerIdx >= 6 && enemyNextAttackerIdx >= 6) {
            playerNextAttackerIdx = 0;
            enemyNextAttackerIdx = 0;
        }
        
        // 如果双方都没人能攻击（可能都死光了，或者虽然索引没到底但都没合法的攻击动作），退出循环防死锁
        if (!actionOccurred && playerNextAttackerIdx === 0 && enemyNextAttackerIdx === 0) {
            break; 
        }
    }
    
    // 如果达到了最大回合数或者陷入无法攻击的死锁，强制判定平局
    if (gameState.isBattleRunning) {
        if (!checkBattleEnd()) {
            setTimeout(() => { 
                alert("本轮平局！"); 
                endBattle("draw"); 
            }, 500);
        }
    }
}

function checkBattleEnd() {
    let playerAlive = gameState.board.some(p => p && p.currentDef > 0);
    let enemyAlive = gameState.enemyBoard.some(e => e && e.currentDef > 0);

    if (!enemyAlive && playerAlive) {
        setTimeout(() => { 
            alert("你赢了本轮！"); 
            endBattle(true); 
        }, 500);
        return true;
    }
    if (!playerAlive && enemyAlive) {
        setTimeout(() => { 
            alert("你输了本轮！"); 
            endBattle(false); 
        }, 500);
        return true;
    }
    if (!playerAlive && !enemyAlive) {
        setTimeout(() => { 
            alert("本轮平局！"); 
            endBattle("draw"); 
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
    target.currentDef = Math.max(0, target.currentDef - dmg);
    
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
    if (isWin === true) {
        const survivors = gameState.board.filter(p => p && p.currentDef > 0).length;
        gameState.enemyGlobalHp -= survivors * 10;
    } else if (isWin === false) {
        const survivors = gameState.enemyBoard.filter(e => e && e.currentDef > 0).length;
        gameState.playerGlobalHp -= survivors * 10;
    }
    // 如果 isWin === "draw"，不扣除任何生命值
    
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
    gameState.phase = "放牌阶段";
    multiState.playerReady = false; // 重置准备状态
    multiState.battleStarted = false; // 重置战斗开始状态
    
    document.getElementById('btn-ready').style.display = 'block';
    document.getElementById('btn-ready').disabled = false;
    document.getElementById('btn-start-battle').style.display = 'none';
    document.getElementById('btn-refresh').disabled = false;
    
    // 每轮增加5点能量，最高不超过10分
    gameState.energy = Math.min(10, gameState.energy + 5);
    
    gameState.board.forEach(c => { if(c) c.currentDef = c.defense; });
    
    // 不要清空敌人，留着下一轮同步覆盖
    // gameState.enemyBoard = Array(6).fill(null);
    
    refreshShop(true);
    updateUI();
    syncState(); // 强制同步一波新回合状态
}


init();