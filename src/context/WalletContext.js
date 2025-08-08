import React, { createContext, useState, useContext } from 'react';

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);

  const addWallet = async (address) => {
    try {
      // Validate address format with a simple regex check
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new Error('Invalid Ethereum address format');
      }
      // Check if wallet already exists
      if (wallets.some(wallet => wallet.address.toLowerCase() === address.toLowerCase())) {
        throw new Error('Wallet already exists');
      }
      setWallets([...wallets, { address, balance: '0', tokens: [] }]);
      // Fetch initial balance
      await updateBalance(address);
    } catch (error) {
      throw error;
    }
  };

  const removeWallet = (address) => {
    setWallets(wallets.filter(wallet => wallet.address !== address));
  };

  const updateBalance = async (address) => {
    console.log('Updating balance for wallet:', address);
    try {
      const response = await fetch(`http://localhost:5000/api/wallet/${address}/balance`);
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }
      const data = await response.json();
      
      setWallets(wallets.map(wallet => 
        wallet.address.toLowerCase() === address.toLowerCase() ? { ...wallet, balance: data.balance } : wallet
      ));
      
      // Also fetch tokens
      await updateTokens(address);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };
  
  const updateTokens = async (address) => {
    console.log('Updating tokens for wallet:', address);
    try {
      const response = await fetch(`http://localhost:5000/api/wallet/${address}/tokens`);
      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }
      const data = await response.json();
      
      setWallets(wallets.map(wallet => 
        wallet.address.toLowerCase() === address.toLowerCase() ? { ...wallet, tokens: data.tokens } : wallet
      ));
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
  };

  return (
    <WalletContext.Provider value={{
      wallets,
      selectedWallet,
      addWallet,
      removeWallet,
      setSelectedWallet,
      updateBalance,
      updateTokens,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet error');
  }
  return context;
};
