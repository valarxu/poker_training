import React, { useEffect, useState } from 'react';
import { Box, Grid, Text, Button, VStack, HStack, Center } from '@chakra-ui/react';
import { GameState, Player, GameAction } from '../../types/poker';
import { initializeGameState, startNewGame, handleAction, nextGamePhase, startNewRound, isRoundComplete } from '../../utils/poker/gameLogic';
import { getAIAction } from '../../utils/ai/aiLogic';
import PlayerComponent from '../Player/PlayerComponent';
import CommunityCards from '../Cards/CommunityCards';

const PokerTable: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(initializeGameState());
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  
  // 开始新游戏
  const handleStartGame = () => {
    setGameState(startNewGame(gameState));
  };
  
  // 处理玩家行动
  const handlePlayerAction = (action: GameAction) => {
    if (!isPlayerTurn) return;
    
    let newState = handleAction(gameState, action);
    setGameState(newState);
    setIsPlayerTurn(false);
  };
  
  // 处理AI行动
  const handleAITurn = async () => {
    const currentPlayer = gameState.players[gameState.currentPlayer];
    
    if (!currentPlayer.isHuman && currentPlayer.isActive && currentPlayer.status === 'acting') {
      const aiAction = getAIAction(gameState, gameState.currentPlayer);
      const newState = handleAction(gameState, aiAction);
      setGameState(newState);
      
      // 模拟AI思考时间
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };
  
  // 检查当前回合是否结束
  const checkRoundEnd = () => {
    if (isRoundComplete(gameState)) {
      if (gameState.gamePhase === 'showdown') {
        // TODO: 实现牌力比较和胜者判定
        setGameState(startNewRound(gameState));
      } else {
        setGameState(nextGamePhase(gameState));
      }
    }
  };
  
  useEffect(() => {
    if (gameState.isGameStarted && !isPlayerTurn) {
      handleAITurn();
    }
  }, [isPlayerTurn, gameState.currentPlayer]);
  
  useEffect(() => {
    if (gameState.isGameStarted) {
      checkRoundEnd();
      setIsPlayerTurn(gameState.players[gameState.currentPlayer].isHuman);
    }
  }, [gameState.players]);
  
  // 玩家操作按钮
  const ActionButtons = () => (
    <HStack spacing={4} mt={4}>
      {!gameState.isGameStarted ? (
        <Button
          colorScheme="green"
          onClick={handleStartGame}
        >
          开始游戏
        </Button>
      ) : (
        <>
          <Button
            colorScheme="red"
            onClick={() => handlePlayerAction({ type: 'fold', playerId: 0 })}
            isDisabled={!isPlayerTurn}
          >
            弃牌
          </Button>
          <Button
            colorScheme="blue"
            onClick={() => handlePlayerAction({ type: 'call', playerId: 0 })}
            isDisabled={!isPlayerTurn}
          >
            跟注
          </Button>
          <Button
            colorScheme="green"
            onClick={() => handlePlayerAction({
              type: 'raise',
              playerId: 0,
              amount: gameState.currentBet * 2
            })}
            isDisabled={!isPlayerTurn}
          >
            加注
          </Button>
        </>
      )}
    </HStack>
  );
  
  return (
    <Box
      w="100vw"
      h="100vh"
      bg="green.700"
      p={8}
    >
      <Center>
        <VStack spacing={8}>
          <Text color="white" fontSize="2xl">
            底池: {gameState.pot} BB
          </Text>
          
          <Text color="white" fontSize="lg">
            {gameState.gamePhase === 'not_started' ? '等待开始' :
             gameState.gamePhase === 'preflop' ? '翻牌前' :
             gameState.gamePhase === 'flop' ? '翻牌' :
             gameState.gamePhase === 'turn' ? '转牌' :
             gameState.gamePhase === 'river' ? '河牌' : '摊牌'}
          </Text>
          
          <CommunityCards cards={gameState.communityCards} />
          
          <Grid
            templateColumns="repeat(3, 1fr)"
            gap={6}
            w="100%"
            maxW="1200px"
          >
            {gameState.players.map((player, index) => (
              <PlayerComponent
                key={player.id}
                player={player}
                isCurrentPlayer={gameState.currentPlayer === index}
                isCurrent={isPlayerTurn && player.isHuman}
              />
            ))}
          </Grid>
          
          <ActionButtons />
        </VStack>
      </Center>
    </Box>
  );
};

export default PokerTable; 