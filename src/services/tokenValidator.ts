import jwt from 'jsonwebtoken';
import { JwtPayload, TokenValidationResult } from '../types';
import { SecretsManagerService } from './secretsManager';
import { config } from '../config';

/**
 * Service to validate JWT tokens
 */
export class TokenValidatorService {
  private secretsManager: SecretsManagerService;
  
  constructor() {
    this.secretsManager = new SecretsManagerService();
  }
  
  /**
   * Validate a JWT token
   * @param token The JWT token to validate
   * @param sourceIp Optional source IP for additional validation
   * @returns Token validation result
   */
  async validateToken(token: string, sourceIp?: string): Promise<TokenValidationResult> {
    try {
      // Get the JWT secret from Secrets Manager
      const secret = await this.secretsManager.getJwtSecret();
      
      // Verify the token
      const decoded = jwt.verify(token, secret, {
        algorithms: [config.jwt.algorithm as jwt.Algorithm],
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }) as JwtPayload;
      
      // Validate token claims
      if (!decoded.sub) {
        return { isValid: false, error: 'Missing subject (user ID) in token' };
      }
      
      if (!decoded.roles || !Array.isArray(decoded.roles) || decoded.roles.length === 0) {
        return { isValid: false, error: 'Missing or invalid roles in token' };
      }
      
      if (!decoded.scopes || !Array.isArray(decoded.scopes) || decoded.scopes.length === 0) {
        return { isValid: false, error: 'Missing or invalid scopes in token' };
      }
      
      // Check IP if provided in token and in request
      if (decoded.ip && sourceIp && decoded.ip !== sourceIp) {
        return { isValid: false, error: 'IP address mismatch' };
      }
      
      // Token is valid
      return {
        isValid: true,
        userId: decoded.sub,
        roles: decoded.roles,
        scopes: decoded.scopes,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { isValid: false, error: 'Token expired' };
      } else if (error instanceof jwt.NotBeforeError) {
        return { isValid: false, error: 'Token not yet valid' };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return { isValid: false, error: `Invalid token: ${error.message}` };
      }
      
      console.error('Error validating token:', error);
      return { isValid: false, error: 'Error validating token' };
    }
  }
} 