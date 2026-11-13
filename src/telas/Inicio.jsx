import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import IconeDoTipo from "../componentes/IconeDoTipo.jsx";
import {
  Anel,
  centavosEmDinheiro,
  Chips,
  dinheiro,
  emBreve,
  mostrarAviso,
  tomDoSaldo,
  TituloDeSecao,
} from "../componentes/Interface.jsx";
import { diaCurtoPorExtenso, hojeISO } from "../nucleo/resumo.js";
import { detalheDoEvento, destinoDoEvento, hojeEmTudo, porLancamento, sobrescritoDoConjunto, TEXTO_DA_SITUACAO } from "./comum.js";

const FILTROS = [
  { valor: "tudo", rotulo: "Tudo" },
  { valor: "atraso", rotulo: "Atrasos" },
  { valor: "despesa", rotulo: "Despesas" },
  { valor: "lembrete", rotulo: "Lembretes" },
  { valor: "vencimento", rotulo: "Vencimentos" },
];

const ICONE_DO_EVENTO = {
  atraso: { icone: "relogio", classe: "evento-icone--atraso" },
  vencimento: { icone: "raio", classe: "evento-icone--ouro" },
  despesa: { icone: "sacola", classe: "evento-icone--vermelho" },
  lembrete: { icone: "sino", classe: "evento-icone--azul" },
  registro: { icone: "registro", classe: "evento-icone--cinza" },
};

