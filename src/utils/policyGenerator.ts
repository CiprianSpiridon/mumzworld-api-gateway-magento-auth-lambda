import { APIGatewayAuthorizerResult } from 'aws-lambda';
import { config } from '../config';

// Define the context interface with index signature
interface AuthorizerContext {
  [key: string]: string;
  userId: string;
  roles: string;
  scopes: string;
}

/**
 * Generate an IAM policy for API Gateway
 * @param principalId User ID
 * @param effect Allow or Deny
 * @param resource API Gateway resource ARN
 * @param context Additional context to include in the response
 * @returns IAM policy document
 */
export function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: AuthorizerContext
): APIGatewayAuthorizerResult {
  // Generate policy document
  const policyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      },
    ],
  };

  // Create the response
  const response: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument,
    context,
  };

  return response;
}

/**
 * Generate an Allow policy for API Gateway
 * @param userId User ID
 * @param resource API Gateway resource ARN
 * @param roles User roles
 * @param scopes API scopes
 * @returns Allow IAM policy
 */
export function generateAllowPolicy(
  userId: string,
  resource: string,
  roles: string[],
  scopes: string[]
): APIGatewayAuthorizerResult {
  // Create a context with user information that will be passed to the backend
  // These values will be available in the integration as $context.authorizer.xyz
  return generatePolicy(userId, 'Allow', resource, {
    userId,                   // Available as $context.authorizer.userId
    roles: roles.join(','),   // Available as $context.authorizer.roles
    scopes: scopes.join(','), // Available as $context.authorizer.scopes
    // Add any additional fields that might be useful for backend services
    userIdHeader: userId,     // Can be mapped to a custom header X-User-Id
    authenticated: 'true',    // Flag indicating successful authentication
    timestamp: new Date().toISOString(), // When the token was validated
  });
}

/**
 * Generate a Deny policy for API Gateway
 * @param userId User ID or 'anonymous'
 * @param resource API Gateway resource ARN
 * @returns Deny IAM policy
 */
export function generateDenyPolicy(
  userId: string = 'anonymous',
  resource: string
): APIGatewayAuthorizerResult {
  return generatePolicy(userId, 'Deny', resource);
}

/**
 * Get the default deny all policy
 * @returns Default deny all policy
 */
export function getDenyAllPolicy(): APIGatewayAuthorizerResult {
  return {
    principalId: 'anonymous',
    policyDocument: config.authorizer.denyAllPolicy as any,
  };
} 