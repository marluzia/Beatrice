import { Component } from "react";

export default class BarreiraDeErro extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error("CDR quebrou:", erro, info?.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="folha">
        <div className="barreira">
          <h1 className="barreira__titulo">O CDR travou</h1>
          <p>
            Alguma coisa quebrou no meio do caminho, e o problema é meu, não
            seu. Nenhuma conta foi enviada para lugar nenhum.
          </p>
          <p>
            Recarregar costuma resolver. Se a tela travar de novo assim que
            abrir, o problema pode estar nos dados salvos neste navegador. Se limpar histórico,
            perde tudo.
          </p>
          <div className="barreira__acoes">
            <button
              type="button"
              className="botao"
              onClick={() => window.location.reload()}
            >
              Recarregar
            </button>
            <button
              type="button"
              className="botao botao--fantasma"
              onClick={() => {
                try {
                  window.localStorage.removeItem("cdr:casa");
                } catch {}
                window.location.reload();
              }}
            >
              Apagar os dados e recomeçar
            </button>
          </div>
          <p className="barreira__detalhe">
            {String(this.state.erro?.message ?? this.state.erro)}
          </p>
        </div>
      </div>
    );
  }
}
