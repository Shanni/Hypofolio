import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Button, TextInput, IconButton, ActivityIndicator } from 'react-native-paper';
import { useWallet } from '../context/WalletContext';

const HomeScreen = ({ navigation }) => {
  const { wallets, addWallet } = useWallet();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddWallet = async () => {
    if (!address.trim()) {
      setError('Please enter a wallet address');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await addWallet(address);
      setAddress('');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const navigateToWalletDetails = (address) => {
    navigation.navigate('WalletDetails', { address });
  };

  const renderWalletItem = ({ item }) => (
    <TouchableOpacity onPress={() => navigateToWalletDetails(item.address)}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.walletInfo}>
            <Text variant="titleMedium" numberOfLines={1} style={styles.addressText}>
              {item.address}
            </Text>
            <Text variant="bodyLarge" style={styles.balanceText}>
              {item.balance} ETH
            </Text>
          </View>
          <IconButton icon="chevron-right" size={24} onPress={() => navigateToWalletDetails(item.address)} />
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Card style={styles.inputCard}>
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
          <Button 
            mode="contained" 
            onPress={handleAddWallet} 
            style={styles.button}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : 'Add Wallet'}
          </Button>
        </Card.Content>
      </Card>
      
      <Text variant="titleLarge" style={styles.sectionTitle}>Your Wallets</Text>
      
      {wallets.length > 0 ? (
        <FlatList
          data={wallets}
          renderItem={renderWalletItem}
          keyExtractor={(item) => item.address}
          style={styles.list}
        />
      ) : (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text style={styles.emptyText}>No wallets added yet</Text>
          </Card.Content>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  inputCard: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  card: {
    marginVertical: 6,
    borderRadius: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletInfo: {
    flex: 1,
  },
  addressText: {
    marginBottom: 4,
  },
  balanceText: {
    fontWeight: 'bold',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
  },
});

export default HomeScreen;
