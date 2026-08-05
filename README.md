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
| `npm run db:backup` | Dump do banco **e** pacote dos anexos em `backups/`, com rotacao |
| `npm test` | Testes das regras puras (rank, agrupamento, limite de login, anexos, datas) |

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

## Anexos

Chamados e rotinas aceitam arquivo. O **conteudo fica em disco**, em `anexos/AAAA/MM/<uuid>.<ext>`;
o banco guarda so o registro (`attachments`). Por que nao `LONGBLOB`: o dump e um `.sql` de texto,
e binario ali vira hexadecimal — cada MB de print viraria uns 2 MB no arquivo, vezes os 14 dumps
que a rotacao mantem.

| | |
|---|---|
| Teto por arquivo | 15 MB (`ANEXO_MAX_BYTES`, em `src/domain/constants.ts`) |
| Tipos aceitos | imagem (png, jpg, gif, webp), pdf, txt, csv, zip, doc(x), xls(x) |
| Onde anexa | Tela do chamado e tela da rotina |

Tres coisas que o codigo faz de proposito, e que nao se deve afrouxar sem entender o motivo:

- **A pasta fica fora de `public/`.** La o Next serviria os arquivos direto, sem olhar sessao, e
  qualquer pessoa com o link leria anexo de cliente. Todo acesso passa por `/api/anexos/[id]`.
- **A lista de tipos e fechada, e `image/svg+xml` e `text/html` estao fora.** SVG e XML e aceita
  `<script>` dentro; seria servido como imagem legitima e rodaria no dominio da aplicacao. Só
  imagem abre `inline` — todo o resto baixa (`Content-Disposition: attachment`).
- **O tipo declarado e conferido contra a assinatura do arquivo.** Renomear `.exe` para `.png` nao
  passa. O nome em disco tambem nunca vem do nome enviado: e um uuid mais a extensao do tipo.

Na rotina escalada aparecem tambem os anexos do chamado de origem, marcados como **do chamado** e
sem botao de apagar — o print pertence ao atendimento. Apagar so pode quem enviou, ou admin/gestor.

## Backup e restauracao

```bash
npm run db:backup
```

Gera **dois** arquivos, com o mesmo carimbo de hora:

| Arquivo | O que e |
|---|---|
| `backups/crm-AAAA-MM-DD-HHmm.sql` | Dump logico so do banco `crm`, com `CREATE DATABASE`, schema e dados |
| `backups/anexos-AAAA-MM-DD-HHmm.tar.gz` | Os arquivos anexados aos chamados e rotinas |

**Os dois formam um backup. Um sozinho nao serve.** Os anexos ficam em disco, em `anexos/`, e nao
dentro do banco (a razao esta na tabela `attachments`, em `src/db/schema.ts`): restaurar so o `.sql`
devolve chamados apontando para arquivos que nao existem mais. Se ainda nao houver anexo nenhum, o
`.tar.gz` nao e gerado e o script diz isso.

O script (`src/db/backup.ts`) le host, porta, usuario, senha e nome do banco da `DATABASE_URL` e
chama o `mysqldump` do proprio MySQL. A senha vai pelo ambiente (`MYSQL_PWD`) do processo filho,
nunca por argumento de linha de comando — argumento apareceria na lista de processos para qualquer
um da maquina.

Se o dump sair e o empacotamento dos anexos falhar, o script avisa em `stderr` e **termina com
codigo 1**, mantendo o `.sql`. Numa tarefa agendada, e o codigo de saida que denuncia o backup pela
metade.

`backups/` e `anexos/` estao no `.gitignore`. **Os dois tem dado de cliente e este repositorio e
publico** — nao tire as linhas.

| Variavel | Padrao | Para que |
|---|---|---|
| `BACKUP_KEEP` | `14` | Quantos dumps manter. Os mais antigos sao apagados no fim de cada execucao |
| `MYSQLDUMP_PATH` | detectado | Caminho do `mysqldump` se ele nao estiver no PATH nem em `C:\Program Files\MySQL\...` |

