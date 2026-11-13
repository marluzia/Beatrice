import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import IconeDoTipo from "../componentes/IconeDoTipo.jsx";
import { Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { nomeDeArquivo } from "../nucleo/arquivo.js";
import EscolhaDePreset from "../passos/EscolhaDePreset.jsx";
import PassoItens from "../passos/PassoItens.jsx";
import { presetDe, presetsDe } from "../nucleo/modos.js";
import { janelaDoFechamento, limitesDeHoje, ultimoDiaDaJanela } from "../nucleo/calendario.js";
import { hojeISO, nomeDe } from "../nucleo/resumo.js";

/** As duas partes de Configurar: o que é o conjunto e o que nele consome kWh ou m³. */
function AlternadorDeParte({ valor, aoMudar }) {
  const partes = [
    { valor: "dados", nome: "Dados gerais", ilustracao: <IconeDoTipo tipo="dadosGerais" tamanho={56} /> },
    { valor: "itens", nome: "Itens", ilustracao: <IconeDoTipo tipo="itens" tamanho={56} /> },
  ];
  return (
    <div className="alternador-ilustrado" role="tablist" aria-label="Parte da configuração">
      {partes.map(({ valor: v, nome, ilustracao }) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={valor === v}
          className={`alternador-ilustrado__opcao ${valor === v ? "alternador-ilustrado__opcao--ativa" : ""}`}
          onClick={() => aoMudar(v)}
        >
          {ilustracao}
          <span>{nome}</span>
        </button>
      ))}
    </div>
  );
}

function baixar(nome, texto) {
  try {
    const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${nomeDeArquivo(nome)}.ceder.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    /* sem download neste navegador */
  }
}

