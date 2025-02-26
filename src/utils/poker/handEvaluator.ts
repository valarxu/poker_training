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

// 检查是否是同花
const isFlush = (cards: Card[]): boolean => {
  const suits = cards.map(card => card.suit);
  return new Set(suits).size === 1;
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
          
          if (ace.rank === 'A') {
            return { rank: HandRank.StraightFlush, strength: 0.95, bestHand };
          }
        }
        
        // 常规同花顺
        const maxRank = Math.max(...sameSuitRanks);
        const bestHand = sortedCards.slice(0, 5);
        
        if (maxRank === 14 && bestHand.some(card => card.rank === 'K')) {
          return { rank: HandRank.RoyalFlush, strength: 1, bestHand };
        }
        return { rank: HandRank.StraightFlush, strength: 0.95 + (maxRank / 300), bestHand };
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
    return { rank: HandRank.FourOfAKind, strength: 0.9 + (quadRank / 140), bestHand };
  }
  
  // 葫芦
  if (groups.trips.length > 0 && groups.pairs.length > 0) {
    const tripRank = Math.max(...groups.trips);
    const tripCards = allCards.filter(card => rankValues[card.rank] === tripRank);
    
    const pairRank = Math.max(...groups.pairs);
    const pairCards = allCards.filter(card => rankValues[card.rank] === pairRank);
    
    const bestHand = [...tripCards, ...pairCards.slice(0, 2)];
    return { rank: HandRank.FullHouse, strength: 0.85 + (tripRank / 140), bestHand };
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
    const maxRank = Math.max(...bestHand.map(card => rankValues[card.rank]));
    return { rank: HandRank.Flush, strength: 0.8 + (maxRank / 140), bestHand };
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
      return { rank: HandRank.Straight, strength: 0.75, bestHand };
    }
    
    // 常规顺子
    for (let i = uniqueRanks.length - 1; i >= 4; i--) {
      if (uniqueRanks[i] - uniqueRanks[i-4] === 4) {
        const straightRanks = uniqueRanks.slice(i-4, i+1);
        const bestHand = straightRanks.map(rank => 
          allCards.find(card => rankValues[card.rank] === rank)!
        );
        
        const maxRank = Math.max(...straightRanks);
        return { rank: HandRank.Straight, strength: 0.75 + (maxRank / 140), bestHand };
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
    return { rank: HandRank.ThreeOfAKind, strength: 0.7 + (tripRank / 140), bestHand };
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
    return { rank: HandRank.TwoPair, strength: 0.6 + (highPairRank / 140) + (lowPairRank / 1400), bestHand };
  }
  
  // 一对
  if (groups.pairs.length === 1) {
    const pairRank = groups.pairs[0];
    const pairCards = allCards.filter(card => rankValues[card.rank] === pairRank);
    
    const kickers = allCards
      .filter(card => rankValues[card.rank] !== pairRank)
      .sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);
    
    const bestHand = [...pairCards, ...kickers.slice(0, 3)];
    return { rank: HandRank.Pair, strength: 0.5 + (pairRank / 140), bestHand };
  }
  
  // 高牌
  const sortedCards = [...allCards].sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);
  const bestHand = sortedCards.slice(0, 5);
  const maxRank = Math.max(...bestHand.map(card => rankValues[card.rank]));
  
  return { rank: HandRank.HighCard, strength: 0.4 + (maxRank / 140), bestHand };
}; 