import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { TokenValidatorService } from './services/tokenValidator';
import { generateAllowPolicy, generateDenyPolicy, getDenyAllPolicy } from './utils/policyGenerator';
import { config } from './config';

// Initialize the token validator service
const tokenValidator = new TokenValidatorService();

/**
 * Extract the token from the Authorization header
 * @param authorizationHeader The Authorization header value
 * @returns The JWT token or null if not found
 */
function extractToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  // Check if it's a Bearer token
  const match = authorizationHeader.match(/^Bearer\s+(.*)$/i);
  if (!match || match.length < 2) {
    return null;
  }

  return match[1];
}

/**
 * Lambda authorizer handler for API Gateway
 * @param event The API Gateway authorizer event
 * @returns IAM policy document
 */
export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Extract the token from the Authorization header
    const token = extractToken(event.authorizationToken);
    if (!token) {
      console.log('No token provided');
      return getDenyAllPolicy();
    }

    // Get the source IP if available
    // Note: For token authorizers, we don't have direct access to the source IP
    // This would be available in a request authorizer, but we're using a token authorizer
    // If IP validation is required, it should be included in the token itself
    const sourceIp = undefined;

    // Validate the token
    const validationResult = await tokenValidator.validateToken(token, sourceIp);
    
    if (!validationResult.isValid) {
      console.log('Token validation failed:', validationResult.error);
      return generateDenyPolicy('anonymous', event.methodArn);
    }

    // Token is valid, generate an Allow policy
    console.log('Token validation successful for user:', validationResult.userId);
    return generateAllowPolicy(
      validationResult.userId!,
      event.methodArn,
      validationResult.roles!,
      validationResult.scopes!
    );
  } catch (error) {
    console.error('Error in authorizer:', error);
    return getDenyAllPolicy();
  }
};

// For local testing
if (process.env.NODE_ENV === 'local') {
  const mockEvent: APIGatewayTokenAuthorizerEvent = {
    type: 'TOKEN',
    methodArn: 'arn:aws:execute-api:us-east-1:123456789012:abcdef123/test/GET/resource',
    authorizationToken: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  };

  handler(mockEvent)
    .then(result => console.log('Result:', JSON.stringify(result, null, 2)))
    .catch(error => console.error('Error:', error));
} 