/** Configurar conjunto: nome, descrição, data, tipo, uso comum, você, e as ações do conjunto. */
export default function Configurar({ app, rota }) {
  const { estado, resultado, indicePorId, modo, acoes, idDoConjunto, nomeDoConjunto, eu, voltar, abrir } = app;
  const preset = presetDe(estado);
  const presets = presetsDe(estado.modo);
  // Evento e temporada não têm faturas, então não têm itens que saem delas.
  const comItens = modo.faturas !== false;
  const [parte, setParte] = useState(comItens && rota?.parte === "itens" ? "itens" : "dados");
  const temporada = modo.chave === "temporada";
  const janela = temporada ? janelaDoFechamento(estado.ciclos, estado.periodo, estado.corte) : null;
  const fimDaTemporada = janela ? ultimoDiaDaJanela(janela) : null;
  const limites = limitesDeHoje(hojeISO());

  return (
    <div className="tela">
      <TopoDaTela aoVoltar={voltar} />
      <Sobrescrito>{nomeDoConjunto}</Sobrescrito>
      <h1 className="titulo-tela titulo-tela--grande">
        Configurar <em>conjunto</em>
      </h1>

      {comItens && <AlternadorDeParte valor={parte} aoMudar={setParte} />}

      {parte === "itens" ? (
        <>
          <p className="texto-apoio">
            Itens e aparelhos que consomem kWh ou m³ e saem das faturas: geladeira, máquina de lavar, ar-condicionado,
            chuveiro.
            {modo.equipamentos
              ? " E os equipamentos que não saem de fatura nenhuma, como embarcações, jet ski e gerador, com custo por hora ou por uso."
              : ""}{" "}
            São eles que recebem os registros de uso.
          </p>
          <div className="embutido">
            <PassoItens
              estado={estado}
              resultado={resultado}
              indicePorId={indicePorId}
              modo={modo}
              acoes={acoes}
              secao="aparelhos"
            />
          </div>
        </>
      ) : (
      <>
      <div className="formulario">
        <label className="campo-novo">
          <span className="rotulo">Nome</span>
          <input
            className="caixa caixa--texto"
            defaultValue={nomeDoConjunto}
            onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== nomeDoConjunto && acoes.renomear(idDoConjunto, e.target.value)}
          />
        </label>
        <label className="campo-novo">
          <span className="rotulo">Descrição (opcional)</span>
          <textarea
            className="caixa caixa--texto caixa--area"
            rows={2}
            value={estado.descricao ?? ""}
            onChange={(e) => acoes.definirCampoDoConjunto("descricao", e.target.value)}
          />
        </label>
        {temporada ? (
          <div className="campo-novo">
            <span className="rotulo">Período</span>
            <div className="linha-campos linha-campos--duas">
              <input
                className="caixa caixa--texto"
                type="date"
                aria-label="Início da temporada"
                value={janela.de}
                min={limites.min}
                max={limites.max}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && v >= limites.min && v <= limites.max)
                    acoes.definirPeriodoDaTemporada(v, v > fimDaTemporada ? v : fimDaTemporada);
                }}
              />
              <input
                className="caixa caixa--texto"
                type="date"
                aria-label="Fim da temporada"
                value={fimDaTemporada}
                min={janela.de}
                max={limites.max}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && v >= janela.de && v <= limites.max) acoes.definirPeriodoDaTemporada(janela.de, v);
                }}
              />
            </div>
            <span className="ajuda-campo">As estadias marcadas dentro do período pesam nas divisões por dias e por presença.</span>
          </div>
        ) : (
          <label className="campo-novo">
            <span className="rotulo">Data</span>
            <input
              className="caixa caixa--texto"
              type="date"
              value={estado.desde ?? ""}
              onChange={(e) => acoes.definirCampoDoConjunto("desde", e.target.value || null)}
            />
          </label>
        )}
        <label className="campo-novo">
          <span className="rotulo">Quem é você aqui</span>
          <select className="caixa caixa--texto" value={eu ?? ""} onChange={(e) => acoes.definirVoce(e.target.value)}>
            <option value="">Ninguém (só organizo)</option>
            {estado.moradores.map((m) => (
              <option key={m.id} value={m.id}>
                {nomeDe(estado, m.id)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h2 className="titulo-secao__texto titulo-secao__texto--solto">Tipo</h2>
      <section className="cartao cartao--tipo">
        <IconeDoTipo tipo={estado.modo} tamanho={56} />
        <span>
          <strong>{modo.nome}</strong>
          <span>{modo.descricao}</span>
        </span>
      </section>
      <p className="nota-tipo">O tipo fica como foi criado.{presets.length > 0 ? " Aqui só muda o jeito de dividir o uso comum." : ""}</p>
      {presets.length > 0 && (
        <>
          <h2 className="titulo-secao__texto titulo-secao__texto--solto">Como dividir o uso comum</h2>
          <p className="texto-apoio">Vale para todos os fechamentos. Trocar pode desfazer a escolha de quem cede.</p>
          <EscolhaDePreset modo={estado.modo} valor={preset?.chave} aoMudar={acoes.definirPreset} />
        </>
      )}
      {modo.marcacaoEscolhida && (
        <>
          <h2 className="titulo-secao__texto titulo-secao__texto--solto">
            No calendário, <em>marcar</em>
          </h2>
          <p className="texto-apoio">Trocar converte o que já foi marcado: os dias de cada um continuam os mesmos.</p>
          <div className="cartao-lista" role="radiogroup" aria-label="O que o calendário marca">
            {[
              { valor: "presenca", nome: "Estadia", texto: "Marca-se quem esteve. Quem não marcou nenhum dia conta zero." },
              { valor: "ausencia", nome: "Dias fora", texto: "Marca-se quem saiu. Quem não marcou nada esteve o período inteiro." },
            ].map((o) => {
              const ativo = modo.presenca === o.valor;
              return (
                <button
                  key={o.valor}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  className="opcao-radio"
                  onClick={() => acoes.definirMarcacao(o.valor)}
                >
                  <span className={`radio ${ativo ? "radio--ativo" : ""}`} aria-hidden="true" />
                  <span className="opcao-radio__textos">
                    <span className="opcao-radio__nome">{o.nome}</span>
                    <span>{o.texto}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
      {(estado.modo === "familia" || estado.modo === "multipro" || preset?.chave === "livre") && (
        <p className="nota-tipo">A régua do uso comum (por igual ↔ por dias) fica no rateio, em Fechar contas.</p>
      )}

      <h2 className="titulo-secao__texto titulo-secao__texto--solto">Ações</h2>
      <div className="cartao-lista">
        {modo.faturas !== false && (
        <button
          type="button"
          className="linha-solta"
          onClick={() => {
            const sugestao = `${nomeDoConjunto}   mês seguinte`;
            const nome = window.prompt(
              "Uma cópia com as mesmas pessoas e os mesmos itens, já no mês seguinte e com os valores em branco. Nome:",
              sugestao,
            );
            if (nome !== null) {
              const novo = acoes.duplicarParaOProximoMes(idDoConjunto, nome.trim() || sugestao);
              if (novo) abrir(novo);
            }
          }}
        >
          <span>
            <strong>Próximo mês</strong>
            <span>Abre o fechamento seguinte com as mesmas pessoas e itens</span>
          </span>
          <Icone nome="seta" tamanho={18} />
        </button>
        )}
        <button
          type="button"
          className="linha-solta"
          onClick={() => {
            const texto = acoes.exportar(idDoConjunto);
            if (texto) baixar(nomeDoConjunto, texto);
          }}
        >
          <span>
            <strong>Baixar</strong>
            <span>Um arquivo .ceder.json para guardar ou abrir noutro aparelho</span>
          </span>
          <Icone nome="baixar" tamanho={18} />
        </button>
        <button
          type="button"
          className="linha-solta"
          onClick={() => {
            if (window.confirm(`Isso zera "${nomeDoConjunto}" e começa do zero, mantendo o tipo, as pessoas e os lembretes. Continuar?`)) acoes.recomecar();
          }}
        >
          <span>
            <strong>Zerar este conjunto</strong>
            <span>Apaga valores, contas e usos; mantém quem é quem</span>
          </span>
          <Icone nome="atualizar" tamanho={18} />
        </button>
        <button
          type="button"
          className="linha-solta linha-solta--perigo"
          onClick={() => {
            if (window.confirm(`Apagar "${nomeDoConjunto}" deste navegador? Isso não tem volta. Se quiser guardar, use Baixar antes.`)) {
              acoes.apagarConjunto(idDoConjunto);
            }
          }}
        >
          <span>
            <strong>Apagar conjunto</strong>
            <span>Some deste navegador, sem volta</span>
          </span>
          <Icone nome="lixo" tamanho={18} />
        </button>
      </div>
      </>
      )}
    </div>
  );
}
