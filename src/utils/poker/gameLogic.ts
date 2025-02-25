import { Card, Suit, Rank, GameState, Player, Action, GameAction, PlayerStatus, PositionName } from '../../types/poker';

// 创建一副新牌
export const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }

  return shuffleDeck(deck);
};

// 洗牌
export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// 根据位置索引获取位置名称
export const getPositionName = (positionIndex: number, playerCount: number): PositionName => {
  // 标准8人桌位置名称
  // BTN (Button) - 庄家位
  // SB (Small Blind) - 小盲位
  // BB (Big Blind) - 大盲位
  // UTG (Under The Gun) - 枪口位
  // UTG+1 - 枪口位+1
  // MP (Middle Position) - 中间位置
  // HJ (Hijack) - 劫机位
  // CO (Cut Off) - 切牌位
  
  // 按照德州扑克标准的顺时针方向排列位置
  // 位置顺序：SB -> BB -> UTG -> UTG+1 -> MP -> HJ -> CO -> BTN -> SB
  // 0: SB (小盲位)
  // 1: BB (大盲位)
  // 2: UTG (枪口位)
  // 3: UTG+1 (枪口位+1)
  // 4: MP (中间位置)
  // 5: HJ (劫机位)
  // 6: CO (切牌位)
  // 7: BTN (庄家位)
  
  const positionNames: PositionName[] = ['SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN'];
  
  // 根据位置索引获取位置名称
  return positionNames[positionIndex % playerCount];
};

// 初始化游戏状态
export const initializeGameState = (): GameState => {
  const players: Player[] = [];
  const playerCount = 8;
  
  // 创建一个人类玩家和7个AI玩家
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: i,
      name: i === 0 ? 'Player' : `AI ${i}`,
      chips: 200, // 200BB
      cards: [],
      isHuman: i === 0,
      position: i,
      positionName: getPositionName(i, playerCount),
      currentBet: 0,
      isActive: true,
      status: 'waiting'
    });
  }

  return {
    isGameStarted: false,
    players,
    communityCards: [],
    pot: 0,
    currentPlayer: 0,
    dealerPosition: 0,
    smallBlind: 0.5, // 0.5BB
    bigBlind: 1, // 1BB
    currentBet: 0,
    deck: createDeck(),
    gamePhase: 'not_started'
  };
};

// 获取下一个应该行动的玩家
const getNextActivePlayer = (state: GameState, startPosition: number): number => {
  const playerCount = state.players.length;
  let nextPlayer = startPosition;
  
  // 寻找下一个未弃牌的玩家
  do {
    nextPlayer = (nextPlayer + 1) % playerCount;
  } while (
    nextPlayer !== startPosition && 
    (!state.players[nextPlayer].isActive || state.players[nextPlayer].status === 'folded')
  );
  
  return nextPlayer;
};

// 获取第一个行动位置
const getFirstActionPosition = (state: GameState): number => {
  const playerCount = state.players.length;
  
  if (state.gamePhase === 'preflop') {
    // 翻牌前从UTG开始
    // UTG在BB后面，即庄家位+3
    let utgPos = (state.dealerPosition + 3) % playerCount;
    
    // 如果UTG已经弃牌，找到之后第一个未弃牌的玩家
    if (!state.players[utgPos].isActive || state.players[utgPos].status === 'folded') {
      return getNextActivePlayer(state, utgPos);
    }
    return utgPos;
  } else {
    // 翻牌后从小盲位开始
    // 如果小盲已经弃牌，找到小盲之后第一个未弃牌的玩家
    const sbPos = (state.dealerPosition + 1) % playerCount;
    if (state.players[sbPos].isActive && state.players[sbPos].status !== 'folded') {
      return sbPos;
    }
    return getNextActivePlayer(state, sbPos);
  }
};

// 开始新游戏
export const startNewGame = (state: GameState): GameState => {
  const newState = { ...state };
  const playerCount = newState.players.length;
  
  // 重置所有玩家状态
  newState.players = newState.players.map(player => ({
    ...player,
    cards: [],
    currentBet: 0,
    isActive: true,
    status: 'waiting'
  }));
  
  // 更新庄家位置
  newState.dealerPosition = (newState.dealerPosition + 1) % playerCount;
  
  // 更新所有玩家的位置名称
  // 位置名称按照顺时针方向轮转：BTN -> SB -> BB -> UTG -> UTG+1 -> MP -> HJ -> CO
  newState.players = newState.players.map((player, index) => {
    // 计算这个玩家相对于庄家的位置偏移
    let relativePosition = (index - newState.dealerPosition + playerCount) % playerCount;
    
    // 将相对位置映射到位置名称
    const positionNames: PositionName[] = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO'];
    const positionName = positionNames[(relativePosition) % playerCount];
    
    return {
      ...player,
      position: index,
      positionName: positionName
    };
  });
  
  // 设置小盲和大盲位置
  const sbPos = (newState.dealerPosition + 1) % playerCount;
  const bbPos = (newState.dealerPosition + 2) % playerCount;
  
  // 收取盲注
  newState.players[sbPos].chips -= newState.smallBlind;
  newState.players[sbPos].currentBet = newState.smallBlind;
  newState.players[bbPos].chips -= newState.bigBlind;
  newState.players[bbPos].currentBet = newState.bigBlind;
  
  // 重置游戏状态
  newState.isGameStarted = true;
  newState.communityCards = [];
  newState.pot = newState.smallBlind + newState.bigBlind;
  newState.currentBet = newState.bigBlind;
  newState.deck = createDeck();
  newState.gamePhase = 'preflop';
  
  // 设置第一个行动的玩家（翻牌前从UTG开始）
  newState.currentPlayer = getFirstActionPosition(newState);
  newState.players[newState.currentPlayer].status = 'acting';
  
  // 发牌
  return dealCards(newState);
};

