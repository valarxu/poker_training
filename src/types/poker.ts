export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Action = 'fold' | 'call' | 'raise';

export type PlayerStatus = 'waiting' | 'acting' | 'folded' | 'called' | 'raised';

export interface Player {
  id: number;
  name: string;
  chips: number;
  cards: Card[];
  isHuman: boolean;
  position: number; // 0-7, 0 being the dealer
  currentBet: number;
  isActive: boolean;
  status: PlayerStatus;
}

export type GamePhase = 'not_started' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

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
}

export interface GameAction {
  type: Action;
  playerId: number;
  amount?: number;
} 