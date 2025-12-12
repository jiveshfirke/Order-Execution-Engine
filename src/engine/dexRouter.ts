
export type DexName = 'raydium' | 'meteora';

interface Quote {
  dex: DexName;
  price: number;
  fee: number;
}

export async function getBestQuote(tokenPair: string, amount: number): Promise<Quote> {
  console.log(`[Router] Checking prices for ${amount} ${tokenPair}...`);

  await new Promise(resolve => setTimeout(resolve, 1000));

  const raydiumPrice = 100 + (Math.random() * 5); // Random price between 100.00 and 105.00
  const meteoraPrice = 100 + (Math.random() * 5); // Random price between 100.00 and 105.00

  console.log(`   - Raydium Price: $${raydiumPrice.toFixed(2)}`);
  console.log(`   - Meteora Price: $${meteoraPrice.toFixed(2)}`);

  if (raydiumPrice < meteoraPrice) {
    return { dex: 'raydium', price: raydiumPrice, fee: 0.05 };
  } else {
    return { dex: 'meteora', price: meteoraPrice, fee: 0.05 };
  }
}

export async function executeTrade(dex: DexName, amount: number, price: number) {
  console.log(`[Router] Executing order on ${dex.toUpperCase()} at $${price.toFixed(2)}...`);

  await new Promise(resolve => setTimeout(resolve, 2000));

  const isSuccess = Math.random() > 0.1; 

  if (!isSuccess) {
    throw new Error(`Swap failed on ${dex} due to high slippage`);
  }

  return {
    txHash: "sol_" + Math.random().toString(36).substring(7),
    status: "confirmed",
    finalPrice: price
  };
}