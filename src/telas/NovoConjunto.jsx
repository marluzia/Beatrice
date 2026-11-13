import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import IconeDoTipo from "../componentes/IconeDoTipo.jsx";
import { Avatar, emBreve, NomeComItalico, Sobrescrito, TopoDaTela } from "../componentes/Interface.jsx";
import { LISTA_DE_MODOS, modoDe, PRESETS_DA_REPUBLICA, presetsDe, presetValido } from "../nucleo/modos.js";
import { hojeISO } from "../nucleo/resumo.js";
import { limitesDeHoje, somarDias } from "../nucleo/calendario.js";

/** Um nome de exemplo por tipo, para o campo não nascer vazio de ideia. */
const EXEMPLO_DE_NOME = {
  evento: "Churrasco do sábado",
  temporada: "Viagem a Paraty",
  familia: "Lar Doce Lar",
  moradia: "República Girassol",
  multipro: "Chalé da Serra",
};

const EXEMPLO_DE_DESCRICAO = {
  evento: "Ex.: na casa da Bia, cada um leva uma coisa",
  temporada: "Ex.: casa alugada em Paraty, 10 dias",
  familia: "Ex.: o apartamento da Rua Augusta",
  moradia: "Ex.: casa da Rua das Flores, 4 quartos",
  multipro: "Ex.: chalé com 4 cotas, uso por temporada",
};

const NOTA_DA_DATA = {
  evento: "Quando é o evento.",
  temporada: "Quando a temporada começa. O calendário abre neste mês.",
};

