import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL ausente. Copie .env.example para .env.local e preencha.");
}

/**
 * Uma unica pool por processo. Em dev o Next recarrega os modulos a cada
 * alteracao, entao a pool fica pendurada no globalThis para nao vazar conexao.
 */
const globalPool = globalThis as unknown as { __crmPool?: mysql.Pool };

function criarPool(uri: string): mysql.Pool {
  const p = mysql.createPool({
    uri,
    connectionLimit: 10,
    // Datas trafegam como string ("YYYY-MM-DD HH:MM:SS.mmm", sempre UTC).
    // Quem formata para o fuso do usuario e a camada de apresentacao.
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    multipleStatements: false,
  });

  /**
   * Tudo e gravado e lido em UTC. Sem isto, CURRENT_TIMESTAMP(3) sairia no fuso
   * do servidor MySQL e os defaults do schema divergiriam das datas da aplicacao.
   * Offset literal em vez de nome de zona: nao depende das tabelas de timezone.
   */
  p.on("connection", (conn) => {
    conn.query("SET time_zone = '+00:00'");
  });

  return p;
}

export const pool = globalPool.__crmPool ?? criarPool(url);

if (process.env.NODE_ENV !== "production") globalPool.__crmPool = pool;

export const db = drizzle(pool, { schema, mode: "default", casing: "snake_case" });

export type Db = typeof db;
/** O que uma transacao recebe. Services tipam por aqui em vez de `any`. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
