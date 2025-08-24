import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Searchbar, Chip, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getApiUrl, API_CONFIG } from '../../src/config/api';

// Define interfaces for market data
interface MarketToken {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  market_cap_rank: number;
  image?: string;
}

interface ApiResponse {
  success: boolean;
  data: MarketToken[];
  timestamp: string;
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
      // Fetch real market data from backend
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.MARKET_TOP) + '?limit=50');
      const result: ApiResponse = await response.json();
      
      if (result.success && result.data) {
        setAllTokens(result.data);
      } else {
        console.error('Failed to fetch market data:', result);
        // Fallback to empty array or show error message
        setAllTokens([]);
      }
    } catch (error) {
      console.error('Error loading market data:', error);
      // Fallback to empty array in case of network error
      setAllTokens([]);
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
      filtered = filtered.filter(token => token.price_change_percentage_24h > 0);
    } else if (filter === 'Losers') {
      filtered = filtered.filter(token => token.price_change_percentage_24h < 0);
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
    const changeColor = item.price_change_percentage_24h >= 0 ? '#00C853' : '#FF1744';
    const changeIcon = item.price_change_percentage_24h >= 0 ? '↗' : '↘';
    
    return (
      <View style={styles.tokenRow}>
        <View style={styles.tokenInfo}>
          <Text style={styles.tokenIcon}>{getTokenIcon(item.symbol.toUpperCase())}</Text>
          <View style={styles.tokenDetails}>
            <Text style={styles.tokenSymbol}>{item.symbol.toUpperCase()}</Text>
            <Text style={styles.tokenName}>{item.name}</Text>
          </View>
        </View>
        
        <View style={styles.marketColumn}>
          <Text style={styles.tokenPrice}>
            ${item.current_price < 1 ? item.current_price.toFixed(6) : item.current_price.toFixed(2)}
          </Text>
          <Text style={styles.marketCap}>{formatMarketCap(item.market_cap)}</Text>
        </View>
        
        <View style={styles.priceColumn}>
          <Text style={[styles.priceChange, { color: changeColor }]}>
            {item.price_change_percentage_24h >= 0 ? '+' : ''}{item.price_change_percentage_24h?.toFixed(2) || '0.00'}% {changeIcon}
          </Text>
          <Text style={styles.rankText}>#{item.market_cap_rank}</Text>
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
        keyExtractor={(item) => item.id}
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