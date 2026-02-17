/**
 * Use module augmentation to include the environment variables to the `process.env` object.
 */
declare namespace NodeJS {
  export interface ProcessEnv {
    PORT?: string;
    NODE_ENV?: string;

    LOCG_FETCH_URL?: string;
    LOCG_DISPLAY_URL?: string;

    EXPRESS_SESSION_SECRET?: string;
  }
}
