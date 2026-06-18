// Your machine's Wi-Fi IP — both PC and phone must be on the same network
// Run `ipconfig` to find your IPv4 address if this changes
export const API_BASE_URL = 'http://10.50.177.123:5000/api/v1';

export const ENDPOINTS = {
  // Auth
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  REFRESH: '/auth/refresh',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',

  // Profile
  MY_PROFILE: '/profile/me',
  PROFILE_BY_ID: (id) => `/profile/${id}`,

  // Boats
  BOATS: '/boats',
  BOAT_BY_ID: (id) => `/boats/${id}`,

  // Catches
  CATCHES: '/catches',
  CATCHES_SYNC: '/catches/sync',
  CATCHES_MONTHLY: '/catches/summary/monthly',

  // Fishing zones
  FISHING_ZONES: '/fishing-zones',
  FISHING_ZONE_BY_ID: (id) => `/fishing-zones/${id}`,

  // SOS
  SOS: '/sos',
  SOS_SYNC: '/sos/sync',
  SOS_STATUS: (id) => `/sos/${id}/status`,

  // Incidents
  INCIDENTS: '/incidents',
  INCIDENTS_SYNC: '/incidents/sync',
  INCIDENT_BY_ID: (id) => `/incidents/${id}`,

  // Complaints
  COMPLAINTS: '/complaints',
  COMPLAINTS_SYNC: '/complaints/sync',
  COMPLAINT_BY_ID: (id) => `/complaints/${id}`,

  // Market prices
  MARKET_PRICES: '/market-prices',
  MARKET_PRICES_LIVE: '/market-prices/fetch-live',

  // Schemes
  SCHEMES: '/schemes',
  SCHEME_BY_ID: (id) => `/schemes/${id}`,

  // Notifications
  NOTIFICATIONS: '/notifications',
  NOTIFICATIONS_BROADCAST: '/notifications/broadcast',
  NOTIFICATION_READ: (id) => `/notifications/${id}/read`,

  // Weather
  WEATHER: '/weather',

  // Analytics
  ANALYTICS_OVERVIEW: '/analytics/overview',
  ANALYTICS_CATCHES: '/analytics/catches',
  ANALYTICS_SOS: '/analytics/sos',
  ANALYTICS_INCIDENTS: '/analytics/incidents',

  // Admin
  ADMIN_USERS: '/admin/users',
  ADMIN_USER_STATUS: (id) => `/admin/users/${id}/status`,
  ADMIN_OFFICERS: '/admin/officers',
  ADMIN_OFFICER_BY_ID: (id) => `/admin/officers/${id}`,
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
};
