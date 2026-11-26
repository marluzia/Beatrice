import Icone from "../componentes/Icone.jsx";
import { dinheiro } from "../componentes/Interface.jsx";
import { CabecalhoDaAba, CabecalhoDaSecao } from "../componentes/CabecalhoDoConjunto.jsx";
import { AVISOS } from "../nucleo/perfil.js";
import { dataAgendada, lembreteParaMim } from "../nucleo/lembretes.js";
import { MESES } from "../nucleo/formato.js";
import { curta, hojeISO, listaEmFrase, nomeDe, proximoVencimento } from "../nucleo/resumo.js";

/** As notificações de hoje, montadas do que está nos conjuntos. */
function avisosDeHoje(panorama, perfil, hoje) {
  const lista = [];
  for (const p of panorama) {
    const e = p.estado;
    const r = p.resumo;
    const mes = MESES[e.periodo.mes - 1];

    // Os seus Pix que faltam.
    if (perfil.avisos.pagamento !== false && r?.eu) {
      const meus = r.transferencias.filter((t) => t.de === r.eu && !t.confirmada);
      if (meus.length > 0) {
        lista.push({
          id: `pix-${p.ficha.id}`,
          tipo: "pix",
          conjunto: p.ficha.id,
          titulo: `${meus.length === 1 ? "Falta seu Pix" : `Faltam seus ${meus.length} Pix`} do fechamento${e.modo === "evento" || e.modo === "temporada" ? "" : ` de ${mes}`}`,
          texto: `${listaEmFrase(meus.map((t) => `${dinheiro(t.centavos / 100, { moeda: e.moeda })} para ${t.paraNome}`))} · ${p.ficha.nome}`,
        });
      }
    }

    // Vencimentos de hoje e dos próximos 3 dias.
    if (perfil.avisos.vencimento !== false) {
      const v = proximoVencimento(e, hoje);
      if (v && v.dias <= 3) {
        const quando = v.dias === 0 ? "hoje" : v.dias === 1 ? "amanhã" : `em ${v.dias} dias`;
        lista.push({
          id: `v-${p.ficha.id}-${v.ciclo.id}`,
          tipo: v.pagoPor ? "ok" : "vencimento",
          conjunto: p.ficha.id,
          ciclo: v.ciclo.id,
          titulo: `${v.ciclo.nome} de ${mes} vence ${quando}`,
          texto: v.pagoPor
            ? `Já paga por ${nomeDe(e, v.pagoPor)}${v.pagoEm ? ` em ${curta(v.pagoEm.slice(0, 10))}` : ""}. Nada a fazer.`
            : `${dinheiro(v.valor, { moeda: e.moeda })} · ${p.ficha.nome} · ninguém marcou como paga.`,
        });
      }
    }

    // Lembretes agendados para hoje (sem data agendada, o dia do lançamento),
    // para quem foi marcado neles; sem ninguém marcado, para o grupo todo.
    if (perfil.avisos.lembrete !== false) {
      for (const l of e.lembretes ?? []) {
        if (dataAgendada(l) === hoje && lembreteParaMim(l, r?.eu ?? null)) {
          lista.push({ id: `l-${l.id}`, tipo: "lembrete", conjunto: p.ficha.id, titulo: l.texto || l.titulo || "Lembrete", texto: p.ficha.nome });
        }
      }
    }

    // O que foi lançado hoje.
    for (const a of p.atividade ?? []) {
      if (!String(a.quando).startsWith(hoje) || a.tipo !== "despesa") continue;
      lista.push({
        id: `a-${p.ficha.id}-${a.quando}`,
        tipo: "lancamento",
        conjunto: p.ficha.id,
        titulo: `${a.texto}, ${dinheiro(a.valor ?? 0, { moeda: e.moeda })}`,
        texto: p.ficha.nome,
      });
    }
  }
  return lista;
}

