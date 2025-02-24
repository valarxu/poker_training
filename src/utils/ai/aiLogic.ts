import { GameState, Player, GameAction, Card } from '../../types/poker';

// 简单的手牌强度评估（这里只是一个示例，实际的GTO策略会更复杂）
const evaluateHandStrength = (playerCards: Card[], communityCards: Card[]): number => {
  // 这里应该实现一个更复杂的手牌评估算法
  // 目前只返回一个0-1之间的随机数作为示例
  return Math.random();
};

// 计算底池赔率
const calculatePotOdds = (state: GameState, player: Player): number => {
  const callAmount = state.currentBet - player.currentBet;
  return callAmount / (state.pot + callAmount);
};

// 基于GTO策略的AI决策
export const makeAIDecision = (state: GameState, playerId: number): GameAction => {
  const player = state.players[playerId];
  const handStrength = evaluateHandStrength(player.cards, state.communityCards);
  const potOdds = calculatePotOdds(state, player);
  
  // 基于手牌强度和底池赔率做出决策
  if (handStrength < 0.2) {
    // 差牌直接弃牌
    return {
      type: 'fold',
      playerId
    };
  }
  
  if (handStrength > 0.8) {
    // 强牌加注
    const raiseAmount = Math.min(
      state.currentBet * 3, // 加注到当前下注的3倍
      player.chips // 不能超过玩家筹码
    );
    
    return {
      type: 'raise',
      playerId,
      amount: raiseAmount
    };
  }
  
  if (handStrength > potOdds) {
    // 如果手牌强度大于底池赔率，选择跟注
    return {
      type: 'call',
      playerId
    };
  }
  
  // 其他情况弃牌
  return {
    type: 'fold',
    playerId
  };
};

// 根据不同的游戏阶段调整策略
export const adjustStrategyByGamePhase = (
  state: GameState,
  playerId: number,
  baseAction: GameAction
): GameAction => {
  const player = state.players[playerId];
  
  switch (state.gamePhase) {
    case 'preflop':
      // 翻前更激进
      if (baseAction.type === 'call' && Math.random() > 0.7) {
        return {
          type: 'raise',
          playerId,
          amount: state.currentBet * 2.5
        };
      }
      break;
      
    case 'river':
      // 河牌更保守
      if (baseAction.type === 'raise' && Math.random() > 0.8) {
        return {
          type: 'call',
          playerId
        };
      }
      break;
  }
  
  return baseAction;
};

// 主要的AI决策函数
export const getAIAction = (state: GameState, playerId: number): GameAction => {
  const baseAction = makeAIDecision(state, playerId);
  return adjustStrategyByGamePhase(state, playerId, baseAction);
}; 