import React from 'react';
import { HStack, Image, Box } from '@chakra-ui/react';
import { Card } from '../../types/poker';

interface CommunityCardsProps {
  cards: Card[];
}

const CommunityCards: React.FC<CommunityCardsProps> = ({ cards }) => {
  const getCardImage = (card: Card) => {
    return `/images/${card.rank}_of_${card.suit}.png`;
  };

  return (
    <HStack spacing={4} justify="center" w="100%">
      {cards.map((card, index) => (
        <Box
          key={index}
          w="100px"
          h="140px"
          borderWidth="1px"
          borderRadius="md"
          overflow="hidden"
          bg="white"
          boxShadow="lg"
        >
          <Image
            src={getCardImage(card)}
            alt={`${card.rank} of ${card.suit}`}
            w="100%"
            h="100%"
            objectFit="contain"
          />
        </Box>
      ))}
      {/* 填充空位，保持布局一致 */}
      {Array.from({ length: 5 - cards.length }).map((_, index) => (
        <Box
          key={`empty-${index}`}
          w="100px"
          h="140px"
          borderWidth="1px"
          borderRadius="md"
          bg="whiteAlpha.300"
        />
      ))}
    </HStack>
  );
};

export default CommunityCards; 