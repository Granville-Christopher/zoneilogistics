import type { VercelRequest, VercelResponse } from '@vercel/node';

// Use the compiled Nest bootstrap (built by `npm run build` / vercel-build)
 // eslint-disable-next-line @typescript-eslint/no-require-imports
const nest = require('../dist/main');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appHandler = nest.default || nest;
  return appHandler(req, res);
}
