import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

const clicar = (texto) => fireEvent.click(screen.getByText(texto));

/** Pelo "+" da barra de baixo: "O que vamos criar?" → Novo conjunto. */
const comecarACriar = () => {
  fireEvent.click(screen.getByRole("button", { name: "Criar" }));
  clicar("Novo conjunto");
};

/** Cria um conjunto do tipo pedido e cai no painel dele. */
const criar = (tipo = "Moradia compartilhada", botao = "Criar república") => {
  const montado = render(<App />);
  comecarACriar();
  clicar(tipo);
  clicar("Continuar");
  clicar(botao);
  return montado;
};

const abrirRepublica = () => criar();

/** Do painel do conjunto para o Fechar contas. */
const fecharContas = () => clicar("Fechar contas");

/** Um passo do Fechar contas, pela linha de etapas (o texto do botão termina no nome). */
const irPara = (nome) => {
  const alvo = screen
    .getAllByRole("button")
    .find((b) => b.textContent?.trim().endsWith(nome) && b.closest(".etapas"));
  if (!alvo) throw new Error(`Não achei o passo "${nome}"`);
  fireEvent.click(alvo);
};

/** O botão da direita no rodapé do Fechar contas (Continuar, com o nome do que vem). */
const continuar = (container) => fireEvent.click(container.querySelector(".rodape-fixo .botao:last-child"));
const voltarNoAssistente = (container) => fireEvent.click(container.querySelector(".rodape-fixo .botao:first-child"));

/** Liga a luz e abre a edição dela, onde ficam as datas de leitura. */
const editarLuz = () => {
  fireEvent.click(screen.getByRole("button", { name: /Luz$/ }));
  fireEvent.click(screen.getByText("editar"));
};

describe("a aplicação abre", () => {
  it("monta e mostra a marca", () => {
    render(<App />);
    expect(screen.getByText("CEDER")).toBeTruthy();
  });

  it("abre no Início, com o meu saldo e as ações rápidas", () => {
    render(<App />);
    expect(screen.getByText("Meu saldo")).toBeTruthy();
    expect(screen.getByText("Cobrar")).toBeTruthy();
    expect(screen.getByText("Entrar em conjunto")).toBeTruthy();
  });

  it("Cobrar e Entrar em conjunto avisam que ainda não existem", () => {
    render(<App />);
    clicar("Cobrar");
    expect(screen.getByText(/Cobrar: em breve/)).toBeTruthy();
    clicar("Entrar em conjunto");
    expect(screen.getByText(/Entrar em conjunto: em breve/)).toBeTruthy();
  });

  it("as abas de baixo trocam de tela", () => {
    render(<App />);
    fireEvent.click(screen.getAllByText("Conjuntos")[0]);
    expect(screen.getByPlaceholderText("Buscar conjunto")).toBeTruthy();
    fireEvent.click(screen.getByText("Perfil"));
    expect(screen.getByText("Seu nome")).toBeTruthy();
  });
});

