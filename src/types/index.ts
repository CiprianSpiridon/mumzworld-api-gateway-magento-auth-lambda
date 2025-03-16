import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

export interface JwtPayload {
  sub: string;          // User ID
  roles: string[];      // User roles/permissions
  scopes: string[];     // API scopes the token has access to
  iat: number;          // Issued at timestamp
  exp: number;          // Expiration timestamp
  nbf?: number;         // Not before timestamp
  iss?: string;         // Issuer (Magento)
  jti?: string;         // JWT ID (for token revocation)
  ip?: string;          // IP address for sensitive operations
}

export interface DecodedToken {
  header: {
    alg: string;
    typ: string;
  };
  payload: JwtPayload;
  signature: string;
}

export interface AuthorizerContext {
  [key: string]: string;
  userId: string;
  roles: string;
  scopes: string;
  userIdHeader: string;
  authenticated: string;
  timestamp: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  userId?: string;
  roles?: string[];
  scopes?: string[];
  error?: string;
}

export { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult }; 