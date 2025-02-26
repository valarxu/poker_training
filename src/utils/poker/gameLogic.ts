import { Card, Suit, Rank, GameState, Player, Action, GameAction, PlayerStatus, PositionName, GamePhase } from '../../types/poker';
import { evaluateHand } from './handEvaluator';

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
    
    // 如果UTG已经弃牌或全押，找到之后第一个可以行动的玩家
    if (!state.players[utgPos].isActive || 
        state.players[utgPos].status === 'folded' || 
        state.players[utgPos].status === 'all-in') {
      return findNextActivePlayerFromPosition(state, utgPos);
    }
    return utgPos;
  } else {
    // 翻牌后从小盲位开始
    // 如果小盲已经弃牌或全押，找到小盲之后第一个可以行动的玩家
    const sbPos = (state.dealerPosition + 1) % playerCount;
    if (state.players[sbPos].isActive && 
        state.players[sbPos].status !== 'folded' && 
        state.players[sbPos].status !== 'all-in') {
      return sbPos;
    }
    return findNextActivePlayerFromPosition(state, sbPos);
  }
};

// 从指定位置开始寻找下一个可以行动的玩家
const findNextActivePlayerFromPosition = (state: GameState, startPosition: number): number => {
  const playerCount = state.players.length;
  let nextPlayer = (startPosition + 1) % playerCount;
  let startPlayer = nextPlayer;
  
  // 循环查找下一个可以行动的玩家
  do {
    const player = state.players[nextPlayer];
    
    // 如果玩家可以行动（未弃牌、未全押）
    if (player.isActive && 
        player.status !== 'folded' && 
        player.status !== 'all-in') {
      return nextPlayer;
    }
    
    nextPlayer = (nextPlayer + 1) % playerCount;
  } while (nextPlayer !== startPlayer);
  
  // 如果没有找到下一个可以行动的玩家，返回-1
  return -1;
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
  newState.lastRaisePlayerId = undefined; // 重置最后加注玩家ID
  
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
      player.status = 'folded';
      break;
      
    case 'call':
      const callAmount = Math.min(newState.currentBet - player.currentBet, player.chips);
      player.chips -= callAmount;
      player.currentBet += callAmount;
      newState.pot += callAmount;
      
      // 如果玩家筹码不足以完全跟注，标记为ALL IN
      if (player.currentBet < newState.currentBet) {
        player.status = 'all-in';
      } else {
        player.status = 'called';
      }
      break;
      
    case 'raise':
      if (action.amount && action.amount > newState.currentBet) {
        // 确保加注金额不超过玩家筹码
        const maxRaiseAmount = player.chips + player.currentBet;
        const actualRaiseAmount = Math.min(action.amount, maxRaiseAmount);
        
        const raiseAmount = actualRaiseAmount - player.currentBet;
        player.chips -= raiseAmount;
        player.currentBet = actualRaiseAmount;
        
        // 更新当前最大下注
        newState.currentBet = actualRaiseAmount;
        newState.pot += raiseAmount;
        
        // 如果玩家用完所有筹码，标记为ALL IN
        if (player.chips === 0) {
          player.status = 'all-in';
        } else {
          player.status = 'raised';
        }
        
        // 记录最后加注的玩家ID
        newState.lastRaisePlayerId = player.id;
        
        // 当有人加注时，其他玩家状态改为'waiting'，除非已经弃牌或全押
        newState.players.forEach(p => {
          if (p.id !== player.id && p.status !== 'folded' && p.status !== 'all-in') {
            p.status = 'waiting';
          }
        });
      }
      break;
      
    case 'all-in':
      // 玩家ALL IN，下注所有筹码
      const allInAmount = player.chips;
      player.chips = 0;
      player.currentBet += allInAmount;
      newState.pot += allInAmount;
      player.status = 'all-in';
      
      // 如果ALL IN金额大于当前最大下注，视为加注
      if (player.currentBet > newState.currentBet) {
        newState.currentBet = player.currentBet;
        
        // 记录最后加注的玩家ID
        newState.lastRaisePlayerId = player.id;
        
        // 当有人加注时，其他玩家状态改为'waiting'，除非已经弃牌或全押
        newState.players.forEach(p => {
          if (p.id !== player.id && p.status !== 'folded' && p.status !== 'all-in') {
            p.status = 'waiting';
          }
        });
      }
      break;
  }
  
  // 检查当前回合是否结束
  if (isRoundComplete(newState)) {
    // 如果回合结束，进入下一阶段
    return nextGamePhase(newState);
  }
  
  // 更新下一个玩家
  const nextPlayer = findNextActivePlayerFromPosition(newState, action.playerId);
  
  // 如果找到了下一个玩家
  if (nextPlayer !== -1) {
    newState.currentPlayer = nextPlayer;
    newState.players[nextPlayer].status = 'acting';
  } else {
    // 如果没有找到下一个玩家，进入下一阶段
    return nextGamePhase(newState);
  }
  
  return newState;
};

