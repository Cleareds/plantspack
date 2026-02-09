// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://75f5c58e2777ced9c1613bcf3d1aa463@o4510374990118912.ingest.de.sentry.io/4510374991364176",

  // Sample 10% of transactions in production to reduce costs
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,

  // Enable logs to be sent to Sentry (only errors in production)
  enableLogs: process.env.NODE_ENV !== 'production',

  // Disable sending PII to comply with privacy regulations
  sendDefaultPii: false,

  // Filter sensitive data before sending
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      const headers = { ...event.request.headers }
      delete headers.authorization
      delete headers.cookie
      event.request.headers = headers
    }

    return event
  },
});
