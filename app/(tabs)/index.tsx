import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Text, Card, Button, TextInput, IconButton, ActivityIndicator, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// Using localStorage for web or AsyncStorage for React Native
import AsyncStorage from '@react-native-async-storage/async-storage';
// Import API configuration
import { getApiUrl, API_CONFIG } from '../../src/config/api';

// Define wallet and token interfaces
interface Token {
  contractAddress?: string;
  symbol: string;
  name: string;
  balance: string;
  rawBalance?: string;
  decimals: number;
  isNative?: boolean;
  price?: number;
  usdValue?: number;
  priceChange24h?: number;
  marketCap?: number;
}

interface Wallet {
  address: string;
  tokens: Token[];
  totalValue: number;
  tokenCount?: number;
}

export default function WalletsScreen() {
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [isResolvingName, setIsResolvingName] = useState(false);
  
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
    } catch (error: any) {
      console.error('Error loading wallets:', error);
    }
  };
  
  const saveWallets = async (updatedWallets: Wallet[]) => {
    try {
      await AsyncStorage.setItem('wallets', JSON.stringify(updatedWallets));
      setWallets(updatedWallets);
    } catch (error: any) {
      console.error('Error saving wallets:', error);
    }
  };

  const resolveHLName = async (input: string): Promise<string> => {
    // Check if input looks like an HL domain (contains .hl)
    if (!input.includes('.hl')) {
      return input; // Return as-is if not an HL domain
    }
    
    try {
      setIsResolvingName(true);
      const response = await fetch(`http://localhost:4005/api/hlnames/resolve/${input}`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.address) {
        setResolvedAddress(data.data.address);
        return data.data.address;
      } else {
        throw new Error(data.error || 'Failed to resolve HL name');
      }
    } catch (error: any) {
      throw new Error(`Could not resolve "${input}": ${error.message}`);
    } finally {
      setIsResolvingName(false);
    }
  };

  const handleAddWallet = async () => {
    if (!address.trim()) {
      setError('Please enter a wallet address or HL domain');
      return;
    }
    
    setLoading(true);
    setError('');
    setResolvedAddress('');
    
    try {
      // Resolve HL name if needed
      let finalAddress = address.trim();
      try {
        finalAddress = await resolveHLName(address.trim());
      } catch (resolveError: any) {
        setError(resolveError.message);
        return;
      }
      
      // Validate Ethereum address format
      if (!finalAddress.startsWith('0x') || finalAddress.length !== 42) {
        setError('Invalid Ethereum address format');
        return;
      }
      
      // Check if wallet already exists
      const walletExists = wallets.some(wallet => 
        wallet.address.toLowerCase() === finalAddress.toLowerCase()
      );
      
      if (walletExists) {
        setError('Wallet already exists');
        return;
      }
      
      // Fetch real wallet data from blockchain API
      console.log('Fetching real wallet data for address:', finalAddress);
      let walletData;
      try {
        const apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.WALLET_REAL_HOLDINGS, { address: finalAddress });
        console.log('Calling real holdings API:', apiUrl);
        const response = await fetch(apiUrl);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          console.error('API error response:', response.statusText);
          throw new Error(`Failed to fetch wallet data: ${response.statusText}`);
        }
        
        walletData = await response.json();
        console.log('Real wallet data received:', walletData);
        
        if (!walletData.success) {
          throw new Error(walletData.error || 'Failed to fetch wallet data');
        }
      } catch (fetchError: any) {
        console.error('Fetch error:', fetchError);
        throw new Error(`Network error: ${fetchError.message}`);
      }
      
      const newWallet = {
        address: finalAddress,
        tokens: walletData?.tokens || [],
        totalValue: walletData?.totalValue || 0,
        tokenCount: walletData?.tokenCount || 0
      };
      
      const updatedWallets = [...wallets, newWallet];
      await saveWallets(updatedWallets);
      
      setAddress('');
      setResolvedAddress('');
      setShowAddWallet(false);
    } catch (error: any) {
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
      // Fetch updated real wallet data from blockchain API
      console.log('Refreshing real wallet data for address:', address);
      let walletData;
      try {
        const apiUrl = getApiUrl(API_CONFIG.ENDPOINTS.WALLET_REAL_HOLDINGS, { address });
        console.log('Calling refresh real holdings API:', apiUrl);
        const response = await fetch(apiUrl);
        console.log('Refresh response status:', response.status);
        
        if (!response.ok) {
          console.error('API refresh error:', response.statusText);
          throw new Error(`Failed to fetch wallet data: ${response.statusText}`);
        }
        
        walletData = await response.json();
        console.log('Refreshed real wallet data:', walletData);
        
        if (!walletData.success) {
          throw new Error(walletData.error || 'Failed to refresh wallet data');
        }
      } catch (fetchError: any) {
        console.error('Refresh fetch error:', fetchError);
        throw new Error(`Network error during refresh: ${fetchError.message}`);
      }
      
      // Update wallet in state with real data
      const updatedWallets = wallets.map(wallet => 
        wallet.address === address ? 
        { 
          ...wallet, 
          tokens: walletData?.tokens || wallet.tokens,
          totalValue: walletData?.totalValue || wallet.totalValue,
          tokenCount: walletData?.tokenCount || wallet.tokenCount
        } : 
        wallet
      );
      
      await saveWallets(updatedWallets);
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Error updating tokens:', error);
    }
  };

  const handleWalletPress = (wallet: Wallet) => {
    router.push(`/wallet/${wallet.address}`);
  };

  const calculateWalletTotalValue = (wallet: Wallet): number => {
    // Use the totalValue from the API response if available
    if (wallet.totalValue !== undefined) {
      return wallet.totalValue;
    }
    
    // Fallback: calculate from token USD values
    let totalValue = 0;
    if (wallet.tokens) {
      wallet.tokens.forEach(token => {
        if (token.usdValue) {
          totalValue += token.usdValue;
        }
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
    const tokenCount = item.tokenCount || item.tokens?.length || 0;
    const topTokens = item.tokens?.slice(0, 3) || [];

    return (
      <TouchableOpacity onPress={() => handleWalletPress(item)} style={styles.walletCardContainer}>
        <View style={styles.walletCard}>
          {/* Header with Icon and Actions */}
          <View style={styles.walletHeader}>
            <View style={styles.walletIconSimple}>
              <Text style={styles.walletIconText}>💳</Text>
            </View>
            <View style={styles.walletActions}>
              <IconButton
                icon="refresh"
                size={18}
                iconColor="#8B7355"
                onPress={(e) => {
                  e.stopPropagation();
                  handleRefreshWallet(item.address);
                }}
              />
              <IconButton
                icon="delete"
                size={18}
                iconColor="#8B7355"
                onPress={(e) => {
                  e.stopPropagation();
                  handleRemoveWallet(item.address);
                }}
              />
            </View>
          </View>
          
          {/* Address and Portfolio Value */}
          <View style={styles.walletInfo}>
            <Text style={styles.addressText}>
              {item.address.slice(0, 6)}...{item.address.slice(-4)}
            </Text>
            <Text style={styles.valueAmount}>
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          
          {/* Top Tokens Preview */}
          {topTokens.length > 0 && (
            <View style={styles.tokensPreview}>
              <Text style={styles.tokensPreviewTitle}>Top Assets</Text>
              <View style={styles.tokensList}>
                {topTokens.map((token, index) => {
                  const tokenValue = token.usdValue || (parseFloat(token.balance) * (token.price || 0));
                  return (
                    <View key={`${token.symbol}-${index}`} style={styles.tokenItem}>
                      <View style={styles.tokenInfo}>
                        <Text style={styles.tokenIcon}>{getTokenIcon(token.symbol)}</Text>
                        <View style={styles.tokenDetails}>
                          <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                          <Text style={styles.tokenBalance}>
                            {parseFloat(token.balance).toFixed(4)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.tokenValue}>
                        ${tokenValue.toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {tokenCount > 3 && (
                <Text style={styles.moreTokensText}>
                  +{tokenCount - 3} more token{tokenCount - 3 !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          )}
          
          {/* Empty State for No Tokens */}
          {tokenCount === 0 && (
            <View style={styles.emptyTokensState}>
              <Text style={styles.emptyTokensText}>No tokens found</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getTokenIcon = (symbol: string) => {
    const icons: { [key: string]: string } = {
      'ETH': '⟠',
      'BTC': '₿',
      'USDT': '₮',
      'USDC': 'Ⓤ',
      'LINK': '🔗',
      'UNI': '🦄',
      'XRP': '◉',
      'BCH': '₿',
      'XMR': 'ɱ',
      'YRISE': '📈'
    };
    return icons[symbol] || '●';
  };

  const renderEmptyWalletList = () => {
    return (
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
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Hypofolio</Text>
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
      
      {showAddWallet && (
        <View style={styles.addWalletOverlay}>
          <View style={styles.addWalletModal}>
            <View style={styles.addWalletHeader}>
              <Text style={styles.addWalletTitle}>Add New Wallet</Text>
              <IconButton
                icon="close"
                size={24}
                iconColor="#8B7355"
                onPress={() => setShowAddWallet(false)}
              />
            </View>
            
            <View style={styles.addWalletContent}>
              <Text style={styles.inputLabel}>Wallet Address or HL Domain</Text>
              <TextInput
                value={address}
                onChangeText={(text) => {
                  setAddress(text);
                  setError('');
                  setResolvedAddress('');
                }}
                style={styles.addressInput}
                placeholder="0x... or name.hl"
                placeholderTextColor="#8B7355"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
              
              {isResolvingName && (
                <View style={styles.resolvingContainer}>
                  <ActivityIndicator size="small" color="#A0522D" />
                  <Text style={styles.resolvingText}>Resolving HL domain...</Text>
                </View>
              )}
              
              {resolvedAddress && (
                <View style={styles.resolvedContainer}>
                  <Text style={styles.resolvedLabel}>✅ Resolved to:</Text>
                  <Text style={styles.resolvedAddress}>{resolvedAddress}</Text>
                </View>
              )}
              
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠️ {error}</Text>
                </View>
              ) : null}
              
              <Text style={styles.helpText}>
                Enter an Ethereum wallet address (0x...) or Hyperliquid domain (name.hl) to track its portfolio and tokens.
              </Text>
            </View>
            
            <View style={styles.addWalletActions}>
              <TouchableOpacity 
                style={styles.cancelButtonNew}
                onPress={() => setShowAddWallet(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.addButtonNew, loading && styles.addButtonDisabled]}
                onPress={handleAddWallet}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.addButtonText}>Add Wallet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
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
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 0 }}
          ListEmptyComponent={renderEmptyWalletList}
          showsVerticalScrollIndicator={false}
          snapToAlignment="start"
          snapToInterval={Dimensions.get('window').width}
          decelerationRate="fast"
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

const styles = StyleSheet.create<any>({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8', // Light beige from swatch
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#F5F0E8', // Light beige from swatch
  },
  title: {
    fontWeight: 'bold',
    fontSize: 28,
    color: '#3D2914', // Dark brown text
    letterSpacing: 0.5,
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
  walletCardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    width: Dimensions.get('window').width - 32,
    alignSelf: 'center',
  },
  walletCard: {
    backgroundColor: '#FFFFFF', // Pure white card background
    borderRadius: 16,
    padding: 20,
    elevation: 3,
    shadowColor: '#A0522D', // Rich brown shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DDD0', // Light beige border
    minHeight: 180,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletIconSimple: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F0E8', // Light beige background
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DDD0', // Light beige border
  },
  walletIconText: {
    fontSize: 20,
  },
  walletActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8', // Light beige divider
  },
  sectionTitle: {
    fontSize: 12,
    color: '#8B7355', // Muted brown
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  addressText: {
    fontSize: 14,
    color: '#8B7355', // Muted brown
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  tokenCountText: {
    fontSize: 12,
    color: '#A0522D', // Rich brown accent
    fontWeight: '500',
    marginTop: 4,
  },
  valueAmount: {
    fontSize: 20,
    color: '#A0522D', // Rich brown accent
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  tokensPreview: {
    marginTop: 8,
  },
  tokensPreviewTitle: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tokensList: {
    gap: 6,
  },
  tokenItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tokenIcon: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
    marginRight: 8,
  },
  tokenDetails: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 14,
    color: '#3D2914',
    fontWeight: '600',
  },
  tokenBalance: {
    fontSize: 12,
    color: '#8B7355',
    marginTop: 1,
  },
  tokenValue: {
    fontSize: 14,
    color: '#A0522D',
    fontWeight: '600',
  },
  moreTokensText: {
    fontSize: 12,
    color: '#8B7355',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyTokensState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyTokensText: {
    fontSize: 14,
    color: '#8B7355',
    fontStyle: 'italic',
  },
  addWalletOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  addWalletModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    elevation: 10,
    shadowColor: '#A0522D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
  },
  addWalletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
  },
  addWalletTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3D2914',
  },
  addWalletContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D2914',
    marginBottom: 8,
  },
  addressInput: {
    backgroundColor: '#F5F0E8',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#3D2914',
    borderWidth: 1,
    borderColor: '#E8DDD0',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFB3B3',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 12,
    color: '#8B7355',
    marginTop: 12,
    lineHeight: 16,
  },
  addWalletActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    gap: 12,
  },
  cancelButtonNew: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DDD0',
  },
  cancelButtonText: {
    color: '#8B7355',
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonNew: {
    flex: 1,
    backgroundColor: '#A0522D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resolvingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F0E8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DDD0',
  },
  resolvingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8B7355',
    fontWeight: '500',
  },
  resolvedContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  resolvedLabel: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 4,
  },
  resolvedAddress: {
    fontSize: 14,
    color: '#1B5E20',
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 80, // Move above tab bar
    backgroundColor: '#A0522D',
    elevation: 10,
    shadowColor: '#A0522D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 9999,
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
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#A0522D', // Rich brown shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#E8DDD0', // Light beige border
  },
  totalPortfolioLabel: {
    fontSize: 16,
    color: '#8B7355', // Muted brown
    fontWeight: '500',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  totalPortfolioValue: {
    fontSize: 36,
    color: '#A0522D', // Rich brown accent
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  totalPortfolioSubtext: {
    fontSize: 14,
    color: '#8B7355', // Muted brown
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});
