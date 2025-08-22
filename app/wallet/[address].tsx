import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, IconButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, API_CONFIG } from '../../src/config/api';

// Define interfaces
interface Token {
  symbol: string;
  balance: string;
  decimals: number;
  price?: number;
  value?: number;
  marketData?: {
    usd: number;
    usd_market_cap: number;
    usd_24h_vol: number;
    usd_24h_change: number;
  };
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

interface TokenWithValue extends Token {
  usdValue: number;
}

export default function WalletDetailsScreen() {
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
      // First try to get real portfolio data from backend
      if (address) {
        try {
          const response = await fetch(`http://localhost:4001/api/wallet/${address}/portfolio`);
          const portfolioData: PortfolioResponse = await response.json();
          
          if (portfolioData.address) {
            setWallet({
              address: portfolioData.address,
              balance: portfolioData.balance,
              tokens: portfolioData.tokens,
              totalValue: portfolioData.totalValue
            });
            setTotalValue(portfolioData.totalValue);
            
            // Convert to TokenWithValue format
            const enrichedTokens: TokenWithValue[] = portfolioData.tokens.map(token => ({
              ...token,
              usdValue: token.value || 0
            }));
            
            setTokensWithValue(enrichedTokens);
            setLoading(false);
            return;
          }
        } catch (apiError) {
          console.log('API call failed, falling back to stored data:', apiError);
        }
      }
      
      // Fallback to stored wallet data
      const storedWallets = await AsyncStorage.getItem('wallets');
      if (storedWallets) {
        const wallets: Wallet[] = JSON.parse(storedWallets);
        const foundWallet = wallets.find(w => w.address === address);
        if (foundWallet) {
          setWallet(foundWallet);
        }
      }
    } catch (error) {
      console.error('Error loading wallet details:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTokenValues = () => {
    if (!wallet) return;

    // If we already have portfolio data from API, skip calculation
    if (wallet.totalValue !== undefined) {
      return;
    }

    let portfolioValue = 0;
    const allTokens: TokenWithValue[] = [];
    
    // Add ETH as a token if there's a balance
    if (wallet.balance && parseFloat(wallet.balance) > 0) {
      const ethBalance = parseFloat(wallet.balance);
      const ethPrice = getMockPrice('ETH');
      const ethValue = ethBalance * ethPrice;
      
      allTokens.push({
        symbol: 'ETH',
        balance: wallet.balance,
        decimals: 18,
        price: ethPrice,
        marketData: {
          usd: ethPrice,
          usd_market_cap: 0,
          usd_24h_vol: 0,
          usd_24h_change: getMockChange24h('ETH')
        },
        usdValue: ethValue
      });
      
      portfolioValue += ethValue;
    }
    
    // Add other tokens
    wallet.tokens.forEach(token => {
      const balance = parseFloat(token.balance);
      const price = token.price || getMockPrice(token.symbol);
      const usdValue = token.value || (balance * price);
      portfolioValue += usdValue;

      allTokens.push({
        ...token,
        price,
        usdValue
      });
    });

    // Sort by USD value descending
    allTokens.sort((a, b) => b.usdValue - a.usdValue);
    
    setTokensWithValue(allTokens);
    setTotalValue(portfolioValue);
  };

  const getMockPrice = (symbol: string): number => {
    const prices: { [key: string]: number } = {
      'ETH': 2902.26,
      'BTC': 43298.89,
      'USDT': 1.00,
      'USDC': 1.00,
      'LINK': 14.52,
      'UNI': 8.76,
      'XRP': 0.202252,
      'BCH': 396.76,
      'XMR': 94.12
    };
    return prices[symbol] || Math.random() * 100;
  };

  const getMockChange24h = (symbol: string): number => {
    const changes: { [key: string]: number } = {
      'ETH': -1.99,
      'BTC': -3.37,
      'USDT': 0.01,
      'USDC': -0.02,
      'LINK': 2.15,
      'UNI': 4.32,
      'XRP': -1.25,
      'BCH': -3.90,
      'XMR': 2.97
    };
    return changes[symbol] || (Math.random() - 0.5) * 10;
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
    const change24h = item.marketData?.usd_24h_change || 0;
    const changeColor = change24h >= 0 ? '#00C853' : '#FF1744';
    const changeIcon = change24h >= 0 ? '↗' : '↘';
    const price = item.price || item.marketData?.usd || 0;
    
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
              <Text style={[styles.priceChange, { color: changeColor }]}>
                {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% {changeIcon}
              </Text>
            </View>
          </View>
          <View style={styles.tokenPrice}>
            <Text style={styles.priceLabel}>Price: ${price < 1 ? price.toFixed(6) : price.toFixed(2)}</Text>
            {item.marketData && (
              <Text style={styles.marketCapLabel}>
                Market Cap: ${item.marketData.usd_market_cap >= 1e9 ? 
                  `${(item.marketData.usd_market_cap / 1e9).toFixed(1)}B` : 
                  `${(item.marketData.usd_market_cap / 1e6).toFixed(1)}M`}
              </Text>
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
    <SafeAreaView style={styles.container}>
      {/* Simple Header */}
      {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconButton icon="arrow-left" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet Details</Text>
      </View> */}

      {/* Tokens List */}
      <View style={styles.tokensSection}>
        <Text style={styles.sectionTitle}>Assets ({tokensWithValue.length})</Text>
        
        {tokensWithValue.length > 0 ? (
          <FlatList
            data={tokensWithValue}
            renderItem={renderTokenItem}
            keyExtractor={(item) => item.symbol}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.tokensList}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tokens found in this wallet</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8', // Light beige from swatch
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
  backButton: {
    marginRight: 8,
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
});
