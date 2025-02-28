import { Card, Rank, Suit } from '../../types/poker';

// 牌力等级
export enum HandRank {
  HighCard,
  Pair,
  TwoPair,
  ThreeOfAKind,
  Straight,
  Flush,
  FullHouse,
  FourOfAKind,
  StraightFlush,
  RoyalFlush
}

// 牌的数值映射
const rankValues: { [key in Rank]: number } = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14
};

// 牌型概率分布（基于7张牌中最佳5张的统计）
const handRankProbabilities = {
  [HandRank.HighCard]: 0.174,      // 高牌：17.4%
  [HandRank.Pair]: 0.438,          // 一对：43.8%
  [HandRank.TwoPair]: 0.235,       // 两对：23.5%
  [HandRank.ThreeOfAKind]: 0.0483, // 三条：4.83%
  [HandRank.Straight]: 0.0462,     // 顺子：4.62%
  [HandRank.Flush]: 0.0303,        // 同花：3.03%
  [HandRank.FullHouse]: 0.026,     // 葫芦：2.6%
  [HandRank.FourOfAKind]: 0.00168, // 四条：0.168%
  [HandRank.StraightFlush]: 0.00031, // 同花顺：0.031%
  [HandRank.RoyalFlush]: 0.0000015  // 皇家同花顺：0.00015%
};

// 计算牌型基础强度（累积概率）
const handRankBaseStrength: { [key in HandRank]: number } = (() => {
  const result = {} as { [key in HandRank]: number };
  let cumulativeProbability = 0;
  
  // 从最低牌型开始累加概率
  for (let rank = HandRank.HighCard; rank <= HandRank.RoyalFlush; rank++) {
    result[rank] = cumulativeProbability;
    cumulativeProbability += handRankProbabilities[rank as HandRank];
  }
  
  return result;
})();

// 计算起手牌强度
export const calculateStartingHandStrength = (cards: Card[]): number => {
  if (cards.length !== 2) return 0;
  
  const [card1, card2] = cards;
  const rank1 = rankValues[card1.rank];
  const rank2 = rankValues[card2.rank];
  const suited = card1.suit === card2.suit;
  
  // 口袋对子
  if (rank1 === rank2) {
    // AA = 1.0, 22 = 0.5
    return 0.5 + (rank1 - 2) / 24;
  }
  
  // 高牌组合
  const highCard = Math.max(rank1, rank2);
  const lowCard = Math.min(rank1, rank2);
  const gap = highCard - lowCard - 1;
  
  // 计算基础分数
  let score = (highCard / 14) * 0.7 + (lowCard / 14) * 0.3;
  
  // 同花加成
  if (suited) score += 0.1;
  
  // 连牌加成
  if (gap === 0) score += 0.1;
  else if (gap === 1) score += 0.05;
  
  // AK特殊加成
  if (highCard === 14 && lowCard === 13) score += 0.1;
  
  return Math.min(score, 1);
};

// 检查是否是顺子
const isStraight = (ranks: number[]): boolean => {
  const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => a - b);
  if (uniqueRanks.length < 5) return false;
  
  // 处理A2345的特殊情况
  if (uniqueRanks.includes(14)) {
    const lowStraight = [2, 3, 4, 5, 14];
    if (lowStraight.every(rank => uniqueRanks.includes(rank))) return true;
  }
  
  // 检查常规顺子
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) return true;
  }
  return false;
};

// 获取所有对子、三条、四条
const getGroups = (ranks: number[]): { pairs: number[], trips: number[], quads: number[] } => {
  const count = new Map<number, number>();
  ranks.forEach(rank => count.set(rank, (count.get(rank) || 0) + 1));
  
  return {
    pairs: Array.from(count.entries()).filter(([_, c]) => c === 2).map(([r]) => r),
    trips: Array.from(count.entries()).filter(([_, c]) => c === 3).map(([r]) => r),
    quads: Array.from(count.entries()).filter(([_, c]) => c === 4).map(([r]) => r)
  };
};

