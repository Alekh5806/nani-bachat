// Run during NSE cash-market hours to check whether the provider is publishing
// new snapshots. Exit 0 on advancement, 1 on request failure, 2 if inconclusive.
import { setTimeout as wait } from 'node:timers/promises';
import { fetchNseQuote } from '../src/services/nseQuotes.js';

const symbol = (process.argv[2] || 'RELIANCE').trim().toUpperCase().replace(/\.NS$/, '');

async function sample() {
  const quote = await fetchNseQuote(symbol, AbortSignal.timeout(15000));
  console.log(`${quote.symbol}  ₹${quote.price.toFixed(2)}  NSE time ${quote.asOf || 'unavailable'}`);
  return quote.asOf;
}

try {
  let previousTime = await sample();
  let advanced = false;
  for (let attempt = 1; attempt <= 3 && !advanced; attempt += 1) {
    await wait(60000);
    const currentTime = await sample();
    // NSE reports YYYY-MM-DD HH:mm:ss in IST. An unchanged price alone
    // cannot distinguish a fresh snapshot from an old one.
    advanced = Boolean(previousTime && currentTime && currentTime > previousTime);
    if (currentTime && !previousTime) previousTime = currentTime;
  }
  if (advanced) {
    console.log('The exchange timestamp advanced between requests.');
  } else {
    console.log('No newer exchange timestamp observed in this run.');
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`Quote check failed: ${error.message}`);
  process.exitCode = 1;
}