// 检查当前回合是否结束
export const isRoundComplete = (state: GameState): boolean => {
  // 如果只剩下一个未弃牌的玩家，回合结束
  const nonFoldedPlayers = state.players.filter(p => 
    p.isActive && p.status !== 'folded'
  );
  if (nonFoldedPlayers.length <= 1) return true;
  
  // 如果所有未弃牌的玩家都已经ALL IN，回合结束
  const nonAllInPlayers = state.players.filter(p => 
    p.isActive && p.status !== 'folded' && p.status !== 'all-in'
  );
  if (nonAllInPlayers.length === 0) return true;
  
  // 如果只有一个未ALL IN的玩家，且其他玩家都已经ALL IN或弃牌，回合结束
  if (nonAllInPlayers.length === 1) {
    // 检查这个玩家是否已经跟注到最大下注
    const player = nonAllInPlayers[0];
    if (player.currentBet === state.currentBet) {
      return true;
    }
  }
  
  // 检查所有活跃玩家是否都已经行动
  const allActed = nonAllInPlayers.every(p => 
    p.status === 'called' || 
    p.status === 'raised'
  );
  
  // 检查所有活跃玩家的下注是否相等
  const betsEqual = nonAllInPlayers.every(p => 
    p.currentBet === state.currentBet
  );
  
  // 如果有最后加注的玩家，检查是否已经轮到了他的下一个玩家
  if (state.lastRaisePlayerId !== undefined) {
    // 找到最后加注玩家的下一个活跃玩家
    const lastRaisePlayerIndex = state.players.findIndex(p => p.id === state.lastRaisePlayerId);
    let nextPlayerIndex = (lastRaisePlayerIndex + 1) % state.players.length;
    let foundNextActivePlayer = false;
    
    // 循环查找下一个活跃玩家
    while (nextPlayerIndex !== lastRaisePlayerIndex) {
      const nextPlayer = state.players[nextPlayerIndex];
      if (nextPlayer.isActive && nextPlayer.status !== 'folded' && nextPlayer.status !== 'all-in') {
        foundNextActivePlayer = true;
        break;
      }
      nextPlayerIndex = (nextPlayerIndex + 1) % state.players.length;
    }
    
    // 如果没有找到下一个活跃玩家，或者所有玩家都已经行动且下注相等，回合结束
    if (!foundNextActivePlayer || (allActed && betsEqual)) {
      return true;
    }
    
    // 检查是否已经回到了最后加注玩家
    // 如果当前玩家是最后加注玩家，且所有玩家都已经行动且下注相等，回合结束
    if (state.currentPlayer === state.lastRaisePlayerId && allActed && betsEqual) {
      return true;
    }
  }
  
  // 如果所有玩家都已经行动且下注相等，回合结束
  return allActed && betsEqual;
};

