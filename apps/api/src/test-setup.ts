// Runs before every test file. The integration tests TRUNCATE tables, so they only ever
// talk to TEST_DATABASE_URL, never to the dev DATABASE_URL.
import "./env";
process.env.APP_PASSWORD = "test-password";
if (process.env.TEST_DATABASE_URL)
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
