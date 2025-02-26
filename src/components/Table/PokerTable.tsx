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
  const [aiThinkingTime, setAiThinkingTime] = useState<number>(0);
  const [isAiThinking, setIsAiThinking] = useState(false);
  
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
      setIsAiThinking(true);
      setAiThinkingTime(5);
      
      // 启动5秒倒计时
      for (let i = 5; i > 0; i--) {
        setAiThinkingTime(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const aiAction = getAIAction(gameState, gameState.currentPlayer);
      const newState = handleAction(gameState, aiAction);
      setGameState(newState);
      setIsAiThinking(false);
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
    if (gameState.isGameStarted && !isPlayerTurn && !isAiThinking) {
      handleAITurn();
    }
  }, [isPlayerTurn, gameState.currentPlayer, isAiThinking]);
  
  useEffect(() => {
    if (gameState.isGameStarted) {
      checkRoundEnd();
      const currentPlayer = gameState.players[gameState.currentPlayer];
      setIsPlayerTurn(currentPlayer.isHuman && currentPlayer.status === 'acting');
    }
  }, [gameState.currentPlayer, gameState.players[gameState.currentPlayer].status]);
  
  // 玩家操作按钮
  const ActionButtons = () => (
    <VStack spacing={4}>
      {!gameState.isGameStarted ? (
        <Button
          colorScheme="green"
          onClick={handleStartGame}
        >
          开始游戏
        </Button>
      ) : (
        <>
          <HStack spacing={4}>
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
          </HStack>
          
          {isAiThinking && (
            <Text color="yellow.300" fontSize="lg">
              AI思考中... {aiThinkingTime}秒
            </Text>
          )}
        </>
      )}
    </VStack>
  );
  
  // 获取玩家在桌子上的位置
  const getPlayerPosition = (index: number) => {
    // 人类玩家固定在bottom-right位置
    if (gameState.players[index].isHuman) {
      return { gridArea: "bottom-right" };
    }
    
    // AI玩家按顺时针顺序排列
    // 假设玩家在位置0，其他位置按顺时针排列
    const positions = [
      "bottom-left",  // 1号位
      "left-bottom", // 2号位
      "left-top",    // 3号位
      "top-left",    // 4号位
      "top-right",   // 5号位
      "right-top",   // 6号位
      "right-bottom" // 7号位
    ];
    
    // 找出这个AI是第几个AI（跳过人类玩家）
    let aiIndex = 0;
    for (let i = 0; i < index; i++) {
      if (!gameState.players[i].isHuman) {
        aiIndex++;
      }
    }
    
    return { gridArea: positions[aiIndex] };
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
          {/* 方形扑克桌布局 */}
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
              h="400px"
              bg="green.500"
              borderRadius="lg"
              p={4}
              zIndex={1}
              flexDirection="column"
            >
              {/* 底池和回合信息放在公共牌上方 */}
              <VStack spacing={2} mb={4}>
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
              </VStack>
              
              {/* 公共牌 */}
              <CommunityCards cards={gameState.communityCards} />
              
              {/* 操作按钮放在公共牌下方 */}
              <Box mt={4} zIndex={2}>
                <ActionButtons />
              </Box>
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
        </VStack>
      </Center>
    </Box>
  );
};

export default PokerTable; 