import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

const websocket = require('@fastify/websocket');

import './worker'; 

const fastify = Fastify({ logger: true });

fastify.register(cors);
fastify.register(websocket);

const connection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null 
});


const orderQueue = new Queue('order-queue', { connection });
const redisSub = new Redis();
const clients = new Map<string, any>();

redisSub.subscribe('order-updates');
redisSub.on('message', (channel, message) => {
  const data = JSON.parse(message);
  const clientSocket = clients.get(data.orderId);
  
  if (clientSocket && clientSocket.readyState === 1) { 
    clientSocket.send(JSON.stringify(data));
  }
});

fastify.post('/api/orders/execute', async (request: any, reply) => {
  const { amount, tokenPair, type } = request.body;
  const orderId = uuidv4();

  await orderQueue.add('execute-order', { 
    orderId, 
    amount, 
    tokenPair: tokenPair || 'SOL-USDC',
    type 
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });

  return { orderId, status: 'queued', message: 'Connect to WS for updates' };
});

fastify.register(async function (fastify) {

  fastify.get('/ws/orders/:orderId', { websocket: true } as any, (connection: any, req: any) => {
    const { orderId } = req.params;
    console.log(`[WS] Client connected for order: ${orderId}`);
    
    const socket = connection.socket || connection;
    
    if (!socket || !socket.on) {
        console.error("[WS Error] Could not find socket object inside connection");
        return;
    }

    clients.set(orderId, socket);

    socket.on('close', () => {
      clients.delete(orderId);
    });
  });
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();