| `ANEXOS_DIR` | `anexos/` | Onde ficam os arquivos anexados. A aplicacao e o backup leem a mesma variavel |

A rotacao so apaga arquivos que casam exatamente com `crm-AAAA-MM-DD-HHmm.sql` ou
`anexos-AAAA-MM-DD-HHmm.tar.gz`. Qualquer outra coisa na pasta (dump manual, log, `.zip`) fica
onde esta.

### Restaurar

O dump ja traz `CREATE DATABASE IF NOT EXISTS crm` e `USE crm`, entao nao precisa dizer o banco
no comando — e nao tem como ele cair em outro banco por engano.

> **Isto sobrescreve o banco.** Cada tabela vem com `DROP TABLE IF EXISTS` antes do `CREATE`.
> Pare o `npm run dev` antes, e nao rode contra um banco cujo estado atual voce ainda quer.

PowerShell:

```powershell
$env:MYSQL_PWD = 'senha_do_crm_app'
& "C:\Program Files\MySQL\MySQL Server 9.5\bin\mysql.exe" `
    --host=127.0.0.1 --port=3306 --user=crm_app --default-character-set=utf8mb4 `
    -e "source backups/crm-2026-08-04-0937.sql"
$env:MYSQL_PWD = $null
```

cmd.exe ou bash, se preferir redirecionar:

```bash
MYSQL_PWD='senha_do_crm_app' \
  "/c/Program Files/MySQL/MySQL Server 9.5/bin/mysql.exe" \
  --host=127.0.0.1 --port=3306 --user=crm_app --default-character-set=utf8mb4 \
  < backups/crm-2026-08-04-0937.sql
```

**E os anexos**, do pacote de mesmo carimbo de hora. Esta etapa nao e opcional: sem ela o banco
restaurado tem os registros dos anexos e nenhum arquivo por tras deles.

```bash
# Apaga o que estiver la e repoe a partir do pacote.
rm -rf anexos && mkdir anexos
tar -xzf backups/anexos-2026-08-04-0937.tar.gz -C anexos
```

Os caminhos dentro do pacote sao relativos (`./2026/08/<uuid>.png`), entao ele restaura em qualquer
maquina e em qualquer pasta — inclusive numa diferente, apontando `ANEXOS_DIR` para ela.

Para conferir que um pacote esta bom sem mexer em nada, extraia num diretorio temporario e compare:

```bash
tar -tzf backups/anexos-2026-08-04-0937.tar.gz   # so lista, nao escreve nada
```

Troque o nome do arquivo pelo dump que voce quer. Depois confira:

```sql
SELECT COUNT(*) FROM tickets;
SELECT COUNT(*) FROM tasks;
```

Para ensaiar a restauracao sem tocar no banco de producao, restaure num banco de teste
(`crm_teste`) — o dump manda em `crm`, entao troque as duas ocorrencias de `` `crm` `` no
cabecalho do arquivo. Isso exige um usuario com permissao de criar banco; o `crm_app` so
enxerga `crm`.

### Agendar no Windows (sugestao — nao esta agendado)

Backup que depende de alguem lembrar de rodar nao e rotina. Para criar uma tarefa diaria as
22:00, rode **uma vez** num prompt como administrador (ajuste o caminho do projeto):

```
schtasks /create /tn "CRM backup diario" /sc daily /st 22:00 /tr "cmd /c cd /d \"C:\Users\Vitor Amendola\OneDrive\Documentos\Projetos\MOR Projects\crm-suporte-dev\" && npm run db:backup >> \"backups\backup.log\" 2>&1"
```

Conferir, rodar na hora ou remover:

```
schtasks /query  /tn "CRM backup diario"
schtasks /run    /tn "CRM backup diario"
schtasks /delete /tn "CRM backup diario" /f
```

O log cai em `backups/backup.log`, que a rotacao ignora por nao casar com o padrao de nome.
Se a maquina costuma ficar desligada as 22:00, adicione `/ri` ou marque "executar assim que
possivel apos uma inicializacao perdida" no Agendador de Tarefas — senao o dia passa em branco.

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
