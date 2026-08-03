# Do PostgreSQL para o MySQL

O `crm_schema_fase1.sql` original (guardado em `docs/referencia/`) e PostgreSQL puro.
O banco escolhido foi MySQL 9.5, entao cada recurso sem equivalente direto virou uma
decisao. Elas estao aqui para nao serem redescobertas daqui a tres meses.

## Tipos

| PostgreSQL | MySQL | Por que |
|---|---|---|
| `uuid` + `gen_random_uuid()` | `char(36)`, gerado com `crypto.randomUUID()` | MySQL tem `UUID()`, mas gerar na aplicacao deixa o id disponivel antes do INSERT, o que a transacao de escalacao precisa. |
| `citext` | `varchar` com a collation padrao `utf8mb4_0900_ai_ci` | Ja e case-insensitive. Efeito colateral: tambem ignora acento, entao `joao` e `joão` colidem como username. Para login interno isso e aceitavel, ate desejavel. |
| `timestamptz` | `datetime(3)` sempre em UTC | MySQL nao guarda fuso. A pool fixa `time_zone='+00:00'` em toda conexao (`src/db/client.ts`) para que `CURRENT_TIMESTAMP(3)` do servidor bata com o que a aplicacao grava. |
| `bigserial` | `bigint unsigned AUTO_INCREMENT` | Direto. |
| `numeric(6,2)` | `decimal(6,2)` | Direto. |
| `uuid[]` (`destino_users`) | `json` | MySQL nao tem array. O tipo continua `string[]` no dominio; a serializacao e do driver. |
| `CHECK (x IN (...))` | `enum(...)` | Mais barato e o Drizzle infere o tipo literal. Os valores saem de `src/domain/constants.ts`, entao banco, zod e UI nao podem divergir. |

## Comportamentos

**`updated_at`** — o original usa uma funcao plpgsql com trigger por tabela. Em MySQL virou
`DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` no DDL.

Cuidado: o `$onUpdate()` do Drizzle **nao** gera essa clausula — ele so aplica o valor quando
o UPDATE passa pelo Drizzle. Um `UPDATE` em SQL cru deixaria o campo parado. Por isso a
clausula e injetada via `sql\`\`` no `default()`, e nao com `$onUpdate`.

**`UNIQUE (board_id, ordem) DEFERRABLE INITIALLY DEFERRED`** — MySQL nao tem constraint
deferivel. O UNIQUE foi mantido, mas reordenar colunas passa a exigir duas fases dentro de
uma transacao: primeiro joga a ordem de todas as colunas do board para negativo, depois grava
a ordem final. Sem isso, um swap simples bate na constraint no meio do caminho.
Isso e implementado no service de reordenacao, na etapa 3.

**`tasks.codigo`** — no Postgres era um `bigserial` a mais numa tabela que ja tem PK uuid.
MySQL so aceita uma coluna `AUTO_INCREMENT` por tabela e ela precisa ser indexada; dai o
`UNIQUE (codigo)`. Testado: gera 1, 2, 3 normalmente.

**FK circular `tickets.task_id` <-> `tasks.ticket_id`** — o original resolvia com um
`ALTER TABLE ... ADD CONSTRAINT` no fim do arquivo. O `drizzle-kit` ja emite todas as FK
como `ALTER TABLE` depois dos `CREATE TABLE`, entao no SQL nao ha problema. No TypeScript ha:
a referencia mutua faz o compilador entrar em loop e tipar as duas tabelas como `any`. A
correcao e anotar o retorno do callback — `.references((): AnyMySqlColumn => tasks.id)`.

**`CREATE INDEX ... ON clients (lower(razao_social))`** — desnecessario. A collation da coluna
ja ignora caixa, entao o indice comum atende `WHERE razao_social LIKE ...`.

**Formato do arquivo de migration** — o `drizzle-kit` separa os comandos com
`--> statement-breakpoint`. O migrator corta por essa marca antes de enviar ao servidor, mas
o MySQL nao aceita `-->` como comentario (exige `--` seguido de espaco). Ou seja: aplique
sempre com `npm run db:migrate`; abrir o `.sql` no Workbench e mandar rodar vai dar erro de
sintaxe.

## Divergencias entre o .sql original e o `types.ts` do prompt

O prompt manda derivar o SQL da camada de dominio ("Regra de ouro"), e foi o que foi feito.
Onde os dois discordavam, o `types.ts` venceu:

- **`users`**: o SQL logava por `email citext UNIQUE NOT NULL`. O dominio manda login por
  `username`, com `email` opcional e usado so para notificacao. Ficou `username` unico e
  `email` anulavel.
- **`tasks.iniciado_em`**: nao existia no SQL. Existe no dominio (base do cycle time) e foi
  criado.
- **`notification_rules` / `notification_outbox`**: estao no dominio, nao estavam no SQL.
  O `crm_migration_notificacoes.sql` citado no prompt nao foi entregue, entao as duas tabelas
  foram derivadas dos tipos `NotificationRule` e `NotificationOutbox`.
- **`clients.email`**: existia no SQL, nao existe no tipo `Cliente`. Removido. Nada na fase 1
  usa e-mail de cliente; notificacao sai de `users.email`.

Duas coisas foram **acrescentadas ao dominio** antes de virarem tabela, como a regra de ouro
exige:

- **`TaskComment`** — `task_comments` existia no SQL e a etapa 5 precisa dela, mas nao havia
  tipo correspondente. O tipo foi criado em `types.ts` primeiro.
- **`sessions`** — a auth propria da etapa 2 precisa persistir sessao. Guarda o SHA-256 do
  token; o token cru so existe no cookie.
