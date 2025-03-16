# Sharing JWT Signing Keys Between Magento and Lambda Authorizer

This guide explains how to securely share JWT signing keys between Magento and the AWS Lambda authorizer to implement a decoupled authentication system.

## Overview

For the JWT token validation to work correctly, both systems need to use the same cryptographic key:

1. **Magento** uses the key to sign JWT tokens when users authenticate
2. **Lambda Authorizer** uses the same key to verify the token signatures

This guide covers different approaches to sharing these keys securely.

## Option 1: Shared Secret Key (Symmetric)

This approach uses a single secret key for both signing and verification (HMAC-based algorithms like HS256).

### Step 1: Generate a Strong Secret Key

Generate a cryptographically secure random key:

```bash
# Generate a 64-byte random key encoded as base64
openssl rand -base64 64
```

Example output:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2
```

### Step 2: Store the Secret in AWS Secrets Manager

```bash
# Store the secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name magento/jwt/secret \
  --description "JWT signing key for Magento authentication" \
  --secret-string "your-generated-secret-key-here"
```

### Step 3: Configure the Secret in Magento

#### Option A: Using Environment Variables

Add the secret to your Magento environment variables:

```bash
# In your Magento server environment configuration
export MAGENTO_JWT_SECRET="your-generated-secret-key-here"
```

Then access it in your custom JWT module:

```php
<?php
// In your Magento JWT module
$jwtSecret = getenv('MAGENTO_JWT_SECRET');
```

#### Option B: Using Magento's Configuration System

1. Create a custom configuration section in Magento admin
2. Store the value encrypted in the database
3. Access it in your code:

```php
<?php
// In your Magento JWT module
$jwtSecret = $this->scopeConfig->getValue(
    'jwt_auth/general/secret_key',
    \Magento\Store\Model\ScopeInterface::SCOPE_STORE
);
```

### Step 4: Implement JWT Token Generation in Magento

Create a custom module that generates JWT tokens during authentication:

```php
<?php
namespace YourCompany\JwtAuth\Model;

use \Firebase\JWT\JWT;
use Magento\Framework\App\Config\ScopeConfigInterface;

class TokenGenerator
{
    private $scopeConfig;
    
    public function __construct(ScopeConfigInterface $scopeConfig)
    {
        $this->scopeConfig = $scopeConfig;
    }
    
    private function getSecret()
    {
        return $this->scopeConfig->getValue(
            'jwt_auth/general/secret_key',
            \Magento\Store\Model\ScopeInterface::SCOPE_STORE
        );
    }
    
    public function generateToken($userId, array $roles, array $scopes)
    {
        $issuedAt = time();
        $expiresAt = $issuedAt + 3600; // 1 hour
        
        $payload = [
            'sub' => $userId,
            'roles' => $roles,
            'scopes' => $scopes,
            'iat' => $issuedAt,
            'exp' => $expiresAt,
            'nbf' => $issuedAt,
            'iss' => 'magento',
            'aud' => 'api-gateway',
            'jti' => $this->generateUniqueTokenId()
        ];
        
        return JWT::encode($payload, $this->getSecret(), 'HS256');
    }
    
    private function generateUniqueTokenId()
    {
        return bin2hex(random_bytes(16));
    }
}
```

## Option 2: Public/Private Key Pair (Asymmetric)

This approach uses a private key for signing (in Magento) and a public key for verification (in Lambda), using algorithms like RS256.

### Step 1: Generate a Key Pair

```bash
# Generate a private key
openssl genrsa -out private.pem 2048

# Extract the public key
openssl rsa -in private.pem -pubout -out public.pem
```

### Step 2: Store the Keys

1. **Private Key**: Store securely in Magento
2. **Public Key**: Store in AWS Secrets Manager for the Lambda

```bash
# Store the public key in AWS Secrets Manager
aws secretsmanager create-secret \
  --name magento/jwt/public-key \
  --description "JWT public key for verifying Magento tokens" \
  --secret-string file://public.pem
```

### Step 3: Implement JWT Token Generation in Magento

```php
<?php
namespace YourCompany\JwtAuth\Model;

use \Firebase\JWT\JWT;

class TokenGenerator
{
    private $privateKey;
    
