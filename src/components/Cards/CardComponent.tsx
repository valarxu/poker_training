import React from 'react';
import { Box, Image } from '@chakra-ui/react';
import { Card } from '../../types/poker';

interface CardComponentProps {
  card: Card;
  isHidden?: boolean;
}

const CardComponent: React.FC<CardComponentProps> = ({ card, isHidden = false }) => {
  // 获取卡牌图片路径
  const getCardImage = () => {
    if (isHidden) {
      return '/images/card-back.png';
    }
    return `/images/${card.rank}_of_${card.suit}.png`;
  };

  // 根据花色设置卡牌颜色
  const getCardColor = () => {
    if (card.suit === 'hearts' || card.suit === 'diamonds') {
      return 'red.500';
    }
    return 'black';
  };

  // 简单显示卡牌的替代方案（如果没有图片）
  const getCardText = () => {
    const suitSymbol = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    }[card.suit];
    
    return `${card.rank}${suitSymbol}`;
  };

  return (
    <Box
      width="60px"
      height="84px"
      bg="white"
      borderRadius="md"
      border="1px solid"
      borderColor="gray.200"
      display="flex"
      justifyContent="center"
      alignItems="center"
      position="relative"
      overflow="hidden"
    >
      {isHidden ? (
        <Box
          width="100%"
          height="100%"
          bg="blue.600"
          borderRadius="md"
        />
      ) : (
        <Box
          color={getCardColor()}
          fontWeight="bold"
          fontSize="lg"
        >
          {getCardText()}
        </Box>
      )}
    </Box>
  );
};

export default CardComponent; 