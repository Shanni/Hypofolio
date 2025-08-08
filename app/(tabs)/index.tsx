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

  // Helper functions for price calculation
  const getMockPrice = (symbol: string): number => {
    const prices: { [key: string]: number } = {
      'ETH': 2300,
      'BTC': 45000,
      'USDT': 1,
      'USDC': 1,
      'LINK': 15,
      'UNI': 8,
      'AAVE': 120,
      'COMP': 80,
    };
    return prices[symbol] || Math.random() * 100;
  };

  const calculateWalletTotalValue = (wallet: Wallet): number => {
    let totalValue = 0;
    
    // Add ETH balance value
    if (wallet.balance && parseFloat(wallet.balance) > 0) {
      const ethBalance = parseFloat(wallet.balance);
      const ethPrice = getMockPrice('ETH');
      totalValue += ethBalance * ethPrice;
    }
    
    // Add token values
    if (wallet.tokens) {
      wallet.tokens.forEach(token => {
        const balance = parseFloat(token.balance);
        const price = getMockPrice(token.symbol);
        totalValue += balance * price;
      });
    }
    
    return totalValue;
  };

  // Calculate total value of all wallets
  const calculateTotalPortfolioValue = (): number => {
    return wallets.reduce((total, wallet) => {
      return total + calculateWalletTotalValue(wallet);
    }, 0);
  };

  const totalPortfolioValue = calculateTotalPortfolioValue();

  const renderWalletItem = ({ item }: { item: Wallet }) => {
    const totalValue = calculateWalletTotalValue(item);

    return (
      <TouchableOpacity onPress={() => handleWalletPress(item)}>
        <Card style={styles.walletCard}>
          <Card.Content>
            {/* Wallet Address Header */}
            <View style={styles.walletAddressHeader}>
              <View style={styles.walletIconContainer}>
                <Text style={styles.walletIcon}>💳</Text>
              </View>
              <View style={styles.addressContainer}>
                <Text style={styles.walletLabel}>Wallet Address</Text>
                <Text style={styles.fullWalletAddress}>{item.address}</Text>
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
            
            {/* Total Portfolio Value */}
            <View style={styles.totalValueSection}>
              <Text style={styles.totalValueLabel}>Total Portfolio Value</Text>
              <Text style={styles.totalValueAmount}>
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>Tap to view detailed holdings →</Text>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>My Pocket</Text>
      </View>
      
      {/* Total Portfolio Value */}
      {wallets.length > 0 && (
        <View style={styles.totalPortfolioSection}>
          <Text style={styles.totalPortfolioLabel}>Total Portfolio Value</Text>
          <Text style={styles.totalPortfolioValue}>
            ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.totalPortfolioSubtext}>{wallets.length} wallet{wallets.length !== 1 ? 's' : ''}</Text>
        </View>
      )}
      
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
    backgroundColor: '#F5F0E8', // Light beige from swatch
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF', // Pure white for contrast
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
    color: '#8B7355', // Muted brown
  },
  addButton: {
    marginTop: 8,
  },
  listContent: {
    padding: 16,
  },
  walletCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF', // Pure white card background
    elevation: 3,
    shadowColor: '#A0522D', // Rich brown shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#E8DDD0', // Light beige border
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
    color: '#8B7355', // Muted brown
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
  // New wallet display styles
  walletAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F0E8', // Light beige from swatch
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E8DDD0',
  },
  walletIcon: {
    fontSize: 20,
  },
  addressContainer: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 12,
    color: '#8B7355', // Muted brown
    fontWeight: '500',
    marginBottom: 2,
  },
  fullWalletAddress: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  totalValueSection: {
    backgroundColor: '#F5F0E8', // Light beige from swatch
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DDD0', // Light beige border
  },
  totalValueLabel: {
    fontSize: 14,
    color: '#8B7355', // Muted brown
    fontWeight: '500',
    marginBottom: 4,
  },
  totalValueAmount: {
    fontSize: 20,
    color: '#A0522D', // Rich brown from swatch
    fontWeight: 'bold',
  },
  totalPortfolioSection: {
    backgroundColor: '#FFFFFF', // Pure white card
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#A0522D', // Rich brown shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DDD0', // Light beige border
  },
  totalPortfolioLabel: {
    fontSize: 16,
    color: '#8B7355', // Muted brown
    fontWeight: '500',
    marginBottom: 8,
  },
  totalPortfolioValue: {
    fontSize: 32,
    color: '#A0522D', // Rich brown accent
    fontWeight: 'bold',
    marginBottom: 4,
  },
  totalPortfolioSubtext: {
    fontSize: 14,
    color: '#8B7355', // Muted brown
    fontWeight: '400',
  },
});
