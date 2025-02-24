import React from 'react';
import { HStack, Image, Box } from '@chakra-ui/react';
import { Card } from '../../types/poker';

interface PlayerCardsProps {
  cards: Card[];
  isHidden: boolean;
}

const PlayerCards: React.FC<PlayerCardsProps> = ({ cards, isHidden }) => {
  const getCardImage = (card: Card) => {
    if (isHidden) {
      return '/images/card-back.png';
    }
    return `/images/${card.rank}_of_${card.suit}.png`;
  };

  return (
    <HStack spacing={2} justify="center">
      {cards.map((card, index) => (
        <Box
          key={index}
          w="60px"
          h="84px"
          borderWidth="1px"
          borderRadius="md"
          overflow="hidden"
          bg="white"
        >
          <Image
            src={getCardImage(card)}
            alt={isHidden ? 'Hidden Card' : `${card.rank} of ${card.suit}`}
            w="100%"
            h="100%"
            objectFit="contain"
          />
        </Box>
      ))}
    </HStack>
  );
};

export default PlayerCards; 