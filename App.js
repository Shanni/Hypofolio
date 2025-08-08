import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { WalletProvider } from './src/context/WalletContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <PaperProvider>
      <WalletProvider>
        <RootNavigator />
      </WalletProvider>
    </PaperProvider>
  );
}
