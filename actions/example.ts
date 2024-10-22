import {
  Context,
  TransactionEvent,
} from '@tenderly/actions';
import axios from "axios";


export const beefyFn = async (context: Context, transactionEvent: TransactionEvent) => {
  const txHash = transactionEvent.hash;
  const txNetwork = transactionEvent.network;

  const WEBHOOK_URL = await context.secrets.get("WEBHOOK_URL");
  const BEARER = await context.secrets.get("BEARER");
  const ACCOUNT_SLUG = await context.secrets.get("ACCOUNT_SLUG");
  const PROJECT_SLUG = await context.secrets.get("PROJECT_SLUG");

  // Get event name from environment variable
  const EVENT_NAME = await context.secrets.get("EVENT_NAME");

  if (!EVENT_NAME) {
    throw new Error("EVENT_NAME not found in environment variables");
  }

  const url = `https://api.tenderly.co/api/v1/public-contract/${txNetwork}/trace/${txHash}`;

  const traceResponse = await axios.get(url, {
    headers: {
      authorization: BEARER,
    },
  });

  const traceData = traceResponse.data;
  const logs = traceData.logs;

  const fetchContractName = async (addr: string) => {
    const contractEndpoint = `https://api.tenderly.co/api/v1/account/${ACCOUNT_SLUG}/project/${PROJECT_SLUG}/contract/${txNetwork}/${addr}`;

    try {
      const contractResponse1 = await axios.get(contractEndpoint, {headers: {'Authorization': BEARER}});
      return contractResponse1.data.contract.contract_name;
    } catch (error) {
      console.error(`Error fetching contract name from endpoint for ${addr}:`, error);
    }
  };

  // Extract unique addresses for specified event
  const extractEventAddresses = (logs: any[]): string[] =>
    Array.from(new Set(
      logs
        .filter(log => log.name === EVENT_NAME)
        .map(log => log.raw.address)
    ));

  // Extract detailed event information
  const extractEventDetails = (logs: any[]) => {
    return logs
      .filter(log => log.name === EVENT_NAME)
      .map(log => {
        const result: { [key: string]: string } = {
          name: log.name
        };

        log.inputs.forEach((input: any) => {
          const name = input.soltype.name;
          const value = input.value.toString();
          result[name] = value;
        });

        return result;
      });
  };

  // Get both addresses and event details
  const addresses = extractEventAddresses(logs);
  const eventDetails = extractEventDetails(logs);
  const contractName = await fetchContractName(addresses[0]);

  // Prepare data for webhook
  const webhookData = {
    contractName: contractName,
    addresses,
    events: eventDetails,
    traceData
  };

  // Send to webhook
  const sendToWebhook = async () => {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData),
      });

      if (!response.ok) {
        throw new Error(`Failed to send data to webhook. Status: ${response.status}`);
      }
      console.log(`Successfully sent ${EVENT_NAME} data to the webhook`);
    } catch (error) {
      console.error('Error sending data to the webhook:', error);
    }
  };

  // Log the data we're sending
  console.log('Event Name:', EVENT_NAME);
  console.log('Addresses:', addresses);
  console.log('Event Details:', eventDetails);

  await sendToWebhook();
};