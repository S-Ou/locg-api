import dotenv from "dotenv";

dotenv.config();

function requiredEnv(key: keyof NodeJS.ProcessEnv): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable is missing: ${key}`);
  }

  return value;
}

const config = {
  /**
   * In development mode, secure cookies are not used for sending the profile. This is because
   * they can't be accessed over HTTP on Safari.
   */
  api: {
    port: Number(process.env.PORT || 8000),
  },
  environment: process.env.NODE_ENV || "production",
  // having a random secret would mess with persistent sessions
  expressSessionSecret:
    process.env.EXPRESS_SESSION_SECRET || "change the secret in production",
} as const;

export default config;
export * from "./constants";
