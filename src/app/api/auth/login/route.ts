import { ROTA_INICIAL, loginSchema } from "@/domain";
import { criarLimitador, type ConfigLimite, type Limitador } from "@/lib/limite";
import { respostaErro, respostaOk, tratarErro, validarCorpo } from "@/lib/rota";
import { autenticar } from "@/services/auth";

/**
 * Numeros pensados para uso interno, nao para um portal exposto: 8 erros em 5
 * minutos e mais do que alguem gasta com caps lock ligado ou trocando o layout
 * do teclado, e o primeiro bloqueio e de 1 minuto - incomodo, nao castigo. Quem
 * insiste dobra a espera a cada bloqueio, ate 15 minutos, que e onde forca
 * bruta deixa de valer a pena.
 */
const POR_CONTA: ConfigLimite = {
  max: 8,
  janelaSegundos: 5 * 60,
  bloqueioSegundos: 60,
  bloqueioMaximoSegundos: 15 * 60,
};

/** Teto do IP inteiro: folgado o bastante para varias pessoas atras do mesmo NAT. */
const POR_IP: ConfigLimite = { ...POR_CONTA, max: 40 };

/**
 * Um limitador por processo. Em dev o Next recarrega os modulos a cada
 * alteracao, e sem pendurar no globalThis o contador se perderia a cada
 * recompilacao - do mesmo jeito que a pool do banco em db/client.ts.
 */
const globalLimites = globalThis as unknown as {
  __crmLimiteConta?: Limitador;
  __crmLimiteIp?: Limitador;
};
const limiteConta = (globalLimites.__crmLimiteConta ??= criarLimitador(POR_CONTA));
const limiteIp = (globalLimites.__crmLimiteIp ??= criarLimitador(POR_IP));

/**
 * IP de quem chamou. Atras de proxy vem em x-forwarded-for, cujo primeiro item
 * e o cliente e o resto sao os proxies do caminho; nginx costuma servir tambem
 * x-real-ip. Sem proxy nenhum - o caso desta instalacao hoje - nao chega
 * cabecalho algum, e ai simplesmente nao ha IP: devolve null e quem chama
 * decide o que fazer, em vez de inventar um valor falso.
 *
 * Vale lembrar que x-forwarded-for e texto que o cliente escreve. So da para
 * confiar nele quando um proxy nosso reescreve o cabecalho na entrada.
 */
function ipDaRequisicao(req: Request): string | null {
  const encaminhado = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (encaminhado) return encaminhado;
  const real = req.headers.get("x-real-ip")?.trim();
  return real ? real : null;
}

/**
 * Mensagem unica, sem depender de a conta existir. O limitador roda antes de
 * qualquer consulta ao banco, entao ele nao sabe - e nao pode passar a saber -
 * se o username e real: seria vazar de graca exatamente o que o hashFantasma
 * de services/auth.ts gasta tempo de argon2 para esconder.
 */
function recusar(segundos: number) {
  const plural = segundos === 1 ? "segundo" : "segundos";
  return respostaErro(`Muitas tentativas de login. Tente de novo em ${segundos} ${plural}.`, 429);
}

export async function POST(req: Request) {
  const v = await validarCorpo(req, loginSchema);
  if (!v.ok) return v.resposta;

  /**
   * Estrategia de chave: IP + username, com um teto por IP por cima.
   *
   * So username seria um botao de negacao de servico - qualquer um erra a senha
   * do "admin" oito vezes e tranca o admin de verdade, de qualquer lugar.
   * So IP poe o escritorio inteiro atras do mesmo NAT na mesma cota e nao
   * segura um atacante que troque de IP.
   * IP + username cobre o caso real (alguem martelando uma conta especifica)
   * sem que um IP consiga bloquear a conta de quem esta em outro IP.
   *
   * Sozinha, a chave combinada ainda deixaria passar spray: o mesmo IP tentando
   * "admin", "vitor", "suporte"... ganharia 8 tentativas para cada nome. Dai o
   * segundo limitador, por IP, com cota larga - invisivel no dia a dia de 10
   * pessoas e suficiente para cortar o spray.
   *
   * Sem IP na requisicao a chave por IP seria a mesma para todo mundo, e um
   * unico atacante bloquearia a equipe toda; nesse caso o teto e pulado e sobra
   * o limite por conta, que continua separando um username do outro.
   */
  const ip = ipDaRequisicao(req);
  // Caixa normalizada so na chave: para quem esta martelando, "Admin" e "admin"
  // sao a mesma conta, e nao adianta ganhar cota nova trocando a capitalizacao.
  const chaveConta = `${ip ?? "sem-ip"}|${v.dados.username.toLowerCase()}`;

  const daConta = limiteConta.registrar(chaveConta);
  if (!daConta.ok) return recusar(daConta.esperarSegundos);

  if (ip) {
    const doIp = limiteIp.registrar(ip);
    if (!doIp.ok) return recusar(doIp.esperarSegundos);
  }

  try {
    const papel = await autenticar(v.dados);
    // Acertou a senha: a conta volta com a cota cheia, para que os erros de
    // ontem nao contem contra ela hoje. O teto por IP fica de pe de proposito -
    // se caisse aqui, bastaria intercalar um login valido para zerar o spray.
    limiteConta.zerar(chaveConta);
    return respostaOk({ destino: ROTA_INICIAL[papel] });
  } catch (e) {
    return tratarErro(e);
  }
}
