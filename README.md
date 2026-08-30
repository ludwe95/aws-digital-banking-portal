# AWS Digital Banking Portal

A serverless portfolio lab deployed in AWS Africa (Cape Town), `af-south-1`. The portal serves a static frontend through Amazon CloudFront and a private Amazon S3 origin, calls an Amazon API Gateway HTTP API, processes requests with Python on AWS Lambda, and stores synthetic transactions in Amazon DynamoDB.

> **Safety notice:** This is a learning project only. It is not a real banking system and must never contain real financial, identity, account or customer data.

## Live Demo

- CloudFront URL: `[ADD YOUR CLOUDFRONT URL]`
- Region: `af-south-1`

## Architecture

`Browser → CloudFront → private S3 frontend`

`Browser → API Gateway HTTP API → Lambda → DynamoDB`

## AWS Services

- Amazon S3 for frontend objects
- Amazon CloudFront for HTTPS content delivery
- Amazon API Gateway HTTP API for `GET /transactions` and `POST /transactions`
- AWS Lambda with Python for request processing
- Amazon DynamoDB for synthetic transaction storage
- AWS IAM for least-privilege table access
- Amazon CloudWatch for Lambda logs

## Repository Structure

```text
frontend/   Static HTML, CSS and JavaScript
backend/    Python Lambda handler
iam/        Example least-privilege IAM policy
tests/      Synthetic Lambda test events
docs/       Portfolio screenshots
```

## Features

- Loads synthetic transactions from DynamoDB
- Creates a fixed synthetic deposit through the API
- Delivers the frontend over HTTPS
- Uses a private S3 origin with CloudFront Origin Access Control
- Handles CORS for browser requests
- Separates environment-specific API configuration from tracked source

## Local Configuration

Copy the example configuration before deployment:

```bash
cp frontend/config.example.js frontend/config.js
```

Edit `frontend/config.js` and replace the placeholder with the API Gateway invoke URL. Do not add `/transactions` or a trailing slash.

## Deployment Summary

1. Create the `BankTransactions` DynamoDB table.
2. Deploy the Python Lambda function and set `TABLE_NAME=BankTransactions`.
3. Grant the Lambda execution role `Scan` and `PutItem` access to the table.
4. Create API Gateway routes for `GET /transactions` and `POST /transactions`.
5. Configure CORS for the frontend origin.
6. Upload the four frontend files to the root of the private S3 bucket.
7. Create a CloudFront distribution with Origin Access Control and `index.html` as the default root object.
8. Invalidate `/*` after frontend updates.

## Testing

```bash
curl "https://YOUR_API_ID.execute-api.af-south-1.amazonaws.com/transactions"
```

Open the CloudFront URL, select **View transactions**, and then select **Add demo deposit**. Confirm the new synthetic transaction appears in DynamoDB.

## Security Decisions

- S3 Block Public Access remains enabled.
- CloudFront uses Origin Access Control to access the private bucket.
- Browser traffic uses HTTPS.
- Lambda receives access to one DynamoDB table only.
- Environment-specific `config.js` is excluded from Git.
- No AWS credentials or real banking data are stored in the repository.

## Limitations

This demonstration does not implement authentication, bank-grade transaction controls, regulatory controls, fraud prevention or production data protection. A production version should add identity, authorisation, validation, monitoring, encryption governance and infrastructure as code.

## Cleanup

Delete the CloudFront distribution, S3 bucket, API Gateway API, Lambda function, DynamoDB table, IAM role and unused CloudWatch logs after the lab to avoid unnecessary charges.

## Author

Ludwe Jolingwenya — AWS and cloud engineering portfolio project.

