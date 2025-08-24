import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl, API_CONFIG } from '../../src/config/api';

interface AnalysisData {
  totalValue: number;
  topPerformer: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  recommendation: string;
  diversification: number;
  tokenCount: number;
  largestHolding: {
    symbol: string;
    percentage: number;
  };
}

interface WalletHolding {
  address: string;
  tokens: Array<{
    symbol: string;
    balance: string;
    price: number;
    usdValue: number;
  }>;
  totalValue: number;
}

export default function AnalysisScreen() {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      
      // Get real wallet data from AsyncStorage
      const storedWallets = await AsyncStorage.getItem('wallets');
      if (!storedWallets) {
        setLoading(false);
        return;
      }
      
      const wallets = JSON.parse(storedWallets);
      const allHoldings: WalletHolding[] = [];
      
      // Fetch real holdings for each wallet
      for (const wallet of wallets) {
        try {
          const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.WALLET_REAL_HOLDINGS, { address: wallet.address }));
          const data = await response.json();
          
          if (data.success && data.tokens) {
            allHoldings.push({
              address: wallet.address,
              tokens: data.tokens,
              totalValue: data.totalValue || 0
            });
          }
        } catch (error) {
          console.error(`Error fetching data for wallet ${wallet.address}:`, error);
        }
      }
      
      // Calculate real analysis from actual data
      const realAnalysis = calculatePortfolioAnalysis(allHoldings);
      setAnalysis(realAnalysis);
      setLoading(false);
      
    } catch (error) {
      console.error('Error loading analysis:', error);
      setLoading(false);
    }
  };
  
  const calculatePortfolioAnalysis = (holdings: WalletHolding[]): AnalysisData => {
    if (holdings.length === 0) {
      return {
        totalValue: 0,
        topPerformer: 'N/A',
        riskLevel: 'Low',
        recommendation: 'Add some wallets to start building your portfolio.',
        diversification: 0,
        tokenCount: 0,
        largestHolding: { symbol: 'N/A', percentage: 0 }
      };
    }
    
    // Aggregate all tokens across wallets
    const allTokens: { [symbol: string]: { totalValue: number; balance: number } } = {};
    let totalPortfolioValue = 0;
    
    holdings.forEach(wallet => {
      totalPortfolioValue += wallet.totalValue;
      
      wallet.tokens.forEach(token => {
        if (!allTokens[token.symbol]) {
          allTokens[token.symbol] = { totalValue: 0, balance: 0 };
        }
        allTokens[token.symbol].totalValue += token.usdValue;
        allTokens[token.symbol].balance += parseFloat(token.balance);
      });
    });
    
    // Find top performer and largest holding
    let topPerformer = 'N/A';
    let largestHolding = { symbol: 'N/A', percentage: 0 };
    let maxValue = 0;
    
    Object.entries(allTokens).forEach(([symbol, data]) => {
      if (data.totalValue > maxValue) {
        maxValue = data.totalValue;
        topPerformer = symbol;
        largestHolding = {
          symbol,
          percentage: (data.totalValue / totalPortfolioValue) * 100
        };
      }
    });
    
    // Calculate diversification score
    const tokenCount = Object.keys(allTokens).length;
    const diversification = Math.min(100, Math.max(0, 
      100 - (largestHolding.percentage - 20) // Penalize if largest holding > 20%
    ));
    
    // Determine risk level
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Medium';
    if (largestHolding.percentage > 70) {
      riskLevel = 'High';
    } else if (largestHolding.percentage < 30 && tokenCount > 5) {
      riskLevel = 'Low';
    }
    
    // Generate AI recommendation
    let recommendation = '';
    if (largestHolding.percentage > 60) {
      recommendation = `Your portfolio is heavily concentrated in ${topPerformer} (${largestHolding.percentage.toFixed(1)}%). Consider diversifying into other assets to reduce risk.`;
    } else if (tokenCount < 3) {
      recommendation = 'Your portfolio has limited diversification. Consider adding more different tokens to spread risk.';
    } else if (diversification > 80) {
      recommendation = 'Excellent diversification! Your portfolio shows good balance across different assets.';
    } else {
      recommendation = `Your ${topPerformer} position is performing well. Consider rebalancing if it becomes too dominant in your portfolio.`;
    }
    
    return {
      totalValue: totalPortfolioValue,
      topPerformer,
      riskLevel,
      recommendation,
      diversification: Math.round(diversification),
      tokenCount,
      largestHolding
    };
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return '#4CAF50';
      case 'Medium': return '#B8756B'; // Brownish pink
      case 'High': return '#F44336';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B8756B" />
          <Text style={styles.loadingText}>Analyzing your portfolio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analysis) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Portfolio Data</Text>
          <Text style={styles.emptyText}>Add some wallets to get AI-powered insights</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI Portfolio Analysis</Text>
          <Text style={styles.subtitle}>Powered by advanced algorithms</Text>
        </View>

        {/* Portfolio Overview */}
        <Card style={styles.overviewCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Portfolio Overview</Text>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Total Value</Text>
                <Text style={styles.overviewValue}>${analysis.totalValue.toLocaleString()}</Text>
              </View>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewLabel}>Top Performer</Text>
                <Text style={styles.overviewValue}>{analysis.topPerformer}</Text>
              </View>
            </View>
            <View style={styles.riskContainer}>
              <Text style={styles.overviewLabel}>Risk Level</Text>
              <Chip 
                style={[styles.riskChip, { backgroundColor: getRiskColor(analysis.riskLevel) + '20' }]}
                textStyle={[styles.riskText, { color: getRiskColor(analysis.riskLevel) }]}
              >
                {analysis.riskLevel}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Diversification Score */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Diversification Score</Text>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreValue}>{analysis.diversification}%</Text>
              <Text style={styles.scoreLabel}>Well diversified portfolio</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${analysis.diversification}%` }]} 
              />
            </View>
          </Card.Content>
        </Card>

        {/* AI Recommendation */}
        <Card style={styles.recommendationCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>💡 AI Recommendation</Text>
            <Text style={styles.recommendationText}>{analysis.recommendation}</Text>
          </Card.Content>
        </Card>

        {/* Refresh Button */}
        <Button 
          mode="contained" 
          onPress={loadAnalysis}
          style={styles.refreshButton}
          buttonColor="#A0522D"
        >
          Refresh Analysis
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8', // Light beige from swatch
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3D2914', // Dark brown
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0522D', // Rich brown from swatch
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B6F47',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C1810',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#8B6F47',
    textAlign: 'center',
  },
  overviewCard: {
    marginBottom: 16,
    backgroundColor: '#F5EDE1', // Light beige
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#D4A574',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#FEFCFA', // Off-white
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#D4A574',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  recommendationCard: {
    marginBottom: 24,
    backgroundColor: '#F5EDE1', // Light beige
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#D4A574',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E8D5C4',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C1810',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 14,
    color: '#8B6F47',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C1810',
  },
  riskContainer: {
    alignItems: 'center',
  },
  riskChip: {
    marginTop: 8,
  },
  riskText: {
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#A0522D', // Rich brown from swatch
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#8B6F47',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E8DDD0', // Light beige border
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A0522D', // Rich brown from swatch
    borderRadius: 4,
  },
  recommendationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2C1810',
  },
  refreshButton: {
    borderRadius: 8,
    marginBottom: 16,
  },
});