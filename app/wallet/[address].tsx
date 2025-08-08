import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, IconButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, API_CONFIG } from '../../src/config/api';

// Define interfaces
interface Token {
  symbol: string;
  balance: string;
  decimals: number;
  price?: number;
  change24h?: number;
}

interface Wallet {
  address: string;
  balance: string;
  tokens: Token[];
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
        change24h: getMockChange24h('ETH'),
        usdValue: ethValue
      });
      
      portfolioValue += ethValue;
    }
    
    // Add other tokens
    wallet.tokens.forEach(token => {
      const balance = parseFloat(token.balance);
      const price = getMockPrice(token.symbol);
      const usdValue = balance * price;
      portfolioValue += usdValue;

      allTokens.push({
        ...token,
        price,
        change24h: getMockChange24h(token.symbol),
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
    const changeColor = (item.change24h || 0) >= 0 ? '#00C853' : '#FF1744';
    const changeIcon = (item.change24h || 0) >= 0 ? '↗' : '↘';
    
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
                {(item.change24h || 0) >= 0 ? '+' : ''}{(item.change24h || 0).toFixed(2)}% {changeIcon}
              </Text>
            </View>
          </View>
          <View style={styles.tokenPrice}>
            <Text style={styles.priceLabel}>Price: ${(item.price || 0).toFixed(2)}</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconButton icon="arrow-left" size={24} iconColor="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{formatAddress(wallet.address)}</Text>
        </View>
      </View>

      {/* Portfolio Summary */}
      <View style={styles.portfolioSummary}>
        <View style={styles.summaryCardFull}>
          <Text style={styles.summaryLabel}>Total Portfolio Value</Text>
          <Text style={styles.summaryValue}>${totalValue.toFixed(2)}</Text>
        </View>
      </View>

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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  walletAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  portfolioSummary: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryCardFull: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
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