describe("criar um conjunto", () => {
  it("oferece os cinco tipos", () => {
    render(<App />);
    comecarACriar();
    for (const tipo of ["Evento", "Temporada", "Familiar", "Moradia compartilhada", "Multi"]) {
      expect(screen.getByText(tipo)).toBeTruthy();
    }
  });

  it("na moradia compartilhada, o uso comum tem quatro jeitos, e só a Livre não é grátis", () => {
    const { container } = render(<App />);
    comecarACriar();
    expect(screen.getByText("Comunal")).toBeTruthy();
    expect(screen.getByText("Temporal")).toBeTruthy();
    expect(screen.getByText("Livre")).toBeTruthy();
    const radios = [...container.querySelectorAll(".opcao-radio")];
    expect(radios).toHaveLength(4);
    expect(radios.filter((r) => r.querySelector(".selo-gratis"))).toHaveLength(3);
    fireEvent.click(screen.getByText("Livre"));
    clicar("Continuar");
    expect(screen.getByText("Moradia compartilhada · Livre")).toBeTruthy();
  });

  it("o evento não pergunta o uso comum", () => {
    render(<App />);
    comecarACriar();
    clicar("Evento");
    expect(screen.queryByText("Comunal")).toBeNull();
  });

  it("cai no painel do conjunto, com você e o tipo no topo", () => {
    abrirRepublica();
    expect(screen.getByText("Configurar conjunto")).toBeTruthy();
    // No cabeçalho, só o jeito do uso comum: Moderado, Comunal, Temporal ou Livre.
    expect(screen.getByText(/Moradia compartilhada · Moderado ·/)).toBeTruthy();
    expect(screen.queryByText(/República Moderada/)).toBeNull();
    expect(screen.getByText("Lançar despesas")).toBeTruthy();
  });

  it("convidado entra na divisão sem precisar de conta", () => {
    render(<App />);
    comecarACriar();
    clicar("Continuar");
    clicar("Adicionar pessoa");
    clicar("Convidado");
    fireEvent.change(screen.getByPlaceholderText("Nome do convidado"), { target: { value: "Bia" } });
    clicar("Adicionar");
    clicar("Criar república");
    clicar("Pessoas");
    expect(screen.getByText("Membros")).toBeTruthy();
    expect(screen.getByText("Bia")).toBeTruthy();
  });

  it("Link, QR code e Contato ainda não funcionam e dizem isso", () => {
    abrirRepublica();
    clicar("Pessoas");
    clicar("Link");
    expect(screen.getByText(/em breve/)).toBeTruthy();
  });

  it("o evento lança despesas avulsas, por categoria", () => {
    criar("Evento", "Criar evento");
    expect(screen.getByText("avulsas, por categoria")).toBeTruthy();
    expect(screen.queryByText("Registros")).toBeNull();
  });
});

