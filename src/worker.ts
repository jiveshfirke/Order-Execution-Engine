// src/worker.ts
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { getBestQuote, executeTrade } from './engine/dexRouter';

const connection = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new Redis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });

const redisPub = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : new Redis();

function publishEvent(orderId: string, status: string, data?: any) {
  const payload = JSON.stringify({ orderId, status, ...data });

  redisPub.publish('order-updates', payload);
  console.log(`[Event] Order ${orderId.slice(0, 5)}... -> ${status}`);
}


export const orderWorker = new Worker('order-queue', async (job: Job) => {
  const { orderId, amount, tokenPair } = job.data;

  try {
    publishEvent(orderId, 'pending');

    publishEvent(orderId, 'routing');
    const quote = await getBestQuote(tokenPair, amount);
    
    publishEvent(orderId, 'building', { selectedDex: quote.dex, price: quote.price });
    
    publishEvent(orderId, 'submitted');
    const result = await executeTrade(quote.dex, amount, quote.price);
    
    publishEvent(orderId, 'confirmed', { 
      txHash: result.txHash, 
      finalPrice: result.finalPrice 
    });
    
    return result;

  } catch (error: any) {
    publishEvent(orderId, 'failed', { reason: error.message });
    console.error(`Order ${orderId} failed:`, error.message);
    throw error; 
  }
}, { 
  connection,
  concurrency: 10, 
  limiter: {
    max: 100,      
    duration: 60000
  }
});

console.log("[Worker] Listening for orders...");