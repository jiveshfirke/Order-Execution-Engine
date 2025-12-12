// src/scripts/test-client.ts
import WebSocket from 'ws';

async function main() {
  console.log("--- 1. Submitting Order ---");

  const response = await fetch('http://localhost:3000/api/orders/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 100,            
      tokenPair: 'SOL-USDC',  
      type: 'market'
    })
  });

  if (!response.ok) {
    console.error("Failed to submit order:", await response.text());
    return;
  }

  const data = await response.json() as { orderId: string, status: string };
  const orderId = data.orderId;
  
  console.log(`Order Created! ID: ${orderId}`);
  console.log("2. Connecting to WebSocket for Updates");

  const ws = new WebSocket(`ws://localhost:3000/ws/orders/${orderId}`);

  ws.on('open', () => {
    console.log(` Connected to Live Feed for Order ${orderId.slice(0, 5)}...`);
  });

  ws.on('message', (message: string) => {
    const update = JSON.parse(message.toString());
    
    console.log(`\n STATUS UPDATE: [${update.status.toUpperCase()}]`);
    if (update.data) console.log(`   Details:`, update.data);

    if (update.status === 'confirmed') {
      console.log("\n---  Order Complete! Exiting... ---");
      ws.close();
      process.exit(0);
    }
  });
}

main();