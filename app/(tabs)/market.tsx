import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
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

interface GlobalMarketData {
  total_market_cap: { usd: number };
  total_volume: { usd: number };
  market_cap_percentage: { btc: number; eth: number };
  market_cap_change_percentage_24h_usd: number;
}

interface ApiResponse {
  success: boolean;
  data: MarketToken[] | GlobalMarketData;
  timestamp: string;
}

export default function MarketScreen() {
  const [topTokens, setTopTokens] = useState<MarketToken[]>([]);
  const [globalData, setGlobalData] = useState<GlobalMarketData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Gainers' | 'Losers'>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGlobalStats, setShowGlobalStats] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadMarketData();
  }, []);

  const loadMarketData = async () => {
    try {
      setLoading(true);
      
      // Fetch top cryptocurrencies and global market data in parallel
      const [topResponse, globalResponse] = await Promise.all([
        fetch(getApiUrl(API_CONFIG.ENDPOINTS.MARKET_TOP) + '?limit=100'),
        fetch(getApiUrl(API_CONFIG.ENDPOINTS.MARKET_GLOBAL))
      ]);

      const topResult: ApiResponse = await topResponse.json();
      const globalResult: ApiResponse = await globalResponse.json();

      if (topResult.success && Array.isArray(topResult.data)) {
        setTopTokens(topResult.data);
      }

      if (globalResult.success && !Array.isArray(globalResult.data)) {
        setGlobalData(globalResult.data as GlobalMarketData);
      }
    } catch (error) {
      console.error('Error loading market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMarketData();
    setRefreshing(false);
  };

  const getFilteredTokens = () => {
    let filtered = topTokens;

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

    return filtered;
  };

  const formatMarketCap = (value: number): string => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
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
      'ADA': '₳',
      'DOT': '●',
      'SOL': '◎',
      'MATIC': '⬟',
      'AVAX': '🔺'
    };
    return icons[symbol] || '●';
  };

  const renderGlobalStats = () => {
    if (!globalData) return null;

    const marketCapChange = globalData.market_cap_change_percentage_24h_usd;
    const changeColor = marketCapChange >= 0 ? '#00C853' : '#FF1744';
    const changeIcon = marketCapChange >= 0 ? '↗' : '↘';

    return (
      <View style={styles.globalStatsContainer}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setShowGlobalStats(!showGlobalStats)}
        >
          <Text style={styles.sectionTitle}>Global Market Overview</Text>
          <IconButton 
            icon={showGlobalStats ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            iconColor="#8B7355"
          />
        </TouchableOpacity>
        
        {showGlobalStats && (
          <View style={styles.statsGrid}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Market Cap</Text>
                <Text style={styles.statValue}>
                  {formatMarketCap(globalData.total_market_cap.usd)}
                </Text>
                <Text style={[styles.statChange, { color: changeColor }]}>
                  {marketCapChange >= 0 ? '+' : ''}{marketCapChange.toFixed(2)}% {changeIcon}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>24h Volume</Text>
                <Text style={styles.statValue}>
                  {formatMarketCap(globalData.total_volume.usd)}
                </Text>
              </View>
            </View>
            
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>BTC Dominance</Text>
                <Text style={styles.statValue}>
                  {globalData.market_cap_percentage.btc.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>ETH Dominance</Text>
                <Text style={styles.statValue}>
                  {globalData.market_cap_percentage.eth.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderTokenItem = ({ item, index }: { item: MarketToken; index: number }) => {
    const changeColor = item.price_change_percentage_24h >= 0 ? '#00C853' : '#FF1744';
    const changeIcon = item.price_change_percentage_24h >= 0 ? '↗' : '↘';
    
    return (
      <TouchableOpacity style={styles.tokenRow}>
        <View style={styles.tokenLeft}>
          <Text style={styles.rankText}>#{item.market_cap_rank}</Text>
          <Text style={styles.tokenIcon}>{getTokenIcon(item.symbol.toUpperCase())}</Text>
          <View style={styles.tokenDetails}>
            <Text style={styles.tokenSymbol}>{item.symbol.toUpperCase()}</Text>
            <Text style={styles.tokenName}>{item.name}</Text>
          </View>
        </View>
        
        <View style={styles.tokenRight}>
          <Text style={styles.tokenPrice}>
            ${item.current_price < 1 ? item.current_price.toFixed(6) : item.current_price.toFixed(2)}
          </Text>
          <Text style={[styles.priceChange, { color: changeColor }]}>
            {item.price_change_percentage_24h >= 0 ? '+' : ''}{item.price_change_percentage_24h?.toFixed(2) || '0.00'}% {changeIcon}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredTokens = getFilteredTokens();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cryptocurrency Market</Text>
          <Text style={styles.headerSubtitle}>Live prices and market data</Text>
        </View>

        {/* Global Market Stats */}
        {renderGlobalStats()}

        {/* Search and Filters */}
        <View style={styles.searchSection}>
          <Searchbar
            placeholder="Search cryptocurrencies..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          
          <TouchableOpacity 
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text style={styles.filterToggleText}>Filters</Text>
            <IconButton 
              icon={showFilters ? 'chevron-up' : 'chevron-down'} 
              size={16} 
              iconColor="#8B7355"
            />
          </TouchableOpacity>
          
          {showFilters && (
            <View style={styles.filterChips}>
              {['All', 'Gainers', 'Losers'].map((filterOption) => (
                <Chip
                  key={filterOption}
                  selected={filter === filterOption}
                  onPress={() => setFilter(filterOption as 'All' | 'Gainers' | 'Losers')}
                  style={[
                    styles.filterChip,
                    filter === filterOption && styles.selectedChip
                  ]}
                  textStyle={[
                    styles.chipText,
                    filter === filterOption && styles.selectedChipText
                  ]}
                >
                  {filterOption}
                </Chip>
              ))}
            </View>
          )}
        </View>

        {/* Market List Header */}
        <View style={styles.listHeader}>
          <Text style={styles.headerText}>Cryptocurrency</Text>
          <Text style={[styles.headerText, { textAlign: 'right' }]}>Price / 24h</Text>
        </View>

        {/* Token List */}
        <View style={styles.tokenList}>
          {filteredTokens.map((token, index) => (
            <View key={token.id}>
              {renderTokenItem({ item: token, index })}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8', // Light beige from swatch
  },
  header: {
    backgroundColor: '#FFFFFF', // Pure white
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD0', // Light beige border
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3D2914', // Dark brown text
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B7355', // Muted brown
  },
  globalStatsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D2914', // Dark brown text
  },
  statsGrid: {
    paddingTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Pure white
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8DDD0', // Light beige border
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#8B7355', // Muted brown
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#A0522D', // Rich brown accent
    marginBottom: 2,
  },
  statChange: {
    fontSize: 11,
    fontWeight: '500',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 8,
  },
  filterToggleText: {
    fontSize: 14,
    color: '#8B7355', // Muted brown
    fontWeight: '500',
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBar: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF', // Pure white
    elevation: 2,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF', // Pure white
    borderWidth: 1,
    borderColor: '#E8DDD0', // Light beige border
  },
  selectedChip: {
    backgroundColor: '#A0522D', // Rich brown accent
  },
  chipText: {
    fontSize: 12,
    color: '#8B7355', // Muted brown
  },
  selectedChipText: {
    color: '#FFFFFF', // White text for selected
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F0E8', // Light beige from swatch
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD0', // Light beige border
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B7355', // Muted brown
  },
  tokenList: {
    backgroundColor: '#FFFFFF', // Pure white
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD0', // Light beige border
  },
  tokenLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B7355', // Muted brown
    width: 24,
    marginRight: 8,
  },
  tokenIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  tokenDetails: {
    marginLeft: 8,
  },
  tokenSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D2914', // Dark brown text
  },
  tokenName: {
    fontSize: 11,
    color: '#8B7355', // Muted brown
    marginTop: 1,
  },
  tokenRight: {
    alignItems: 'flex-end',
  },
  tokenPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D2914', // Dark brown text
  },
  priceChange: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
