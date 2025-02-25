import React from 'react';
import { HStack, Image, Box } from '@chakra-ui/react';
import { Card } from '../../types/poker';

interface PlayerCardsProps {
  cards: Card[];
  isHidden: boolean;
  isFolded: boolean;
}

const PlayerCards: React.FC<PlayerCardsProps> = ({ cards, isHidden, isFolded }) => {
  const getCardImage = (card: Card) => {
    if (isHidden || isFolded) {
      return '/images/card-back.png';
    }
    return `/images/${card.rank}_of_${card.suit}.png`;
  };

  // 如果玩家弃牌，显示灰色的牌背
  const getCardStyle = () => {
    if (isFolded) {
      return {
        opacity: 0.5,
        filter: "grayscale(100%)"
      };
    }
    return {};
  };

  return (
    <HStack spacing={2} justify="center" h="100%">
      {cards.map((card, index) => (
        <Box
          key={index}
          w="80px"
          h="112px"
          borderWidth="1px"
          borderRadius="md"
          overflow="hidden"
          bg="white"
          boxShadow="md"
          style={getCardStyle()}
        >
          <Image
            src={getCardImage(card)}
            alt={isHidden || isFolded ? 'Hidden Card' : `${card.rank} of ${card.suit}`}
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