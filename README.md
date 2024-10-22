# Tenderly Event Tracking System

## Prerequisites

- Node.js and npm installed
- Access to Tenderly API
- Valid Tenderly account and project
- Webhook endpoint for receiving data

## Environment Variables

The following secrets need to be configured in your Tenderly environment. For this you'll place them inside Web3 Action [Secrets](https://docs.tenderly.co/web3-actions/references/context-storage-and-secrets#secrets):

```env
WEBHOOK_URL
BEARER
ACCOUNT_SLUG
PROJECT_SLUG
EVENT_NAME
```

## Installation

1. Clone this repo, or create brand new Web3 Action using tihs [guide](https://docs.tenderly.co/web3-actions/tutorials-and-quickstarts/deploy-web3-action-via-cli)
2. If you've cloned repo, do the following:
```bash
cd actions && npm install
```
3. Inside `tenderly.yaml` modify `ACCOUNT_SLUG` and `PROJECT_SLUG` with your information
4. After everything has been setup properly, do `cd ..` to get to root directory (`beefy-action`) and then `tenderly actions deploy`

## Usage

The main function `beefyFn` is triggered by Tenderly Actions when a matching transaction event occurs. It performs the following operations:

1. Fetches transaction trace data using Tenderly API
2. Extracts relevant event information
3. Retrieves contract names for involved addresses
4. Processes and formats the data
5. Sends the formatted data to the specified webhook

### Function Workflow

1. **Transaction Information Retrieval**
    - Gets transaction hash and network
    - Fetches detailed transaction trace data

2. **Contract Information**
    - Fetches contract names for relevant addresses
    - Handles API errors gracefully

3. **Event Processing**
    - Filters for specified events
    - Extracts unique addresses
    - Processes event details and parameters

4. **Data Forwarding**
    - Formats data for webhook consumption
    - Sends data to configured webhook endpoint
    - Logs operation results

## Data Structure

### Webhook Payload Format

```typescript
{
  contractName: string,
  addresses: string[],
  events: Array<{
    name: string,
    [parameterName: string]: string
  }>,
  traceData: object
}
```

## Error Handling

The system includes error handling for:
- Missing environment variables
- API request failures
- Contract information retrieval
- Webhook communication issues

## Logging

The system logs:
- Event name being processed
- Addresses involved
- Detailed event information
- Webhook transmission status

## Dependencies

- `@tenderly/actions`: For interacting with Tenderly's action system
- `axios`: For making HTTP requests