describe("na Multi, o calendário marca estadia ou dias fora", () => {
  it("a escolha fica no calendário e em Configurar", () => {
    criar("Multi", "Criar espaço");
    clicar("Calendário");
    expect(screen.getByText("Marcar no calendário")).toBeTruthy();
    const naEscolha = (texto) => screen.getAllByText(texto).find((el) => el.closest(".marcacao-do-calendario"));
    expect(naEscolha("Estadia").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(naEscolha("Dias fora"));
    expect(naEscolha("Dias fora").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    clicar("Configurar conjunto");
    const dias = screen.getAllByText("Dias fora").find((el) => el.closest(".opcao-radio"));
    expect(dias.closest(".opcao-radio").getAttribute("aria-checked")).toBe("true");
  });

  it("a moradia compartilhada não oferece a escolha: marca sempre os dias fora", () => {
    abrirRepublica();
    clicar("Calendário");
    expect(screen.queryByText("Marcar no calendário")).toBeNull();
  });
});

describe("as telas do conjunto abrem", () => {
  it("despesas, saldos, calendário, lembretes e registros", () => {
    abrirRepublica();
    clicar("Lançar despesas");
    // O período saiu de Lançar despesas: fica na aba Período do painel.
    expect(screen.getByText(/fica no painel do conjunto, na aba Período/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));

    clicar("Ver saldos");
    expect(screen.getByText(/Soma das partes/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));

    clicar("Calendário");
    expect(screen.getAllByText(/\+ Lançar no dia \d+/).length).toBeGreaterThan(0);
    // A legenda começa oculta e abre pelo botão.
    expect(screen.queryByText("Ocultar legenda")).toBeNull();
    clicar("Mostrar legenda");
    expect(screen.getByText("Ocultar legenda")).toBeTruthy();
    expect(screen.queryByText(/Tarefa/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));

    clicar("Lembretes");
    expect(screen.getByText("+ Novo lembrete")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));

    clicar("Registros");
    expect(screen.getByText(/Usos de itens e aparelhos/)).toBeTruthy();
  });

  it("um lembrete novo vira uma nota no conjunto", () => {
    abrirRepublica();
    clicar("Lembretes");
    clicar("+ Novo lembrete");
    clicar("Nota");
    expect(screen.getByPlaceholderText(/senha do wi-fi/)).toBeTruthy();
  });
});

describe("Fechar contas percorre os cinco passos", () => {
  it("cada passo renderiza sem estourar", () => {
    abrirRepublica();
    fecharContas();
    expect(screen.getAllByText(/quem mora aqui/i).length).toBeGreaterThan(0);

    irPara("Contas");
    expect(screen.getAllByText(/^Faturas/i).length).toBeGreaterThan(0);

    irPara("Itens");
    expect(screen.getAllByText(/o que o conjunto gasta/i).length).toBeGreaterThan(0);

    irPara("Rateio");
    expect(screen.getAllByText(/quanto cada um deve/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText("Acerto").find((b) => b.closest(".subetapas")));
    expect(screen.getAllByText(/quem transfere/i).length).toBeGreaterThan(0);
  });

  it("a mensagem de coleta é montada sem erro", () => {
    abrirRepublica();
    fecharContas();
    irPara("Itens");
    fireEvent.click(screen.getAllByText("Juntar os dados").find((b) => b.closest(".subetapas")));
    expect(screen.getAllByText(/Fechamento de/).length).toBeGreaterThan(0);
  });

  it("nas contas, Continuar vai das faturas para o período e depois para os itens", () => {
    const { container } = abrirRepublica();
    fecharContas();
    irPara("Contas");
    expect(screen.queryByText("Período de corte")).toBeNull();

    continuar(container);
    expect(screen.getByText("Período de corte")).toBeTruthy();
    expect(screen.queryByText(/\+ Gás ou outras/)).toBeNull();

    continuar(container);
    expect(screen.getAllByText("Sai do ciclo de faturas").length).toBeGreaterThan(0);
  });

  it("Voltar de uma etapa cai na última seção da anterior", () => {
    const { container } = abrirRepublica();
    fecharContas();
    irPara("Itens");
    voltarNoAssistente(container);
    expect(screen.getByText("Período de corte")).toBeTruthy();
  });

  it("nos itens, o que sai da fatura e o que não sai ficam um de cada vez", () => {
    const { container } = abrirRepublica();
    fecharContas();
    irPara("Itens");
    expect(screen.getAllByText("Sai do ciclo de faturas").length).toBeGreaterThan(0);
    expect(screen.queryByText("Independente do ciclo de faturas")).toBeNull();

    continuar(container);
    expect(screen.getAllByText("Independente do ciclo de faturas").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sai do ciclo de faturas")).toBeNull();
  });

  it("cada passo tem pelo menos um painel de ajuda", () => {
    const { container } = abrirRepublica();
    fecharContas();
    for (const passo of ["Pessoas", "Contas", "Itens", "Rateio"]) {
      irPara(passo);
      expect(container.querySelectorAll("details.ajuda").length, `passo ${passo} ficou sem ajuda`).toBeGreaterThan(0);
    }
  });
});

describe("as contas seguram os passos depois delas", () => {
  const digitar = (indice, texto) => {
    const campos = screen.getAllByPlaceholderText("dd/mm/aaaa");
    fireEvent.change(campos[indice], { target: { value: texto } });
  };

  const nasContas = () => {
    abrirRepublica();
    fecharContas();
    irPara("Contas");
    editarLuz();
  };

  it("com tudo em branco, dá para seguir", () => {
    abrirRepublica();
    fecharContas();
    irPara("Itens");
    expect(screen.getAllByText(/o que o conjunto gasta/i).length).toBeGreaterThan(0);
  });

  it("com meia data escrita, a navegação trava e diz o que falta", () => {
    nasContas();
    digitar(0, "25/07/2026");

    expect(screen.getByText(/resolva o período das faturas/i)).toBeTruthy();
    expect(screen.getByText(/data final/i)).toBeTruthy();

    irPara("Itens");
    expect(screen.getAllByText(/^Faturas/i).length).toBeGreaterThan(0);
  });

  it("completar o ciclo libera a navegação", () => {
    nasContas();
    digitar(0, "25/07/2026");
    digitar(1, "21/08/2026");

    expect(screen.queryByText(/resolva o período das faturas/i)).toBeNull();
    irPara("Itens");
    expect(screen.getAllByText(/o que o conjunto gasta/i).length).toBeGreaterThan(0);
  });

  it("apagar a data de volta destrava", () => {
    nasContas();
    digitar(0, "25/07/2026");
    expect(screen.getByText(/resolva o período das faturas/i)).toBeTruthy();

    digitar(0, "");
    expect(screen.queryByText(/resolva o período das faturas/i)).toBeNull();
  });
});

const temBarra = () => document.querySelector(".barra-inferior") !== null;

describe("despesas: lançar e ver", () => {
  it("Lançar despesas não tem recentes; a avulsa vem antes da cíclica e criar fica embaixo", () => {
    abrirRepublica();
    expect(screen.getByText("avulsas e cíclicas")).toBeTruthy();
    // Ver despesas é uma linha do painel, logo abaixo de Lançar despesas.
    const linhas = [...document.querySelectorAll(".linha-menu strong")].map((el) => el.textContent);
    expect(linhas.indexOf("Ver despesas")).toBe(linhas.indexOf("Lançar despesas") + 1);

    clicar("Lançar despesas");
    expect(temBarra()).toBe(true);
    expect(screen.queryByText(/Lançamentos/)).toBeNull();
    expect(screen.queryByText("Ver despesas")).toBeNull();

    // Os botões de criar ficam no rodapé, Avulsa primeiro.
    const rodape = [...document.querySelectorAll(".rodape-fixo .botao")].map((b) => b.textContent);
    expect(rodape).toEqual(["+ Avulsa", "+ Cíclica"]);
    const titulos = [...document.querySelectorAll("h2")].map((h) => h.textContent);
    expect(titulos.findIndex((t) => /avulsas/.test(t))).toBeLessThan(titulos.findIndex((t) => /cíclicas/.test(t)));

    clicar("+ Avulsa");
    expect(temBarra()).toBe(false);
  });

  it("Ver despesas tem busca, filtro por tipo e o status de cada uma", () => {
    abrirRepublica();
    clicar("Lançar despesas");
    clicar("+ Avulsa");
    fireEvent.click(document.querySelector(".botao--catalogo"));
    clicar("Pronto");
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    clicar("Ver despesas");

    const busca = screen.getByPlaceholderText("Buscar despesa");
    for (const chip of ["Todas", "Avulsas", "Cíclicas", "Registradas"]) expect(screen.getByText(chip)).toBeTruthy();

    clicar("Cíclicas");
    expect(document.querySelector(".tipo-despesa--avulsa")).toBeNull();
    clicar("Avulsas");
    expect(document.querySelectorAll(".tipo-despesa--avulsa").length).toBeGreaterThan(0);
    expect(document.querySelector(".tipo-despesa--ciclica")).toBeNull();
    // Ninguém pagou ainda: aberta.
    expect(document.querySelector(".status-despesa").textContent).toBe("aberta");

    fireEvent.change(busca, { target: { value: "zzz-nada" } });
    expect(screen.getByText("Nenhuma despesa com essa busca.")).toBeTruthy();
    // A busca ignora maiúsculas e acentos.
    fireEvent.change(busca, { target: { value: "GAS" } });
    const achados = [...document.querySelectorAll(".linha-despesa > span:first-child > strong")].map((el) => el.textContent);
    expect(achados.length).toBeGreaterThan(0);
    expect(achados.every((t) => /gás/i.test(t))).toBe(true);
  });
});

describe("o painel: período, anel e histórico", () => {
  it("o período fica na aba Despesas | Pessoas | Período", () => {
    abrirRepublica();
    const abas = [...document.querySelectorAll("[role='tab']")].map((a) => a.textContent);
    expect(abas).toEqual(["Despesas", "Pessoas", "Período"]);
    fireEvent.click(screen.getByRole("tab", { name: "Período" }));
    expect(screen.getByText("Período do fechamento")).toBeTruthy();
    expect(screen.getByText(/O início não vai antes de/)).toBeTruthy();
  });

  it("o evento não tem período", () => {
    criar("Evento", "Criar evento");
    const abas = [...document.querySelectorAll("[role='tab']")].map((a) => a.textContent);
    expect(abas).toEqual(["Despesas", "Pessoas"]);
  });

  it("o histórico filtra despesas, lembretes e registros, e as despesas por status", () => {
    criar("Evento", "Criar evento");
    clicar("Lançar despesas");
    clicar("+ Despesa");
    fireEvent.click(document.querySelectorAll(".botao--catalogo")[0]);
    clicar("Pronto");
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    fireEvent.click(screen.getByRole("button", { name: "Histórico" }));

    for (const chip of ["Tudo", "Despesas", "Lembretes", "Registros"]) expect(screen.getByText(chip)).toBeTruthy();
    clicar("Despesas");
    for (const chip of ["Abertas", "A vencer", "Atrasadas", "Pagas"]) expect(screen.getByText(chip)).toBeTruthy();
    expect(document.querySelectorAll(".linha-historia").length).toBe(1);
    clicar("Pagas");
    expect(document.querySelectorAll(".linha-historia").length).toBe(0);
    clicar("Abertas");
    expect(document.querySelectorAll(".linha-historia").length).toBe(1);
    clicar("Lembretes");
    expect(screen.getByText("Nada deste tipo ainda.")).toBeTruthy();
  });
});

describe("conjuntos que nascem limpos e não mudam de tipo", () => {
  it("o evento nasce sem nenhuma despesa e sem trocar para temporada", () => {
    criar("Evento", "Criar evento");
    clicar("Lançar despesas");
    expect(screen.queryByText("Outra despesa")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    clicar("Configurar conjunto");
    expect(screen.queryByText(/Virar temporada|Mudar para temporada|É uma temporada/)).toBeNull();
    expect(screen.getByText(/O tipo fica como foi criado/)).toBeTruthy();
    // Evento não tem itens de fatura: sem Dados gerais | Itens.
    expect(screen.queryByText("Dados gerais")).toBeNull();
  });

  it("a temporada tem período, na aba Período e em Configurar", () => {
    render(<App />);
    comecarACriar();
    clicar("Temporada");
    clicar("Continuar");
    expect(document.querySelector('[aria-label="Início da temporada"]')).toBeTruthy();
    expect(document.querySelector('[aria-label="Fim da temporada"]')).toBeTruthy();
    clicar("Criar temporada");
    clicar("Lançar despesas");
    expect(screen.queryByText("Outra despesa")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    fireEvent.click(screen.getByRole("tab", { name: "Período" }));
    expect(screen.getByText("Período da temporada")).toBeTruthy();
    expect(screen.getByText(/As estadias marcadas no calendário dentro deste período/)).toBeTruthy();
    clicar("Configurar conjunto");
    expect(document.querySelector('[aria-label="Início da temporada"]')).toBeTruthy();
  });
});

describe("Configurar conjunto: Dados gerais e Itens", () => {
  it("na moradia, Itens é onde ficam os aparelhos que geram registros", () => {
    abrirRepublica();
    clicar("Configurar conjunto");
    expect(temBarra()).toBe(false);
    const dados = screen.getByRole("tab", { name: "Dados gerais" });
    expect(dados.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Nome")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Itens" }));
    expect(screen.getByRole("tab", { name: "Itens" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getAllByText(/o que o conjunto gasta/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Nome")).toBeNull();
  });

  it("Registros sem aparelhos leva direto para Configurar → Itens", () => {
    abrirRepublica();
    clicar("Registros");
    clicar("Cadastrar itens");
    expect(screen.getByRole("tab", { name: "Itens" }).getAttribute("aria-selected")).toBe("true");
  });
});

describe("o painel do conjunto", () => {
  it("Recente mostra a última atividade e 'mostrar mais' leva ao histórico", () => {
    criar("Evento", "Criar evento");
    expect(document.querySelector(".recente")).toBeNull();
    clicar("Lançar despesas");
    clicar("+ Despesa");
    const categorias = document.querySelectorAll(".botao--catalogo");
    fireEvent.click(categorias[0]);
    expect(document.querySelector(".recente")).toBeNull();
    fireEvent.click(categorias[1]);
    clicar("Pronto");
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));

    expect(document.querySelectorAll(".recente .faixa-aviso").length).toBe(1);
    clicar("mostrar mais");
    expect(screen.getByText(/Notificações|Histórico/)).toBeTruthy();
  });

  it("o botão ao lado do info compartilha o conjunto por link ou QR Code", async () => {
    abrirRepublica();
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar conjunto" }));
    expect(screen.getByRole("dialog", { name: "Compartilhar conjunto" })).toBeTruthy();
    await waitFor(() => expect(document.querySelector(".link-gerado__texto").textContent).toMatch(/#conjunto=z/));
    fireEvent.click(screen.getByRole("tab", { name: "QR Code" }));
    expect(document.querySelector("svg.qr")).toBeTruthy();
  });

  it("um link de conjunto abre a cópia que veio nele", async () => {
    abrirRepublica();
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar conjunto" }));
    await waitFor(() => expect(document.querySelector(".link-gerado__texto").textContent).toMatch(/#conjunto=z/));
    const link = document.querySelector(".link-gerado__texto").textContent;
    cleanup();
    window.localStorage.clear();

    window.history.replaceState(null, "", link.slice(link.indexOf("#")));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Conjunto aberto pelo link/)).toBeTruthy());
    expect(window.location.hash).toBe("");
    expect(screen.getByText("Configurar conjunto")).toBeTruthy();
  });
});

describe("Início: Hoje mostra os atrasos", () => {
  it("tem o filtro Atrasos e a conta vencida sem pagamento aparece nele", () => {
    abrirRepublica();
    const [ficha] = JSON.parse(window.localStorage.getItem("ceder:conjuntos")).conjuntos;
    cleanup();
    const chave = `ceder:conjunto:${ficha.id}`;
    const salvo = JSON.parse(window.localStorage.getItem(chave));
    const estado = salvo.estado ?? salvo;
    const luz = estado.ciclos.find((c) => c.id === "luz");
    luz.ativa = true;
    luz.vencimento = "2020-01-10";
    luz.pagoPor = null;
    window.localStorage.setItem(chave, JSON.stringify(salvo));

    render(<App />);
    expect(screen.getByText(/^Atrasos/)).toBeTruthy();
    clicar(screen.getByText(/^Atrasos/).textContent);
    expect(screen.getAllByText(/atrasada/).length).toBeGreaterThan(0);
    expect(screen.getByText(/venceu 10\/01/)).toBeTruthy();
  });
});

describe("antes do período e equipamentos", () => {
  /** Mexe no conjunto salvo e abre o app de novo, já nele. */
  const mexerNoSalvo = (mudar) => {
    const [ficha] = JSON.parse(window.localStorage.getItem("ceder:conjuntos")).conjuntos;
    cleanup();
    const chave = `ceder:conjunto:${ficha.id}`;
    const salvo = JSON.parse(window.localStorage.getItem(chave));
    mudar(salvo.estado ?? salvo);
    window.localStorage.setItem(chave, JSON.stringify(salvo));
    render(<App />);
    fireEvent.click(screen.getAllByText(ficha.nome)[0]);
  };

  it("a despesa em aberto de antes do período ganha a escolha de entrar na conta", () => {
    render(<App />);
    comecarACriar();
    clicar("Temporada");
    clicar("Continuar");
    clicar("Criar temporada");
    mexerNoSalvo((e) => {
      const de = e.corte.de;
      const antes = new Date(`${de}T12:00:00Z`);
      antes.setUTCDate(antes.getUTCDate() - 5);
      e.itens.push({
        id: "sinal",
        nome: "Sinal da casa",
        especie: "reais",
        valor: "300",
        rateio: "igual",
        participantes: e.moradores.map((m) => m.id),
        data: antes.toISOString().slice(0, 10),
        pagoPor: null,
      });
    });

    const total = () => document.querySelector(".valor-anel").textContent;
    expect(total()).toBe("R$ 300,00");
    fireEvent.click(screen.getByRole("tab", { name: "Período" }));
    const escolha = screen.getByRole("combobox", { name: "Sinal da casa entra na conta?" });
    expect(escolha.value).toBe("sim");
    fireEvent.change(escolha, { target: { value: "nao" } });
    expect(screen.getByRole("combobox", { name: "Sinal da casa entra na conta?" }).value).toBe("nao");
    expect(total()).toBe("R$ 0,00");
  });

  it("na Multi, Configurar → Itens cadastra embarcação e equipamento; na moradia, não", () => {
    criar("Multi", "Criar espaço");
    clicar("Configurar conjunto");
    fireEvent.click(screen.getByRole("tab", { name: "Itens" }));
    expect(screen.getByText("Equipamentos fora das faturas")).toBeTruthy();
    clicar("+ Embarcação");
    const grupo = [...document.querySelectorAll(".grupo-catalogo")].find((g) =>
      g.textContent.includes("Equipamentos fora das faturas"),
    );
    fireEvent.click(grupo.querySelector(".item-acao"));
    expect(screen.getByText("Cada hora custa")).toBeTruthy();
    cleanup();
    window.localStorage.clear();

    abrirRepublica();
    clicar("Configurar conjunto");
    fireEvent.click(screen.getByRole("tab", { name: "Itens" }));
    expect(screen.queryByText("Equipamentos fora das faturas")).toBeNull();
  });
});
