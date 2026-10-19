// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
// The app is loaded lazily so that a startup problem (e.g. a missing environment variable)
// returns a readable JSON error instead of an opaque FUNCTION_INVOCATION_FAILED.
let appPromise;

export default async function handler(req, res) {
  try {
    appPromise ??= import('../server/app.js').then((m) => m.default);
    const app = await appPromise;
    return app(req, res);
  } catch (err) {
    appPromise = undefined; // try again on the next request
    console.error('API failed to start:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({
      error: err.isConfigError
        ? `Server setup problem: ${err.message}`
        : `The server failed to start (${err.code || err.name}). Check the function logs in Vercel.`,
    }));
  }
}
