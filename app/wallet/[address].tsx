import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, IconButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, API_CONFIG } from '../../src/config/api';

// Define styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8', // Light beige from swatch
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  walletAddress: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#8B7355', // Muted brown
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF', // Pure white
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD0', // Light beige border
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#A0522D',
    fontWeight: '500',
  },
  backButton: {
    fontSize: 16,
    color: '#A0522D',
    fontWeight: '500',
  },
  portfolioSummary: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Pure white
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#A0522D', // Rich brown shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E8DDD0', // Light beige border
  },
  summaryCardFull: {
    backgroundColor: '#F5F0E8', // Light beige from swatch
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#A0522D', // Rich brown shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8DDD0', // Light beige border
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tokensSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tokensList: {
    paddingBottom: 20,
  },
  tokenCard: {
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#A0522D', // Rich brown shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF', // Pure white background
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DDD0', // Light beige border
  },
  tokenContent: {
    padding: 16,
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  tokenBalance: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  tokenValues: {
    alignItems: 'flex-end',
  },
  tokenValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  priceChange: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  tokenPrice: {
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  marketCapLabel: {
    fontSize: 11,
    color: '#8B7355', // Muted brown
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
});

// Define interfaces
interface Token {
  symbol: string;
  balance: string;
  decimals: number;
  price?: number;
  value?: number;
  usdValue?: number;
  priceChange24h?: number | null;
  marketData?: {
    usd: number;
    usd_market_cap: number;
    usd_24h_vol: number;
    usd_24h_change: number;
  };
}

interface RealToken {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  contractAddress?: string;
  isNative?: boolean;
  price: number;
  usdValue: number;
  priceChange24h: number | null;
  lastPriceUpdate?: string | null;
}

interface Wallet {
  address: string;
  balance: string;
  tokens: Token[];
  totalValue?: number;
}

interface PortfolioResponse {
  address: string;
  balance: string;
  tokens: Token[];
  totalValue: number;
  timestamp: string;
}

interface RealHoldingsResponse {
  success: boolean;
  address: string;
  tokens: RealToken[];
  totalValue: number;
  tokenCount: number;
  timestamp: string;
  message?: string;
}

// Use RealToken as our main token interface since it already has usdValue
type TokenWithValue = RealToken;

export default function WalletDetailsScreen() {
  // Tab navigation is handled by the Tabs component in the return statement
  const { address } = useLocalSearchParams<{ address: string }>();
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [tokensWithValue, setTokensWithValue] = useState<TokenWithValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    if (address) {
      loadWalletDetails();
    }
  }, [address]);

  useEffect(() => {
    if (wallet) {
      calculateTokenValues();
    }
  }, [wallet]);

  const loadWalletDetails = async () => {
    try {
      if (!address) return;

      // First, load from AsyncStorage immediately for fast display
      const storedWallets = await AsyncStorage.getItem('wallets');
      if (storedWallets) {
        const wallets: Wallet[] = JSON.parse(storedWallets);
        const foundWallet = wallets.find(w => w.address === address);
        if (foundWallet) {
          setWallet(foundWallet);
          setTotalValue(foundWallet.totalValue || 0);
          
          // Convert stored wallet data to TokenWithValue format
          const storedTokens: TokenWithValue[] = foundWallet.tokens.map(token => ({
            symbol: token.symbol,
            name: token.symbol,
            balance: token.balance,
            decimals: token.decimals,
            price: token.price || 0,
            usdValue: token.usdValue || 0,
            priceChange24h: token.priceChange24h || null
          }));
          
          // Sort by USD value
          const sortedTokens = [...storedTokens].sort((a, b) => b.usdValue - a.usdValue);
          setTokensWithValue(sortedTokens);
          setLoading(false);
        }
      }

      // Then try to fetch fresh data from backend (only once)
      try {
        const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.WALLET_REAL_HOLDINGS, { address }));
        const realHoldingsData: RealHoldingsResponse = await response.json();
        
        if (realHoldingsData.success && realHoldingsData.tokens) {
          // Update with fresh data
          setTotalValue(realHoldingsData.totalValue);
          
          const sortedTokens = [...realHoldingsData.tokens].sort((a, b) => b.usdValue - a.usdValue);
          setTokensWithValue(sortedTokens);
          
          setWallet({
            address: realHoldingsData.address,
            balance: realHoldingsData.tokens.find(t => t.isNative)?.balance || '0',
            tokens: realHoldingsData.tokens,
            totalValue: realHoldingsData.totalValue
          });

          // Update AsyncStorage with fresh data
          if (storedWallets) {
            const wallets: Wallet[] = JSON.parse(storedWallets);
            const updatedWallets = wallets.map(w => 
              w.address === address ? {
                address: realHoldingsData.address,
                tokens: realHoldingsData.tokens,
                totalValue: realHoldingsData.totalValue,
                tokenCount: realHoldingsData.tokenCount
              } : w
            );
            await AsyncStorage.setItem('wallets', JSON.stringify(updatedWallets));
          }
        }
      } catch (apiError) {
        console.log('API call failed, using cached data:', apiError);
        // We already have cached data loaded, so just continue
      }
    } catch (error) {
      console.error('Error loading wallet details:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTokenValues = () => {
    if (!wallet) return;
    
    // If we already have tokens with value from the real-holdings endpoint,
    // we don't need to recalculate anything
    if (tokensWithValue.length > 0 && tokensWithValue[0].usdValue !== undefined) {
      return;
    }
    
    let portfolioValue = 0;
    const allTokens: TokenWithValue[] = [];
    
    // Add tokens from wallet data
    wallet.tokens.forEach(token => {
      const balance = parseFloat(token.balance);
      const price = token.price || 0;
      const usdValue = token.value || (balance * price);
      portfolioValue += usdValue;

      allTokens.push({
        symbol: token.symbol,
        name: token.symbol, // Legacy data doesn't have name
        balance: token.balance,
        decimals: token.decimals,
        price: price,
        usdValue: usdValue,
        priceChange24h: token.marketData?.usd_24h_change || null
      });
    });
    
    // Sort by USD value descending
    allTokens.sort((a, b) => b.usdValue - a.usdValue);
    
    setTokensWithValue(allTokens);
    setTotalValue(portfolioValue);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWalletDetails();
    setRefreshing(false);
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
      'XMR': 'ɱ'
    };
    return icons[symbol] || '●';
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const renderTokenItem = ({ item }: { item: TokenWithValue }) => {
    const change24h = item.priceChange24h || 0;
    const changeColor = change24h >= 0 ? '#00C853' : '#FF1744';
    const changeIcon = change24h >= 0 ? '↗' : '↘';
    const price = item.price || 0;
    
    return (
      <Card style={styles.tokenCard}>
        <Card.Content style={styles.tokenContent}>
          <View style={styles.tokenHeader}>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenIcon}>{getTokenIcon(item.symbol)}</Text>
              <View>
                <Text style={styles.tokenSymbol}>{item.symbol}</Text>
                <Text style={styles.tokenBalance}>
                  {parseFloat(item.balance).toFixed(4)} {item.symbol}
                </Text>
              </View>
            </View>
            <View style={styles.tokenValues}>
              <Text style={styles.tokenValue}>${item.usdValue.toFixed(2)}</Text>
              {item.priceChange24h !== null && (
                <Text style={[styles.priceChange, { color: changeColor }]}>
                  {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% {changeIcon}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.tokenPrice}>
            <Text style={styles.priceLabel}>Price: ${price < 1 ? price.toFixed(6) : price.toFixed(2)}</Text>
            {item.name && item.name !== item.symbol && (
              <Text style={styles.marketCapLabel}>{item.name}</Text>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading wallet details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!wallet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Wallet not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  
  return (
    <>
      <Stack.Screen options={{
        headerShown: false,
      }} />
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: '#E8DDD0',
          },
          tabBarActiveTintColor: '#A0522D',
          tabBarInactiveTintColor: '#8B7355',
          tabBarShowLabel: true,
          headerShown: false
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Wallets',
            tabBarIcon: ({ color }) => <Ionicons name="wallet-outline" size={24} color={color} />,
          }}
          redirect={true}
        />
        <Tabs.Screen
          name="tokens"
          options={{
            title: 'Tokens',
            tabBarIcon: ({ color }) => <Ionicons name="logo-bitcoin" size={24} color={color} />,
          }}
          redirect={true}
        />
        <Tabs.Screen
          name="analysis"
          options={{
            title: 'Analysis',
            tabBarIcon: ({ color }) => <Ionicons name="analytics-outline" size={24} color={color} />,
          }}
          redirect={true}
        />
      </Tabs>
      
      <SafeAreaView style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonContainer}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet Details</Text>
        </View>
        
        {/* Scrollable Content */}
        <FlatList
          data={tokensWithValue.filter(token => token.usdValue >= 0.01)}
          renderItem={renderTokenItem}
          keyExtractor={(item) => item.symbol}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={() => (
            <View style={styles.summaryContainer}>
              <Card style={styles.summaryCard}>
                <Card.Content>
                  <Text style={styles.summaryLabel}>Total Portfolio Value</Text>
                  <Text style={styles.summaryValue}>${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  <Text style={styles.walletAddress}>{formatAddress(address || '')}</Text>
                </Card.Content>
              </Card>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No tokens found in this wallet</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </>
  );
}
