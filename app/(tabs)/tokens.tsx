import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Searchbar, Chip, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define interfaces for market data
interface MarketToken {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  rank: number;
}

export default function TokensScreen() {
  const [allTokens, setAllTokens] = useState<MarketToken[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<MarketToken[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Gainers' | 'Losers'>('All');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMarketData();
  }, []);

  useEffect(() => {
    filterTokens();
  }, [allTokens, searchQuery, filter]);

  const loadMarketData = async () => {
    try {
      // Generate mock market data for popular cryptocurrencies
      const marketTokens: MarketToken[] = [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          price: 43298.89,
          change24h: -3.37,
          marketCap: 850000000000,
          volume24h: 25000000000,
          rank: 1
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          price: 2902.26,
          change24h: -1.99,
          marketCap: 350000000000,
          volume24h: 15000000000,
          rank: 2
        },
        {
          symbol: 'USDT',
          name: 'Tether',
          price: 1.00,
          change24h: 0.01,
          marketCap: 95000000000,
          volume24h: 45000000000,
          rank: 3
        },
        {
          symbol: 'BNB',
          name: 'BNB',
          price: 308.45,
          change24h: 2.15,
          marketCap: 47000000000,
          volume24h: 1200000000,
          rank: 4
        },
        {
          symbol: 'XRP',
          name: 'XRP',
          price: 0.202252,
          change24h: -1.25,
          marketCap: 11000000000,
          volume24h: 800000000,
          rank: 5
        },
        {
          symbol: 'USDC',
          name: 'USD Coin',
          price: 1.00,
          change24h: -0.02,
          marketCap: 25000000000,
          volume24h: 5000000000,
          rank: 6
        },
        {
          symbol: 'LINK',
          name: 'Chainlink',
          price: 14.52,
          change24h: 2.15,
          marketCap: 8500000000,
          volume24h: 450000000,
          rank: 7
        },
        {
          symbol: 'UNI',
          name: 'Uniswap',
          price: 8.76,
          change24h: 4.32,
          marketCap: 5200000000,
          volume24h: 180000000,
          rank: 8
        },
        {
          symbol: 'BCH',
          name: 'Bitcoin Cash',
          price: 396.76,
          change24h: -3.90,
          marketCap: 7800000000,
          volume24h: 320000000,
          rank: 9
        },
        {
          symbol: 'XMR',
          name: 'Monero',
          price: 94.12,
          change24h: 2.97,
          marketCap: 1700000000,
          volume24h: 85000000,
          rank: 10
        }
      ];
      
      setAllTokens(marketTokens);
    } catch (error) {
      console.error('Error loading market data:', error);
    }
  };



  const filterTokens = () => {
    let filtered = allTokens;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(token => 
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply gain/loss filter
    if (filter === 'Gainers') {
      filtered = filtered.filter(token => token.change24h > 0);
    } else if (filter === 'Losers') {
      filtered = filtered.filter(token => token.change24h < 0);
    }

    setFilteredTokens(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMarketData();
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

  const formatMarketCap = (value: number): string => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const renderTokenItem = ({ item }: { item: MarketToken }) => {
    const changeColor = item.change24h >= 0 ? '#00C853' : '#FF1744';
    const changeIcon = item.change24h >= 0 ? '↗' : '↘';
    
    return (
      <View style={styles.tokenRow}>
        <View style={styles.tokenInfo}>
          <Text style={styles.tokenIcon}>{getTokenIcon(item.symbol)}</Text>
          <View style={styles.tokenDetails}>
            <Text style={styles.tokenSymbol}>{item.symbol}</Text>
            <Text style={styles.tokenName}>{item.name}</Text>
          </View>
        </View>
        
        <View style={styles.marketColumn}>
          <Text style={styles.tokenPrice}>${item.price.toFixed(2)}</Text>
          <Text style={styles.marketCap}>{formatMarketCap(item.marketCap)}</Text>
        </View>
        
        <View style={styles.priceColumn}>
          <Text style={[styles.priceChange, { color: changeColor }]}>
            {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}% {changeIcon}
          </Text>
          <Text style={styles.rankText}>#{item.rank}</Text>
        </View>
        
        <TouchableOpacity style={styles.alertButton}>
          <IconButton icon="star-outline" size={20} iconColor="#666" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Market Header */}
      <View style={styles.marketHeader}>
        <Text style={styles.marketTitle}>Cryptocurrency Market</Text>
        <Text style={styles.marketSubtitle}>Live prices and market data</Text>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <Searchbar
          placeholder="Search tokens..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <View style={styles.filterChips}>
          {['All', 'Gainers', 'Losers'].map((filterOption) => (
            <Chip
              key={filterOption}
              selected={filter === filterOption}
              onPress={() => setFilter(filterOption as 'All' | 'Gainers' | 'Losers')}
              style={styles.filterChip}
              textStyle={styles.chipText}
            >
              {filterOption}
            </Chip>
          ))}
        </View>
      </View>

      {/* Token List Header */}
      <View style={styles.listHeader}>
        <Text style={styles.headerText}>Coin</Text>
        <Text style={styles.headerText}>Price/MCap</Text>
        <Text style={styles.headerText}>24h/Rank</Text>
        <Text style={styles.headerText}>Watch</Text>
      </View>

      {/* Token List */}
      <FlatList
        data={filteredTokens}
        renderItem={renderTokenItem}
        keyExtractor={(item) => item.symbol}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.tokenList}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8', // Light beige from swatch
  },
  marketHeader: {
    backgroundColor: '#FFFFFF', // Pure white
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD0', // Light beige border
  },
  marketTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  marketSubtitle: {
    fontSize: 14,
    color: '#8B7355', // Muted brown
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 12,
    elevation: 2,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF', // Pure white
  },
  chipText: {
    fontSize: 12,
  },
  listHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F5F0E8', // Light beige from swatch
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD0', // Light beige border
  },
  headerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#8B7355', // Muted brown
  },
  tokenList: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Pure white
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD0', // Light beige border
  },
  tokenInfo: {
    flex: 1,
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
  tokenDetails: {
    marginLeft: 4,
  },
  tokenName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  marketColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  marketCap: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  rankText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  priceColumn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  tokenPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  priceChange: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  alertButton: {
    width: 40,
    alignItems: 'center',
  },
});