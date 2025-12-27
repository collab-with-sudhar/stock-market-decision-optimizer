import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.nix-ai.dev/api';

let apiClient;

try {
  apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, 
  });

  

  
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      
      return Promise.reject(error);
    }
  );
} catch (error) {
  console.error('Failed to initialize axios:', error);
  
  apiClient = {
    post: () => { throw new Error('Axios not properly initialized. Run: npm install axios'); },
    get: () => { throw new Error('Axios not properly initialized. Run: npm install axios'); },
    put: () => { throw new Error('Axios not properly initialized. Run: npm install axios'); },
    delete: () => { throw new Error('Axios not properly initialized. Run: npm install axios'); },
  };
}

export default apiClient;
