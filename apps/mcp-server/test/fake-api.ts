// TEST DOUBLE of the REST agent API contract (docs/api-contract.md, section "API agent").
// Never imported by production code.
import { createServer, type Server } from 'node:http';

export interface RecordedRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  authorization: string | undefined;
}

export interface Reply {
  status: number;
  body: unknown;
}

export interface FakeApi {
  url: string;
  requests: RecordedRequest[];
  /** Replace to control the response of the next requests. */
  reply: (request: RecordedRequest) => Reply;
  close: () => Promise<void>;
}

export async function startFakeApi(): Promise<FakeApi> {
  const requests: RecordedRequest[] = [];
  const api: FakeApi = {
    url: '',
    requests,
    reply: () => ({ status: 200, body: { data: null } }),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };

  const server: Server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const text = Buffer.concat(chunks).toString('utf8');
    const url = new URL(req.url ?? '/', 'http://fake');
    const request: RecordedRequest = {
      method: req.method ?? '',
      path: url.pathname,
      query: url.searchParams,
      body: text ? JSON.parse(text) : undefined,
      authorization: req.headers.authorization,
    };
    requests.push(request);
    const reply = api.reply(request);
    res.writeHead(reply.status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(reply.body));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('fake API failed to listen');
  api.url = `http://127.0.0.1:${address.port}`;
  return api;
}
