import React from 'react';
import { Box, Text, VStack, HStack, Badge, Flex } from '@chakra-ui/react';
import { Player } from '../../types/poker';
import PlayerCards from '../Cards/PlayerCards';

interface PlayerComponentProps {
  player: Player;
  isCurrentPlayer: boolean;
  isCurrent: boolean;
}

const PlayerComponent: React.FC<PlayerComponentProps> = ({
  player,
  isCurrentPlayer,
  isCurrent
}) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'acting':
        return 'yellow';
      case 'waiting':
        return 'gray';
      case 'folded':
        return 'red';
      case 'called':
        return 'blue';
      case 'raised':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'acting':
        return '思考中';
      case 'waiting':
        return '等待中';
      case 'folded':
        return '已弃牌';
      case 'called':
        return '已跟注';
      case 'raised':
        return '已加注';
      default:
        return '等待中';
    }
  };

  // 获取位置名称的颜色
  const getPositionColor = (positionName: string): string => {
    switch (positionName) {
      case 'BTN':
        return 'purple.500';
      case 'SB':
        return 'blue.500';
      case 'BB':
        return 'red.500';
      case 'UTG':
        return 'orange.500';
      case 'UTG+1':
        return 'yellow.500';
      case 'MP':
        return 'green.500';
      case 'HJ':
        return 'teal.500';
      case 'CO':
        return 'cyan.500';
      default:
        return 'gray.500';
    }
  };

  return (
    <Box
      borderWidth={isCurrentPlayer ? "3px" : "1px"}
      borderColor={isCurrentPlayer ? "yellow.400" : "gray.200"}
      borderRadius="lg"
      p={4}
      bg={player.isActive ? "whiteAlpha.900" : "whiteAlpha.500"}
      position="relative"
      h="240px" // 进一步增加高度
      display="flex"
      flexDirection="column"
      overflow="hidden" // 确保内容不会溢出
    >
      <VStack spacing={2} align="stretch" flex="1">
        {/* 玩家名称和位置和状态 */}
        <HStack justify="space-between" mb={1}>
          <Text fontWeight="bold" color={player.isHuman ? "blue.500" : "gray.700"}>
            {player.name}
          </Text>
          <Badge 
            colorScheme={getPositionColor(player.positionName).split('.')[0]} 
            fontSize="sm" 
            p={1}
          >
            {player.positionName}
          </Badge>
          <Badge colorScheme={getStatusColor(player.status)}>
            {getStatusText(player.status)}
          </Badge>
        </HStack>
        
        {/* 筹码和当前下注 */}
        <HStack justify="space-between" mb={1}>
          <Text fontSize="sm" color="gray.600">
            筹码: {player.chips} BB
          </Text>
          <Text fontSize="sm" color="orange.500" textAlign="center" mb={1}>
            当前下注: {player.currentBet} BB
          </Text>
        </HStack>
        
        {/* 卡牌区域 - 固定高度 */}
        <Flex justify="center" align="center" h="112px" flex="1">
          {player.cards.length > 0 ? (
            <PlayerCards
              cards={player.cards}
              isHidden={!player.isHuman && player.isActive}
              isFolded={player.status === 'folded'}
            />
          ) : (
            <Box h="112px" display="flex" alignItems="center" justifyContent="center">
              <Text color="gray.400" fontSize="sm">等待发牌</Text>
            </Box>
          )}
        </Flex>
      </VStack>
      
      {isCurrent && (
        <Box
          position="absolute"
          top="-2"
          right="-2"
          bg="blue.500"
          color="white"
          px={2}
          py={1}
          borderRadius="md"
          fontSize="sm"
          zIndex={2}
        >
          轮到你了
        </Box>
      )}
    </Box>
  );
};

export default PlayerComponent; 