import { Platform } from 'react-native';

// API configuration with platform-specific URLs
const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:4005';
  }
  // For Android/iOS, use ngrok tunnel
  return 'https://3f7f686caac8.ngrok-free.app';
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  ENDPOINTS: {
    WALLET: '/api/wallet',
    WALLET_REAL_HOLDINGS: '/api/wallet/:address/real-holdings',
    WALLET_BALANCE: '/api/wallet/:address/balance',
    WALLET_TOKENS: '/api/wallet/:address/tokens',
    WALLET_PORTFOLIO: '/api/wallet/:address/portfolio',
    MARKET_PRICES: '/api/market/prices',
    MARKET_TOKENS: '/api/market/tokens',
    MARKET_TOP: '/api/market/top',
    MARKET_GLOBAL: '/api/market/global'
  }
};

// Helper function to get full API URL
export const getApiUrl = (endpoint, params = {}) => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  // Replace path parameters
  Object.keys(params).forEach(key => {
    url = url.replace(`:${key}`, params[key]);
  });
  
  return url;
};
