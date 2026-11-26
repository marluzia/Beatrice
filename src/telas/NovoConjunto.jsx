import { useState } from "react";
import Icone from "../componentes/Icone.jsx";
import IconeDoTipo from "../componentes/IconeDoTipo.jsx";
import { Avatar, emBreve } from "../componentes/Interface.jsx";
import { CabecalhoDaAba } from "../componentes/CabecalhoDoConjunto.jsx";
import { LISTA_DE_MODOS, modoDe, presetsDe, presetValido } from "../nucleo/modos.js";
import { hojeISO } from "../nucleo/resumo.js";
import { somarDias } from "../nucleo/calendario.js";
import { LISTA_DE_MOEDAS, MOEDA_PADRAO } from "../nucleo/moedas.js";

/** Um nome de exemplo por tipo, para o campo não nascer vazio de ideia. */
const EXEMPLO_DE_NOME = {
  evento: "Churrasco do sábado",
  temporada: "Viagem a Paraty",
  familia: "Lar Doce Lar",
  moradia: "República Girassol",
  multipro: "Chalé da Serra",
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
 * Criar um conjunto, em duas telas: que tipo (o evento vem marcado), e depois
 * nome, moeda e pessoas   e, na moradia, como dividir o uso comum.
 */
export default function NovoConjunto({ app, aoCancelar, aoCriar }) {
  const { perfil, acoes } = app;
  const [passo, setPasso] = useState("tipo");
  const [tipo, setTipo] = useState("evento");
  const [preset, setPreset] = useState(undefined);

  const [nome, setNome] = useState("");
  const [moeda, setMoeda] = useState(MOEDA_PADRAO);
  const [meuNome, setMeuNome] = useState(perfil?.nome ?? "");
  const [convidados, setConvidados] = useState([]);
  const [adicionando, setAdicionando] = useState(false);

  const modo = modoDe(tipo);
  const presetAtual = presetValido(tipo, preset);

  if (passo === "tipo") {
    return (
      <div className="tela tela--com-rodape">
        <CabecalhoDaAba titulo="Que tipo de conjunto?" aoVoltar={aoCancelar} />
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

        {tipo === "familia" && (
          <p className="nota-tipo">O uso comum começa dividido por igual. A régua para pesar os dias em casa fica no rateio.</p>
        )}
        {tipo === "multipro" && (
          <p className="nota-tipo">
            Calculadora completa: a régua do uso comum é livre a cada fechamento, e na agenda vocês escolhem marcar a estadia
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
    // A data do conjunto é a de hoje: ele nasce agora, e isso não se edita.
    // A temporada começa hoje com uma semana; o período se ajusta na aba Período.
    const hoje = hojeISO();
    aoCriar({
      nome: nome.trim() || EXEMPLO_DE_NOME[tipo] || modo.nome,
      modo: tipo,
      preset: presetAtual ?? undefined,
      voce: eu || "Você",
      convidados,
      moeda,
      desde: hoje,
      ate: tipo === "temporada" ? somarDias(hoje, 6) : null,
    });
  };

  const nomeDoTipo = modo.nome.toLowerCase();

  return (
    <div className="tela tela--com-rodape">
      <CabecalhoDaAba titulo={`Criar ${nomeDoTipo}`} aoVoltar={() => setPasso("tipo")} />

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
          <span className="rotulo">Moeda</span>
          <select
            className="caixa caixa--texto"
            value={moeda}
            onChange={(e) => setMoeda(e.target.value)}
            aria-label="Moeda do conjunto"
          >
            {LISTA_DE_MOEDAS.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.nome} ({m.simbolo})
              </option>
            ))}
          </select>
          <span className="ajuda-campo">
            Todos os valores do conjunto ficam nesta moeda. Ela não muda depois de criar.
            {tipo === "temporada" ? " O período da temporada se escolhe depois, na aba Período." : ""}
          </span>
        </label>

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

      {/* Na moradia, o jeito de dividir o uso comum fica no próprio formulário. */}
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


      <div className="rodape-fixo">
        <button type="button" className="botao botao--largo" onClick={criar}>
          Criar
        </button>
      </div>
    </div>
  );
}
