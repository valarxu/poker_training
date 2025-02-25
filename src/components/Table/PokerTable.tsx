import React, { useEffect, useState } from 'react';
import { Box, Grid, Text, Button, VStack, HStack, Center, Flex } from '@chakra-ui/react';
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
  
  // 获取玩家在桌子上的位置
  const getPlayerPosition = (index: number) => {
    // 按照德州扑克桌的布局，将8个位置分配到桌子的四条边上
    // 下边：CO(7), BTN(0)
    // 右边：SB(1), BB(2)
    // 上边：UTG(3), UTG+1(4)
    // 左边：MP(5), HJ(6)
    switch (index) {
      case 0: return { gridArea: "bottom-right" }; // BTN
      case 1: return { gridArea: "right-top" };    // SB
      case 2: return { gridArea: "right-bottom" }; // BB
      case 3: return { gridArea: "top-right" };    // UTG
      case 4: return { gridArea: "top-left" };     // UTG+1
      case 5: return { gridArea: "left-top" };     // MP
      case 6: return { gridArea: "left-bottom" };  // HJ
      case 7: return { gridArea: "bottom-left" };  // CO
      default: return {};
    }
  };
  
  return (
    <Box
      w="100vw"
      h="100vh"
      bg="green.700"
      p={8}
    >
      <Center>
        <VStack spacing={4}>
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
          
          {/* 扑克桌布局 */}
          <Box
            w="1440px"
            h="1050px"
            position="relative"
            bg="green.600"
            borderRadius="xl"
            boxShadow="xl"
            p={8}
          >
            {/* 中央区域 - 公共牌 */}
            <Center
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              w="600px"
              h="220px"
              bg="green.500"
              borderRadius="lg"
              p={4}
              zIndex={1}
            >
              <CommunityCards cards={gameState.communityCards} />
            </Center>
            
            {/* 玩家位置 - 使用Grid布局 */}
            <Grid
              templateAreas={`
                ".           top-left     top-right    ."
                "left-top    .            .            right-top"
                "left-bottom .            .            right-bottom"
                ".           bottom-left  bottom-right ."
              `}
              gridTemplateRows="220px 220px 220px 220px"
              gridTemplateColumns="320px 320px 320px 320px"
              h="100%"
              w="100%"
              gap={8}
            >
              {gameState.players.map((player, index) => (
                <Box
                  key={player.id}
                  {...getPlayerPosition(index)}
                  width="100%"
                  height="100%"
                >
                  <PlayerComponent
                    player={player}
                    isCurrentPlayer={gameState.currentPlayer === index}
                    isCurrent={isPlayerTurn && player.isHuman}
                  />
                </Box>
              ))}
            </Grid>
          </Box>
          
          {/* 操作按钮放在桌子下方，确保不被玩家挡住 */}
          <Box position="relative" zIndex={2}>
            <ActionButtons />
          </Box>
        </VStack>
      </Center>
    </Box>
  );
};

export default PokerTable; 