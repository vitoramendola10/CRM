import { NextResponse, type NextRequest } from "next/server";
import { PAPEIS_POR_ROTA, ROTAS, ROTA_INICIAL, SESSAO_COOKIE, podeAcessar } from "@/domain";
import { lerSessao } from "@/lib/session-token";

/**
 * Primeira barreira: roda no Edge, entao confere apenas a assinatura do cookie -
 * sem banco. Quem valida se a sessao ainda existe e lib/auth.ts, no servidor.
 *
 * As permissoes saem de PAPEIS_POR_ROTA, em src/domain. Nenhuma rota aparece
 * chumbada aqui: incluir uma area nova e editar o dominio, nao este arquivo.
 */

const PUBLICAS = [ROTAS.login, "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ehApi = pathname.startsWith("/api/");
  const sessao = await lerSessao(req.cookies.get(SESSAO_COOKIE)?.value);

  if (PUBLICAS.includes(pathname)) {
    // Ja logado nao tem o que fazer na tela de login.
    if (sessao && pathname === ROTAS.login) {
      return NextResponse.redirect(new URL(ROTA_INICIAL[sessao.p], req.url));
    }
    return NextResponse.next();
  }

  if (!sessao) {
    if (ehApi) {
      return NextResponse.json({ erro: "Sessao expirada. Entre novamente." }, { status: 401 });
    }
    const destino = new URL(ROTAS.login, req.url);
    // Volta para onde a pessoa queria ir depois que ela se identificar.
    if (pathname !== "/") destino.searchParams.set("de", pathname);
    return NextResponse.redirect(destino);
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(ROTA_INICIAL[sessao.p], req.url));
  }

  // As rotas de API espelham as areas: /api/config/* segue a regra de /config.
  const alvo = ehApi ? pathname.replace(/^\/api/, "") : pathname;
  const protegida = Object.keys(PAPEIS_POR_ROTA).some(
    (base) => alvo === base || alvo.startsWith(`${base}/`),
  );

  if (protegida && !podeAcessar(sessao.p, alvo)) {
    if (ehApi) {
      return NextResponse.json({ erro: "Voce nao tem acesso a esta area." }, { status: 403 });
    }
    return NextResponse.redirect(new URL(ROTA_INICIAL[sessao.p], req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp|woff2)$).*)"],
};
