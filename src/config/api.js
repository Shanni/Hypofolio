// API configuration
export const API_CONFIG = {
  BASE_URL: 'https://6c449606d196.ngrok-free.app',
  ENDPOINTS: {
    WALLET: '/api/wallet',
    WALLET_BALANCE: '/api/wallet/:address/balance',
    WALLET_TOKENS: '/api/wallet/:address/tokens',
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