/** Notificações: o que pede atenção hoje, o que aconteceu antes e quando avisar. */
export default function Notificacoes({ app, rota, aoVoltar }) {
  const { panorama, perfil, acoes, abrir, voltar, idDoConjunto } = app;
  const hoje = hojeISO();
  const fonte = rota?.soEste ? panorama.filter((p) => p.ficha.id === idDoConjunto) : panorama;
  const deHoje = avisosDeHoje(fonte, perfil, hoje);

  const antes = fonte
    .flatMap((p) => (p.atividade ?? []).map((a) => ({ ...a, conjunto: p.ficha.id, nomeDoConjunto: p.ficha.nome, moeda: p.estado.moeda })))
    .filter((a) => !String(a.quando).startsWith(hoje))
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)))
    .slice(0, 12);

  // Cada aviso abre o lançamento dele, sozinho; o Pix vai para o acerto.
  const destino = (n) =>
    n.tipo === "pix"
      ? { tela: "fechar", passo: "rateio", secao: "acerto" }
      : n.tipo === "vencimento" || n.tipo === "ok"
        ? { tela: "lancamento", tipo: "ciclica", id: n.ciclo }
        : n.ref
          ? { tela: "lancamento", ...n.ref }
          : n.tipo === "lembrete"
            ? { tela: "verLembretes" }
            : { tela: "verDespesas" };

  return (
    <div className="tela">
      {app.estado && !aoVoltar ? (
        <CabecalhoDaSecao app={app} secao={rota?.soEste ? "Histórico" : "Notificações"} />
      ) : (
        <CabecalhoDaAba titulo={rota?.soEste ? "Histórico" : "Notificações"} aoVoltar={aoVoltar ?? voltar} />
      )}
      <p className="texto-apoio">Os avisos nascem do que acontece nas despesas: vencimentos, pagamentos, registros e fechamentos.</p>

      <p className="rotulo-secao">Hoje</p>
      {deHoje.length === 0 ? (
        <p className="vazio-suave">Nada pedindo atenção hoje.</p>
      ) : (
        <div className="pilha">
          {deHoje.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`aviso ${n.tipo === "pix" ? "aviso--escuro" : ""}`}
              onClick={() => abrir(n.conjunto, destino(n))}
            >
              <span className={`aviso__marca aviso__marca--${n.tipo}`} aria-hidden="true">
                {n.tipo === "ok" ? <Icone nome="check" tamanho={20} espessura={2.4} /> : null}
              </span>
              <span className="aviso__textos">
                <strong>{n.titulo}</strong>
                <span>{n.texto}</span>
                {n.tipo === "pix" && <span className="aviso__link">Abrir Fechar contas</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      {antes.length > 0 && (
        <>
          <p className="rotulo-secao">Antes</p>
          <div className="cartao-lista">
            {antes.map((a, i) => (
              <div className="linha-historico" key={`${a.conjunto}-${a.quando}-${i}`}>
                <span className="linha-historico__data">{curta(String(a.quando).slice(0, 10))}</span>
                <span>
                  {a.texto}
                  {a.valor ? ` · ${dinheiro(a.valor, { moeda: a.moeda })}` : ""}
                  {!rota?.soEste && <small> · {a.nomeDoConjunto}</small>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="titulo-secao__texto titulo-secao__texto--solto">
        Avisar <em>quando</em>
      </h2>
      <div className="cartao-lista">
        {AVISOS.map((a) => {
          const ligado = perfil.avisos[a.chave] !== false;
          return (
            <label className="linha-alternar" key={a.chave}>
              <span>{a.texto}</span>
              <input type="checkbox" checked={ligado} onChange={(e) => acoes.definirAviso(a.chave, e.target.checked)} />
              <span className="caixinha" aria-hidden="true">
                {ligado && <Icone nome="check" tamanho={16} espessura={2.6} />}
              </span>
            </label>
          );
        })}
      </div>
      <p className="ajuda-campo">Os avisos aparecem aqui e no sino. Notificação no celular: em breve.</p>
    </div>
  );
}
