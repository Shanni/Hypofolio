import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, List, Divider } from 'react-native-paper';
import { useWallet } from '../context/WalletContext';

const WalletDetailsScreen = ({ route }) => {
  const { address } = route.params;
  const { wallets, updateBalance } = useWallet();
  const wallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
  
  useEffect(() => {
    // Refresh data when screen loads
    if (wallet) {
      updateBalance(wallet.address);
    }
  }, []);

  const handleRefreshBalance = async () => {
    await updateBalance(address);
  };

  if (!wallet) {
    return <Text>Wallet not found</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.addressText}>{wallet.address}</Text>
          <Text variant="headlineSmall" style={styles.balanceText}>{wallet.balance} ETH</Text>
          <Button mode="contained" onPress={handleRefreshBalance} style={styles.button}>
            Refresh Balance
          </Button>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Title title="Tokens" />
        <Card.Content>
          {wallet.tokens && wallet.tokens.length > 0 ? (
            wallet.tokens.map((token, index) => (
              <View key={index}>
                {index > 0 && <Divider style={styles.divider} />}
                <List.Item
                  title={token.symbol}
                  description={`Balance: ${token.balance}`}
                  left={props => <List.Icon {...props} icon="token" />}
                />
              </View>
            ))
          ) : (
            <Text>No tokens found</Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginVertical: 8,
  },
  button: {
    marginTop: 16,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '500',
  },
  balanceText: {
    marginTop: 8,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 8,
  },
});

export default WalletDetailsScreen;
