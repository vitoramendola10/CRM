import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // mysql2 e argon2 sao nativos/CJS: manter fora do bundle do servidor.
  serverExternalPackages: ["mysql2", "@node-rs/argon2"],
};

export default nextConfig;
