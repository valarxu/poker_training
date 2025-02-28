import { GameState, Player, GameAction, PositionName } from '../../types/poker';
import { evaluateHand } from '../poker/handEvaluator';

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

// 将金额调整为0.5BB的整数倍
const roundToBBMultiple = (amount: number, smallBlind: number): number => {
  // 最小单位是0.5BB，即一个小盲注
  const minUnit = smallBlind;
  
  // 将金额除以最小单位，四舍五入，然后再乘以最小单位
  return Math.round(amount / minUnit) * minUnit;
};

// 计算加注大小
const calculateRaiseAmount = (state: GameState, player: Player, handStrength: number): number => {
  const potSize = state.pot;
  const minRaise = state.currentBet * 2;
  
  // 根据手牌强度和底池大小计算加注
  let raiseAmount = minRaise;
  
  // 根据不同的牌力和游戏阶段调整加注尺寸
  if (state.gamePhase === 'preflop') {
    if (handStrength > 0.9) {
      // 超强牌，加注3-4倍大盲
      raiseAmount = state.bigBlind * (Math.random() < 0.7 ? 3 : 4);
    } else if (handStrength > 0.7) {
      // 强牌，加注2.5-3倍大盲
      raiseAmount = state.bigBlind * (Math.random() < 0.5 ? 2.5 : 3);
    } else {
      // 中等牌，加注2-2.5倍大盲
      raiseAmount = state.bigBlind * (Math.random() < 0.5 ? 2 : 2.5);
    }
    
    // 如果已经有人加注，则考虑3bet尺寸
    if (state.currentBet > state.bigBlind) {
      // 3bet通常是前一个加注的2.5-3倍
      raiseAmount = state.currentBet * (Math.random() < 0.7 ? 2.5 : 3);
    }
  } else {
    // 翻后阶段，根据牌力和底池大小调整下注尺寸
    if (handStrength > 0.9) {
      // 超强牌，下注0.75-1.2倍底池
      raiseAmount = state.currentBet + potSize * (Math.random() < 0.7 ? 1 : 1.2);
    } else if (handStrength > 0.8) {
      // 强牌，下注0.66-0.8倍底池
      raiseAmount = state.currentBet + potSize * (Math.random() < 0.6 ? 0.66 : 0.8);
    } else if (handStrength > 0.6) {
      // 中强牌，下注0.5-0.66倍底池
      raiseAmount = state.currentBet + potSize * (Math.random() < 0.5 ? 0.5 : 0.66);
    } else {
      // 弱牌/诈唬，下注0.33-0.5倍底池
      raiseAmount = state.currentBet + potSize * (Math.random() < 0.7 ? 0.33 : 0.5);
    }
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
  
  // 调整手牌强度，考虑位置权重
  const adjustedStrength = handStrength * (0.8 + positionWeight * 0.2);
  
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
    // 超强起手牌 (AA, KK, QQ, AK等)
    if (adjustedStrength > 0.9) {
      // 如果已经有人加注，降低再次加注的概率，但仍然保持较高加注频率
      if (hasRaised && Math.random() < 0.2) {
        return { type: 'call', playerId };
      }
      // 80%概率加注，20%概率跟注(慢打)
      if (Math.random() < 0.8) {
        return {
          type: 'raise',
          playerId,
          amount: calculateRaiseAmount(state, player, adjustedStrength)
        };
      }
      return { type: 'call', playerId };
    }
    
    // 强力起手牌 (JJ, TT, AQ等)
    if (adjustedStrength > 0.8) {
      // 如果已经有人加注，降低再次加注的概率
      if (hasRaised && Math.random() < 0.4) {
        return { type: 'call', playerId };
      }
      // 60%概率加注，40%概率跟注
      if (Math.random() < 0.6) {
        return {
          type: 'raise',
          playerId,
          amount: calculateRaiseAmount(state, player, adjustedStrength)
        };
      }
      return { type: 'call', playerId };
    }
    
    // 中等起手牌 (99, 88, AJ, KQ等)
    if (adjustedStrength > 0.7) {
      // 如果已经有人加注，大幅降低再次加注的概率
      if (hasRaised && Math.random() < 0.7) {
        return { type: 'call', playerId };
      }
      // 40%概率加注，60%概率跟注
      if (Math.random() < 0.4) {
        return {
          type: 'raise',
          playerId,
          amount: calculateRaiseAmount(state, player, adjustedStrength)
        };
      }
      return { type: 'call', playerId };
    }
    
    // 边缘可玩牌 (小对子，中连张，小高牌等)
    if (adjustedStrength > 0.5) {
      // 如果已经有人加注，几乎不再加注
      if (hasRaised) {
        // 根据底池赔率决定是否跟注
        if (adjustedStrength > potOdds * 1.3) {
          return { type: 'call', playerId };
        }
        return { type: 'fold', playerId };
      }
      
      // 20%概率加注(偷盲或轻度半诈唬)，80%概率跟注
      if (Math.random() < 0.2) {
        return {
          type: 'raise',
          playerId,
          amount: calculateRaiseAmount(state, player, adjustedStrength)
        };
      }
      return { type: 'call', playerId };
    }
    
    // 弱起手牌
    if (adjustedStrength > 0.3) {
      // 如果已经有人加注，几乎总是弃牌
      if (hasRaised) {
        // 极少数情况下跟注(如底池很大且赔率好)
        if (adjustedStrength > potOdds * 1.5 && Math.random() < 0.1) {
          return { type: 'call', playerId };
        }
        return { type: 'fold', playerId };
      }
      
      // 无人加注时，5%概率诈唬加注，15%概率跟注，80%概率弃牌
      const rand = Math.random();
      if (rand < 0.05) {
        return {
          type: 'raise',
          playerId,
          amount: calculateRaiseAmount(state, player, adjustedStrength)
        };
      } else if (rand < 0.2) {
        return { type: 'call', playerId };
      }
    }
    
    return { type: 'fold', playerId };
  }
  
  // 翻牌圈策略
  if (state.gamePhase === 'flop') {
    // 强牌 (成牌或强听牌)
    if (adjustedStrength > 0.8) {
      // 如果已经有人加注，降低再次加注的概率
      if (hasRaised) {
        // 70%概率跟注，30%概率再加注
        if (Math.random() < 0.7) {
          return { type: 'call', playerId };
        }
        return {
          type: 'raise',
          playerId,
          amount: calculateRaiseAmount(state, player, adjustedStrength)
        };
      }
      
      // 无人加注时，80%概率下注，20%概率过牌(慢打)
      if (Math.random() < 0.8) {
        return {
          type: 'raise',
          playerId,
          amount: calculateRaiseAmount(state, player, adjustedStrength)
        };
      }
      return { type: 'call', playerId };
    }
    
    // 中等牌力 (中对，弱顶对，强听牌等)
    if (adjustedStrength > 0.6) {
      // 如果已经有人加注
      if (hasRaised) {
        // 60%概率跟注，5%概率再加注，35%概率弃牌
        const rand = Math.random();
        if (rand < 0.6) {
          return { type: 'call', playerId };
        } else if (rand < 0.65) {
          return {
            type: 'raise',
            playerId,
            amount: calculateRaiseAmount(state, player, adjustedStrength)
          };
        }
        return { type: 'fold', playerId };
      }
      
      // 无人加注时，50%概率下注，50%概率过牌
      if (Math.random() < 0.5) {
        return {
          type: 'raise',
          playerId,
          amount: calculateRaiseAmount(state, player, adjustedStrength)
        };
      }
      return { type: 'call', playerId };
    }
    
    // 弱牌 (听牌或弱对子)
    if (adjustedStrength > 0.4) {
      // 如果已经有人加注
      if (hasRaised) {
        // 30%概率跟注，70%概率弃牌
        if (Math.random() < 0.3 && adjustedStrength > potOdds * 1.2) {
          return { type: 'call', playerId };
        }
        return { type: 'fold', playerId };
      }
      
      // 无人加注时，20%概率诈唬下注，80%概率过牌
      if (Math.random() < 0.2) {
        return {
          type: 'raise',
          playerId,
          amount: calculateRaiseAmount(state, player, adjustedStrength)
        };
      }
      return { type: 'call', playerId };
    }
    
    // 极弱牌
    if (hasRaised) {
      // 几乎总是弃牌，极少数情况下跟注
      if (Math.random() < 0.05 && adjustedStrength > potOdds * 1.5) {
        return { type: 'call', playerId };
      }
      return { type: 'fold', playerId };
    }
    
    // 无人加注时，10%概率诈唬下注，90%概率过牌
    if (Math.random() < 0.1) {
      return {
        type: 'raise',
        playerId,
        amount: calculateRaiseAmount(state, player, adjustedStrength)
      };
    }
    return { type: 'call', playerId };
  }
  
  // 转牌和河牌策略
  // 强牌
  if (adjustedStrength > 0.8) {
    // 如果已经有人加注
    if (hasRaised) {
      // 河牌圈强牌更倾向于跟注而非再加注
      if (state.gamePhase === 'river' && Math.random() < 0.8) {
        return { type: 'call', playerId };
      }
      
      // 转牌圈60%概率跟注，40%概率再加注
      if (Math.random() < 0.6) {
        return { type: 'call', playerId };
      }
      return {
        type: 'raise',
        playerId,
        amount: calculateRaiseAmount(state, player, adjustedStrength)
      };
    }
    
    // 无人加注时，85%概率下注，15%概率过牌(慢打)
    // 河牌圈强牌更倾向于下注
    const betProb = state.gamePhase === 'river' ? 0.9 : 0.85;
    if (Math.random() < betProb) {
      return {
        type: 'raise',
        playerId,
        amount: calculateRaiseAmount(state, player, adjustedStrength)
      };
    }
    return { type: 'call', playerId };
  }
  
  // 中强牌
  if (adjustedStrength > 0.6) {
    // 如果已经有人加注
    if (hasRaised) {
      // 河牌圈中强牌更倾向于弃牌而非跟注
      if (state.gamePhase === 'river') {
        if (Math.random() < 0.4 && adjustedStrength > potOdds * 1.3) {
          return { type: 'call', playerId };
        }
        return { type: 'fold', playerId };
      }
      
      // 转牌圈50%概率跟注，50%概率弃牌
      if (Math.random() < 0.5 && adjustedStrength > potOdds * 1.2) {
        return { type: 'call', playerId };
      }
      return { type: 'fold', playerId };
    }
    
    // 无人加注时
    // 河牌圈中强牌更倾向于过牌
    if (state.gamePhase === 'river') {
      if (Math.random() < 0.3) {
        return {
          type: 'raise',
          playerId,
          amount: calculateRaiseAmount(state, player, adjustedStrength)
        };
      }
      return { type: 'call', playerId };
    }
    
    // 转牌圈40%概率下注，60%概率过牌
    if (Math.random() < 0.4) {
      return {
        type: 'raise',
        playerId,
        amount: calculateRaiseAmount(state, player, adjustedStrength)
      };
    }
    return { type: 'call', playerId };
  }
  
  // 弱牌
  if (hasRaised) {
    // 几乎总是弃牌，极少数情况下跟注
    // 河牌圈更倾向于弃牌
    const callProb = state.gamePhase === 'river' ? 0.05 : 0.1;
    if (Math.random() < callProb && adjustedStrength > potOdds * 1.5) {
      return { type: 'call', playerId };
    }
    return { type: 'fold', playerId };
  }
  
  // 无人加注时
  // 河牌圈弱牌几乎不诈唬
  if (state.gamePhase === 'river') {
    if (Math.random() < 0.05) {
      return {
        type: 'raise',
        playerId,
        amount: calculateRaiseAmount(state, player, adjustedStrength)
      };
    }
    return { type: 'call', playerId };
  }
  
  // 转牌圈15%概率诈唬下注，85%概率过牌
  if (Math.random() < 0.15) {
    return {
      type: 'raise',
      playerId,
      amount: calculateRaiseAmount(state, player, adjustedStrength)
    };
  }
  return { type: 'call', playerId };
};

// 主要的AI决策函数
export const getAIAction = (state: GameState, playerId: number): GameAction => {
  const player = state.players[playerId];
  const handEvaluation = evaluateHand(player.cards, state.communityCards);
  const positionWeight = positionWeights[player.positionName];
  
  return makeGTODecision(state, playerId, handEvaluation.strength, positionWeight);
};