import { useRef } from "react";
import Icone from "../componentes/Icone.jsx";
import MarcaR from "../componentes/MarcaR.jsx";
import { Avatar, emBreve } from "../componentes/Interface.jsx";
import { AVISOS } from "../nucleo/perfil.js";

/** Perfil: o seu nome, os avisos e os dados deste navegador. */
export default function Perfil({ app }) {
  const { perfil, acoes, panorama, abrir } = app;
  const arquivo = useRef(null);

  const escolherArquivo = (evento) => {
    const escolhido = evento.target.files?.[0];
    if (!escolhido) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      const id = acoes.importar(String(leitor.result));
      if (!id) {
        window.alert("Não consegui ler esse arquivo como um conjunto da CEDER. O arquivo certo termina em .ceder.json e sai de Configurar conjunto → Baixar.");
        return;
      }
      abrir(id);
    };
    leitor.onerror = () => window.alert("Não consegui abrir esse arquivo. Tente baixá-lo de novo.");
    leitor.readAsText(escolhido);
    evento.target.value = "";
  };

  return (
    <div className="tela">
      <div className="perfil-topo">
        <MarcaR tamanho={44} titulo="CEDER" />
        <span className="sobrescrito sobrescrito--sem-margem">juntos dividimos justo</span>
      </div>
      <h1 className="titulo-tela titulo-tela--grande">Perfil</h1>

      <section className="cartao cartao--perfil">
        <Avatar nome={perfil.nome || "?"} indice={0} tamanho={64} />
        <label className="campo-novo campo-novo--cheio">
          <span className="rotulo">Seu nome</span>
          <input
            className="caixa caixa--texto"
            value={perfil.nome}
            onChange={(e) => acoes.definirNomeDoPerfil(e.target.value)}
            placeholder="Como o grupo te chama"
          />
          <span className="ajuda-campo">É por ele que o app acha “você” nos conjuntos e mostra o seu saldo.</span>
        </label>
      </section>

      <button type="button" className="linha-solta linha-solta--cartao" onClick={() => emBreve("Adicionar amigos")}>
        <span>
          <strong>Adicionar amigos</strong>
          <span>Convidar quem divide com você para ter conta no app</span>
        </span>
        <span className="selo-pilula selo-pilula--areia">em breve</span>
      </button>

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

      <h2 className="titulo-secao__texto titulo-secao__texto--solto">
        Seus <em>dados</em>
      </h2>
      <section className="cartao">
        <p className="texto-apoio texto-apoio--sem-margem">
          Os {panorama.length} {panorama.length === 1 ? "conjunto fica salvo" : "conjuntos ficam salvos"} neste navegador, e só nele.
          Limpar os dados do site ou trocar de aparelho apaga tudo. Para um conjunto que você não pode perder, use Configurar
          conjunto → Baixar e guarde o arquivo.
        </p>
        <button type="button" className="botao botao--fantasma botao--largo" onClick={() => arquivo.current?.click()}>
          <Icone nome="subir" tamanho={20} /> Trazer de um arquivo
        </button>
        <input type="file" accept=".json,application/json" ref={arquivo} onChange={escolherArquivo} style={{ display: "none" }} />
      </section>

      <p className="rodape-marca">CEDER | Finanças Coletivas</p>
    </div>
  );
}
