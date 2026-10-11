import { useRef, useState } from "react";
import { Botao, Ficha, Titulo } from "../componentes/index.js";
import { MESES } from "../nucleo/formato.js";
import { modoDe } from "../nucleo/modos.js";
import EscolhaDeModo, { RotuloDoModo } from "./EscolhaDeModo.jsx";

const mesEAno = (casa) =>
  casa.mes && casa.ano ? `${MESES[casa.mes - 1]} de ${casa.ano}` : "sem mês";

function quando(iso) {
  if (!iso) return "";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (!Number.isFinite(dias)) return "";
  if (dias <= 0) return "salva hoje";
  if (dias === 1) return "salva ontem";
  if (dias < 30) return `salva há ${dias} dias`;
  return `salva em ${new Date(iso).toLocaleDateString("pt-BR")}`;
}

function baixar(nome, texto) {
  try {
    const url = URL.createObjectURL(new Blob([texto], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${nome.replace(/[^\w\- ]+/g, "").trim() || "casa"}.ceder.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export default function PainelDeCasas({ casas, acoes }) {
  const [criando, setCriando] = useState(casas.length === 0);
  const arquivo = useRef(null);

  if (criando) {
    return (
      <EscolhaDeModo
        podeCancelar={casas.length > 0}
        aoCancelar={() => setCriando(false)}
        aoCriar={(nome, modo, pessoas) => {
          acoes.novaCasa(nome, modo, pessoas);
          setCriando(false);
        }}
      />
    );
  }

  // Os tipos já criados, do mais numeroso para o menos.
  const porTipo = Object.entries(
    casas.reduce((conta, c) => {
      const tipo = modoDe(c.modo).tipo;
      return { ...conta, [tipo]: (conta[tipo] ?? 0) + 1 };
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const exportar = (casa) => {
    const texto = acoes.exportar(casa.id);
    if (texto) baixar(casa.nome, texto);
  };

  const escolherArquivo = (evento) => {
    const escolhido = evento.target.files?.[0];
    if (!escolhido) return;

    const leitor = new FileReader();
    leitor.onload = () => {
      const id = acoes.importar(String(leitor.result));
      if (!id) window.alert("Não consegui ler esse arquivo como um conjunto da CEDER.");
    };
    leitor.readAsText(escolhido);
    evento.target.value = "";
  };

  return (
    <div className="coluna">
      <Ficha>
        <Titulo nota="Cada conjunto guarda o próprio fechamento. Abra um para continuar de onde parou.">
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

      <div className="lista-casas">
        {casas.map((casa) => {
          const modo = modoDe(casa.modo);

          return (
            <article className="casa-cartao" key={casa.id}>
              <header className="casa-cartao__topo">
                <h3 className="casa-cartao__nome">{casa.nome}</h3>
                <RotuloDoModo chave={casa.modo} />
              </header>

              <p className="casa-cartao__linha">
                {mesEAno(casa)} · {casa.pessoas}{" "}
                {casa.pessoas === 1 ? modo.palavras.pessoa : modo.palavras.pessoas}
              </p>
              <p className="casa-cartao__quando">{quando(casa.salvaEm)}</p>

              <div className="casa-cartao__acoes">
                <Botao aoClicar={() => acoes.abrirCasa(casa.id)}>Abrir</Botao>

                <Botao
                  tipo="fantasma"
                  aoClicar={() => {
                    const sugestao = `${casa.nome} — mês seguinte`;
                    const nome = window.prompt(
                      "Uma cópia com as mesmas pessoas e os mesmos itens, já no mês seguinte e com os valores em branco. Nome:",
                      sugestao,
                    );
                    if (nome !== null) acoes.duplicarParaOProximoMes(casa.id, nome.trim() || sugestao);
                  }}
                >
                  Próximo mês
                </Botao>

                <Botao tipo="fantasma" aoClicar={() => exportar(casa)}>
                  Baixar
                </Botao>

                <Botao
                  tipo="fantasma"
                  aoClicar={() => {
                    const nome = window.prompt("Novo nome para este conjunto:", casa.nome);
                    if (nome !== null) acoes.renomear(casa.id, nome);
                  }}
                >
                  Renomear
                </Botao>

                <Botao
                  tipo="fantasma"
                  aoClicar={() => {
                    const certeza = window.confirm(
                      `Apagar "${casa.nome}" deste navegador? Isso não tem volta. Se quiser guardar, use Baixar antes.`,
                    );
                    if (certeza) acoes.apagarCasa(casa.id);
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
