import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { config } from '../config';

interface SecretCache {
  [key: string]: {
    value: string;
    timestamp: number;
  };
}

// Cache for secrets to avoid frequent calls to Secrets Manager
const secretsCache: SecretCache = {};

/**
 * Service to retrieve secrets from AWS Secrets Manager with caching
 */
export class SecretsManagerService {
  private client: SecretsManager;
  private useLocalSecrets: boolean;
  
  constructor() {
    this.client = new SecretsManager({
      region: config.aws.region,
    });
    
    // Check if we should use local secrets for development
    this.useLocalSecrets = process.env.NODE_ENV !== 'production' && !!config.jwt.localSecret;
    
    if (this.useLocalSecrets) {
      console.log('Using local secrets for development');
    }
  }
  
  /**
   * Get a secret from AWS Secrets Manager with caching
   * @param secretName The name of the secret to retrieve
   * @returns The secret value
   */
  async getSecret(secretName: string): Promise<string> {
    // For local development, use the local secret if available
    if (this.useLocalSecrets && secretName === config.jwt.secretName && config.jwt.localSecret) {
      return config.jwt.localSecret;
    }
    
    // Check if secret is in cache and not expired
    const cachedSecret = secretsCache[secretName];
    const now = Date.now();
    
    if (
      cachedSecret && 
      now - cachedSecret.timestamp < config.aws.secretsManager.cacheExpiryMs
    ) {
      return cachedSecret.value;
    }
    
    try {
      // Retrieve secret from Secrets Manager
      const response = await this.client.getSecretValue({ SecretId: secretName });
      
      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} not found or has no value`);
      }
      
      // Cache the secret
      secretsCache[secretName] = {
        value: response.SecretString,
        timestamp: now,
      };
      
      return response.SecretString;
    } catch (error) {
      console.error(`Error retrieving secret ${secretName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get the JWT secret key from Secrets Manager
   * @returns The JWT secret key
   */
  async getJwtSecret(): Promise<string> {
    return this.getSecret(config.jwt.secretName);
  }
} 