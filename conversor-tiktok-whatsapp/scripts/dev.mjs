import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import converter from '../netlify/functions/converter.mjs';

const origin = 'http://127.0.0.1:8888';
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
]);

createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, origin);
    if (url.pathname === '/api/converter') {
      const hasBody = !['GET', 'HEAD'].includes(incoming.method);
      const request = new Request(url, {
        method: incoming.method,
        headers: incoming.headers,
        ...(hasBody && { body: Readable.toWeb(incoming), duplex: 'half' }),
      });
      const response = await converter(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) await pipeline(Readable.fromWeb(response.body), outgoing);
      else outgoing.end();
      return;
    }

    const file = files.get(url.pathname);
    if (!file) {
      outgoing.writeHead(404).end('Página não encontrada');
      return;
    }
    const [name, type] = file;
    const content = await readFile(new URL('../public/' + name, import.meta.url));
    outgoing.writeHead(200, { 'Content-Type': type }).end(content);
  } catch (error) {
    if (!outgoing.headersSent) outgoing.writeHead(500);
    outgoing.end();
    console.error(error);
  }
}).listen(8888, '127.0.0.1', () => console.log('Conversor disponível em ' + origin));
