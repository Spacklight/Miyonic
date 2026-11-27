import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
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

async function aiGenerator({
  description,
  model,
  products,
  categories,
  env,
}: {
  description: string;
  model: string;
  products: Array<{ slug: string; name: string; website_url?: string; summary?: string }>;
  categories: Array<{ slug: string; name: string }>;
  env: Record<string, string | undefined>;
}) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY is not configured in server secrets.') as Error & { status?: number };
    err.status = 503;
    throw err;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const productContext = (products || [])
    .map((p) => `- ${p.slug} (${p.name}): ${p.website_url || ''} — ${p.summary || ''}`)
    .join('\n');
  const categoryContext = (categories || []).map((c) => `${c.slug} (${c.name})`).join(', ');

  const systemInstruction = `You are the official editorial and SEO writer for MIYONI ("We build functionality and quality."), an independent technology company founded by Roosevelt Chikwende in Malawi.
Generate a complete, authentic, well-structured, SEO-strong article or announcement from the user's description.
Make sure primary search keywords appear naturally in the title, excerpt, tags, SEO fields, and body headings so the article ranks at the top of search results.
Use only clean semantic HTML in content_html (<p>, <h2>, <h3>, <ul>, <ol>, <li>, <blockquote>, <strong>, <em>, <a>).

Available category_slug options: ${categoryContext || 'company-announcements'}
MIYONI Products:
${productContext}`;

  const invoke = async (targetModel: string) => {
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: `Create a complete MIYONI news/blog post draft based on this description:\n\n${description}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            slug: { type: Type.STRING },
            content_type: { type: Type.STRING },
            category_slug: { type: Type.STRING },
            excerpt: { type: Type.STRING },
            content_html: { type: Type.STRING },
            product_slug: { type: Type.STRING },
            product_url: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            seo_title: { type: Type.STRING },
            seo_description: { type: Type.STRING },
          },
          required: ['title', 'slug', 'content_type', 'category_slug', 'excerpt', 'content_html', 'tags'],
        },
      },
    });
    return {
      text: (response.text ?? '{}').trim(),
      modelUsed: targetModel,
    };
  };

  let out;
  let fallbackUsed = false;
  try {
    out = await invoke(model);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number })?.status;
    if ((status === 404 || /not found|404/i.test(msg)) && model !== 'gemini-3.1-flash-lite') {
      out = await invoke('gemini-3.1-flash-lite');
      fallbackUsed = true;
    } else {
      throw err;
    }
  }

  return {
    parsed: JSON.parse(out.text),
    modelUsed: out.modelUsed,
    fallbackUsed,
  };
}

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

      const runtimeEnv = {
        ...process.env,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'prof200619@gmail.com',
      };

      const webResponse = await handleWorkerRequest(
        webRequest,
        runtimeEnv,
        assetsFetcher,
        localPersistence,
        aiGenerator
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
