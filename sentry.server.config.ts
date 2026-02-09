// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://75f5c58e2777ced9c1613bcf3d1aa463@o4510374990118912.ingest.de.sentry.io/4510374991364176",

  // Sample 10% of transactions in production to reduce costs
  // Adjust based on traffic: 0.1 = 10%, 0.05 = 5%, 0.01 = 1%
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,

  // Enable logs to be sent to Sentry (only errors in production)
  enableLogs: process.env.NODE_ENV !== 'production',

  // Disable sending PII to comply with privacy regulations
  // User context should be set explicitly when needed
  sendDefaultPii: false,

  // Filter sensitive data before sending
  beforeSend(event, hint) {
    // Remove sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        if (breadcrumb.data) {
          // Remove potential tokens, passwords, etc.
          const sanitized = { ...breadcrumb.data }
          delete sanitized.password
          delete sanitized.token
          delete sanitized.accessToken
          delete sanitized.refreshToken
          return { ...breadcrumb, data: sanitized }
        }
        return breadcrumb
      })
    }

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
