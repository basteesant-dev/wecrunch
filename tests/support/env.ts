import { inject } from "vitest";

// Must run before any test imports src/lib/db.ts.
process.env.WECRUNCH_DATABASE_URL = inject("databaseUrl");
process.env.APP_SECRET = "integration-test-secret-integration-test-secret";
process.env.LOCAL_UPLOAD_DIR = "./storage/test-uploads";
process.env.STORAGE_DRIVER = "local";
