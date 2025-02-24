import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import PokerTable from './components/Table/PokerTable';

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
});

export default function App() {
  return (
    <ChakraProvider theme={theme}>
      <PokerTable />
    </ChakraProvider>
  );
}
