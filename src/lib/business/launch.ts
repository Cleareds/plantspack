/**
 * Launch switch for the business-owner tools.
 *
 * false = admin preview: every business page, link, API and the place-page
 *         menu section work only for admins; owners and visitors see nothing
 *         new, and the monthly owner email refuses to send.
 * true  = live for every verified owner.
 *
 * Launch = flip to true in one commit and push.
 */
export const BUSINESS_TOOLS_PUBLIC = false
