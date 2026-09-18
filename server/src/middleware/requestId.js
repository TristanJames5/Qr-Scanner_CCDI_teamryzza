/**
 * requestId.js
 * Attaches a unique X-Request-ID to every request and response.
 * Enables correlation: one ID traces a request through all logs.
 * Standard: RFC 7329 / OpenTelemetry trace context pattern.
 */
import crypto from 'crypto';

export function requestIdMiddleware(req, res, next) {
  // Honour existing ID from client or upstream proxy; otherwise generate one
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}
