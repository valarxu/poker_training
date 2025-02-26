import React from 'react';
import { Box, Text, VStack, HStack, Badge, Flex } from '@chakra-ui/react';
import { Player, GamePhase } from '../../types/poker';
import PlayerCards from '../Cards/PlayerCards';

interface PlayerComponentProps {
  player: Player;
  position: string;
  isCurrentPlayer: boolean;
  isDealer: boolean;
  gamePhase: GamePhase;
}

const PlayerComponent: React.FC<PlayerComponentProps> = ({
  player,
  position,
  isCurrentPlayer,
  isDealer,
  gamePhase
}) => {
  // 确定玩家状态的显示文本和颜色
  const getStatusDisplay = () => {
    switch (player.status) {
      case 'acting':
        return { text: '思考中...', color: 'yellow.400' };
      case 'folded':
        return { text: '弃牌', color: 'red.500' };
      case 'called':
        return { text: '跟注', color: 'blue.400' };
      case 'raised':
        return { text: '加注', color: 'green.400' };
      case 'all-in':
        return { text: '全押', color: 'purple.400' };
      default:
        return { text: '等待中', color: 'gray.400' };
    }
  };
  
  const statusDisplay = getStatusDisplay();
  
  // 判断是否应该显示牌
  const shouldShowCards = () => {
    // 在摊牌阶段且玩家未弃牌时显示所有玩家的牌
    if (gamePhase === 'showdown' && player.status !== 'folded') {
      return true;
    }
    
    // 玩家自己的牌始终可见
    if (player.isHuman) {
      return true;
    }
    
    return false;
  };
  
  return (
    <Box
      bg="gray.800"
      borderRadius="md"
      p={4}
      borderWidth={isCurrentPlayer ? "3px" : "1px"}
      borderColor={isCurrentPlayer ? "yellow.400" : "gray.200"}
      boxShadow={isCurrentPlayer ? "0 0 15px yellow" : "none"}
      height="100%"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
    >
      {/* 玩家信息 */}
      <VStack spacing={1} align="stretch">
        <Flex justify="space-between" align="center">
          <Text color="white" fontWeight="bold">
            {player.name}
          </Text>
          <Badge colorScheme={player.positionName === 'BTN' ? "purple" : "gray"}>
            {player.positionName}
          </Badge>
        </Flex>
        
        <Text color="green.300">
          筹码: {player.chips} BB
        </Text>
        
        {player.currentBet > 0 && (
          <Text color="orange.300">
            当前下注: {player.currentBet} BB
          </Text>
        )}
        
        <Text color={statusDisplay.color}>
          {statusDisplay.text}
        </Text>
      </VStack>
      
      {/* 玩家手牌 */}
      <HStack spacing={2} justify="center" mt={4}>
        {player.cards && player.cards.length > 0 && (
          <PlayerCards 
            cards={player.cards} 
            isHidden={!shouldShowCards()} 
            isFolded={player.status === 'folded'} 
          />
        )}
      </HStack>
    </Box>
  );
};

export default PlayerComponent; 