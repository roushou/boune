declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: "development" | "production" | "test";
      DEBUG?: string;
      BOUNE_PROFILE?: string;
      HTTP_BASE_URL?: string;
      HTTP_TIMEOUT?: string;
    }
  }
}

export {};