// 评估最终牌力
export const evaluateHand = (holeCards: Card[], communityCards: Card[]): { rank: HandRank, strength: number, bestHand?: Card[] } => {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 2) return { rank: HandRank.HighCard, strength: 0 };
  
  // 如果只有起手牌，使用起手牌评估
  if (allCards.length === 2) {
    return {
      rank: HandRank.HighCard,
      strength: calculateStartingHandStrength(holeCards),
      bestHand: holeCards
    };
  }
  
  const ranks = allCards.map(card => rankValues[card.rank]);
  const groups = getGroups(ranks);
  
  // 检查同花顺和皇家同花顺
  for (const suit of ['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]) {
    const sameSuitCards = allCards.filter(card => card.suit === suit);
    if (sameSuitCards.length >= 5) {
      const sameSuitRanks = sameSuitCards.map(card => rankValues[card.rank]);
      if (isStraight(sameSuitRanks)) {
        // 找出同花顺的五张牌
        const sortedCards = [...sameSuitCards].sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);
        
        // 处理A2345的特殊情况
        if (sortedCards.some(card => card.rank === 'A') && 
            sortedCards.some(card => card.rank === '2') && 
            sortedCards.some(card => card.rank === '3') && 
            sortedCards.some(card => card.rank === '4') && 
            sortedCards.some(card => card.rank === '5')) {
          const ace = sortedCards.find(card => card.rank === 'A')!;
          const two = sortedCards.find(card => card.rank === '2')!;
          const three = sortedCards.find(card => card.rank === '3')!;
          const four = sortedCards.find(card => card.rank === '4')!;
          const five = sortedCards.find(card => card.rank === '5')!;
          const bestHand = [ace, two, three, four, five];
          
          // A-5同花顺是最低的同花顺
          const baseStrength = handRankBaseStrength[HandRank.StraightFlush];
          const rankFraction = 0; // 最低同花顺
          const strengthRange = handRankProbabilities[HandRank.StraightFlush] + handRankProbabilities[HandRank.RoyalFlush];
          return { 
            rank: HandRank.StraightFlush, 
            strength: baseStrength + (rankFraction * strengthRange * 0.99), 
            bestHand 
          };
        }
        
        // 常规同花顺
        const maxRank = Math.max(...sameSuitRanks);
        const bestHand = sortedCards.slice(0, 5);
        
        if (maxRank === 14 && bestHand.some(card => card.rank === 'K')) {
          // 皇家同花顺
          return { 
            rank: HandRank.RoyalFlush, 
            strength: 1, 
            bestHand 
          };
        }
        
        // 普通同花顺
        const baseStrength = handRankBaseStrength[HandRank.StraightFlush];
        // 计算在同花顺中的相对强度（5高到K高）
        const rankFraction = (maxRank - 5) / 8; // 5是最低顺子，13是K高顺子
        const strengthRange = handRankProbabilities[HandRank.StraightFlush] + handRankProbabilities[HandRank.RoyalFlush];
        return { 
          rank: HandRank.StraightFlush, 
          strength: baseStrength + (rankFraction * strengthRange * 0.99), 
          bestHand 
        };
      }
    }
  }
  
  // 四条
  if (groups.quads.length > 0) {
    const quadRank = Math.max(...groups.quads);
    const quadCards = allCards.filter(card => rankValues[card.rank] === quadRank);
    const kickers = allCards
      .filter(card => rankValues[card.rank] !== quadRank)
      .sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);
    
    const bestHand = [...quadCards, kickers[0]];
    
    const baseStrength = handRankBaseStrength[HandRank.FourOfAKind];
    // 四条的相对强度主要由四条牌值决定，其次是踢脚
    const rankFraction = (quadRank - 2) / 12 + (rankValues[kickers[0].rank] - 2) / (12 * 13);
    const strengthRange = handRankProbabilities[HandRank.FourOfAKind];
    return { 
      rank: HandRank.FourOfAKind, 
      strength: baseStrength + (rankFraction * strengthRange * 0.99), 
      bestHand 
    };
  }
  
  // 葫芦
  if (groups.trips.length > 0 && groups.pairs.length > 0) {
    const tripRank = Math.max(...groups.trips);
    const tripCards = allCards.filter(card => rankValues[card.rank] === tripRank);
    
    const pairRank = Math.max(...groups.pairs);
    const pairCards = allCards.filter(card => rankValues[card.rank] === pairRank);
    
    const bestHand = [...tripCards, ...pairCards.slice(0, 2)];
    
    const baseStrength = handRankBaseStrength[HandRank.FullHouse];
    // 葫芦的相对强度主要由三条牌值决定，其次是对子
    const rankFraction = (tripRank - 2) / 12 + (pairRank - 2) / (12 * 13);
    const strengthRange = handRankProbabilities[HandRank.FullHouse];
    return { 
      rank: HandRank.FullHouse, 
      strength: baseStrength + (rankFraction * strengthRange * 0.99), 
      bestHand 
    };
  }
  
  // 同花
  const flushSuit = allCards.find(card => 
    allCards.filter(c => c.suit === card.suit).length >= 5
  )?.suit;
  if (flushSuit) {
    const flushCards = allCards
      .filter(card => card.suit === flushSuit)
      .sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);
    
    const bestHand = flushCards.slice(0, 5);
    const ranks = bestHand.map(card => rankValues[card.rank]);
    
    const baseStrength = handRankBaseStrength[HandRank.Flush];
    // 同花的相对强度由5张牌的大小决定，主要是最大牌
    const rankFraction = (ranks[0] - 2) / 12 + 
                         (ranks[1] - 2) / (12 * 13) + 
                         (ranks[2] - 2) / (12 * 13 * 13) + 
                         (ranks[3] - 2) / (12 * 13 * 13 * 13) + 
                         (ranks[4] - 2) / (12 * 13 * 13 * 13 * 13);
    const strengthRange = handRankProbabilities[HandRank.Flush];
    return { 
      rank: HandRank.Flush, 
      strength: baseStrength + (rankFraction * strengthRange * 0.99), 
      bestHand 
    };
  }
  
  // 顺子
  if (isStraight(ranks)) {
    // 找出顺子的五张牌
    const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => a - b);
    
    // 处理A2345的特殊情况
    if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && 
        uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
      const ace = allCards.find(card => card.rank === 'A')!;
      const two = allCards.find(card => card.rank === '2')!;
      const three = allCards.find(card => card.rank === '3')!;
      const four = allCards.find(card => card.rank === '4')!;
      const five = allCards.find(card => card.rank === '5')!;
      
      const bestHand = [ace, two, three, four, five];
      
      const baseStrength = handRankBaseStrength[HandRank.Straight];
      // A-5顺子是最低的顺子
      const rankFraction = 0;
      const strengthRange = handRankProbabilities[HandRank.Straight];
      return { 
        rank: HandRank.Straight, 
        strength: baseStrength + (rankFraction * strengthRange * 0.99), 
        bestHand 
      };
    }
    
    // 常规顺子
    for (let i = uniqueRanks.length - 1; i >= 4; i--) {
      if (uniqueRanks[i] - uniqueRanks[i-4] === 4) {
        const straightRanks = uniqueRanks.slice(i-4, i+1);
        const bestHand = straightRanks.map(rank => 
          allCards.find(card => rankValues[card.rank] === rank)!
        );
        
        const maxRank = Math.max(...straightRanks);
        
        const baseStrength = handRankBaseStrength[HandRank.Straight];
        // 顺子的相对强度由最大牌决定
        const rankFraction = (maxRank - 5) / 9; // 5高到A高
        const strengthRange = handRankProbabilities[HandRank.Straight];
        return { 
          rank: HandRank.Straight, 
          strength: baseStrength + (rankFraction * strengthRange * 0.99), 
          bestHand 
        };
      }
    }
  }
  
  // 三条
  if (groups.trips.length > 0) {
    const tripRank = Math.max(...groups.trips);
    const tripCards = allCards.filter(card => rankValues[card.rank] === tripRank);
    
    const kickers = allCards
      .filter(card => rankValues[card.rank] !== tripRank)
      .sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);
    
    const bestHand = [...tripCards, ...kickers.slice(0, 2)];
    const kickerRanks = kickers.slice(0, 2).map(card => rankValues[card.rank]);
    
    const baseStrength = handRankBaseStrength[HandRank.ThreeOfAKind];
    // 三条的相对强度主要由三条牌值决定，其次是踢脚
    const rankFraction = (tripRank - 2) / 12 + 
                         (kickerRanks[0] - 2) / (12 * 13) + 
                         (kickerRanks[1] - 2) / (12 * 13 * 13);
    const strengthRange = handRankProbabilities[HandRank.ThreeOfAKind];
    return { 
      rank: HandRank.ThreeOfAKind, 
      strength: baseStrength + (rankFraction * strengthRange * 0.99), 
      bestHand 
    };
  }
  
  // 两对
  if (groups.pairs.length >= 2) {
    const sortedPairs = [...groups.pairs].sort((a, b) => b - a);
    const [highPairRank, lowPairRank] = sortedPairs;
    
    const highPairCards = allCards.filter(card => rankValues[card.rank] === highPairRank);
    const lowPairCards = allCards.filter(card => rankValues[card.rank] === lowPairRank);
    
    const kickers = allCards
      .filter(card => rankValues[card.rank] !== highPairRank && rankValues[card.rank] !== lowPairRank)
      .sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);
    
    const bestHand = [...highPairCards, ...lowPairCards, kickers[0]];
    const kickerRank = kickers.length > 0 ? rankValues[kickers[0].rank] : 2;
    
    const baseStrength = handRankBaseStrength[HandRank.TwoPair];
    // 两对的相对强度由高对、低对和踢脚决定
    const rankFraction = (highPairRank - 2) / 12 + 
                         (lowPairRank - 2) / (12 * 13) + 
                         (kickerRank - 2) / (12 * 13 * 13);
    const strengthRange = handRankProbabilities[HandRank.TwoPair];
    return { 
      rank: HandRank.TwoPair, 
      strength: baseStrength + (rankFraction * strengthRange * 0.99), 
      bestHand 
    };
  }
  
  // 一对
  if (groups.pairs.length === 1) {
    const pairRank = groups.pairs[0];
    const pairCards = allCards.filter(card => rankValues[card.rank] === pairRank);
    
    const kickers = allCards
      .filter(card => rankValues[card.rank] !== pairRank)
      .sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);
    
    const bestHand = [...pairCards, ...kickers.slice(0, 3)];
    const kickerRanks = kickers.slice(0, 3).map(card => rankValues[card.rank]);
    
    const baseStrength = handRankBaseStrength[HandRank.Pair];
    // 一对的相对强度由对子和三个踢脚决定
    const rankFraction = (pairRank - 2) / 12 + 
                         (kickerRanks[0] - 2) / (12 * 13) + 
                         (kickerRanks[1] - 2) / (12 * 13 * 13) + 
                         (kickerRanks[2] - 2) / (12 * 13 * 13 * 13);
    const strengthRange = handRankProbabilities[HandRank.Pair];
    return { 
      rank: HandRank.Pair, 
      strength: baseStrength + (rankFraction * strengthRange * 0.99), 
      bestHand 
    };
  }
  
  // 高牌
  const sortedCards = [...allCards].sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);
  const bestHand = sortedCards.slice(0, 5);
  const bestRanks = bestHand.map(card => rankValues[card.rank]);
  
  const baseStrength = handRankBaseStrength[HandRank.HighCard];
  // 高牌的相对强度由5张牌的大小决定
  const rankFraction = (bestRanks[0] - 2) / 12 + 
                       (bestRanks[1] - 2) / (12 * 13) + 
                       (bestRanks[2] - 2) / (12 * 13 * 13) + 
                       (bestRanks[3] - 2) / (12 * 13 * 13 * 13) + 
                       (bestRanks[4] - 2) / (12 * 13 * 13 * 13 * 13);
  const strengthRange = handRankProbabilities[HandRank.HighCard];
  return { 
    rank: HandRank.HighCard, 
    strength: baseStrength + (rankFraction * strengthRange * 0.99), 
    bestHand 
  };
}; 