export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Action = 'fold' | 'call' | 'raise' | 'all-in';

export type PlayerStatus = 'waiting' | 'acting' | 'folded' | 'called' | 'raised' | 'all-in';

// 德州扑克标准位置名称
export type PositionName = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'MP' | 'HJ' | 'CO';

export interface Player {
  id: number;
  name: string;
  chips: number;
  cards: Card[];
  isHuman: boolean;
  position: number; // 0-7, 0 being the dealer
  positionName: PositionName; // 位置名称
  currentBet: number;
  isActive: boolean;
  status: PlayerStatus;
}

export type GamePhase = 'not_started' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

// 摊牌结果接口
export interface HandRankResult {
  playerId: number;
  handRank: number;
  handStrength: number;
  bestHand?: Card[];
}

export interface ShowdownResult {
  winners: number[];
  handRanks: HandRankResult[];
}

export interface GameState {
  isGameStarted: boolean;
  players: Player[];
  communityCards: Card[];
  pot: number;
  currentPlayer: number;
  dealerPosition: number;
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
  deck: Card[];
  gamePhase: GamePhase;
  lastAction?: {
    playerId: number;
    type: Action;
    amount?: number;
  };
  lastRaisePlayerId?: number; // 记录最后一个加注的玩家ID
  showdownResults?: ShowdownResult; // 摊牌结果
}

export interface GameAction {
  type: Action;
  playerId: number;
  amount?: number;
} 