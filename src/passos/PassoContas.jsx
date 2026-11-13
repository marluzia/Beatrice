import { useState } from "react";
import { AjudaContas } from "./ajudas.jsx";
import QuemPagou from "./QuemPagou.jsx";
import LinhaDoTempo from "./LinhaDoTempo.jsx";
import {
  Botao,
  Campo,
  CampoData,
  Ficha,
  Rotulo,
  Segmentado,
  SimboloDoCiclo,
  Titulo,
} from "../componentes/index.js";
import { MESES, nomeOu, reais, tarifa } from "../nucleo/formato.js";
import {
  consumoDaFatura,
  consumoMedido,
  tarifaDaFatura,
  totalDaFatura,
  valorDoConsumo,
} from "../nucleo/adaptador.js";
import {
  LIMITES_DO_CICLO,
  cicloValido,
  LIMITE_DO_PERIODO,
  corteValido,
  diasDaJanela,
  distanciaEmDias,
  somarDias,
  faturaAtiva,
  janelaDoFechamento,
  limitesDoCorte,
  limitesDeHoje,
  janelaPreenchida,
  janelaValida,
  temCicloInvalido,
  ultimoDiaDaJanela,
} from "../nucleo/calendario.js";
import { hojeISO } from "../nucleo/resumo.js";
import {
  MAXIMO_DE_CICLOS,
  RECURSOS,
  ciclosDe,
  doCiclo,
  ehDeFabrica,
  ehMedido,
  naOrdemDaTela,
  unidadeDoRecurso,
} from "../nucleo/ciclos.js";
import { mostra } from "./secoes.js";

const SUGESTOES = {
  luz: [
    { nome: "Energia elétrica", comportamento: "consumo" },
    { nome: "Iluminação pública", comportamento: "igual" },
    { nome: "Custo de disponibilidade", comportamento: "igual" },
    { nome: "Energia compensada", comportamento: "consumo" },
    { nome: "Energia SCEE isenta", comportamento: "consumo" },
    { nome: "Energia injetada (crédito)", comportamento: "abatimento" },
  ],
  agua: [
    { nome: "Tarifa água", comportamento: "consumo" },
    { nome: "Coleta / afastamento esgoto", comportamento: "consumo" },
    { nome: "Tratamento esgoto", comportamento: "consumo" },
    { nome: "Custo mínimo fixo", comportamento: "igual" },
    { nome: "Parcelamento / juros", comportamento: "igual" },
  ],
};

