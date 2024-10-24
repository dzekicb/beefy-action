import {
  Context,
  TransactionEvent,
} from '@tenderly/actions';
import axios from "axios";

export const beefyFn = async (context: Context, transactionEvent: TransactionEvent) => {
  const txHash = transactionEvent.hash;
  const txNetwork = transactionEvent.network;

  const blockHash = transactionEvent.blockHash;
  const blockNumber = transactionEvent.blockNumber;

  const WEBHOOK_URL = await context.secrets.get("WEBHOOK_URL");
  const BEARER = await context.secrets.get("BEARER");
  const ACCOUNT_SLUG = await context.secrets.get("ACCOUNT_SLUG");
  const PROJECT_SLUG = await context.secrets.get("PROJECT_SLUG");
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

  // Fetch contract name using your provided function
  const fetchContractName = async (addr: string) => {
    const contractEndpoint = `https://api.tenderly.co/api/v1/account/${ACCOUNT_SLUG}/project/${PROJECT_SLUG}/contract/${txNetwork}/${addr}`;

    try {
      const contractResponse = await axios.get(contractEndpoint, {headers: {'Authorization': BEARER}});
      return contractResponse.data.contract.contract_name;
    } catch (error) {
      console.error(`Error fetching contract name from endpoint for ${addr}:`, error);
    }
  };

  const fetchContractAbi = async (addr: string) => {
    const contractEndpoint = `https://api.tenderly.co/api/v1/account/${ACCOUNT_SLUG}/project/${PROJECT_SLUG}/contract/${txNetwork}/${addr}`;

    try {
      const contractResponse = await axios.get(contractEndpoint, {headers: {'Authorization': BEARER}});
      return contractResponse.data.contract.data.abi;
    } catch (error) {
      console.error(`Error fetching contract ABI from endpoint for ${addr}:`, error);
    }
  };


  // Extract detailed event information using the provided function for decoding logs
  const extractEventAddresses = (logs: any[]): string[] =>
    Array.from(new Set(
      logs
        .filter(log => log.name === EVENT_NAME)
        .map(log => log.raw.address)
    ));

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

  const eventAddresses = extractEventAddresses(traceData.logs);
  const eventDetails = extractEventDetails(traceData.logs);
  const contractName = await fetchContractName(eventAddresses[0]);
  const contractAbi = await fetchContractAbi(eventAddresses[0]);

  // Extract transaction details
  const sentinel = {
    contractName: contractName,
    abi: contractAbi,
  }

  // Prepare data for the webhook
  const webhookData = {
    hash: txHash,
    transaction: transactionEvent,
    blockHash: blockHash,
    blockNumber: blockNumber,
    matchReasons: eventDetails,
    sentinel: sentinel,
    traceData: traceData.call_trace,
    addresses: eventAddresses
  };

  // Send the data to the webhook
  const sendToWebhook = async () => {
    try {
      const response = await axios.post(WEBHOOK_URL, webhookData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': BEARER
        }
      });

      if (response.status !== 200) {
        throw new Error(`Failed to send data to webhook. Status: ${response.status}`);
      }

      console.log(`Successfully sent ${EVENT_NAME} data to the webhook`);
    } catch (error) {
      console.error('Error sending data to the webhook:', error);
    }
  };

  await sendToWebhook();
};
