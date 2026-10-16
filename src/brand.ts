// Brand identity constants for this application only.
// Everything a visitor or editor can change lives in the database instead.
export const BRAND = {
  key: "wecrunch",
  name: "WeCrunch",
  sessionCookie: "wecrunch_admin_session",
  databaseEnv: "WECRUNCH_DATABASE_URL",
} as const;
