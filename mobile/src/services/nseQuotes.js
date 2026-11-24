// NSE's free CM Market MCP returns a delayed snapshot, including the time of
// the market data. Keep only the protocol session in memory between requests.
const ENDPOINT = 'https://mcp.nseindia.in/cmmkt/mcp';
const PROTOCOL = '2025-03-26';
let session = null;
let nextId = 1;

async function rpc(method, params, connection, signal, notification = false) {
  const id = nextId++;
  const headers = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
  };
  if (connection) {
    headers['MCP-Protocol-Version'] = PROTOCOL;
    if (connection.id) headers['Mcp-Session-Id'] = connection.id;
  }
  const message = { jsonrpc: '2.0', method, params };
  if (!notification) message.id = id;
  const response = await fetch(ENDPOINT, {
    method: 'POST', headers, signal, body: JSON.stringify(message),
  });
  if (!response.ok) {
    const error = new Error(`NSE returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  if (notification) return;

  const body = await response.text();
  let reply;
  if ((response.headers.get('content-type') || '').includes('text/event-stream')) {
    // The tools endpoint sends one finite SSE response per request. Ignore
    // heartbeats and notifications, and select the reply with our RPC id.
    for (const event of body.split(/\r?\n\r?\n/)) {
      const data = event.split(/\r?\n/).filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart()).join('\n');
      if (!data) continue;
      const payload = JSON.parse(data);
      if (payload.id === id) {
        reply = payload;
        break;
      }
    }
  } else {
    reply = JSON.parse(body);
  }
  if (reply?.id !== id || reply.error || !reply.result) {
    throw new Error('NSE did not return a valid response.');
  }
  return { result: reply.result, sessionId: response.headers.get('mcp-session-id') };
}

async function connect(signal) {
  const { result, sessionId } = await rpc('initialize', {
    protocolVersion: PROTOCOL,
    capabilities: {},
    clientInfo: { name: 'PoolVest', version: '1.0' },
  }, null, signal);
  if (result.protocolVersion !== PROTOCOL) throw new Error('Unsupported NSE protocol.');
  const connection = { id: sessionId };
  await rpc('notifications/initialized', {}, connection, signal, true);
  session = connection;
  return connection;
}

export async function fetchNseQuote(symbol, signal) {
  const connection = session || await connect(signal);
  const params = { name: 'cm_get_stock_quote', arguments: { symbol } };
  let reply;
  try {
    reply = await rpc('tools/call', params, connection, signal);
  } catch (error) {
    if (error.status !== 404) throw error;
    // Streamable HTTP uses 404 when a previously negotiated session expires.
    if (session === connection) session = null;
    reply = await rpc('tools/call', params, await connect(signal), signal);
  }
  const content = reply.result.content?.find(item => item.type === 'text');
  if (reply.result.isError || !content) throw new Error('NSE quote unavailable.');
  const { stock } = JSON.parse(content.text);
  const price = stock?.lastTradedPrice;
  if (stock?.symbol !== symbol || !Number.isFinite(price) || price <= 0) {
    throw new Error('NSE quote unavailable.');
  }
  // updatedAt is the provider cache time and can advance on weekends.
  const asOf = stock.latestTimestamp ? `${stock.latestTimestamp} IST` : null;
  return { symbol, price, asOf };
}
