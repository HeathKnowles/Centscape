import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Quick manual override - replace with your Expo Metro IP
const EXPO_METRO_IP = '10.124.253.191'; // Your computer's IP

const getApiBaseUrl = () => {
  if (!__DEV__) {
    return 'https://your-production-api.com';
  }
  
  // Use HTTP with cleartext traffic enabled
  return `http://${EXPO_METRO_IP}:3000`;
};

const API_BASE_URL = getApiBaseUrl();

export interface PreviewResponse {
  title?: string;
  image?: string;
  price?: string;
  currency?: string;
  siteName?: string;
  sourceUrl?: string;
}

export interface ApiError {
  error: string;
  retryAfter?: string;
}

/**
 * Test basic connectivity to the backend
 */
export async function testConnection(): Promise<boolean> {
  try {
    // First test public internet connectivity
    console.log('🌐 Testing internet connectivity...');
    const publicResponse = await fetch('https://httpbin.org/get', {
      method: 'GET',
    });
    console.log('✅ Internet works:', publicResponse.ok);
    
    if (!publicResponse.ok) {
      console.log('❌ No internet connection');
      return false;
    }
    
    // Now test local backend
    console.log('🔌 Testing connection to:', API_BASE_URL);
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });
    
    console.log('✅ Backend connection successful:', response.status);
    return response.ok;
  } catch (error) {
    console.log('❌ Connection test failed:', error);
    return false;
  }
}

/**
 * Fetch preview data from backend
 * @param url - URL to fetch preview for
 * @returns Promise<PreviewResponse> - Preview metadata
 */
export async function fetchPreview(url: string): Promise<PreviewResponse> {
  console.log('🔍 Fetching preview for URL:', url);
  console.log('📡 API Base URL:', API_BASE_URL);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s for debugging

  try {
    const requestBody = { url };
    console.log('📤 Request body:', JSON.stringify(requestBody));
    
    const response = await fetch(`${API_BASE_URL}/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', response.headers);

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        const errorData: ApiError = await response.json();
        throw new Error(`Rate limit exceeded. ${errorData.retryAfter ? `Try again in ${errorData.retryAfter}` : 'Please try again later.'}`);
      }
      
      const errorData: ApiError = await response.json();
      console.log('❌ Error response:', errorData);
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: PreviewResponse = await response.json();
    console.log('✅ Success response:', data);
    return data;
  } catch (error) {
    console.log('💥 Fetch error:', error);
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      throw error;
    }
    
    throw new Error('Network error. Please check your connection and try again.');
  }
}

/**
 * Retry wrapper with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Don't retry on rate limit or client errors
      if (lastError.message.includes('Rate limit') || lastError.message.includes('400')) {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Fetch preview with retry logic
 * @param url - URL to fetch preview for
 * @returns Promise<PreviewResponse> - Preview metadata with retry
 */
export async function fetchPreviewWithRetry(url: string): Promise<PreviewResponse> {
  return retryWithBackoff(() => fetchPreview(url), 2, 1000);
}