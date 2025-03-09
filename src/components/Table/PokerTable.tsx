import React, { useEffect, useState } from 'react';
import { Box, Text, Button, VStack, HStack, Center } from '@chakra-ui/react';
import { GameState, GameAction } from '../../types/poker';
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
    // 如果当前是摊牌阶段，则开始新的一轮
    if (gameState.gamePhase === 'showdown') {
      setGameState(startNewRound(gameState));
    } else {
      // 否则开始新游戏
      setGameState(startNewGame(gameState));
    }
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
      setAiThinkingTime(2);

      // 启动5秒倒计时
      for (let i = 2; i > 0; i--) {
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
      if (gameState.gamePhase === 'river') {
        // 河牌阶段结束后，进入摊牌阶段，但不自动开始新的一轮
        const newState = nextGamePhase(gameState);
        // 确保在摊牌阶段所有玩家的牌都可见
        if (newState.gamePhase === 'showdown') {
          setGameState({
            ...newState,
            isGameStarted: true // 保持游戏状态为已开始，这样不会自动开始新游戏
          });
        } else {
          setGameState(newState);
        }
      } else if (gameState.gamePhase !== 'showdown') {
        // 其他阶段结束后，正常进入下一阶段
        setGameState(nextGamePhase(gameState));
      }
      // 摊牌阶段不自动进入下一轮，等待玩家点击"开始游戏"按钮
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
      // 检查currentPlayer是否有效
      if (gameState.currentPlayer >= 0 && gameState.currentPlayer < gameState.players.length) {
        const currentPlayer = gameState.players[gameState.currentPlayer];
        setIsPlayerTurn(currentPlayer.isHuman && currentPlayer.status === 'acting');
      } else {
        // 如果currentPlayer无效，检查是否需要进入下一阶段
        if (gameState.gamePhase !== 'showdown') {
          setGameState(nextGamePhase(gameState));
        }
        // 摊牌阶段不自动开始新的一轮
      }
    }
  }, [gameState.currentPlayer, gameState.players, gameState.gamePhase]);

  // 玩家操作按钮
  const ActionButtons = () => (
    <VStack spacing={4}>
      {!gameState.isGameStarted || gameState.gamePhase === 'showdown' ? (
        <Button
          colorScheme="green"
          onClick={handleStartGame}
        >
          {gameState.gamePhase === 'showdown' ? '开始新一轮' : '开始游戏'}
        </Button>
      ) : (
        <>
          {isAiThinking && (
            <Text color="yellow.300" fontSize="lg">
              AI思考中... {aiThinkingTime}秒
            </Text>
          )}
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
        </>
      )}
    </VStack>
  );

  // 获取玩家位置的网格区域，调整布局避免被公共牌和摊牌结果遮挡
  const getPlayerPosition = (index: number): { gridArea: string } => {
    // 按照顺时针顺序排列位置，调整位置避免遮挡
    const positions = [
      { gridArea: 'bottom-right' }, // 玩家位置（人类玩家）
      { gridArea: 'bottom-right-center' },
      { gridArea: 'bottom-left-center' },
      { gridArea: 'bottom-left' },
      { gridArea: 'top-left' },
      { gridArea: 'top-left-center' },
      { gridArea: 'top-right-center' },
      { gridArea: 'top-right' }
    ];

    // 如果是人类玩家，固定在bottom-right位置
    if (gameState.players[index].isHuman) {
      return positions[0];
    }

    // 计算AI玩家的位置
    // 找出这个AI是第几个AI（跳过人类玩家）
    let aiIndex = 0;
    for (let i = 0; i < index; i++) {
      if (!gameState.players[i].isHuman) {
        aiIndex++;
      }
    }

    // 返回对应的位置
    return positions[aiIndex + 1]; // +1是因为第0个位置是给人类玩家的
  };

  // 添加ShowdownResults组件，调整位置避免遮挡玩家
  const ShowdownResults = () => {
    if (!gameState.showdownResults) return null;

    return (
      <Box
        position="fixed"
        top="10%"
        left="80%"
        transform="translateX(-50%)"
        bg="rgba(0, 0, 0, 0.8)"
        color="white"
        p={4}
        borderRadius="md"
        zIndex={10}
        maxW="300px"
        textAlign="center"
        boxShadow="dark-lg"
      >
        <Text fontSize="xl" fontWeight="bold" mb={4}>
          摊牌结果
        </Text>

        <VStack spacing={3} align="stretch">
          <Text fontSize="lg" color="yellow.300">
            赢家: {gameState.showdownResults?.winners.map(id =>
              gameState.players.find(p => p.id === id)?.name
            ).join(', ')}
          </Text>

          <Text fontSize="md" mb={2}>
            赢得: {gameState.pot} BB
          </Text>

          {gameState.showdownResults?.handRanks.map((result, index) => {
            const player = gameState.players.find(p => p.id === result.playerId);
            if (!player) return null;

            // 获取手牌等级的文本描述
            const getHandRankText = (rank: number) => {
              const ranks = [
                '高牌', '一对', '两对', '三条',
                '顺子', '同花', '葫芦', '四条',
                '同花顺', '皇家同花顺'
              ];
              return ranks[rank] || '未知';
            };

            return (
              <Box
                key={index}
                p={2}
                bg={gameState.showdownResults?.winners.includes(result.playerId)
                  ? "green.800"
                  : "gray.800"
                }
                borderRadius="md"
                borderWidth={gameState.showdownResults?.winners.includes(result.playerId) ? "1px" : "0"}
                borderColor="yellow.400"
              >
                <Text fontWeight="bold">
                  {player.name}: {getHandRankText(result.handRank)}
                </Text>
              </Box>
            );
          })}
        </VStack>

        <Text fontSize="sm" mt={4} color="gray.400">
          点击"开始新一轮"继续游戏
        </Text>
      </Box>
    );
  };

  return (
    <Box h="100vh" bg="green.700" position="relative">
      <Center h="100%">
        <VStack spacing={4} w="100%" maxW="1280px">
          <Box
            w="100%"
            h="80vh"
            bg="green.600"
            borderRadius="xl"
            boxShadow="xl"
            position="relative"
            p={4}
            display="grid"
            gridTemplateAreas={`
              "top-left top-left-center . top-right-center top-right"
              ". . center . ."
              "bottom-left bottom-left-center . bottom-right-center bottom-right"
            `}
            gridTemplateRows="1fr 1fr 1fr"
            gridTemplateColumns="1fr 1fr 1fr 1fr 1fr"
            gap={4}
          >
            {/* 公共牌 - 放在中央，但调整位置避免遮挡玩家 */}
            <Box
              position="absolute"
              top="40%"
              left="50%"
              transform="translate(-50%, -50%)"
              zIndex={2}
              bg="green.500"
              p={4}
              borderRadius="md"
              boxShadow="lg"
              width="600px"
              borderWidth="2px"
              borderColor="green.300"
              gridArea="center"
            >
              <VStack>
                <HStack justify="space-between" w="100%" mb={2}>
                  <Text color="white" fontSize="lg" fontWeight="bold">
                    公共牌
                  </Text>
                  <Text color="white" fontSize="xl">
                    底池: {gameState.pot} BB
                  </Text>
                  <Text color="white" fontSize="lg">
                    {gameState.gamePhase === 'not_started' ? '等待开始' :
                      gameState.gamePhase === 'preflop' ? '翻牌前' :
                        gameState.gamePhase === 'flop' ? '翻牌' :
                          gameState.gamePhase === 'turn' ? '转牌' :
                            gameState.gamePhase === 'river' ? '河牌' : '摊牌'}
                  </Text>
                </HStack>
                <CommunityCards cards={gameState.communityCards} />
              </VStack>
            </Box>

            {/* 玩家组件 */}
            {gameState.players.map((player, index) => (
              <Box
                key={player.id}
                {...getPlayerPosition(index)}
                height="150px"
              >
                <PlayerComponent
                  player={player}
                  position={player.position.toString()}
                  isCurrentPlayer={gameState.currentPlayer === index}
                  isDealer={index === gameState.dealerPosition}
                  gamePhase={gameState.gamePhase}
                  communityCards={gameState.communityCards}
                  playerCount={gameState.players.filter(p => p.status !== 'folded').length}
                />
              </Box>
            ))}

            {/* 摊牌结果 */}
            {gameState.gamePhase === 'showdown' && <ShowdownResults />}

            {/* 玩家操作按钮 */}
            <Box position="absolute" bottom="20px" left="50%" transform="translateX(-50%)">
              <ActionButtons />
            </Box>
          </Box>
        </VStack>
      </Center>
    </Box>
  );
};

export default PokerTable; 