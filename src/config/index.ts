// Load environment variables from .env file in local development
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config();
}

export const config = {
  // JWT configuration
  jwt: {
    secretName: process.env.JWT_SECRET_NAME || 'magento/jwt/secret',
    issuer: process.env.JWT_ISSUER || 'magento',
    audience: process.env.JWT_AUDIENCE || 'api-gateway',
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '3600', 10), // 1 hour in seconds
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
    // For local development without AWS Secrets Manager
    localSecret: process.env.LOCAL_JWT_SECRET,
  },
  
  // AWS configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    secretsManager: {
      cacheExpiryMs: parseInt(process.env.SECRETS_CACHE_EXPIRY_MS || '300000', 10), // 5 minutes
    },
  },
  
  // Lambda authorizer configuration
  authorizer: {
    // Cache TTL for the authorizer result (in seconds)
    // This is important for performance - set to 5-10 minutes (300-600 seconds)
    cacheTtl: parseInt(process.env.AUTHORIZER_CACHE_TTL || '300', 10),
    
    // Default deny all policy
    denyAllPolicy: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Deny',
          Resource: '*',
        },
      ],
    },
  },
}; 