function Linha({ qual, linha, unidade, medido, acoes }) {
  const nome = linha.nome || "linha";
  const editar = (campo, valor) => acoes.editarLinha(qual, linha.id, campo, valor);

  return (
    <div className="linha-fatura">
      <input
        type="text"
        className="caixa caixa--texto"
        value={linha.nome}
        placeholder="Nome na fatura"
        aria-label="Nome da linha"
        onChange={(e) => editar("nome", e.target.value)}
      />
      <div className="linha-fatura__baixo">
        {/* Num ciclo só monetário (aluguel, condomínio) não há quantidade. */}
        {medido && (
          <input
            type="text"
            inputMode="decimal"
            className="caixa linha-fatura__quantidade"
            value={linha.quantidade ?? ""}
            placeholder={unidade}
            aria-label={`Quantidade de ${nome} em ${unidade}`}
            onChange={(e) => editar("quantidade", e.target.value)}
          />
        )}
        <input
          type="text"
          inputMode="decimal"
          className="caixa linha-fatura__valor"
          value={linha.valor}
          placeholder="R$"
          aria-label={`Valor de ${nome}`}
          onChange={(e) => editar("valor", e.target.value)}
        />
        <Segmentado
          rotuloDoGrupo={`Comportamento de ${nome}`}
          opcoes={
            medido
              ? [
                  { valor: "consumo", texto: "acompanha o consumo" },
                  { valor: "abatimento", texto: "abate o consumo" },
                  { valor: "igual", texto: "divide igual" },
                ]
              : [
                  { valor: "consumo", texto: "vai para o uso comum" },
                  { valor: "abatimento", texto: "desconto" },
                  { valor: "igual", texto: "divide igual" },
                ]
          }
          valor={linha.comportamento}
          aoMudar={(v) => editar("comportamento", v)}
        />
        <button
          type="button"
          className="linha-fatura__remover"
          aria-label={`Remover ${nome}`}
          onClick={() => acoes.removerLinha(qual, linha.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function CicloDeLeitura({ fatura, periodo, acoes }) {
  const qual = fatura.id;
  const titulo = fatura.nome || "Conta";
  const janela = fatura.janela ?? null;

  const [malEscrita, setMalEscrita] = useState({});

  const definir = (campo, valor) =>
    acoes.definirCiclo(qual, "janela", { ...(janela ?? {}), [campo]: valor || null });

  const marcar = (campo, ruim) => setMalEscrita((m) => ({ ...m, [campo]: ruim }));

  const curto = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : " ");

  const vazio = !janela?.de && !janela?.ate;
  const completa = janelaPreenchida(janela);
  const escritaRuim = Boolean(malEscrita.de || malEscrita.ate);
  const dias = completa && janelaValida(janela) ? distanciaEmDias(janela.de, janela.ate) : 0;

  let selo = `${diasDaJanela(null, periodo)} dias (do mês)`;
  let erro = false;

  if (escritaRuim) {
    selo = "ERRO: Data inválida";
    erro = true;
  } else if (completa && !janelaValida(janela)) {
    selo = "ERRO: Data final antes da inicial";
    erro = true;
  } else if (completa && !cicloValido(janela)) {
    selo = `${dias} dias. Ciclo tem entre ${LIMITES_DO_CICLO.minimo} e ${LIMITES_DO_CICLO.maximo}`;
    erro = true;
  } else if (completa) {
    // Dizer só "29 dias" confunde quem digitou 01/12 e 30/12 e esperava 30.
    // As datas são LEITURAS: a segunda é o instante em que o ciclo seguinte
    // começa, e por isso o dia dela não é cobrado aqui. Mostrar o último dia
    // efetivamente contado resolve a dúvida sem mudar a conta.
    selo = `${dias} dias · até ${curto(ultimoDiaDaJanela(janela))}`;
  } else if (!vazio) {
    selo = `PERÍODO ${titulo.toUpperCase()}`;
  }

  return (
    <div className="ciclo">
      <span className="ciclo-nome">{titulo}</span>
      <CampoData
        valor={janela?.de ?? null}
        aoMudar={(v) => definir("de", v)}
        aoInvalidar={(ruim) => marcar("de", ruim)}
        etiqueta={`Leitura anterior ${doCiclo(fatura)}`}
      />
      <span className="ciclo-seta" aria-hidden="true">
        →
      </span>
      <CampoData
        valor={janela?.ate ?? null}
        aoMudar={(v) => definir("ate", v)}
        aoInvalidar={(ruim) => marcar("ate", ruim)}
        etiqueta={`Leitura atual ${doCiclo(fatura)} (abre o ciclo seguinte)`}
      />
      <span className={`selo ${erro ? "selo--erro" : ""}`} role={erro ? "alert" : undefined}>
        {selo}
      </span>
    </div>
  );
}

/** Como uma conta só de valor se divide. */
const REGRAS_SO_VALOR = [
  { valor: "igual", texto: "igual" },
  { valor: "dias", texto: "por dias" },
  { valor: "porcentagem", texto: "%" },
  { valor: "comum", texto: "régua do uso comum" },
];

/**
 * A conta de um ciclo, para preencher. Abre e fecha como os itens. A ordem é a
 * das histórias: nome (nas contas do grupo, com o que ela mede), quem pagou,
 * o período de leitura, e só então o conteúdo da fatura.
 */
function BlocoDeFatura({ fatura, periodo, moradores, indicePorId, acoes, aoFechar }) {
  const qual = fatura.id;
  const titulo = fatura.nome || "Conta";
  const medido = ehMedido(fatura);
  const unidade = unidadeDoRecurso(fatura.recurso);
  const doGrupo = !ehDeFabrica(fatura);

  const jaLancadas = new Set(fatura.linhas.map((l) => l.nome.trim().toLowerCase()));
  const porUsar = (SUGESTOES[qual] ?? []).filter((s) => !jaLancadas.has(s.nome.toLowerCase()));

  const somado = consumoMedido(fatura);
  const consumoEmReais = valorDoConsumo(fatura);
  const preco = tarifaDaFatura(fatura);
  const total = totalDaFatura(fatura);

  return (
    <div className="bloco-fatura bloco-fatura--aberto">
      <div className="bloco-fatura__cabeca">
        {doGrupo ? (
          <input
            type="text"
            className="caixa caixa--texto bloco-fatura__nome"
            value={fatura.nome}
            placeholder="Nome da conta: gás, aluguel, condomínio"
            aria-label="Nome da conta"
            onChange={(e) => acoes.definirCiclo(qual, "nome", e.target.value)}
          />
        ) : (
          <h3>
            <SimboloDoCiclo ciclo={fatura} tamanho={12} /> {titulo}
          </h3>
        )}
        <button type="button" className="item-acao" onClick={aoFechar}>
          fechar
        </button>
      </div>

      {doGrupo && (
        <Segmentado
          rotuloDoGrupo={`O que ${titulo} mede`}
          opcoes={[
            { valor: "nenhum", texto: "só valor" },
            { valor: "kwh", texto: RECURSOS.kwh.unidade },
            { valor: "m3", texto: RECURSOS.m3.unidade },
          ]}
          valor={fatura.recurso ?? "nenhum"}
          aoMudar={(v) => acoes.definirCiclo(qual, "recurso", v === "nenhum" ? null : v)}
        />
      )}

      {/* Quem desembolsou esta conta, logo depois do nome: é daqui que sai o acerto. */}
      {moradores.length > 0 && (
        <QuemPagou
          pessoas={moradores}
          indicePorId={indicePorId}
          valor={fatura.pagoPor ?? null}
          aoMudar={(id) => acoes.definirPagador("fatura", qual, id)}
          semNinguem="Ninguém marcado: ainda não se sabe quem pagou esta conta, e ela fica fora do acerto."
          comAlguem="Essa pessoa pagou a conta inteira: os outros devem a ela no acerto."
        />
      )}

      {/* O período da fatura, no topo dela. */}
      <div className="grupo">
        <Rotulo>Período desta fatura</Rotulo>
        <CicloDeLeitura fatura={fatura} periodo={periodo} acoes={acoes} />
      </div>

      {medido ? (
        <>
          <div className="consumo-somado">
            <span className="rotulo rotulo-solto">Consumo faturado</span>
            {somado > 0 ? (
              <>
                <strong>
                  {somado.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {unidade}
                </strong>
                <em>somado das quantidades das linhas</em>
              </>
            ) : (
              <>
                <strong className="consumo-somado--vazio">  {unidade}</strong>
                <em>preencha a quantidade nas linhas de consumo abaixo</em>
              </>
            )}
          </div>

          <div className="grupo">
            <Rotulo>Linhas da fatura</Rotulo>

            {fatura.linhas.length === 0 ? (
              <p className="dica">
                Copie cada linha da fatura com a quantidade e o valor. "Abate o
                consumo" é para crédito de energia compensada: o valor entra
                negativo, mas a quantidade não soma de novo, é a mesma energia da
                linha que ele abate.
              </p>
            ) : (
              <div className="lista-linhas">
                {fatura.linhas.map((linha) => (
                  <Linha key={linha.id} qual={qual} linha={linha} unidade={unidade} medido acoes={acoes} />
                ))}
              </div>
            )}

            <div className="linha-acoes">
              {porUsar.map((s) => (
                <button
                  key={s.nome}
                  type="button"
                  className="botao botao--catalogo"
                  onClick={() => acoes.adicionarLinha(qual, s.nome, s.comportamento)}
                >
                  + {s.nome}
                </button>
              ))}
              <button type="button" className="botao botao--catalogo" onClick={() => acoes.adicionarLinha(qual)}>
                + outra
              </button>
            </div>
          </div>

          {(total !== 0 || consumoEmReais !== 0) && (
            <div className="resumo-fatura">
              {preco !== 0 && (
                <p className="tarifa tarifa--viva">
                  R$ {tarifa(preco)} por {unidade}
                  <span className="resumo-fatura__nota">
                    preço efetivo do mês, já com impostos e créditos: não é a
                    tarifa impressa na fatura
                  </span>
                </p>
              )}
              <p className="total-fatura">
                Total da fatura: <strong>R$ {reais(total)}</strong>
                <span>confira com o valor a pagar</span>
              </p>
            </div>
          )}
        </>
      ) : (
        <SoValor fatura={fatura} moradores={moradores} indicePorId={indicePorId} acoes={acoes} />
      )}

      {/* O vencimento não decide a qual período a conta pertence; decide só
          se alguém vai precisar adiantar o pagamento antes do acerto. */}
      <div className="pagador-fatura">
        <CampoData
          rotulo="Vencimento"
          valor={fatura.vencimento ?? null}
          aoMudar={(v) => acoes.definirCiclo(qual, "vencimento", v || null)}
          etiqueta={`Vencimento da conta ${doCiclo(fatura)}`}
        />
      </div>

      {doGrupo && (
        <div className="linha-acoes">
          <button
            type="button"
            className="botao botao--catalogo"
            onClick={() => {
              if (window.confirm(`Tirar "${titulo}" deste conjunto? Itens que saíam dela ficam sem conta.`)) {
                acoes.removerCiclo(qual);
              }
            }}
          >
            Remover esta conta
          </button>
        </div>
      )}
    </div>
  );
}

/** Conta só de valor: o valor e como divide. Por porcentagem, a fatia de cada um. */
function SoValor({ fatura, moradores, indicePorId, acoes }) {
  const qual = fatura.id;
  const regra = fatura.rateio ?? "comum";
  const linhaDoValor = fatura.linhas?.[0];
  const soma = moradores.reduce(
    (s, m) => s + (Number(String(fatura.porcentagens?.[m.id] ?? "").replace(",", ".")) || 0),
    0,
  );

  return (
    <>
      <div className="linha-campos">
        <Campo
          rotulo="Valor"
          sufixo="R$"
          valor={linhaDoValor?.valor ?? ""}
          aoMudar={(v) => acoes.definirValorDoCiclo(qual, v)}
          largura="campo--curto"
          placeholder="0,00"
        />
      </div>
      <div className="grupo">
        <Rotulo>Como divide</Rotulo>
        <Segmentado
          rotuloDoGrupo={`Como ${fatura.nome || "a conta"} divide`}
          opcoes={REGRAS_SO_VALOR}
          valor={regra}
          aoMudar={(v) => acoes.definirCiclo(qual, "rateio", v)}
        />
        {regra === "porcentagem" && (
          <>
            <div className="linha-campos">
              {moradores.map((m, i) => (
                <Campo
                  key={m.id}
                  rotulo={nomeOu(m.nome, indicePorId[m.id] ?? i)}
                  valor={fatura.porcentagens?.[m.id] ?? ""}
                  aoMudar={(v) => acoes.definirCiclo(qual, "porcentagens", { ...(fatura.porcentagens ?? {}), [m.id]: v })}
                  sufixo="%"
                  largura="campo--minimo"
                  placeholder="0"
                />
              ))}
            </div>
            <p className={Math.abs(soma - 100) > 0.005 ? "dica dica--alerta" : "dica"}>
              Somam {soma.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
              {Math.abs(soma - 100) > 0.005 ? ": deveria ser 100%." : "."}
            </p>
          </>
        )}
        {regra === "comum" && (
          <p className="dica">Segue a régua do uso comum do rateio, como a sobra da luz e da água.</p>
        )}
      </div>
    </>
  );
}

const curtoBR = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");

export default function PassoContas({ estado, acoes, indicePorId = {}, secao, abaInicial = null }) {
  const { mes, ano } = estado.periodo;
  const ciclos = ciclosDe(estado);

  // A conta aberta no fichário: uma aba por vez. `null` = fichário fechado.
  const [aba, setAba] = useState(abaInicial);
  // Os ids que existiam quando "+ Gás ou outras" foi tocado: o que aparecer
  // depois disso é a conta nova, e ela abre sozinha.
  const [antesDaNova, setAntesDaNova] = useState(null);

  const indefinido = temCicloInvalido(ciclos);
  const comCorte = corteValido(estado.corte);
  const doPeriodo = janelaDoFechamento(ciclos, estado.periodo, estado.corte);
  const longoDemais = distanciaEmDias(doPeriodo.de, doPeriodo.ate) > LIMITE_DO_PERIODO;

  const naTela = naOrdemDaTela(ciclos);
  const ligadas = naTela.filter(faturaAtiva);
  const cheio = ciclos.length >= MAXIMO_DE_CICLOS;

  const recemCriada = antesDaNova ? ciclos.find((c) => !antesDaNova.has(c.id)) : null;
  const abaAtiva = ligadas.find((c) => c.id === (recemCriada?.id ?? aba)) ?? null;

  const abrirAba = (id) => {
    setAntesDaNova(null);
    setAba(id);
  };

  const novaConta = () => {
    setAntesDaNova(new Set(ciclos.map((c) => c.id)));
    acoes.adicionarCiclo("", null);
  };

  const removerConta = (c) => {
    if (window.confirm(`Tirar "${c.nome || "esta conta"}" deste conjunto? Itens que saíam dela ficam sem conta.`)) {
      acoes.removerCiclo(c.id);
      if (abaAtiva?.id === c.id) abrirAba(null);
    }
  };

  // O fim do período de corte é o último dia contado; guardado, ele é o dia seguinte.
  const fimDoCorte = comCorte ? ultimoDiaDaJanela(doPeriodo) : null;
  const limites = limitesDoCorte(ciclos, estado.periodo);

  return (
    <div className="coluna">
      {mostra(secao, "faturas") && (
      <Ficha>
        <Titulo>
          Faturas cíclicas
          <AjudaContas />
        </Titulo>

        <p className="dica">
          Ligue as contas que este conjunto recebe e toque em editar para preencher
          cada uma. Dá para ter até {MAXIMO_DE_CICLOS} contas.
        </p>

        <div className="contas-chips">
          {naTela.map((c) => {
            const ligada = faturaAtiva(c);
            const aberta = abaAtiva?.id === c.id;
            return (
              <span className="conta-chip" key={c.id}>
                <button
                  type="button"
                  className={`botao botao--catalogo ${ligada ? "botao--ligado" : ""}`}
                  aria-pressed={ligada}
                  onClick={() => {
                    acoes.definirCiclo(c.id, "ativa", !ligada);
                    if (ligada && aberta) abrirAba(null);
                  }}
                >
                  <SimboloDoCiclo ciclo={c} tamanho={11} /> {c.nome || "Nova conta"}
                </button>
                {ligada && (
                  <button
                    type="button"
                    className="item-acao"
                    aria-expanded={aberta}
                    onClick={() => abrirAba(aberta ? null : c.id)}
                  >
                    {aberta ? "fechar" : "editar"}
                  </button>
                )}
                {/* Água e luz não saem, só desligam; as contas novas saem no x. */}
                {!ehDeFabrica(c) && (
                  <button
                    type="button"
                    className="item-acao item-acao--remover"
                    aria-label={`Remover ${c.nome || "a conta nova"}`}
                    title="Remover esta conta"
                    onClick={() => removerConta(c)}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
          <button type="button" className="botao botao--catalogo" disabled={cheio} onClick={novaConta}>
            + Gás ou outras
          </button>
        </div>

        {/* O fichário: uma aba por conta ligada, uma conta aberta por vez. */}
        {ligadas.length > 0 && (
          <div className="fichario">
            <div className="fichario__abas" role="tablist" aria-label="Contas ligadas">
              {ligadas.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={abaAtiva?.id === c.id}
                  className="fichario__aba"
                  onClick={() => abrirAba(abaAtiva?.id === c.id ? null : c.id)}
                >
                  <SimboloDoCiclo ciclo={c} tamanho={10} /> {c.nome || "Nova conta"}
                </button>
              ))}
            </div>
            {abaAtiva ? (
              <div className="fichario__folha" role="tabpanel">
                <BlocoDeFatura
                  key={abaAtiva.id}
                  fatura={abaAtiva}
                  periodo={estado.periodo}
                  moradores={estado.moradores}
                  indicePorId={indicePorId}
                  acoes={acoes}
                  aoFechar={() => abrirAba(null)}
                />
              </div>
            ) : (
              <p className="dica fichario__vazio">Toque numa aba para preencher a conta.</p>
            )}
          </div>
        )}
      </Ficha>
      )}

      {mostra(secao, "periodo") && (
      <Ficha>
        <Titulo>Período</Titulo>
        <p className="periodo-deduzido">
          {indefinido ? (
            <strong>Fechamento indefinido</strong>
          ) : (
            <>
              Fechamento de{" "}
              <strong>
                {MESES[mes - 1]} de {ano}
              </strong>
              {" · "}
              {curtoBR(doPeriodo.de)} a {curtoBR(ultimoDiaDaJanela(doPeriodo))},{" "}
              {diasDaJanela(doPeriodo, estado.periodo)} dias
            </>
          )}
        </p>

        <LinhaDoTempo estado={estado} comCorte={comCorte} aoMudarCorte={acoes.definirJanelaDeCorte} />

        <div className="grupo">
          <Rotulo>Período de corte</Rotulo>
          <Segmentado
            rotuloDoGrupo="Usar período de corte"
            opcoes={[
              { valor: "nao", texto: "sem corte" },
              { valor: "sim", texto: "com período de corte" },
            ]}
            valor={comCorte ? "sim" : "nao"}
            aoMudar={(v) => acoes.alternarCorte(v === "sim")}
          />
          {comCorte && (
            <div className="linha-campos">
              <CampoData
                rotulo="Início"
                valor={doPeriodo.de}
                min={limitesDeHoje(hojeISO()).min}
                aoMudar={(v) => v && v < somarDias(fimDoCorte, 1) && acoes.definirJanelaDeCorte({ de: v, ate: doPeriodo.ate })}
                etiqueta="Primeiro dia do período de corte"
              />
              <CampoData
                rotulo="Fim"
                valor={fimDoCorte}
                max={limitesDeHoje(hojeISO()).max}
                aoMudar={(v) => v && v >= doPeriodo.de && acoes.definirJanelaDeCorte({ de: doPeriodo.de, ate: somarDias(v, 1) })}
                etiqueta="Último dia do período de corte"
              />
            </div>
          )}
          {longoDemais && (
            <p className="dica dica--alerta">
              O período passa de {LIMITE_DO_PERIODO} dias. Confira se não há uma conta de outro mês ligada.
            </p>
          )}
          <p className="dica">
            {comCorte
              ? `O período de corte é o trecho analisado: digite o início e o fim, ou arraste as bolinhas da barra do período. O início vai até ${curtoBR(limites.de)} (30 dias antes do ciclo que começa primeiro) e o fim até ${curtoBR(ultimoDiaDaJanela(limites))} (30 dias depois do que termina por último). Cada conta entra no período em que cai a sua leitura final; o vencimento não muda isso.`
              : "Sem corte, o período vai do começo do ciclo que começa primeiro até o fim do que termina por último. Arrastar as bolinhas da barra do período liga o período de corte."}
          </p>
        </div>
      </Ficha>
      )}
    </div>
  );
}
