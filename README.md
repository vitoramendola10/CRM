# CRM Suporte + Dev

Ferramenta interna de uma software house: o suporte registra o atendimento, avalia, e o que
vira trabalho de desenvolvimento nasce como card no board de dev. Autocontido — cadastro
proprio de clientes e usuarios, sem integracao com ERP, telefonia ou qualquer sistema externo.

Next.js 15 (App Router) · TypeScript strict · MySQL 9 via Drizzle · Tailwind 4.

---

## Rodando pela primeira vez

O MySQL ja precisa estar no ar. O script cria o banco se ele nao existir.

```bash
npm install
```

Depois abra `.env.local` e preencha a senha do MySQL:

```
DATABASE_URL="mysql://root:SUA_SENHA@localhost:3306/crm"
```

> Se a senha tiver `@ : / ? #`, use percent-encoding (`@` vira `%40`, e assim por diante).

Para escolher a senha do admin em vez de aceitar o padrao, preencha tambem
`SEED_ADMIN_PASSWORD`. Entao:

```bash
npm run db:setup   # cria o banco, aplica as migrations e roda o seed
npm run dev
```

Login inicial: usuario `admin`. A senha e a de `SEED_ADMIN_PASSWORD`; se deixar em branco,
o seed usa `admin` e avisa no console. A tela de login chega na etapa 2.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | Gera migration a partir de `src/db/schema.ts` |
| `npm run db:migrate` | Cria o banco (se faltar) e aplica as migrations |
| `npm run db:seed` | Estado inicial. Idempotente: nao duplica nem sobrescreve |
| `npm run db:setup` | `db:migrate` + `db:seed` |

## Como o codigo se organiza

```
src/
  domain/      tipos, enums e zod de TODA entidade - a fonte da verdade
  db/          client, schema Drizzle e queries/
  services/    regras de negocio
  app/         rotas
  components/  ui/ (primitivos) e por area
  lib/         utilitarios sem regra de negocio
```

Duas regras que valem para tudo que vier depois:

1. **Nenhum arquivo declara tipo de entidade ou string de status fora de `src/domain`.**
   Faltou um campo? Altera o dominio primeiro, usa depois.
2. **Query nunca dentro de componente.** Componente chama service, service chama query.

Nome de coluna e de status sao editaveis pelo usuario e por isso nunca aparecem chumbados no
codigo — o que o relatorio e a automacao leem e a `categoria` do status
(`aberto` / `andamento` / `concluido` / `cancelado`), que e fixa.

## Banco

O schema foi portado do `crm_schema_fase1.sql` (PostgreSQL) para MySQL. Cada decisao de
traducao — `citext`, `timestamptz`, constraint deferivel, FK circular — esta em
[docs/portabilidade-mysql.md](docs/portabilidade-mysql.md). Vale a leitura antes de mexer no
schema.

Os arquivos originais da especificacao estao em `docs/referencia/`.

Aplique migrations sempre com `npm run db:migrate`. O `.sql` gerado usa o separador
`--> statement-breakpoint`, que o MySQL nao aceita como comentario — abrir o arquivo no
Workbench e mandar rodar da erro de sintaxe.

## Estado

| Etapa | |
|---|---|
| 1. Setup, dominio, migrations e seed | pronta |
| 2. Auth + middleware por papel | |
| 3. `/config` de colunas e status | |
| 4. Kanban com drag & drop | |
| 5. Detalhe do card + comentarios | |
| 6. `/atendimentos` + escalacao | |
| 7. Outbox + worker de e-mail | |
| 8. Dashboard | |
