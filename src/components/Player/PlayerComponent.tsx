import React from 'react';
import { Box, Text, VStack, HStack, Badge } from '@chakra-ui/react';
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

  return (
    <Box
      borderWidth={isCurrentPlayer ? "3px" : "1px"}
      borderColor={isCurrentPlayer ? "yellow.400" : "gray.200"}
      borderRadius="lg"
      p={4}
      bg={player.isActive ? "whiteAlpha.900" : "whiteAlpha.500"}
      position="relative"
    >
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" color={player.isHuman ? "blue.500" : "gray.700"}>
            {player.name}
          </Text>
          <Badge colorScheme={getStatusColor(player.status)}>
            {getStatusText(player.status)}
          </Badge>
        </HStack>
        
        <PlayerCards
          cards={player.cards}
          isHidden={!player.isHuman && player.isActive}
        />
        
        <HStack justify="space-between">
          <Text fontSize="sm" color="gray.600">
            位置: {player.position}
          </Text>
          <Text fontSize="sm" color="gray.600">
            筹码: {player.chips} BB
          </Text>
        </HStack>
        
        {player.currentBet > 0 && (
          <Text fontSize="sm" color="orange.500" textAlign="center">
            当前下注: {player.currentBet} BB
          </Text>
        )}
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
        >
          轮到你了
        </Box>
      )}
    </Box>
  );
};

export default PlayerComponent; 