/** O Início: meu saldo em todos os conjuntos, ações rápidas, hoje e os recentes. */
export default function Inicio({ app }) {
  const { panorama, abrir, escolherAba, comecarACriar, abrirNotificacoes, acoes } = app;
  const [filtro, setFiltro] = useState("tudo");
  const [tudoDeHoje, setTudoDeHoje] = useState(false);
  const hoje = hojeISO();

  const aPagar = panorama.reduce((s, p) => s + (p.resumo?.aPagar ?? 0), 0);
  const aReceber = panorama.reduce((s, p) => s + (p.resumo?.aReceber ?? 0), 0);
  const saldo = aReceber - aPagar;
  const tom = tomDoSaldo(saldo / 100);

  const deHoje = hojeEmTudo(panorama, hoje);
  const atrasos = deHoje.filter((e) => e.tipo === "atraso").length;
  const filtros = FILTROS.map((f) => (f.valor === "atraso" && atrasos > 0 ? { ...f, rotulo: `Atrasos · ${atrasos}` } : f));
  const eventos = deHoje.filter((e) => filtro === "tudo" || e.tipo === filtro);
  const visiveis = tudoDeHoje ? eventos : eventos.slice(0, 3);
  const pendentes = panorama.some((p) => p.resumo?.aPagar > 0);

  return (
    <div className="tela tela--inicio">
      <header className="inicio-topo">
        <h1 className="marca-ceder">CEDER</h1>
        <div className="topo-tela__acoes">
          <button
            type="button"
            className="icone-botao"
            aria-label="Atualizar"
            onClick={() => {
              acoes.recarregar();
              mostrarAviso("Tudo atualizado.");
            }}
          >
            <Icone nome="atualizar" tamanho={24} />
          </button>
          <button type="button" className="icone-botao" aria-label="Buscar conjunto" onClick={() => escolherAba("conjuntos")}>
            <Icone nome="busca" tamanho={24} />
          </button>
          <button type="button" className="icone-botao" aria-label="Notificações" onClick={abrirNotificacoes}>
            <Icone nome="sino" tamanho={24} />
            {pendentes && <span className="ponto-aviso" />}
          </button>
        </div>
      </header>

      <section className="cartao-saldo" aria-label="Meu saldo">
        <div className="cartao-saldo__topo">
          <h2>Meu saldo</h2>
          <button type="button" className="link-mono" onClick={() => escolherAba("atividade")}>
            Atividade ›
          </button>
        </div>

        <div className="cartao-saldo__anel">
          <Anel
            tamanho={150}
            espessura={16}
            partes={[
              { valor: aPagar, cor: "var(--vermelho)" },
              { valor: aReceber, cor: "var(--verde)" },
            ]}
          >
            <strong className={`valor-grande valor--${tom}`}>{centavosEmDinheiro(saldo, { sinal: true })}</strong>
          </Anel>
        </div>

        <div className="cartao-saldo__base">
          <div>
            <span className="rotulo-ponto rotulo-ponto--pagar">A pagar</span>
            <strong className="valor-medio valor--pagar">{centavosEmDinheiro(aPagar)}</strong>
          </div>
          <div className="direita">
            <span className="rotulo-ponto rotulo-ponto--receber">A receber</span>
            <strong className="valor-medio valor--receber">{centavosEmDinheiro(aReceber)}</strong>
          </div>
        </div>
      </section>

      <p className="rotulo-secao">Ação rápida</p>
      <div className="acoes-rapidas">
        <button type="button" className="acao-rapida acao-rapida--escura" onClick={() => emBreve("Cobrar")}>
          <Icone nome="receber" tamanho={28} />
          <strong>Cobrar</strong>
        </button>
        <button type="button" className="acao-rapida" onClick={() => emBreve("Entrar em conjunto")}>
          <Icone nome="qr" tamanho={28} />
          <strong>Entrar em conjunto</strong>
        </button>
        <button type="button" className="acao-rapida" onClick={() => emBreve("Escanear conta")}>
          <Icone nome="escanear" tamanho={28} />
          <strong>Escanear conta</strong>
        </button>
      </div>

      <TituloDeSecao direita={diaCurtoPorExtenso(hoje)}>Hoje</TituloDeSecao>
      <Chips opcoes={filtros} valor={filtro} aoMudar={setFiltro} />

      {visiveis.length === 0 ? (
        <p className="vazio-suave">
          {panorama.length === 0
            ? "Quando houver conjuntos, o que vence e o que for lançado hoje aparece aqui."
            : filtro === "atraso"
              ? "Nenhuma conta atrasada."
              : "Nada para hoje."}
        </p>
      ) : (
        <div className="pilha">
          {visiveis.map((ev) => {
            const visual = ICONE_DO_EVENTO[ev.tipo] ?? ICONE_DO_EVENTO.despesa;
            return (
              <button
                key={`${ev.conjunto}-${ev.id}`}
                type="button"
                className={`cartao-evento ${ev.tipo === "atraso" ? "cartao-evento--atraso" : ""}`}
                onClick={() => abrir(ev.conjunto, destinoDoEvento(ev))}
              >
                <span className={`evento-icone ${visual.classe}`}>
                  <Icone nome={visual.icone} tamanho={22} />
                </span>
                <span className="cartao-evento__textos">
                  <strong>{ev.tipo === "vencimento" ? `${ev.titulo} hoje` : ev.titulo}</strong>
                  <span>{detalheDoEvento(ev)}</span>
                </span>
                <span className="cartao-evento__valor">
                  {ev.tipo === "lembrete"
                    ? "lembrete"
                    : ev.tipo === "registro"
                      ? `${ev.quantidade}×`
                      : dinheiro(ev.valor ?? 0)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {eventos.length > 3 && (
        <button type="button" className="link-mono link-mono--centro" onClick={() => setTudoDeHoje((v) => !v)}>
          {tudoDeHoje ? "mostrar menos" : `+ ${eventos.length - 3} lançamentos de hoje`}
        </button>
      )}

      <TituloDeSecao direita="Ver todos" aoClicarDireita={() => escolherAba("conjuntos")}>
        Conjuntos recentes
      </TituloDeSecao>

      {panorama.length === 0 ? (
        <div className="cartao-vazio">
          <IconeDoTipo tipo="novoConjunto" tamanho={56} />
          <p>
            Um conjunto é um grupo dividindo despesas: um churrasco, uma viagem, a casa, uma república.
          </p>
          <button type="button" className="botao" onClick={comecarACriar}>
            Criar o primeiro conjunto
          </button>
        </div>
      ) : (
        <div className="pilha">
          {porLancamento(panorama)
            .slice(0, 3)
            .map((p) => {
              const r = p.resumo;
              const valor = r?.eu ? r.aberto / 100 : null;
              return (
                <button key={p.ficha.id} type="button" className="cartao-recente" onClick={() => abrir(p.ficha.id)}>
                  <IconeDoTipo tipo={p.estado.modo} tamanho={60} />
                  <span className="cartao-recente__textos">
                    <strong>{p.ficha.nome}</strong>
                    <span className="sobrescrito sobrescrito--sem-margem">{sobrescritoDoConjunto(p, hoje)}</span>
                  </span>
                  <span className="cartao-recente__valor">
                    <strong className={`mono valor--${valor === null ? "zero" : tomDoSaldo(valor)}`}>
                      {valor === null ? "—" : dinheiro(valor, { sinal: true, simbolo: false })}
                    </strong>
                    <span>{TEXTO_DA_SITUACAO[r?.situacao] ?? ""}</span>
                  </span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
