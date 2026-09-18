/**
 * validateEnv.js
 * Fail-fast environment variable validation.
 * Call this before initDatabase() in server.js.
 * In production: missing secrets = hard crash with clear message.
 * In development: missing secrets = loud warning, fallback allowed.
 */

const REQUIRED_IN_PRODUCTION = ['JWT_SECRET', 'QR_HMAC_SECRET'];

const DEV_FALLBACKS = {
  JWT_SECRET: 'dev-only-jwt-secret-change-before-any-deployment',
  QR_HMAC_SECRET: 'dev-only-hmac-secret-change-before-any-deployment',
};

export function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);

  if (missing.length === 0) return; // All secrets present — green path

  if (isProduction) {
    console.error('\n[FATAL] ====================================================');
    console.error('[FATAL] Missing required environment variables:');
    missing.forEach((key) => console.error(`[FATAL]   - ${key}`));
    console.error('[FATAL] Set these in your hosting dashboard (Render → Environment).');
    console.error('[FATAL] Server startup aborted.');
    console.error('[FATAL] ====================================================\n');
    process.exit(1);
  } else {
    // Development: apply fallbacks but warn loudly
    console.warn('\n[WARN] ⚠️  Missing environment variables — using INSECURE dev fallbacks:');
    missing.forEach((key) => {
      process.env[key] = DEV_FALLBACKS[key];
      console.warn(`[WARN]   ${key} = (insecure dev value — set a real value in server/.env)`);
    });
    console.warn('[WARN] These fallbacks are ONLY safe on your local machine.\n');
  }
}