    public function __construct($privateKeyPath)
    {
        $this->privateKey = file_get_contents($privateKeyPath);
    }
    
    public function generateToken($userId, array $roles, array $scopes)
    {
        $issuedAt = time();
        $expiresAt = $issuedAt + 3600; // 1 hour
        
        $payload = [
            'sub' => $userId,
            'roles' => $roles,
            'scopes' => $scopes,
            'iat' => $issuedAt,
            'exp' => $expiresAt,
            'nbf' => $issuedAt,
            'iss' => 'magento',
            'aud' => 'api-gateway',
            'jti' => $this->generateUniqueTokenId()
        ];
        
        return JWT::encode($payload, $this->privateKey, 'RS256');
    }
    
    private function generateUniqueTokenId()
    {
        return bin2hex(random_bytes(16));
    }
}
```

### Step 4: Update the Lambda to Use the Public Key

Modify the `tokenValidator.ts` file to use the public key:

```typescript
// In tokenValidator.ts
const decoded = jwt.verify(token, secret, {
  algorithms: ['RS256'],  // Change from HS256 to RS256
  issuer: config.jwt.issuer,
  audience: config.jwt.audience,
}) as JwtPayload;
```

## Option 3: Key Rotation

For enhanced security, implement key rotation:

### Step 1: Generate Multiple Keys with IDs

Generate multiple keys and assign each a unique ID (kid):

```bash
# Generate keys with different IDs
openssl rand -base64 64 > key1.txt
openssl rand -base64 64 > key2.txt
```

### Step 2: Store Keys with IDs in AWS Secrets Manager

```bash
# Store multiple keys
aws secretsmanager create-secret \
  --name magento/jwt/keys/key1 \
  --description "JWT key 1" \
  --secret-string file://key1.txt

aws secretsmanager create-secret \
  --name magento/jwt/keys/key2 \
  --description "JWT key 2" \
  --secret-string file://key2.txt
```

### Step 3: Include Key ID in JWT Header

In Magento, include the key ID in the JWT header:

```php
<?php
$header = [
    'kid' => 'key1',  // Key identifier
    'typ' => 'JWT',
    'alg' => 'HS256'
];

$jwt = JWT::encode($payload, $secret, 'HS256', null, $header);
```

### Step 4: Update Lambda to Fetch the Correct Key

Modify the Lambda to extract the key ID from the token header and fetch the corresponding key:

```typescript
// Extract key ID from token header
const decodedToken = jwt.decode(token, { complete: true });
const keyId = decodedToken?.header?.kid || 'default';

// Fetch the correct key based on ID
const secret = await this.secretsManager.getSecret(`magento/jwt/keys/${keyId}`);
```

## Security Best Practices

1. **Encrypt Keys at Rest**: Always use encryption for stored keys
2. **Limit Access**: Restrict access to keys using IAM policies
3. **Rotate Keys Regularly**: Change keys periodically (e.g., every 90 days)
4. **Monitor Usage**: Set up alerts for unusual key access patterns
5. **Use Short-Lived Tokens**: Keep token expiration times short (1 hour or less)
6. **Implement Token Revocation**: Have a mechanism to revoke tokens if needed

## Troubleshooting

### Common Issues

1. **Signature Verification Failed**: 
   - Ensure the exact same key is used in both systems
   - Check for whitespace or encoding issues in the key

2. **Token Expired**:
   - Verify server clocks are synchronized
   - Check token expiration time settings

3. **Algorithm Mismatch**:
   - Ensure both systems use the same algorithm (HS256, RS256, etc.)

### Debugging Tips

1. Decode the JWT token (without verification) to inspect its contents:
   ```typescript
   const decoded = jwt.decode(token, { complete: true });
   console.log(JSON.stringify(decoded, null, 2));
   ```

2. Log the first few characters of the secret key (never the full key) to verify it's being loaded:
   ```typescript
   console.log(`Secret key starts with: ${secret.substring(0, 3)}...`);
   ```

## Conclusion

Properly sharing JWT signing keys between Magento and the Lambda authorizer is crucial for secure, decoupled authentication. Choose the approach that best fits your security requirements and operational constraints.

Remember that the security of this system depends on keeping these keys secure and properly managing their lifecycle. 