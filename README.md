# Mumzworld API Gateway Magento Auth Lambda

A Lambda authorizer for AWS API Gateway that validates JWT tokens issued by Magento, enabling decoupled authentication for Magento-based APIs.

## Overview

This Lambda authorizer implements a token-based validation mechanism that:

1. Validates JWT tokens locally without calling back to Magento for every request
2. Verifies token signature, expiration, and claims
3. Returns appropriate IAM policies based on validation results
4. Caches validation results for improved performance

## Features

- **Local Token Validation**: Validates tokens without calling back to Magento
- **Performance Optimized**: 
  - Configurable authorizer result caching (default: 300 seconds)
  - Secret caching to minimize AWS Secrets Manager calls
  - Lightweight implementation for fast execution
- **Security Best Practices**:
  - JWT signature verification
  - Token expiration validation
  - Role and scope-based access control
  - Optional IP validation for sensitive operations

## Setup

### Prerequisites

- Node.js 18+
- AWS CLI configured with appropriate permissions
- AWS Secrets Manager with JWT secret stored

### Installation

```bash
# Clone the repository
git clone https://github.com/mumzworld/mumzworld-api-gateway-magento-auth-lambda.git
cd mumzworld-api-gateway-magento-auth-lambda

# Install dependencies
npm install

# Copy the example environment file and modify as needed
cp .env.example .env

# Build the project
npm run build
```

### Local Development

For local development, you can use the `.env` file to configure the Lambda authorizer:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file to set your local configuration.

3. For local testing without AWS Secrets Manager, you can set a local JWT secret:
   ```
   LOCAL_JWT_SECRET=your-local-development-secret-key
   ```

4. Run the Lambda in watch mode:
   ```bash
   npm run start
   ```

### Configuration

The Lambda authorizer can be configured using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET_NAME` | Name of the secret in AWS Secrets Manager | `magento/jwt/secret` |
| `JWT_ISSUER` | Expected issuer of the JWT | `magento` |
| `JWT_AUDIENCE` | Expected audience of the JWT | `api-gateway` |
| `JWT_EXPIRES_IN` | Token expiration time in seconds | `3600` (1 hour) |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `AWS_REGION` | AWS region for Secrets Manager | `us-east-1` |
| `SECRETS_CACHE_EXPIRY_MS` | Cache duration for secrets in milliseconds | `300000` (5 minutes) |
| `AUTHORIZER_CACHE_TTL` | Cache TTL for authorizer results in seconds | `300` (5 minutes) |

### Deployment

```bash
# Package the Lambda function
npm run package

# Deploy using AWS CLI
aws lambda create-function \
  --function-name mumzworld-api-gateway-magento-auth \
  --runtime nodejs18.x \
  --handler dist/index.handler \
  --zip-file fileb://lambda-package.zip \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --environment Variables="{JWT_SECRET_NAME=magento/jwt/secret,AUTHORIZER_CACHE_TTL=300}"
```

## Token Structure

The Lambda authorizer expects JWT tokens with the following claims:

```json
{
  "sub": "user123",                 // User ID
  "roles": ["customer", "admin"],   // User roles
  "scopes": ["read", "write"],      // API scopes
  "iat": 1625097600,                // Issued at timestamp
  "exp": 1625101200,                // Expiration timestamp
  "nbf": 1625097600,                // Not before timestamp (optional)
  "iss": "magento",                 // Issuer (optional)
  "jti": "unique-token-id",         // JWT ID (optional)
  "ip": "192.168.1.1"               // IP address (optional)
}
```

## API Gateway Integration

1. Create a Lambda authorizer in API Gateway:
   - Type: `TOKEN`
   - Lambda Function: `mumzworld-api-gateway-magento-auth`
   - Token Source: `Authorization`
   - Result TTL in Seconds: `300`

2. Configure the authorizer on your API methods:
   - Select the authorizer for each method or use it as the default authorizer

3. Access user information in backend services:
   - The authorizer passes user information to backend services via the request context
   - The following context variables are available:
     - `$context.authorizer.userId` - The authenticated user's ID
     - `$context.authorizer.roles` - Comma-separated list of user roles
     - `$context.authorizer.scopes` - Comma-separated list of token scopes
     - `$context.authorizer.userIdHeader` - User ID that can be mapped to a custom header
     - `$context.authorizer.authenticated` - Always "true" for successful authentication
     - `$context.authorizer.timestamp` - When the token was validated

4. Map context variables to headers (optional):
   - In the API Gateway integration request settings, you can map context variables to HTTP headers
   - Example mapping:
     ```
     Integration Request → HTTP Headers → Add header:
     Name: X-User-Id
     Mapped from: $context.authorizer.userIdHeader
     ```

## Documentation

For more detailed documentation, check the [docs](./docs) directory:

- [JWT Key Sharing Guide](./docs/jwt-key-sharing.md) - How to securely share JWT signing keys between Magento and the Lambda authorizer

## Development

```bash
# Run tests
npm test

# Run in watch mode during development
npm run start
```

## License

ISC
