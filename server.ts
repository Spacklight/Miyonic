import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleWorkerRequest } from './lib/router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const LOCAL_DATA_FILE = path.resolve(__dirname, '.miyoni-local-data.json');

const MIME_MAP: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
};

const localPersistence = {
  async read() {
    try {
      if (!fs.existsSync(LOCAL_DATA_FILE)) return null;
      const raw = fs.readFileSync(LOCAL_DATA_FILE, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  async write(data: unknown) {
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  },
};

async function assetsFetcher(webRequest: Request): Promise<Response> {
  const url = new URL(webRequest.url);
  const relPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const resolved = path.resolve(PUBLIC_DIR, relPath);
  if (!resolved.startsWith(PUBLIC_DIR + path.sep)) {
    return new Response('Forbidden', { status: 403 });
  }
  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    return new Response('Not Found', { status: 404 });
  }
  const ext = path.extname(resolved).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';
  const buf = fs.readFileSync(resolved);
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
    },
  });
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.raw({ type: '*/*', limit: '10mb' }));

  app.use(async (req, res) => {
    try {
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      const fullUrl = `${protocol}://${host}${req.originalUrl}`;

      const headers = new Headers();
      for (const [key, val] of Object.entries(req.headers)) {
        if (val === undefined) continue;
        if (Array.isArray(val)) {
          val.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, String(val));
        }
      }

      const hasBody = !['GET', 'HEAD'].includes(req.method.toUpperCase());
      const body: BodyInit | undefined =
        hasBody && Buffer.isBuffer(req.body) && req.body.length > 0
          ? new Uint8Array(req.body)
          : undefined;

      const webRequest = new Request(fullUrl, {
        method: req.method,
        headers,
        body,
      });

      const webResponse = await handleWorkerRequest(
        webRequest,
        process.env,
        assetsFetcher,
        localPersistence
      );

      res.status(webResponse.status);
      const setCookies =
        typeof (webResponse.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
          ? (webResponse.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
          : [];
      if (setCookies.length > 0) {
        res.setHeader('Set-Cookie', setCookies);
      }
      webResponse.headers.forEach((value: string, key: string) => {
        if (key.toLowerCase() === 'set-cookie') return;
        res.setHeader(key, value);
      });

      const arrayBuf = await webResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch (err) {
      console.error('Server error:', err);
      res.status(500).send('Internal Server Error');
    }
  });

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`MIYONI headquarters server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
