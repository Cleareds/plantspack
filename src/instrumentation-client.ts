// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://75f5c58e2777ced9c1613bcf3d1aa463@o4510374990118912.ingest.de.sentry.io/4510374991364176",

  // Sample 10% of transactions in production to reduce costs
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,

  // Enable logs only in development
  enableLogs: process.env.NODE_ENV !== 'production',

  // Disable sending PII to comply with privacy regulations
  sendDefaultPii: false,

  // Filter sensitive data before sending
  beforeSend(event, hint) {
    // Remove sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        if (breadcrumb.data) {
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

    // Remove sensitive cookies
    if (event.request?.cookies) {
      const cookies = { ...event.request.cookies }
      delete cookies['sb-access-token']
      delete cookies['sb-refresh-token']
      event.request.cookies = cookies
    }

    return event
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;