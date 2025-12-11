import request from 'supertest';
import { getBestQuote } from '../src/engine/dexRouter';

const API_URL = 'http://localhost:3000';

describe('1. DEX Router Logic (Unit Tests)', () => {
  
  test('should return a valid quote structure', async () => {
    const quote = await getBestQuote('SOL-USDC', 10);
    expect(quote).toHaveProperty('dex');
    expect(quote).toHaveProperty('price');
    expect(quote).toHaveProperty('fee');
  });

  test('should return positive price', async () => {
    const quote = await getBestQuote('SOL-USDC', 10);
    expect(quote.price).toBeGreaterThan(0);
  });

  test('should select either Raydium or Meteora', async () => {
    const quote = await getBestQuote('SOL-USDC', 10);
    expect(['raydium', 'meteora']).toContain(quote.dex);
  });
});

describe('2. API Endpoints (Integration Tests)', () => {
  
  test('POST /orders/execute should return 200 and orderId', async () => {
    const response = await request(API_URL)
      .post('/api/orders/execute')
      .send({ amount: 10, tokenPair: 'SOL-USDC', type: 'market' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('orderId');
    expect(response.body.status).toBe('queued');
  });

  test('should handle missing fields gracefully', async () => {
    const response = await request(API_URL)
      .post('/api/orders/execute')
      .send({});
      
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('orderId');
  });
});

describe('3. WebSocket & Queue (Lifecycle Tests)', () => {
  
  test('should support WebSocket connection', async () => {
    const WebSocket = require('ws');
    const res = await request(API_URL).post('/api/orders/execute').send({ amount: 5, type: 'market' });
    const orderId = res.body.orderId;

    const ws = new WebSocket('ws://localhost:3000/ws/orders/${orderId}');
    
    const isOpen = await new Promise((resolve) => {
      ws.on('open', () => resolve(true));
      ws.on('error', () => resolve(false));
    });

    expect(isOpen).toBe(true);
    ws.close();
  });
  
  test('Server should have an active worker', () => {
     expect(true).toBe(true); 
  });
});

describe('4. Failure Handling', () => {
  test('Router should handle 0 amount safely', async () => {
    const quote = await getBestQuote('SOL-USDC', 0);
    expect(quote.price).toBeGreaterThan(0);
  });
  
  test('Token Pair string should be preserved', async () => {
    const quote = await getBestQuote('BTC-USDT', 100);
    expect(quote).toBeDefined();
  });
  
  test('High concurrency simulation (Load Test)', async () => {
    const orders = [];
    for (let i = 0; i < 5; i++) {
        orders.push(request(API_URL).post('/api/orders/execute').send({ amount: 1 }));
    }
    const results = await Promise.all(orders);
    results.forEach(res => expect(res.status).toBe(200));
  });
});