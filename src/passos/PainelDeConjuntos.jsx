import { useRef, useState } from "react";
import { Botao, Ficha, Titulo } from "../componentes/index.js";
import { MESES } from "../nucleo/formato.js";
import { modoDe } from "../nucleo/modos.js";
import EscolhaDeModo, { RotuloDoModo } from "./EscolhaDeModo.jsx";

const mesEAno = (conjunto) =>
  conjunto.mes && conjunto.ano ? `${MESES[conjunto.mes - 1]} de ${conjunto.ano}` : "sem mês";

function quando(iso) {
  if (!iso) return "";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (!Number.isFinite(dias)) return "";
  if (dias <= 0) return "salva hoje";
  if (dias === 1) return "salva ontem";
  if (dias < 30) return `salva há ${dias} dias`;
  return `salva em ${new Date(iso).toLocaleDateString("pt-BR")}`;
}

/**
 * O nome do conjunto virando nome de arquivo.
 *
 * Tira só o que sistema de arquivos recusa   `\ / : * ? " < > |` e caracteres
 * de controle   e preserva o resto. A primeira versão usava `[^\w\- ]`, e `\w`
 * em JavaScript é ASCII puro: "República da Serra" virava "Repblica da Serra"
 * e "Edifício Açaí" virava "Edifcio Aa". Num produto brasileiro, onde o
 * arquivo vai anexado num e-mail para o cliente, isso é o nome da conjunto dele
 * chegando quebrado.
 */
export function nomeDeArquivo(nome) {
  return (
    String(nome ?? "")
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "conjunto"
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
    return true;
  } catch {
    return false;
  }
}

export default function PainelDeConjuntos({ conjuntos, acoes }) {
  // O painel abre sempre na lista, mesmo vazia: criar é um botão dele.
  const [criando, setCriando] = useState(false);
  const arquivo = useRef(null);

  if (criando) {
    return (
      <EscolhaDeModo
        podeCancelar={conjuntos.length > 0}
        aoCancelar={() => setCriando(false)}
        aoCriar={(nome, modo, pessoas, preset) => {
          acoes.novoConjunto(nome, modo, pessoas, preset);
          setCriando(false);
        }}
      />
    );
  }

  // Os tipos já criados, do mais numeroso para o menos.
  const porTipo = Object.entries(
    conjuntos.reduce((conta, c) => {
      const tipo = modoDe(c.modo).tipo;
      return { ...conta, [tipo]: (conta[tipo] ?? 0) + 1 };
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const exportar = (conjunto) => {
    const texto = acoes.exportar(conjunto.id);
    if (texto) baixar(conjunto.nome, texto);
  };

  const escolherArquivo = (evento) => {
    const escolhido = evento.target.files?.[0];
    if (!escolhido) return;

    const leitor = new FileReader();

    leitor.onload = () => {
      const id = acoes.importar(String(leitor.result));

      if (!id) {
        window.alert(
          "Não consegui ler esse arquivo como um conjunto da CEDER. " +
            "O arquivo certo termina em .ceder.json e sai do botão Baixar.",
        );
        return;
      }

      // Abre o que acabou de chegar. Sem isso o painel só ganhava mais uma
      // linha em silêncio, e quem importou não sabia se tinha dado certo nem
      // qual das linhas era a nova   ainda mais com dois arquivos de nome
      // parecido.
      acoes.abrirConjunto(id);
    };

    leitor.onerror = () =>
      window.alert("Não consegui abrir esse arquivo. Tente baixá-lo de novo.");

    leitor.readAsText(escolhido);
    evento.target.value = "";
  };

  return (
    <div className="coluna">
      <Ficha>
        <Titulo nota="Cada conjunto envolve elementos a serem divididos. Crie um novo ou abra um antigo para continuar de onde parou.">
          Meus conjuntos
        </Titulo>

        <div className="linha-acoes">
          <Botao aoClicar={() => setCriando(true)}>Criar conjunto</Botao>
          <Botao tipo="fantasma" aoClicar={() => arquivo.current?.click()}>
            Trazer de um arquivo
          </Botao>
          <input
            type="file"
            accept=".json,application/json"
            ref={arquivo}
            onChange={escolherArquivo}
            style={{ display: "none" }}
          />
        </div>

        {/* Quais tipos de conjunto já existem aqui, e quantos de cada. */}
        {porTipo.length > 0 && (
          <div className="tipos-resumo">
            {porTipo.map(([tipo, quantos]) => (
              <span className="selo selo--modo" key={tipo}>
                {tipo} · {quantos}
              </span>
            ))}
          </div>
        )}
      </Ficha>

      <div className="lista-conjuntos">
        {conjuntos.map((conjunto) => {
          const modo = modoDe(conjunto.modo);

          return (
            <article className="conjunto-cartao" key={conjunto.id}>
              <header className="conjunto-cartao__topo">
                <h3 className="conjunto-cartao__nome">{conjunto.nome}</h3>
                <RotuloDoModo chave={conjunto.modo} />
              </header>

              <p className="conjunto-cartao__linha">
                {mesEAno(conjunto)} · {conjunto.pessoas}{" "}
                {conjunto.pessoas === 1 ? modo.palavras.pessoa : modo.palavras.pessoas}
              </p>
              <p className="conjunto-cartao__quando">{quando(conjunto.salvaEm)}</p>

              <div className="conjunto-cartao__acoes">
                <Botao aoClicar={() => acoes.abrirConjunto(conjunto.id)}>Abrir</Botao>

                <Botao
                  tipo="fantasma"
                  aoClicar={() => {
                    const sugestao = `${conjunto.nome}   mês seguinte`;
                    const nome = window.prompt(
                      "Uma cópia com as mesmas pessoas e os mesmos itens, já no mês seguinte e com os valores em branco. Nome:",
                      sugestao,
                    );
                    if (nome !== null) acoes.duplicarParaOProximoMes(conjunto.id, nome.trim() || sugestao);
                  }}
                >
                  Próximo mês
                </Botao>

                <Botao tipo="fantasma" aoClicar={() => exportar(conjunto)}>
                  Baixar
                </Botao>

                <Botao
                  tipo="fantasma"
                  aoClicar={() => {
                    const nome = window.prompt("Novo nome para este conjunto:", conjunto.nome);
                    if (nome !== null) acoes.renomear(conjunto.id, nome);
                  }}
                >
                  Renomear
                </Botao>

                <Botao
                  tipo="fantasma"
                  aoClicar={() => {
                    const certeza = window.confirm(
                      `Apagar "${conjunto.nome}" deste navegador? Isso não tem volta. Se quiser guardar, use Baixar antes.`,
                    );
                    if (certeza) acoes.apagarConjunto(conjunto.id);
                  }}
                >
                  Apagar
                </Botao>
              </div>
            </article>
          );
        })}
      </div>

      <Ficha>
        <p className="nota">
          Os conjuntos ficam salvos neste navegador, e só nele. Limpar os dados
          do site ou trocar de aparelho apaga todos. Para um conjunto que você
          não pode perder, use <strong>Baixar</strong> e guarde o arquivo.
        </p>
      </Ficha>
    </div>
  );
}
