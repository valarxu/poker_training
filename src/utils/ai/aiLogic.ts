import { GameState, Player, GameAction, Card, PositionName } from '../../types/poker';
import { evaluateHand, calculateStartingHandStrength } from '../poker/handEvaluator';

// 位置权重
const positionWeights: { [key in PositionName]: number } = {
  'BTN': 1.0,  // 庄家位，最强位置
  'CO': 0.9,   // 切牌位，次强位置
  'HJ': 0.8,   // 劫机位
  'MP': 0.7,   // 中间位置
  'UTG+1': 0.6, // 枪口位+1
  'UTG': 0.5,  // 枪口位，最弱位置
  'SB': 0.65,  // 小盲位，特殊位置
  'BB': 0.55   // 大盲位，特殊位置
};

// 计算底池赔率
const calculatePotOdds = (state: GameState, player: Player): number => {
  const callAmount = state.currentBet - player.currentBet;
  return callAmount / (state.pot + callAmount);
};

// 计算有效栈深
const calculateEffectiveStack = (state: GameState, player: Player): number => {
  const otherActivePlayers = state.players.filter(p => 
    p.id !== player.id && p.isActive && p.status !== 'folded'
  );
  const minOtherStack = Math.min(...otherActivePlayers.map(p => p.chips));
  return Math.min(player.chips, minOtherStack);
};

// 将金额调整为0.5BB的整数倍
const roundToBBMultiple = (amount: number, smallBlind: number): number => {
  // 一个大盲注等于两个小盲注
  const bbUnit = smallBlind * 2;
  // 最小单位是0.5BB，即一个小盲注
  const minUnit = smallBlind;
  
  // 将金额除以最小单位，四舍五入，然后再乘以最小单位
  return Math.round(amount / minUnit) * minUnit;
};

// 计算加注大小
const calculateRaiseAmount = (state: GameState, player: Player, handStrength: number): number => {
  const effectiveStack = calculateEffectiveStack(state, player);
  const potSize = state.pot;
  const minRaise = state.currentBet * 2;
  
  // 根据手牌强度和底池大小计算加注
  let raiseAmount = minRaise;
  
  if (handStrength > 0.9) {
    // 超强牌，加注0.8倍底池
    raiseAmount = state.currentBet + potSize * 0.8;
  } else if (handStrength > 0.8) {
    // 强牌，加注0.6倍底池
    raiseAmount = state.currentBet + potSize * 0.6;
  } else if (handStrength > 0.7) {
    // 中强牌，加注0.4倍底池
    raiseAmount = state.currentBet + potSize * 0.4;
  } else {
    // 普通牌，加注0.2倍底池
    raiseAmount = state.currentBet + potSize * 0.2;
  }
  
  // 确保加注金额不小于最小加注
  raiseAmount = Math.max(raiseAmount, minRaise);
  
  // 确保加注金额不超过玩家筹码
  raiseAmount = Math.min(raiseAmount, player.chips + player.currentBet);
  
  // 将加注金额调整为0.5BB的整数倍
  return roundToBBMultiple(raiseAmount, state.smallBlind);
};

// GTO策略决策
const makeGTODecision = (
  state: GameState,
  playerId: number,
  handStrength: number,
  positionWeight: number
): GameAction => {
  const player = state.players[playerId];
  const potOdds = calculatePotOdds(state, player);
  const effectiveStack = calculateEffectiveStack(state, player);
  
  // 调整手牌强度，考虑位置权重
  const adjustedStrength = handStrength * positionWeight;
  
  // 如果玩家筹码不足以跟注，只能选择ALL IN或弃牌
  if (player.chips < state.currentBet - player.currentBet) {
    // 如果手牌足够强，选择ALL IN
    if (adjustedStrength > potOdds * 1.2) {
      return {
        type: 'all-in',
        playerId,
        amount: player.chips + player.currentBet
      };
    } else {
      return { type: 'fold', playerId };
    }
  }
  
  // 检查是否已经有人加注，如果有，降低再次加注的概率
  const hasRaised = state.lastRaisePlayerId !== undefined;
  
  // 翻前策略
  if (state.gamePhase === 'preflop') {
    // 强力起手牌
    if (adjustedStrength > 0.8) {
      // 如果已经有人加注，降低再次加注的概率
      if (hasRaised && Math.random() < 0.4) {
        return { type: 'call', playerId };
      }
      return {
        type: 'raise',
        playerId,
        amount: calculateRaiseAmount(state, player, adjustedStrength)
      };
    }
    
    // 中等起手牌
    if (adjustedStrength > 0.6) {
      // 如果已经有人加注，大幅降低再次加注的概率
      if (hasRaised && Math.random() < 0.7) {
        return { type: 'call', playerId };
      }
      // 50%概率加注，50%概率跟注
      if (Math.random() < 0.5) {
        return {
          type: 'raise',
          playerId,
          amount: calculateRaiseAmount(state, player, adjustedStrength)
        };
      }
      return { type: 'call', playerId };
    }
    
    // 弱起手牌
    if (adjustedStrength > potOdds * 1.2) {
      return { type: 'call', playerId };
    }
    
    return { type: 'fold', playerId };
  }
  
  // 翻后策略
  // 强牌
  if (adjustedStrength > 0.8) {
    const raiseAmount = calculateRaiseAmount(state, player, adjustedStrength);
    // 如果已经有人加注，降低再次加注的概率
    if (hasRaised && Math.random() < 0.3) {
      return { type: 'call', playerId };
    }
    // 70%概率加注
    if (Math.random() < 0.7) {
      return { type: 'raise', playerId, amount: raiseAmount };
    }
    return { type: 'call', playerId };
  }
  
  // 中强牌
  if (adjustedStrength > 0.6) {
    const raiseAmount = calculateRaiseAmount(state, player, adjustedStrength);
    // 如果已经有人加注，大幅降低再次加注的概率
    if (hasRaised && Math.random() < 0.6) {
      return { type: 'call', playerId };
    }
    // 40%概率加注
    if (Math.random() < 0.4) {
      return { type: 'raise', playerId, amount: raiseAmount };
    }
    return { type: 'call', playerId };
  }
  
  // 中等牌力
  if (adjustedStrength > potOdds * 1.5) {
    // 如果已经有人加注，几乎不再加注
    if (hasRaised && Math.random() < 0.9) {
      return { type: 'call', playerId };
    }
    // 20%概率加注
    if (Math.random() < 0.2) {
      return {
        type: 'raise',
        playerId,
        amount: calculateRaiseAmount(state, player, adjustedStrength)
      };
    }
    return { type: 'call', playerId };
  }
  
  // 弱牌
  if (adjustedStrength > potOdds * 1.2) {
    return { type: 'call', playerId };
  }
  
  return { type: 'fold', playerId };
};

// 主要的AI决策函数
export const getAIAction = (state: GameState, playerId: number): GameAction => {
  const player = state.players[playerId];
  const handEvaluation = evaluateHand(player.cards, state.communityCards);
  const positionWeight = positionWeights[player.positionName];
  
  return makeGTODecision(state, playerId, handEvaluation.strength, positionWeight);
};