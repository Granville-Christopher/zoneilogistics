/**
 * Vercel serverless entry.
 * Nest app is compiled first via `npm run vercel-build` into dist/.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nest = require('../dist/main');

module.exports = async function handler(req, res) {
  const appHandler = nest.default || nest;
  return appHandler(req, res);
};
