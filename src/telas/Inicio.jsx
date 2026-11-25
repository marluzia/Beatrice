import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import IconeDoTipo from "../componentes/IconeDoTipo.jsx";
import {
  Anel,
  centavosEmDinheiro,
  AbasDePasta,
  BotaoSino,
  dinheiro,
  emBreve,
  mostrarAviso,
  tomDoSaldo,
  TituloDeSecao,
} from "../componentes/Interface.jsx";
import { LISTA_DE_MOEDAS, MOEDA_PADRAO, MOEDAS, moedaValida } from "../nucleo/moedas.js";
import { diaCurtoPorExtenso, hojeISO } from "../nucleo/resumo.js";
import { detalheDoEvento, destinoDoEvento, hojeEmTudo } from "./comum.js";

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

/** As moedas dos conjuntos da pessoa, na ordem da lista (sempre ao menos o real). */
function moedasEmUso(panorama) {
  const usadas = new Set(panorama.map((p) => moedaValida(p.estado.moeda)));
  const lista = LISTA_DE_MOEDAS.map((m) => m.codigo).filter((c) => usadas.has(c));
  return lista.length ? lista : [MOEDA_PADRAO];
}

const CHAVE_DA_MOEDA = "ceder:moedaDoInicio";

/** A moeda que a pessoa escolheu da última vez, se ainda houver conjunto nela. */
function moedaGuardada(moedas) {
  try {
    const guardada = window.localStorage.getItem(CHAVE_DA_MOEDA);
    if (guardada && moedas.includes(guardada)) return guardada;
  } catch {
    /* sem armazenamento: fica na primeira */
  }
  return moedas[0];
}

function guardarMoeda(codigo) {
  try {
    window.localStorage.setItem(CHAVE_DA_MOEDA, codigo);
  } catch {
    /* sem armazenamento, a escolha vale até fechar */
  }
}

/** O Início: o saldo (na moeda escolhida), as ações rápidas e o que acontece hoje. */
export default function Inicio({ app }) {
  const { panorama, abrir, escolherAba, comecarACriar, abrirBusca, acoes, perfil } = app;
  const primeiroNome = (perfil?.nome ?? "").trim().split(/\s+/)[0];
  const [filtro, setFiltro] = useState("tudo");
  const [tudoDeHoje, setTudoDeHoje] = useState(false);
  const hoje = hojeISO();

  // O saldo é a soma do que você paga e recebe em cada conjunto, mas só se
  // soma dinheiro da mesma moeda: a pessoa escolhe qual ver.
  const moedas = moedasEmUso(panorama);
  const [moeda, setMoeda] = useState(() => moedaGuardada(moedas));
  const daMoeda = panorama.filter((p) => moedaValida(p.estado.moeda) === moeda);
  const aPagar = daMoeda.reduce((s, p) => s + (p.resumo?.aPagar ?? 0), 0);
  const aReceber = daMoeda.reduce((s, p) => s + (p.resumo?.aReceber ?? 0), 0);
  const saldo = aReceber - aPagar;
  const tom = tomDoSaldo(saldo / 100);
  const escolherMoeda = (codigo) => {
    setMoeda(codigo);
    guardarMoeda(codigo);
  };

  const deHoje = hojeEmTudo(panorama, hoje);
  const atrasos = deHoje.filter((e) => e.tipo === "atraso").length;
  const filtros = FILTROS.map((f) =>
    f.valor === "atraso" && atrasos > 0
      ? {
          ...f,
          rotulo: (
            <>
              Atrasos
              <i className="pasta__ponto" aria-label={`${atrasos} ${atrasos === 1 ? "atrasada" : "atrasadas"}`} />
            </>
          ),
        }
      : f,
  );
  const eventos = deHoje.filter((e) => filtro === "tudo" || e.tipo === filtro);
  const visiveis = tudoDeHoje ? eventos : eventos.slice(0, 3);

  return (
    <div className="tela tela--inicio">
      <header className="inicio-topo">
        <h1 className="marca-ceder">{primeiroNome ? `Olá, ${primeiroNome}` : "Olá!"}</h1>
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
          <button type="button" className="icone-botao" aria-label="Buscar" onClick={abrirBusca}>
            <Icone nome="busca" tamanho={24} />
          </button>
          <BotaoSino />
        </div>
      </header>

      <section className="cartao-saldo" aria-label="Saldo">
        <div className="cartao-saldo__topo">
          <label className="seletor-moeda">
            <span className="sr-only">Moeda do saldo</span>
            <select value={moeda} onChange={(e) => escolherMoeda(e.target.value)} aria-label="Moeda do saldo">
              {moedas.map((codigo) => (
                <option key={codigo} value={codigo}>
                  {MOEDAS[codigo].simbolo} · {MOEDAS[codigo].nome}
                </option>
              ))}
            </select>
            <Icone nome="baixo" tamanho={18} />
          </label>
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
            <strong className={`valor-grande valor--${tom}`}>{centavosEmDinheiro(saldo, { sinal: true, moeda })}</strong>
          </Anel>
        </div>

        <div className="cartao-saldo__base">
          <div>
            <span className="rotulo-ponto rotulo-ponto--pagar">A pagar</span>
            <strong className="valor-medio valor--pagar">{centavosEmDinheiro(aPagar, { moeda })}</strong>
          </div>
          <div className="direita">
            <span className="rotulo-ponto rotulo-ponto--receber">A receber</span>
            <strong className="valor-medio valor--receber">{centavosEmDinheiro(aReceber, { moeda })}</strong>
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
      <div className="pasta--compacta">
      <AbasDePasta opcoes={filtros} valor={filtro} aoMudar={setFiltro} rotulo="Filtrar o que é de hoje">
      {visiveis.length === 0 ? (
        <p className="vazio-suave vazio-suave--na-pasta">
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
                      : dinheiro(ev.valor ?? 0, { moeda: ev.estado?.moeda })}
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
      </AbasDePasta>
      </div>

      {panorama.length === 0 && (
        <div className="cartao-vazio">
          <IconeDoTipo tipo="novoConjunto" tamanho={56} />
          <p>Um conjunto é um grupo dividindo despesas: um churrasco, uma viagem, a casa, uma república.</p>
          <button type="button" className="botao" onClick={comecarACriar}>
            Criar o primeiro conjunto
          </button>
        </div>
      )}
    </div>
  );
}
