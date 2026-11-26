import Icone from "../componentes/Icone.jsx";
import IconeDoTipo from "../componentes/IconeDoTipo.jsx";
import { useId, useState } from "react";
import { AbasDePasta, LinhaDeMenu, mostrarAviso, SetaComBarra } from "../componentes/Interface.jsx";
import { CabecalhoDaSecao, rotuloDaAba } from "../componentes/CabecalhoDoConjunto.jsx";
import { nomeDeArquivo } from "../nucleo/arquivo.js";
import EscolhaDePreset from "../passos/EscolhaDePreset.jsx";
import CaixaComLista from "../componentes/CaixaComLista.jsx";
import { GRUPO_DA_FATURA, GRUPO_DOS_EQUIPAMENTOS, itensPorGrupo } from "../nucleo/catalogo.js";
import { registrosDe } from "../nucleo/adaptador.js";
import { GRUPOS_DA_SECAO } from "../passos/secoes.js";
import { presetDe, presetsDe } from "../nucleo/modos.js";
import { nomeDaMoeda } from "../nucleo/moedas.js";
import { nomeDe } from "../nucleo/resumo.js";

/** "01/08/2026" */
const diaPorExtensoCurto = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const COMO_MEDE = {
  porUso: "por uso",
  porHora: "por hora",
  consumo: "consumo no mês",
  reais: "em dinheiro",
};

/** As duas fichas da seção Itens: o que sai das faturas e o que corre por fora delas. */
const FICHAS_DOS_ITENS = [
  {
    valor: "ciclicos",
    rotulo: "Cíclicos",
    grupo: GRUPO_DA_FATURA,
    sobre: "Saem das faturas de luz e água. Escolha o tipo e diga quanto ele gasta por hora, por uso ou no mês.",
    generico: "livre",
  },
  {
    valor: "avulsos",
    rotulo: "Avulsos",
    grupo: GRUPO_DOS_EQUIPAMENTOS,
    sobre: "Fora das faturas: quanto custa a hora ou cada uso, em dinheiro.",
    generico: "equipamento",
  },
];

const normal = (t) =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

/**
 * O tipo de item, num campo que é lista e também aceita texto, com Adicionar
 * ao lado. Um nome da lista adiciona aquele tipo; um nome novo vira um item
 * do tipo genérico da ficha (Outro aparelho, Equipamento) com esse nome.
 */
function AdicionarItem({ modelos, generico, grupo, aoAdicionar }) {
  const [texto, setTexto] = useState("");
  const lista = useId();
  const limpo = texto.trim();
  const adicionar = () => {
    if (!limpo) return;
    const igual = modelos.find((m) => normal(m.nome) === normal(limpo));
    if (igual) aoAdicionar(igual, null);
    else {
      const base = modelos.find((m) => m.chave === generico) ?? modelos[modelos.length - 1];
      aoAdicionar(base, limpo);
    }
    setTexto("");
  };
  return (
    <div className="adicionar-item">
      <label className="rotulo" htmlFor={`${lista}-campo`}>
        Tipo de item
      </label>
      <div className="adicionar-item__linha">
        <CaixaComLista
          id={`${lista}-campo`}
          opcoes={modelos.map((m) => m.nome)}
          valor={texto}
          aoMudar={setTexto}
          aoConfirmar={adicionar}
          placeholder="Escolha ou escreva"
          rotulo={`Tipo de item em ${grupo}`}
        />
        <button type="button" className="botao adicionar-item__botao" onClick={adicionar} disabled={!limpo}>
          Adicionar
        </button>
      </div>
    </div>
  );
}

/**
 * Os itens do conjunto, numa pasta Cíclicos | Avulsos. No topo de cada ficha,
 * os tipos de item para adicionar (geladeira, máquina, embarcação…); embaixo,
 * os que já existem, cada um abrindo a tela dele (Editar item). As horas e os
 * usos não se escrevem aqui: vêm dos registros.
 */
