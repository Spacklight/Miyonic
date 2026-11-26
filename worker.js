/**
 * MIYONI Official Digital Headquarters — Cloudflare Worker Entry Point
 * Deploy with: npx wrangler deploy
 */

import { handleWorkerRequest } from './lib/router.js';

export default {
  async fetch(request, env, ctx) {
    const assetsFetcher = env.ASSETS ? (req) => env.ASSETS.fetch(req) : null;
    return handleWorkerRequest(request, env, assetsFetcher, null);
  },
};
