# Mumzworld API Gateway Magento Auth Lambda Documentation

This folder contains documentation for the Mumzworld API Gateway Magento Auth Lambda project.

## Available Documentation

- [JWT Key Sharing Guide](jwt-key-sharing.md) - How to securely share JWT signing keys between Magento and the Lambda authorizer

## Additional Resources

- [Main README](../README.md) - Project overview, setup instructions, and deployment guide
- [AWS Lambda Authorizers Documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html) - Official AWS documentation on Lambda authorizers
- [JWT.io](https://jwt.io/) - Useful tool for debugging JWT tokens

## Implementation Details

The Lambda authorizer implements a token-based validation mechanism that:

1. Validates JWT tokens locally without calling back to Magento for every request
2. Verifies token signature, expiration, and claims
3. Returns appropriate IAM policies based on validation results
4. Passes user identity information to backend services

## Security Considerations

When implementing this solution, consider the following security best practices:

1. Use short-lived access tokens (1 hour or less)
2. Implement token refresh mechanisms with proper security controls
3. Store secrets securely using AWS Secrets Manager
4. Rotate keys regularly
5. Monitor for unusual authentication patterns
6. Implement proper error handling and logging 