export function ItensDoConjunto({ app }) {
  const { estado, modo, acoes, ir } = app;
  const abrirItem = (id, novo = false) => ir("editarItem", { id, ...(novo ? { novo: true } : {}) });
  const grupos = itensPorGrupo(estado.itens, modo, true).filter((g) => GRUPOS_DA_SECAO.aparelhos.includes(g.grupo));
  const fichas = FICHAS_DOS_ITENS.filter((f) => grupos.some((g) => g.grupo === f.grupo));
  const [aba, setAba] = useState(fichas[0]?.valor ?? "ciclicos");
  const ficha = fichas.find((f) => f.valor === aba) ?? fichas[0];
  const g = grupos.find((x) => x.grupo === ficha?.grupo);
  if (!g) return null;

  return (
    <div className="itens-do-conjunto">
      <AbasDePasta opcoes={fichas} valor={ficha.valor} aoMudar={setAba} rotulo="Tipo de item">
        <section className="grupo-de-itens" aria-label={g.grupo}>
          <p className="texto-apoio texto-apoio--colado">{ficha.sobre}</p>
          <AdicionarItem
            key={ficha.valor}
            modelos={g.modelos}
            generico={ficha.generico}
            grupo={g.grupo}
            aoAdicionar={(modelo, nome) => {
              acoes.adicionarItem(modelo, nome ? { nome } : {});
              mostrarAviso(`${nome || modelo.nome} adicionado em ${ficha.rotulo}. Toque nele para configurar.`);
            }}
          />
          <h2 className="rotulo-secao rotulo-secao--na-pasta">{g.grupo}</h2>
          {g.itens.length > 0 ? (
            <div className="cartao-lista">
              {g.itens.map((i) => {
                const registros = registrosDe(i).length;
                return (
                  <LinhaDeMenu
                    key={i.id}
                    icone="registro"
                    titulo={i.nome?.trim() || "Item"}
                    subtitulo={[
                      COMO_MEDE[i.especie] ?? i.especie,
                      registros ? `${registros} ${registros === 1 ? "registro" : "registros"}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    aoClicar={() => abrirItem(i.id)}
                  />
                );
              })}
            </div>
          ) : (
            <p className="vazio-suave vazio-suave--na-pasta">Nenhum ainda. Escolha um tipo acima.</p>
          )}
        </section>
      </AbasDePasta>
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
export default function Configurar({ app }) {
  const { estado, modo, acoes, idDoConjunto, nomeDoConjunto, eu, voltar, abrir } = app;
  const preset = presetDe(estado);
  const presets = presetsDe(estado.modo);
  const temporada = modo.chave === "temporada";

  return (
    <div className="tela">
      <CabecalhoDaSecao app={app} secao="Configurar conjunto" />

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
        {/* Moeda e data nasceram com o conjunto: aparecem, mas não se editam. */}
        <div className="linha-campos linha-campos--duas">
          <div className="campo-novo">
            <span className="rotulo">Moeda</span>
            <span className="caixa caixa--texto caixa--fixa" aria-label="Moeda do conjunto">
              {nomeDaMoeda(estado.moeda)}
            </span>
          </div>
          <div className="campo-novo">
            <span className="rotulo">Criado em</span>
            <span className="caixa caixa--texto caixa--fixa" aria-label="Data de criação">
              {estado.desde ? diaPorExtensoCurto(estado.desde) : "—"}
            </span>
          </div>
        </div>
        <span className="ajuda-campo ajuda-campo--colada">
          A moeda e a data de criação vêm de quando o conjunto foi criado e não mudam.
          {temporada ? " O período da temporada fica no painel, na aba Período." : ""}
        </span>
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
            Na agenda, <em>marcar</em>
          </h2>
          <p className="texto-apoio">Trocar converte o que já foi marcado: os dias de cada um continuam os mesmos.</p>
          <div className="cartao-lista" role="radiogroup" aria-label="O que a agenda marca">
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
          <SetaComBarra />
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
    </div>
  );
}