// 处理摊牌阶段
export const handleShowdown = (state: GameState): GameState => {
  // 如果只有一个玩家没有弃牌，直接将奖池分配给他
  const activePlayers = state.players.filter(p => p.status !== 'folded');
  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    return {
      ...state,
      players: state.players.map(player => {
        if (player.id === winner.id) {
          return {
            ...player,
            chips: player.chips + state.pot
          };
        }
        return player;
      }),
      pot: 0,
      isGameStarted: true, // 保持游戏状态为已开始
      showdownResults: {
        winners: [winner.id],
        handRanks: [{
          playerId: winner.id,
          handRank: 0,
          handStrength: 0
        }]
      }
    };
  }

  // 评估每个玩家的手牌
  const handRanks = activePlayers.map(player => {
    const evaluation = evaluateHand(player.cards, state.communityCards);
    return {
      playerId: player.id,
      handRank: evaluation.rank,
      handStrength: evaluation.strength,
      bestHand: evaluation.bestHand
    };
  });

  // 按手牌强度排序
  handRanks.sort((a, b) => b.handStrength - a.handStrength);

  // 确定赢家（可能有多个赢家，如果有平局）
  const highestStrength = handRanks[0].handStrength;
  const winners = handRanks
    .filter(hr => Math.abs(hr.handStrength - highestStrength) < 0.0001)
    .map(hr => hr.playerId);

  // 分配奖池
  const winAmount = Math.floor(state.pot / winners.length);
  const remainder = state.pot % winners.length;

  const updatedPlayers = state.players.map(player => {
    if (winners.includes(player.id)) {
      // 如果是赢家，分配奖池
      const extraChip = winners.indexOf(player.id) < remainder ? 1 : 0;
      return {
        ...player,
        chips: player.chips + winAmount + extraChip
      };
    }
    return player;
  });

  return {
    ...state,
    players: updatedPlayers,
    pot: 0,
    isGameStarted: true, // 保持游戏状态为已开始
    showdownResults: {
      winners,
      handRanks
    }
  };
};

// 进入下一个游戏阶段
export const nextGamePhase = (state: GameState): GameState => {
  // 重置玩家状态
  const resetPlayers = state.players.map(player => ({
    ...player,
    currentBet: 0,
    hasTakenAction: false
  }));

  let nextPhase: GamePhase;
  let updatedCommunityCards = [...state.communityCards];

  switch (state.gamePhase) {
    case 'preflop':
      nextPhase = 'flop';
      // 发三张公共牌
      updatedCommunityCards = state.deck.slice(0, 3);
      break;
    case 'flop':
      nextPhase = 'turn';
      // 发第四张公共牌
      updatedCommunityCards = [...state.communityCards, state.deck[3]];
      break;
    case 'turn':
      nextPhase = 'river';
      // 发第五张公共牌
      updatedCommunityCards = [...state.communityCards, state.deck[4]];
      break;
    case 'river':
      nextPhase = 'showdown';
      // 进入摊牌阶段
      const showdownState = {
        ...state,
        players: resetPlayers,
        gamePhase: nextPhase,
        currentPlayer: -1,
        lastRaisePlayerId: undefined
      };
      return handleShowdown(showdownState);
    case 'showdown':
    default:
      // 游戏结束，开始新一轮
      return startNewRound(state);
  }

  // 找到下一个应该行动的玩家
  const nextActivePlayer = findNextActivePlayerFromPosition(state, state.dealerPosition);
  
  // 如果找不到下一个活跃玩家，直接进入下一阶段
  if (nextActivePlayer === -1) {
    return nextGamePhase({
      ...state,
      players: resetPlayers,
      gamePhase: nextPhase,
      communityCards: updatedCommunityCards
    });
  }

  // 设置下一个玩家为行动状态
  const updatedPlayers = resetPlayers.map((player, index) => {
    if (index === nextActivePlayer) {
      return {
        ...player,
        status: 'acting' as PlayerStatus
      };
    }
    return player;
  });

  return {
    ...state,
    players: updatedPlayers,
    gamePhase: nextPhase,
    communityCards: updatedCommunityCards,
    currentPlayer: nextActivePlayer,
    lastRaisePlayerId: undefined
  };
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
  newState.lastRaisePlayerId = undefined; // 重置最后加注玩家ID
  newState.showdownResults = undefined; // 重置摊牌结果
  
  return newState;
}; 