/** As opções de "Adicionar pessoa": só Convidado funciona por enquanto. */
export function OpcoesDeAdicionar({ aoConvidar, escuro = false }) {
  const [convidando, setConvidando] = useState(false);
  const [nome, setNome] = useState("");

  const confirmar = () => {
    if (!nome.trim()) return;
    aoConvidar(nome.trim());
    setNome("");
  };

  return (
    <div className="adicionar-pessoa">
      <div className="adicionar-pessoa__opcoes">
        <button type="button" className={`opcao-pessoa ${escuro ? "opcao-pessoa--escura" : ""}`} onClick={() => emBreve("Convite por link")}>
          <Icone nome="link" tamanho={24} />
          <span>Link</span>
        </button>
        <button type="button" className="opcao-pessoa" onClick={() => emBreve("Convite por QR code")}>
          <Icone nome="qr" tamanho={24} />
          <span>QR code</span>
        </button>
        <button type="button" className="opcao-pessoa" onClick={() => emBreve("Adicionar amigos dos contatos")}>
          <Icone nome="contato" tamanho={24} />
          <span>Contato</span>
        </button>
        <button
          type="button"
          className={`opcao-pessoa ${convidando ? "opcao-pessoa--ativa" : ""}`}
          aria-pressed={convidando}
          onClick={() => setConvidando((v) => !v)}
        >
          <Icone nome="convidado" tamanho={24} />
          <span>Convidado</span>
        </button>
      </div>

      {convidando && (
        <div className="convidar">
          <input
            className="caixa caixa--texto"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmar();
            }}
            placeholder="Nome do convidado"
            aria-label="Nome do convidado"
            autoFocus
          />
          <button type="button" className="botao" onClick={confirmar} disabled={!nome.trim()}>
            Adicionar
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Criar um conjunto, em duas telas: que tipo (e, na república, como dividir o
 * uso comum), e depois nome, descrição, data e pessoas.
 */
export default function NovoConjunto({ app, aoCancelar, aoCriar }) {
  const { perfil, acoes } = app;
  const [passo, setPasso] = useState("tipo");
  const [tipo, setTipo] = useState("moradia");
  const [preset, setPreset] = useState(undefined);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [desde, setDesde] = useState(hojeISO());
  const limites = limitesDeHoje(hojeISO());
  const [ate, setAte] = useState(() => somarDias(hojeISO(), 6));
  const [meuNome, setMeuNome] = useState(perfil?.nome ?? "");
  const [convidados, setConvidados] = useState([]);
  const [adicionando, setAdicionando] = useState(false);

  const modo = modoDe(tipo);
  const presetAtual = presetValido(tipo, preset);
  const presetObj = presetAtual ? PRESETS_DA_REPUBLICA[presetAtual] : null;

  if (passo === "tipo") {
    return (
      <div className="tela tela--com-rodape">
        <TopoDaTela aoVoltar={aoCancelar} />
        <Sobrescrito>Novo conjunto</Sobrescrito>
        <h1 className="titulo-tela titulo-tela--grande">Que tipo de conjunto?</h1>
        <p className="texto-apoio">O tipo não muda o cálculo: muda com o que o conjunto abre e como as telas perguntam.</p>

        <div className="pilha" role="radiogroup" aria-label="Tipo de conjunto">
          {LISTA_DE_MODOS.map((m) => {
            const ativo = m.chave === tipo;
            return (
              <button
                key={m.chave}
                type="button"
                role="radio"
                aria-checked={ativo}
                className={`tipo-cartao ${ativo ? "tipo-cartao--ativo" : ""}`}
                onClick={() => {
                  setTipo(m.chave);
                  setPreset(undefined);
                }}
              >
                <IconeDoTipo tipo={m.chave} tamanho={60} />
                <span className="tipo-cartao__textos">
                  <span className="tipo-cartao__nome">
                    {m.nome}
                    {!m.pago && <span className="selo-gratis">grátis</span>}
                  </span>
                  <span className="tipo-cartao__exemplo">{m.exemplo}</span>
                  <span className="tipo-cartao__descricao">{m.descricao}</span>
                </span>
                <span className={`marcador ${ativo ? "marcador--ativo" : ""}`} aria-hidden="true">
                  {ativo && <Icone nome="check" tamanho={16} espessura={2.6} />}
                </span>
              </button>
            );
          })}
        </div>

        {presetsDe(tipo).length > 0 && (
          <>
            <h2 className="titulo-secao__texto titulo-secao__texto--solto">Como quer dividir o uso comum?</h2>
            <p className="texto-apoio">O uso comum é a parte das faturas que nenhum aparelho explica. Dá para trocar depois.</p>
            <div className="cartao-lista" role="radiogroup" aria-label="Como dividir o uso comum">
              {presetsDe(tipo).map((p) => {
                const ativo = p.chave === presetAtual;
                return (
                  <button
                    key={p.chave}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    className="opcao-radio"
                    onClick={() => setPreset(p.chave)}
                  >
                    <span className={`radio ${ativo ? "radio--ativo" : ""}`} aria-hidden="true" />
                    <span className="opcao-radio__textos">
                      <span className="opcao-radio__nome">
                        {p.curto}
                        {p.chave === modo.presetPadrao ? " · padrão" : ""}
                        {p.gratis && <span className="selo-gratis">grátis</span>}
                      </span>
                      <span>{p.resumo}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tipo === "familia" && (
          <p className="nota-tipo">O uso comum começa dividido por igual. A régua para pesar os dias em casa fica no rateio.</p>
        )}
        {tipo === "multipro" && (
          <p className="nota-tipo">
            Calculadora completa: a régua do uso comum é livre a cada fechamento, e no calendário vocês escolhem marcar a estadia
            de cada um ou os dias fora (dá para trocar depois).
          </p>
        )}

        <div className="rodape-fixo">
          <button type="button" className="botao botao--largo" onClick={() => setPasso("dados")}>
            Continuar
          </button>
        </div>
      </div>
    );
  }

  const criar = () => {
    const eu = meuNome.trim();
    if (eu && eu !== perfil?.nome) acoes.definirNomeDoPerfil(eu);
    aoCriar({
      nome: nome.trim() || EXEMPLO_DE_NOME[tipo] || modo.nome,
      modo: tipo,
      preset: presetAtual ?? undefined,
      voce: eu || "Você",
      convidados,
      descricao,
      desde,
      ate: tipo === "temporada" ? ate : null,
    });
  };

  const nomeDoTipo = modo.nome.toLowerCase();

  return (
    <div className="tela tela--com-rodape">
      <TopoDaTela aoVoltar={() => setPasso("tipo")} />
      <Sobrescrito partes={[modo.nome, presetObj?.curto]} />
      <h1 className="titulo-tela titulo-tela--grande">
        Criar <em>{nomeDoTipo}</em>
      </h1>

      <div className="formulario">
        <label className="campo-novo">
          <span className="rotulo">Nome</span>
          <input
            className="caixa caixa--texto"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={EXEMPLO_DE_NOME[tipo]}
          />
        </label>

        <label className="campo-novo">
          <span className="rotulo">Descrição (opcional)</span>
          <textarea
            className="caixa caixa--texto caixa--area"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={EXEMPLO_DE_DESCRICAO[tipo]}
            rows={3}
          />
        </label>

        {tipo === "temporada" ? (
          <div className="campo-novo">
            <span className="rotulo">Período</span>
            <div className="linha-campos linha-campos--duas">
              <label className="caixa-com-icone">
                <Icone nome="calendario" tamanho={22} />
                <input
                  className="caixa caixa--texto"
                  type="date"
                  aria-label="Início da temporada"
                  value={desde}
                  min={limites.min}
                  max={limites.max}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && (v < limites.min || v > limites.max)) return;
                    setDesde(v);
                    if (v && ate < v) setAte(v);
                  }}
                />
              </label>
              <label className="caixa-com-icone">
                <Icone nome="calendario" tamanho={22} />
                <input
                  className="caixa caixa--texto"
                  type="date"
                  aria-label="Fim da temporada"
                  value={ate}
                  min={desde}
                  max={limites.max}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && v > limites.max) return;
                    setAte(v);
                  }}
                />
              </label>
            </div>
            <span className="ajuda-campo">
              Do primeiro ao último dia; o início vai até 40 dias para trás e o fim, até 2 anos para a frente. No calendário, cada um marca os dias de estadia dentro deste período: são eles que
              dividem por dias e por presença.
            </span>
          </div>
        ) : (
          <label className="campo-novo">
            <span className="rotulo">Data</span>
            <span className="caixa-com-icone">
              <Icone nome="calendario" tamanho={22} />
              <input className="caixa caixa--texto" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </span>
            <span className="ajuda-campo">
              {NOTA_DA_DATA[tipo] ?? "Desde quando o conjunto existe. Os fechamentos contam a partir daqui."}
            </span>
          </label>
        )}

        {!perfil?.nome && (
          <label className="campo-novo">
            <span className="rotulo">Seu nome</span>
            <input
              className="caixa caixa--texto"
              value={meuNome}
              onChange={(e) => setMeuNome(e.target.value)}
              placeholder="Como o grupo te chama"
            />
          </label>
        )}

        <div className="campo-novo">
          <span className="rotulo">Pessoas · pode adicionar depois</span>
          <div className="fichas-de-pessoa">
            <span className="ficha-pessoa ficha-pessoa--eu">
              <Avatar nome={meuNome || "Você"} indice={0} tamanho={40} />
              {meuNome.trim() ? `${meuNome.trim()} (você)` : "Você"}
            </span>
            {convidados.map((c, i) => (
              <span className="ficha-pessoa" key={`${c}-${i}`}>
                <Avatar nome={c} indice={i + 1} tamanho={34} />
                {c}
                <button
                  type="button"
                  className="ficha-pessoa__tirar"
                  aria-label={`Tirar ${c}`}
                  onClick={() => setConvidados((l) => l.filter((_, j) => j !== i))}
                >
                  <Icone nome="x" tamanho={14} espessura={2.2} />
                </button>
              </span>
            ))}
            <button
              type="button"
              className="ficha-pessoa ficha-pessoa--adicionar"
              aria-expanded={adicionando}
              onClick={() => setAdicionando((v) => !v)}
            >
              <Icone nome="mais" tamanho={18} espessura={2} /> Adicionar pessoa
            </button>
          </div>
          {adicionando ? (
            <OpcoesDeAdicionar
              aoConvidar={(n) => {
                if (convidados.length + 1 >= modo.maximoDeMoradores) return;
                setConvidados((l) => [...l, n]);
              }}
            />
          ) : (
            <span className="ajuda-campo">Por link, QR code, contato ou como convidado.</span>
          )}
          {convidados.length + 1 >= modo.maximoDeMoradores && (
            <span className="ajuda-campo">Este tipo vai até {modo.maximoDeMoradores} pessoas.</span>
          )}
        </div>
      </div>

      <div className="rodape-fixo">
        <button type="button" className="botao botao--largo" onClick={criar}>
          Criar {modo.palavras.conjunto}
        </button>
      </div>
    </div>
  );
}
