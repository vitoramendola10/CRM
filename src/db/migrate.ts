import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

/**
 * Cria o banco se ainda nao existir e aplica as migrations de ./drizzle.
 * Conecta sem `database` na URL para conseguir rodar o CREATE DATABASE.
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ausente. Copie .env.example para .env.local.");

  const alvo = new URL(url);
  const nomeBanco = decodeURIComponent(alvo.pathname.replace(/^\//, ""));
  if (!nomeBanco) throw new Error("DATABASE_URL precisa terminar com o nome do banco.");

  const semBanco = new URL(url);
  semBanco.pathname = "/";
  const admin = await mysql.createConnection({ uri: semBanco.toString() });
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${nomeBanco}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
  );
  await admin.end();
  console.log(`banco "${nomeBanco}" pronto`);

  const conn = await mysql.createConnection({ uri: url, multipleStatements: true });
  await conn.query("SET time_zone = '+00:00'");
  await migrate(drizzle(conn), { migrationsFolder: "./drizzle" });
  await conn.end();
  console.log("migrations aplicadas");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