// 发牌
export const dealCards = (state: GameState): GameState => {
  const newState = { ...state };
  const deck = [...state.deck];
  
  // 给每个玩家发两张牌
  for (let i = 0; i < 2; i++) {
    for (const player of newState.players) {
      if (player.isActive) {
        const card = deck.pop();
        if (card) {
          player.cards.push(card);
        }
      }
    }
  }
  
  newState.deck = deck;
  return newState;
};

// 处理玩家行动
export const handleAction = (state: GameState, action: GameAction): GameState => {
  const newState = { ...state };
  const player = newState.players[action.playerId];
  
  // 记录最后的行动
  newState.lastAction = {
    playerId: action.playerId,
    type: action.type,
    amount: action.amount
  };
  
  switch (action.type) {
    case 'fold':
      player.isActive = false;
      player.status = 'folded';
      break;
      
    case 'call':
      const callAmount = newState.currentBet - player.currentBet;
      player.chips -= callAmount;
      player.currentBet = newState.currentBet;
      newState.pot += callAmount;
      player.status = 'called';
      break;
      
    case 'raise':
      if (action.amount && action.amount > newState.currentBet) {
        const raiseAmount = action.amount - player.currentBet;
        player.chips -= raiseAmount;
        player.currentBet = action.amount;
        newState.currentBet = action.amount;
        newState.pot += raiseAmount;
        player.status = 'raised';
        
        // 当有人加注时，其他已经'called'的玩家状态改为'waiting'
        newState.players.forEach(p => {
          if (p.id !== player.id && p.status === 'called') {
            p.status = 'waiting';
          }
        });
      }
      break;
  }
  
  // 更新下一个玩家
  let nextPlayer = (action.playerId + 1) % 8;
  while (
    nextPlayer !== action.playerId && 
    (!newState.players[nextPlayer].isActive || 
     newState.players[nextPlayer].status === 'folded' ||
     newState.players[nextPlayer].status === 'called')
  ) {
    nextPlayer = (nextPlayer + 1) % 8;
  }
  
  // 如果找到了下一个玩家
  if (nextPlayer !== action.playerId) {
    newState.currentPlayer = nextPlayer;
    newState.players[nextPlayer].status = 'acting';
  }
  
  return newState;
};

// 检查当前回合是否结束
export const isRoundComplete = (state: GameState): boolean => {
  const activePlayers = state.players.filter(p => p.isActive);
  if (activePlayers.length <= 1) return true;
  
  const betsEqual = activePlayers.every(p => 
    p.currentBet === state.currentBet || 
    p.status === 'folded'
  );
  
  const allActed = activePlayers.every(p => 
    p.status === 'called' || 
    p.status === 'folded' ||
    p.status === 'raised'
  );
  
  return betsEqual && allActed;
};

// 进入下一个游戏阶段
export const nextGamePhase = (state: GameState): GameState => {
  const newState = { ...state };
  const deck = [...state.deck];
  
  // 重置玩家状态
  newState.players.forEach(player => {
    if (player.isActive && player.status !== 'folded') {
      player.status = 'waiting';
      player.currentBet = 0; // 清空当前下注
    }
  });
  
  newState.currentBet = 0; // 清空当前最大下注
  
  switch (state.gamePhase) {
    case 'preflop':
      // 发放3张公共牌
      newState.communityCards = deck.splice(0, 3);
      newState.gamePhase = 'flop';
      break;
      
    case 'flop':
      // 发放转牌
      newState.communityCards.push(deck.pop()!);
      newState.gamePhase = 'turn';
      break;
      
    case 'turn':
      // 发放河牌
      newState.communityCards.push(deck.pop()!);
      newState.gamePhase = 'river';
      break;
      
    case 'river':
      newState.gamePhase = 'showdown';
      break;
  }
  
  // 设置第一个行动的玩家（翻牌后从小盲位开始）
  if (newState.gamePhase !== 'showdown') {
    newState.currentPlayer = getFirstActionPosition(newState);
    newState.players[newState.currentPlayer].status = 'acting';
  }
  
  newState.deck = deck;
  return newState;
};

// 重置玩家状态
export const resetPlayerState = (player: Player): Player => {
  return {
    ...player,
    cards: [],
    currentBet: 0,
    isActive: true,
    status: 'waiting',
    chips: player.chips <= 0 ? 200 : player.chips // 如果筹码小于等于0，重置为200BB
  };
};

// 开始新的一轮
export const startNewRound = (state: GameState): GameState => {
  const newState = { ...state };
  
  // 重置所有玩家状态
  newState.players = newState.players.map(resetPlayerState);
  
  // 重置游戏状态
  newState.isGameStarted = false;
  newState.communityCards = [];
  newState.pot = 0;
  newState.currentBet = 0;
  newState.deck = createDeck();
  newState.gamePhase = 'not_started';
  
  return newState;
}; 