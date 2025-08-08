import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Button, TextInput, IconButton, ActivityIndicator, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// Using localStorage for web or AsyncStorage for React Native
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import API configuration
import { getApiUrl, API_CONFIG } from '../../src/config/api';

// Define wallet and token interfaces
interface Token {
  symbol: string;
  balance: string;
  decimals: number;
}

interface Wallet {
  address: string;
  balance: string;
  tokens: Token[];
}

export default function WalletsScreen() {
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddWallet, setShowAddWallet] = useState(false);
  
  // Load wallets from localStorage on component mount
  useEffect(() => {
    loadWallets();
  }, []);
  
  const loadWallets = async () => {
    try {
      const storedWallets = await AsyncStorage.getItem('wallets');
      if (storedWallets) {
        setWallets(JSON.parse(storedWallets));
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
    }
  };
  
  const saveWallets = async (updatedWallets: Wallet[]) => {
    try {
      await AsyncStorage.setItem('wallets', JSON.stringify(updatedWallets));
      setWallets(updatedWallets);
    } catch (error) {
      console.error('Error saving wallets:', error);
    }
  };

  const handleAddWallet = async () => {
    if (!address.trim()) {
      setError('Please enter a wallet address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Check if wallet already exists
      const walletExists = wallets.some(wallet => 
        wallet.address.toLowerCase() === address.toLowerCase()
      );
      
      if (walletExists) {
        setError('Wallet already exists');
        return;
      }
      
      // Fetch wallet data from API (mock for now)
      console.log('Fetching wallet data for address:', address);
      let walletData;
      try {
        const apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.WALLET + `/${address}`);
        console.log('Calling API:', apiUrl);
        const response = await fetch(apiUrl);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          console.error('API error response:', response.statusText);
          throw new Error(`Failed to fetch wallet data: ${response.statusText}`);
        }
        
        walletData = await response.json();
        console.log('Wallet data received:', walletData);
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError);
        throw new Error(`Network error: ${fetchError.message}`);
      }
      
      const newWallet = {
        address: address,
        balance: walletData?.balance || '0',
        tokens: walletData?.tokens || []
      };
      
      const updatedWallets = [...wallets, newWallet];
      await saveWallets(updatedWallets);
      
      setAddress('');
      setShowAddWallet(false);
    } catch (error) {
      setError(error.message || 'Failed to add wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWallet = (address: string) => {
    Alert.alert(
      'Remove Wallet',
      'Are you sure you want to remove this wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          onPress: () => {
            const updatedWallets = wallets.filter(wallet => wallet.address !== address);
            saveWallets(updatedWallets);
          },
          style: 'destructive'
        }
      ]
    );
  };

  const handleRefreshWallet = async (address: string) => {
    try {
      // Fetch updated wallet data from API
      console.log('Refreshing wallet data for address:', address);
      let walletData;
      try {
        const apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.WALLET + `/${address}`);
        console.log('Calling refresh API:', apiUrl);
        const response = await fetch(apiUrl);
        console.log('Refresh response status:', response.status);
        
        if (!response.ok) {
          console.error('API refresh error:', response.statusText);
          throw new Error(`Failed to fetch wallet data: ${response.statusText}`);
        }
        
        walletData = await response.json();
        console.log('Refreshed wallet data:', walletData);
      } catch (fetchError: any) {
        console.error('Refresh fetch error:', fetchError);
        throw new Error(`Network error during refresh: ${fetchError.message}`);
      }
      
      // Update wallet in state
      const updatedWallets = wallets.map(wallet => 
        wallet.address === address ? 
        { ...wallet, balance: walletData?.balance || wallet.balance } : 
        wallet
      );
      
      await saveWallets(updatedWallets);
    } catch (error) {
      console.error('Error refreshing wallet:', error);
    }
  };
  
  const updateTokens = async (address: string) => {
    console.log('Updating tokens for wallet:', address);
    try {
      // Fetch tokens for the wallet
      console.log('Fetching tokens for wallet:', address);
      let data;
      try {
        const apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.WALLET_TOKENS, { address });
        console.log('Calling tokens API:', apiUrl);
        const response = await fetch(apiUrl);
        console.log('Tokens response status:', response.status);
        
        if (!response.ok) {
          console.error('API tokens error:', response.statusText);
          throw new Error(`Failed to fetch token data: ${response.statusText}`);
        }
        
        data = await response.json();
        console.log('Token data received:', data);
      } catch (fetchError: any) {
        console.error('Tokens fetch error:', fetchError);
        throw new Error(`Network error fetching tokens: ${fetchError.message}`);
      }
      
      // Update wallet tokens in state
      const updatedWallets = wallets.map(wallet => 
        wallet.address === address ? 
        { ...wallet, tokens: data?.tokens || [] } : 
        wallet
      );
      
      await saveWallets(updatedWallets);
    } catch (error) {
      console.error('Error updating tokens:', error);
    }
  };

  const handleWalletPress = (wallet: Wallet) => {
    router.push(`/wallet/${wallet.address}`);
  };

  const renderWalletItem = ({ item }: { item: Wallet }) => {
    const totalTokenValue = item.tokens ? item.tokens.reduce((sum: number, token: Token) => {
      // Mock token prices for demonstration
      const tokenPrice = token.symbol === 'USDT' || token.symbol === 'USDC' ? 1 : Math.random() * 10;
      return sum + (parseFloat(token.balance) * tokenPrice);
    }, 0) : 0;

    return (
      <TouchableOpacity onPress={() => handleWalletPress(item)}>
        <Card style={styles.walletCard}>
          <Card.Content>
            <View style={styles.walletHeader}>
              <View style={styles.walletInfo}>
                <Text style={styles.walletAddress}>
                  {item.address.slice(0, 6)}...{item.address.slice(-4)}
                </Text>
                <Text style={styles.walletBalance}>{item.balance} ETH</Text>
              </View>
              <View style={styles.walletActions}>
                <IconButton
                  icon="refresh"
                  size={20}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleRefreshWallet(item.address);
                  }}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleRemoveWallet(item.address);
                  }}
                />
              </View>
            </View>
            
            <View style={styles.walletStats}>
              <Text style={styles.tokenCount}>
                {item.tokens?.length || 0} tokens
              </Text>
              <Text style={styles.totalValue}>
                ~${totalTokenValue.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>Tap to view tokens →</Text>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>My Wallets</Text>
      </View>
      
      {showAddWallet ? (
        <Card style={styles.addWalletCard}>
          <Card.Content>
            <TextInput
              label="Wallet Address"
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                setError('');
              }}
              style={styles.input}
              error={!!error}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <View style={styles.buttonContainer}>
              <Button 
                mode="outlined" 
                onPress={() => setShowAddWallet(false)}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleAddWallet} 
                loading={loading}
                disabled={loading}
              >
                Add Wallet
              </Button>
            </View>
          </Card.Content>
        </Card>
      ) : null}
      
      {wallets.length === 0 && !showAddWallet ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No wallets added yet</Text>
          <Button 
            mode="contained" 
            onPress={() => setShowAddWallet(true)}
            style={styles.addButton}
          >
            Add Your First Wallet
          </Button>
        </View>
      ) : (
        <FlatList
          data={wallets}
          renderItem={renderWalletItem}
          keyExtractor={(item) => item.address}
          contentContainerStyle={styles.listContent}
        />
      )}
      
      {!showAddWallet && wallets.length > 0 && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setShowAddWallet(true)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    marginBottom: 16,
    fontSize: 16,
    color: '#666',
  },
  addButton: {
    marginTop: 8,
  },
  listContent: {
    padding: 16,
  },
  walletCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    marginRight: 8,
  },
  walletActions: {
    flexDirection: 'row',
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalValue: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  walletInfo: {
    flex: 1,
  },
  walletAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 14,
    color: '#666',
  },
  walletStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  tokenCount: {
    fontSize: 14,
    color: '#666',
  },
  tapHint: {
    marginTop: 8,
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  addWalletCard: {
    margin: 16,
    borderRadius: 8,
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    marginRight: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
