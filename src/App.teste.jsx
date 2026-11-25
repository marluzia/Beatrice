import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { criarItem, modeloPorChave } from "./nucleo/catalogo.js";

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

/** Os três pontos do topo do conjunto, e uma das opções do menu. */
const noMenu = (opcao) => {
  fireEvent.click(screen.getByRole("button", { name: "Mais opções" }));
  fireEvent.click(screen.getByRole("menuitem", { name: opcao }));
};

/** Configurar conjunto mora nos três pontos do topo do conjunto. */
const configurar = () => noMenu("Configurar conjunto");

/** A seção Itens, na barra de baixo do conjunto. */
/** A seção Itens: na aba Registros do painel, abaixo de Ver registros (ou "Cadastrar itens", sem nenhum). */
const abrirItens = () => {
  fireEvent.click(screen.getByRole("tab", { name: "Registros" }));
  const linha = screen.queryByText("Itens", { selector: ".linha-menu strong" });
  fireEvent.click(linha ?? screen.getByText("Cadastrar itens"));
};

/** O campo de um rótulo no formulário clássico ("Valor", "Nome"). */
const campo = (rotulo) =>
  [...document.querySelectorAll("label.campo")].find((l) => l.textContent.trim().startsWith(rotulo))?.querySelector("input");

/** Lança uma avulsa à mão: Lançar despesas → Lançar manualmente → formulário → Lançar. */
const lancarAvulsa = (valor = "50", nome = null) => {
  clicar("Lançar despesas");
  clicar("Lançar manualmente");
  if (nome) fireEvent.change(campo("Nome"), { target: { value: nome } });
  fireEvent.change(campo("Valor"), { target: { value: valor } });
  fireEvent.click(document.querySelector(".rodape-fixo .botao"));
};

/** Sai do conjunto e volta ao Início do app. */
const sairParaOInicio = () => {
  voltarAoPainel();
  fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
  if (!screen.queryByRole("combobox", { name: "Moeda do saldo" })) fireEvent.click(screen.getAllByText("Início")[0]);
};

/** De volta ao painel do conjunto, depois de lançar. */
const voltarAoPainel = () => {
  while (!document.querySelector(".aneis")) fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
};

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
  it("monta e cumprimenta quem está usando", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: /^Olá/ })).toBeTruthy();
  });

  it("abre no Início, com o meu saldo e as ações rápidas", () => {
    render(<App />);
    // No lugar de "Meu saldo", a moeda do saldo.
    expect(screen.getByRole("combobox", { name: "Moeda do saldo" })).toBeTruthy();
    expect(screen.queryByText("Meu saldo")).toBeNull();
    expect(screen.queryByText("Conjuntos recentes")).toBeNull();
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
    expect(screen.queryByRole("button", { name: "Configurar conjunto" })).toBeNull();
    expect(screen.getByRole("button", { name: "Mais opções" })).toBeTruthy();
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
    configurar();
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
    // O período não fica em Lançar despesas: fica na aba Período do painel.
    expect(screen.getByText("Lançar manualmente")).toBeTruthy();
    expect(screen.queryByText("Período do fechamento")).toBeNull();
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

    // Lembretes é uma aba do painel no mesmo estilo de Despesas: Lançar e Ver.
    fireEvent.click(screen.getByRole("tab", { name: "Lembretes" }));
    expect(screen.getByText("Lançar lembretes")).toBeTruthy();
    expect(screen.getByText("Ver lembretes")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Registros" }));
    expect(screen.queryByText(/Usos de itens e aparelhos/)).toBeNull();
    expect(screen.getByText(/Cadastrar itens|Lançar registros/)).toBeTruthy();
  });

  it("Lançar lembretes: abas Lista | Nota, sucesso, e o lembrete aparece em Ver lembretes", () => {
    abrirRepublica();
    fireEvent.click(screen.getByRole("tab", { name: "Lembretes" }));
    clicar("Lançar lembretes");
    const abas = [...document.querySelectorAll(".pasta__aba")].map((el) => el.textContent);
    expect(abas).toEqual(["Lista", "Nota"]);
    expect(screen.queryByText(/^Sucesso/)).toBeNull();

    // Lista: nome e dois itens.
    fireEvent.change(screen.getByPlaceholderText("Mercado da semana"), { target: { value: "Feira" } });
    const novo = screen.getByPlaceholderText("Novo item");
    fireEvent.change(novo, { target: { value: "Tomate" } });
    fireEvent.click(screen.getByRole("button", { name: "Somar item" }));
    fireEvent.change(novo, { target: { value: "Alface" } });
    clicar("Lançar lista");
    expect(screen.getByText(/^Sucesso/)).toBeTruthy();
    expect(screen.getByPlaceholderText("Mercado da semana").value).toBe("");

    // Nota: sem texto não lança.
    fireEvent.click(screen.getByRole("tab", { name: "Nota" }));
    clicar("Lançar nota");
    expect(screen.getByText("Escreva a nota.")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/senha do wi-fi/), { target: { value: "Senha do wi-fi: ceder123" } });
    clicar("Lançar nota");

    fireEvent.click(screen.getByRole("button", { name: "Ver lembretes" }));
    expect(screen.getByRole("heading", { name: /Ver lembretes/ })).toBeTruthy();
    expect(screen.getByText("Feira")).toBeTruthy();
    expect(screen.getByText("Senha do wi-fi: ceder123")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Notas" }));
    expect(screen.queryByText("Feira")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Listas" }));
    expect(screen.getByText(/0 de 2 feitos/)).toBeTruthy();

    // Tocar dá Abrir ou Duplicar; Abrir mostra só aquele lançamento.
    fireEvent.click(screen.getByText("Feira"));
    expect(screen.getByRole("dialog", { name: "Opções de Feira" })).toBeTruthy();
    clicar("Abrir");
    expect(screen.getByRole("heading", { name: "Feira" })).toBeTruthy();
    expect(screen.getByText("Lançado por")).toBeTruthy();
    expect(screen.getByText("Lançado em")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
    // Riscar um item da lista é de qualquer um, sem entrar em edição.
    fireEvent.click(screen.getByRole("button", { name: "Tomate" }));
    expect(screen.getByRole("button", { name: "Tomate" }).getAttribute("aria-pressed")).toBe("true");
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
  it("Lançar despesas: pasta Avulsa | Cíclica, os três jeitos e nada do que já foi lançado", () => {
    abrirRepublica();
    expect(screen.getByText("avulsas e cíclicas")).toBeTruthy();
    // Ver despesas é uma linha do painel, logo abaixo de Lançar despesas.
    const linhas = [...document.querySelectorAll(".linha-menu strong")].map((el) => el.textContent);
    expect(linhas.indexOf("Ver despesas")).toBe(linhas.indexOf("Lançar despesas") + 1);

    clicar("Lançar despesas");
    expect(temBarra()).toBe(false);
    const abas = [...document.querySelectorAll(".pasta__aba")].map((el) => el.textContent);
    expect(abas).toEqual(["Avulsa", "Cíclica"]);
    for (const jeito of ["Importar arquivo", "Foto", "Lançar manualmente"]) expect(screen.getByText(jeito)).toBeTruthy();
    // Nada já lançado aparece aqui.
    expect(screen.queryByText("Faxina")).toBeNull();
    expect(screen.queryByText(/Despesas avulsas/)).toBeNull();

    clicar("Foto");
    expect(screen.getByText(/em breve/)).toBeTruthy();

    clicar("Lançar manualmente");
    expect(temBarra()).toBe(false);
    for (const rotulo of ["Categoria", "Quem pagou", "Valor", "Como divide", "Quem paga", "Quando foi"]) {
      expect(screen.getAllByText(rotulo).length).toBeGreaterThan(0);
    }
    // Sem valor, não lança.
    fireEvent.click(document.querySelector(".rodape-fixo .botao"));
    expect(screen.getByText("Escreva o valor da despesa.")).toBeTruthy();
    fireEvent.change(campo("Valor"), { target: { value: "42" } });
    fireEvent.click(document.querySelector(".rodape-fixo .botao"));
    expect(screen.getByText(/Sucesso\. Confira em/)).toBeTruthy();
    clicar("Ver despesas");
    expect(screen.getByText("Ver")).toBeTruthy();
  });

  it("a cíclica se lança pelo formulário da fatura", () => {
    abrirRepublica();
    clicar("Lançar despesas");
    fireEvent.click(screen.getByRole("tab", { name: "Cíclica" }));
    clicar("Lançar manualmente");
    expect(screen.getByRole("radio", { name: "Luz" })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Luz" }));
    fireEvent.change(campo("Energia elétrica"), { target: { value: "180" } });
    fireEvent.click(document.querySelector(".rodape-fixo .botao"));
    expect(screen.getByText(/Sucesso\. Confira em/)).toBeTruthy();
    voltarAoPainel();
    expect(document.querySelector(".valor-anel").textContent).toBe("R$ 180,00");
  });

  it("Ver despesas: busca, abas de pasta, status, e tocar abre Abrir ou Duplicar", () => {
    abrirRepublica();
    lancarAvulsa("60", "Pizza");
    voltarAoPainel();
    clicar("Ver despesas");

    const busca = screen.getByPlaceholderText("Buscar despesa");
    const abas = [...document.querySelectorAll(".pasta__aba")].map((el) => el.textContent);
    expect(abas).toEqual(["Todas", "Avulsas", "Cíclicas", "Registradas", "Abertas", "Pagas", "Atrasadas"]);

    // Pela situação: a Pizza foi paga, então está em Pagas e não em Abertas.
    clicar("Pagas");
    expect([...document.querySelectorAll(".linha-despesa")].some((l) => l.textContent.includes("Pizza"))).toBe(true);
    expect([...document.querySelectorAll(".status-despesa")].every((el) => el.textContent === "paga")).toBe(true);
    clicar("Abertas");
    expect([...document.querySelectorAll(".linha-despesa")].some((l) => l.textContent.includes("Pizza"))).toBe(false);
    clicar("Atrasadas");
    expect([...document.querySelectorAll(".status-despesa")].every((el) => el.textContent === "atrasada")).toBe(true);

    clicar("Cíclicas");
    expect(document.querySelector(".tipo-despesa--avulsa")).toBeNull();
    clicar("Avulsas");
    const status = [...document.querySelectorAll(".status-despesa")].map((el) => el.textContent);
    // A Pizza foi paga por você; as categorias de partida estão em aberto.
    expect(status).toContain("paga");
    expect(status).toContain("aberta");

    fireEvent.change(busca, { target: { value: "zzz-nada" } });
    expect(screen.getByText("Nenhuma despesa com essa busca.")).toBeTruthy();
    fireEvent.change(busca, { target: { value: "PIZ" } });
    expect(document.querySelectorAll(".linha-despesa").length).toBe(1);

    fireEvent.click(document.querySelector(".linha-despesa"));
    expect(screen.getByRole("dialog", { name: "Opções de Pizza" })).toBeTruthy();
    clicar("Duplicar");
    expect(document.querySelectorAll(".linha-despesa").length).toBe(2);
    fireEvent.click(document.querySelector(".linha-despesa"));
    clicar("Abrir");
    // Abrir mostra só o lançamento; editar é pelo lápis.
    expect(screen.getByRole("heading", { name: /Pizza/ })).toBeTruthy();
    expect(screen.getByText("Lançado por")).toBeTruthy();
    // O lápis abre Editar despesa, com o formulário de lançar já preenchido.
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("heading", { name: /Editar despesa/ })).toBeTruthy();
    expect(campo("Nome").value).toMatch(/Pizza/);
    expect(screen.queryByText(/o que o conjunto gasta/i)).toBeNull();
  });
});

describe("o painel: período, anel e histórico", () => {
  it("o painel tem as abas Despesas | Lembretes | Registros | Período", () => {
    abrirRepublica();
    const abas = [...document.querySelectorAll(".abas__aba")].map((a) => a.textContent);
    expect(abas).toEqual(["Despesas", "Lembretes", "Registros", "Período"]);
    fireEvent.click(screen.getByRole("tab", { name: "Período" }));
    expect(screen.getByText("Período do fechamento")).toBeTruthy();
    expect(screen.getByText(/O início não vai antes de/)).toBeTruthy();
  });

  it("o evento tem só Despesas e Lembretes; a temporada, mais Período", () => {
    criar("Evento", "Criar evento");
    expect([...document.querySelectorAll(".abas__aba")].map((a) => a.textContent)).toEqual(["Despesas", "Lembretes"]);
    cleanup();
    window.localStorage.clear();
    criar("Temporada", "Criar temporada");
    expect([...document.querySelectorAll(".abas__aba")].map((a) => a.textContent)).toEqual(["Despesas", "Lembretes", "Período"]);
  });

  it("o histórico filtra despesas, lembretes e registros, e as despesas por status", () => {
    criar("Evento", "Criar evento");
    lancarAvulsa("80");
    voltarAoPainel();
    noMenu("Histórico");

    for (const chip of ["Tudo", "Despesas", "Lembretes", "Registros"]) expect(screen.getByText(chip)).toBeTruthy();
    clicar("Despesas");
    for (const chip of ["Abertas", "A vencer", "Atrasadas", "Pagas"]) expect(screen.getByText(chip)).toBeTruthy();
    expect(document.querySelectorAll(".linha-historia").length).toBe(1);
    // Quem lança é quem pagou, a não ser que diga outra coisa: paga.
    clicar("Abertas");
    expect(document.querySelectorAll(".linha-historia").length).toBe(0);
    clicar("Pagas");
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
    configurar();
    expect(screen.queryByText(/Virar temporada|Mudar para temporada|É uma temporada/)).toBeNull();
    expect(screen.getByText(/O tipo fica como foi criado/)).toBeTruthy();
    // Evento não tem itens de fatura: a seção Itens fica apagada na barra.
    expect(screen.queryByText("Dados gerais")).toBeNull();
  });

  it("criar pede só Nome, Moeda e Pessoas; a temporada tem período na aba Período", () => {
    render(<App />);
    comecarACriar();
    clicar("Temporada");
    clicar("Continuar");
    expect(screen.getByRole("combobox", { name: "Moeda do conjunto" })).toBeTruthy();
    expect(document.querySelector('[aria-label="Início da temporada"]')).toBeNull();
    expect(screen.queryByText("Descrição (opcional)")).toBeNull();
    clicar("Criar temporada");
    clicar("Lançar despesas");
    expect(screen.queryByText("Outra despesa")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    fireEvent.click(screen.getByRole("tab", { name: "Período" }));
    expect(screen.getByText("Período da temporada")).toBeTruthy();
    expect(screen.getByText(/As estadias marcadas no calendário dentro deste período/)).toBeTruthy();
    configurar();
    // Moeda e data de criação aparecem, mas não se editam.
    expect(document.querySelector('[aria-label="Moeda do conjunto"]').textContent).toBe("Real (R$)");
    expect(document.querySelector('[aria-label="Moeda do conjunto"]').tagName).toBe("SPAN");
    expect(document.querySelector('[aria-label="Data de criação"]').textContent).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});

describe("Configurar conjunto e a seção Itens", () => {
  it("Configurar fica nos três pontos, sem engrenagem no topo, e o sino fica no canto direito", () => {
    abrirRepublica();
    const topo = document.querySelector(".topo-tela__acoes");
    const rotulos = [...topo.querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));
    expect(rotulos).toEqual(["Mais opções", "Notificações"]);
    configurar();
    expect(temBarra()).toBe(false);
    expect(screen.getByText("Nome")).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Itens" })).toBeNull();
    const ultimo = [...document.querySelectorAll(".topo-tela__acoes button")].at(-1);
    expect(ultimo.getAttribute("aria-label")).toBe("Notificações");
  });

  it("na moradia, Itens é onde ficam os aparelhos que geram registros", () => {
    abrirRepublica();
    abrirItens();
    expect(screen.getByRole("heading", { name: "Itens" })).toBeTruthy();
    // "O que o conjunto gasta" é só de Fechar contas: aqui, a lista dos itens.
    expect(screen.queryByText(/o que o conjunto gasta/i)).toBeNull();
    expect(screen.queryByText("Nome")).toBeNull();
    const maquinas = () => [...document.querySelectorAll(".linha-menu")].filter((l) => l.textContent.includes("Máquina de lavar"));
    const antes = maquinas().length;
    // O tipo de item é um campo que é lista e aceita texto, com Adicionar ao lado.
    const tipo = screen.getByRole("combobox", { name: /Tipo de item/ });
    fireEvent.change(tipo, { target: { value: "maquina de lavar" } });
    clicar("Adicionar");
    expect(maquinas().length).toBe(antes + 1);
    // Um nome que não está na lista vira um aparelho com esse nome.
    fireEvent.change(tipo, { target: { value: "Secadora" } });
    clicar("Adicionar");
    expect([...document.querySelectorAll(".linha-menu")].some((l) => l.textContent.includes("Secadora"))).toBe(true);
    fireEvent.click(maquinas()[0]);
    expect(screen.getByRole("heading", { name: /Editar item/ })).toBeTruthy();
    expect(document.querySelector('input[aria-label="Nome do item"]').value).toBe("Máquina de lavar");
  });

  it("Registros sem aparelhos leva direto para Itens", () => {
    abrirRepublica();
    clicar("Registros");
    clicar("Cadastrar itens");
    expect(screen.getByRole("heading", { name: "Itens" })).toBeTruthy();
  });
});

describe("o painel do conjunto", () => {
  it("Recente mostra a última atividade e 'mostrar mais' leva ao histórico", () => {
    criar("Evento", "Criar evento");
    expect(document.querySelector(".recente")).toBeNull();
    lancarAvulsa("30");
    fireEvent.change(campo("Valor"), { target: { value: "45" } });
    fireEvent.click(document.querySelector(".rodape-fixo .botao"));
    voltarAoPainel();

    expect(document.querySelectorAll(".recente .faixa-aviso").length).toBe(1);
    clicar("mostrar mais");
    expect(screen.getByText(/Notificações|Histórico/)).toBeTruthy();
  });

  it("os três pontos compartilham o conjunto por link ou QR Code", async () => {
    abrirRepublica();
    noMenu("Compartilhar");
    expect(screen.getByRole("dialog", { name: "Compartilhar conjunto" })).toBeTruthy();
    await waitFor(() => expect(document.querySelector(".link-gerado__texto").textContent).toMatch(/#conjunto=z/));
    fireEvent.click(screen.getByRole("tab", { name: "QR Code" }));
    expect(document.querySelector("svg.qr")).toBeTruthy();
  });

  it("um link de conjunto abre a cópia que veio nele", async () => {
    abrirRepublica();
    noMenu("Compartilhar");
    await waitFor(() => expect(document.querySelector(".link-gerado__texto").textContent).toMatch(/#conjunto=z/));
    const link = document.querySelector(".link-gerado__texto").textContent;
    cleanup();
    window.localStorage.clear();

    window.history.replaceState(null, "", link.slice(link.indexOf("#")));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Conjunto aberto pelo link/)).toBeTruthy());
    expect(window.location.hash).toBe("");
    expect(screen.getByRole("button", { name: "Configurar conjunto" })).toBeTruthy();
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
    fireEvent.click(screen.getAllByText("Conjuntos")[0]);
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

  it("na Multi, Itens cadastra embarcação e equipamento; na moradia, não", () => {
    criar("Multi", "Criar espaço");
    abrirItens();
    fireEvent.click(screen.getByRole("tab", { name: "Avulsos" }));
    expect(screen.getByText("Equipamentos fora das faturas")).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: /Tipo de item/ }), { target: { value: "Embarcação" } });
    clicar("Adicionar");
    fireEvent.click([...document.querySelectorAll(".linha-menu")].find((l) => l.textContent.includes("Embarcação")));
    // O item abre já ajustando: a unidade de consumo vem primeiro, e cada
    // unidade ligada (mês, dia, hora, uso) tem o seu preço.
    expect(screen.getByText("Cada hora custa")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "por dia" }));
    expect(screen.getByText("Cada dia custa")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "por hora" }));
    expect(screen.queryByText("Cada hora custa")).toBeNull();
    // O item é só a caracterização: quem pagou, como divide e quem paga ficam em Lançar registros.
    for (const secao of ["Quem pagou", "Como divide", "Quem paga"]) expect(screen.queryByText(secao)).toBeNull();
    cleanup();
    window.localStorage.clear();

    abrirRepublica();
    abrirItens();
    expect(screen.queryByText("Equipamentos fora das faturas")).toBeNull();
    expect(screen.queryByRole("tab", { name: "Avulsos" })).toBeNull();
  });
});

describe("a moeda do conjunto", () => {
  it("um conjunto em dólar escreve tudo em US$, e o Início soma por moeda", () => {
    render(<App />);
    comecarACriar();
    clicar("Evento");
    clicar("Continuar");
    fireEvent.change(screen.getByRole("combobox", { name: "Moeda do conjunto" }), { target: { value: "USD" } });
    clicar("Criar evento");
    expect(document.querySelector(".valor-anel").textContent).toBe("US$ 0,00");
    expect(screen.getByText(/· USD/)).toBeTruthy();

    lancarAvulsa("90");
    expect(screen.getAllByText(/US\$/).length).toBeGreaterThan(0);
    // A tecla "valor" do Como divide também escreve na moeda do conjunto.
    expect(screen.getByRole("radio", { name: "valor" }).textContent).toContain("US$");
    voltarAoPainel();
    expect(document.querySelector(".valor-anel").textContent).toBe("US$ 90,00");
    configurar();
    expect(document.querySelector('[aria-label="Moeda do conjunto"]').textContent).toBe("Dólar americano (US$)");

    // No Início, o saldo é de uma moeda por vez.
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    sairParaOInicio();
    const seletor = screen.getByRole("combobox", { name: "Moeda do saldo" });
    expect([...seletor.options].map((o) => o.value)).toEqual(["USD"]);
  });
});

describe("a busca geral do Início", () => {
  it("acha conjuntos, despesas, itens, lembretes e pessoas, e abre o conjunto", () => {
    abrirRepublica();
    lancarAvulsa("33", "Pão de queijo");
    voltarAoPainel();
    sairParaOInicio();

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    const abas = [...document.querySelectorAll(".pasta__aba")].map((el) => el.textContent);
    expect(abas).toEqual(["Conjuntos", "Despesas", "Itens", "Lembretes", "Pessoas"]);
    fireEvent.change(screen.getByPlaceholderText("Buscar em todos os conjuntos"), { target: { value: "queijo" } });
    fireEvent.click(screen.getByRole("tab", { name: /Despesas/ }));
    expect(screen.getByText("Pão de queijo")).toBeTruthy();
    fireEvent.click(screen.getByText("Pão de queijo"));
    // Fora de "Ver", tocar num lançamento mostra só ele.
    expect(screen.getByRole("heading", { name: "Pão de queijo" })).toBeTruthy();
    expect(screen.getByText("Lançado em")).toBeTruthy();
  });
});

describe("a barra de baixo do conjunto", () => {
  const barraDoConjunto = () => document.querySelector(".barra-do-conjunto");

  it("no painel, a barra tem Início, Calendário, Análise e Pessoas, e não há mais os botões de antes", () => {
    abrirRepublica();
    const secoes = [...barraDoConjunto().querySelectorAll("button")].map((b) => b.textContent);
    expect(secoes).toEqual(["Início", "Calendário", "Análise", "Pessoas"]);
    expect(document.querySelector(".ladrilhos")).toBeNull();

    fireEvent.click(within(barraDoConjunto()).getByText("Pessoas"));
    expect(screen.getByText("Adicionar pessoa")).toBeTruthy();
    expect(barraDoConjunto()).toBeTruthy();
    fireEvent.click(within(barraDoConjunto()).getByText("Análise"));
    expect(screen.getByRole("heading", { name: "Análise" })).toBeTruthy();
    fireEvent.click(within(barraDoConjunto()).getByText("Início"));
    expect(document.querySelector(".aneis")).toBeTruthy();
    fireEvent.click(within(barraDoConjunto()).getByText("Calendário"));
    expect(screen.getByText("Mostrar legenda")).toBeTruthy();
    // Das seções da barra, voltar leva ao painel.
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(document.querySelector(".aneis")).toBeTruthy();
  });

  it("Lançar despesas, Ver despesas e Ver saldos não têm barra nenhuma", () => {
    abrirRepublica();
    for (const linha of ["Lançar despesas", "Ver despesas", "Ver saldos"]) {
      clicar(linha);
      expect(document.querySelector(".barra-inferior")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    }
  });

  it("o evento não tem calendário: a barra avisa", () => {
    criar("Evento", "Criar evento");
    fireEvent.click(within(barraDoConjunto()).getByText("Calendário"));
    expect(screen.getByText(/Evento não conta dias/)).toBeTruthy();
  });

  it("o novo registro do + abre Lançar registros", () => {
    abrirRepublica();
    sairParaOInicio();
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    clicar("Novo registro");
    expect(screen.getByRole("heading", { name: /Lançar registros/ })).toBeTruthy();
  });
});

describe("um lançamento sozinho: quem lançou, quando, editar e duplicar", () => {
  /** Muda o conjunto salvo e reabre o app nele (como se outra pessoa tivesse mexido). */
  const mexer = (mudar) => {
    // Sair do conjunto grava o que ainda estava para ser salvo.
    sairParaOInicio();
    const [ficha] = JSON.parse(window.localStorage.getItem("ceder:conjuntos")).conjuntos;
    cleanup();
    const chave = `ceder:conjunto:${ficha.id}`;
    const salvo = JSON.parse(window.localStorage.getItem(chave));
    mudar(salvo.estado ?? salvo);
    window.localStorage.setItem(chave, JSON.stringify(salvo));
    render(<App />);
    fireEvent.click(screen.getAllByText("Conjuntos")[0]);
    fireEvent.click(screen.getAllByText(ficha.nome)[0]);
  };

  it("o Recente do painel abre a despesa sozinha, com quem lançou e quando", () => {
    abrirRepublica();
    lancarAvulsa("45", "Padaria");
    voltarAoPainel();
    fireEvent.click(document.querySelector(".faixa-aviso"));
    expect(screen.getByRole("heading", { name: "Padaria" })).toBeTruthy();
    expect(screen.getByText("Lançado por")).toBeTruthy();
    expect(screen.getByText("Lançado em")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Duplicar" })).toBeTruthy();
  });

  it("sem direito de editar não há lápis; duplicar faz um lançamento de quem duplicou", () => {
    abrirRepublica();
    lancarAvulsa("80", "Botijão");
    voltarAoPainel();
    mexer((e) => {
      // O conjunto novo só tem "Você": entra a Bia, que lançou o gás e é admin.
      e.moradores.push({ ...e.moradores[0], id: "m-bia", nome: "Bia", convidado: false });
      const [eu, outro] = e.moradores;
      eu.nome = "Ana";
      e.voce = eu.id;
      e.admin = outro.id;
      const gas = e.itens.find((i) => i.nome === "Botijão");
      gas.lancadoPor = outro.id;
      gas.lancadoEm = "2026-11-20T15:00:00.000Z";
    });
    clicar("Ver despesas");
    fireEvent.change(screen.getByPlaceholderText("Buscar despesa"), { target: { value: "Botijão" } });
    fireEvent.click(document.querySelector(".linha-despesa"));
    clicar("Abrir");
    expect(screen.getByText("Bia")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(screen.getByText(/pode editar/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Duplicar" }));
    expect(screen.getByText("Ana (você)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar" })).toBeTruthy();
  });

  it("o Histórico abre o lembrete sozinho; duplicar a lista copia sem nada riscado", () => {
    abrirRepublica();
    fireEvent.click(screen.getByRole("tab", { name: "Lembretes" }));
    clicar("Lançar lembretes");
    fireEvent.change(screen.getByPlaceholderText("Mercado da semana"), { target: { value: "Viagem" } });
    fireEvent.change(screen.getByPlaceholderText("Novo item"), { target: { value: "Toalha" } });
    clicar("Lançar lista");
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    noMenu("Histórico");
    fireEvent.click(screen.getByRole("tab", { name: "Lembretes" }));
    fireEvent.click(document.querySelector(".pasta__conteudo button"));
    expect(screen.getByRole("heading", { name: "Viagem" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Toalha" }));
    fireEvent.click(screen.getByRole("button", { name: "Duplicar" }));
    expect(screen.getByText(/A cópia é um lançamento seu/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Toalha" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("um registro de uso abre sozinho, edita ali mesmo e duplica com a data de hoje", () => {
    abrirRepublica();
    mexer((e) => {
      const hoje = new Date().toISOString().slice(0, 10);
      const maquina = { ...criarItem(modeloPorChave("maquina"), e.moradores.map((m) => m.id)), id: "maquina", nome: "Máquina de lavar" };
      maquina.registrosDeUso = [
        { id: "uso-1", data: "2026-11-02", quantidade: 1, participantes: [e.moradores[0].id], lancadoPor: e.moradores[0].id, lancadoEm: `${hoje}T09:00:00.000Z` },
      ];
      e.itens.push(maquina);
    });
    clicar("Ver despesas");
    fireEvent.click(screen.getByRole("tab", { name: "Registradas" }));
    fireEvent.click(document.querySelector(".linha-despesa"));
    clicar("Abrir");
    expect(screen.getByRole("heading", { name: "Máquina de lavar" })).toBeTruthy();
    expect(screen.getByText("Quem usou")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("heading", { name: /Editar registro/ })).toBeTruthy();
    expect(screen.getByText("Apagar este registro")).toBeTruthy();
    fireEvent.change(campo("Quantas vezes"), { target: { value: "3" } });
    clicar("Salvar edição");
    expect(screen.getByText("3 lavagens")).toBeTruthy();
    expect(screen.getByText("1 edição")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Duplicar" }));
    expect(screen.getByText(/A cópia é um lançamento seu/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Máquina de lavar" })).toBeTruthy();
  });

  it("Ver lembretes começa vazio e leva a Lançar lembretes", () => {
    abrirRepublica();
    fireEvent.click(screen.getByRole("tab", { name: "Lembretes" }));
    clicar("Ver lembretes");
    expect(screen.getByText("Nenhum lembrete lançado ainda.")).toBeTruthy();
    clicar("+ Lançar lembrete");
    expect(screen.getByRole("heading", { name: /Lançar lembretes/ })).toBeTruthy();
    expect(document.querySelector(".barra-inferior")).toBeNull();
  });

  it("no calendário, os lançamentos do dia abrem sozinhos", () => {
    abrirRepublica();
    lancarAvulsa("25", "Sorvete");
    voltarAoPainel();
    // O calendário abre no dia de hoje, onde a despesa foi lançada.
    clicar("Calendário");
    const linha = [...document.querySelectorAll(".linha-do-dia")].find((b) => b.textContent.includes("Sorvete"));
    expect(linha).toBeTruthy();
    fireEvent.click(linha);
    expect(screen.getByRole("heading", { name: "Sorvete" })).toBeTruthy();
  });
});

describe("editar é lançar: Editar despesa e a edição como lançamento", () => {
  const abrirNoVer = (nome) => {
    clicar("Ver despesas");
    fireEvent.change(screen.getByPlaceholderText("Buscar despesa"), { target: { value: nome } });
    fireEvent.click(document.querySelector(".linha-despesa"));
    clicar("Abrir");
  };

  it("Editar despesa tem o formulário de lançar; salvar lança uma edição com o antes e o depois", () => {
    abrirRepublica();
    lancarAvulsa("60", "Pizza");
    voltarAoPainel();
    abrirNoVer("Pizza");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.getByRole("heading", { name: /Editar despesa/ })).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: "Categoria" })).toBeTruthy();
    expect(campo("Valor").value).toBe("60");
    expect(document.querySelector(".barra-inferior")).toBeNull();

    // Sem mudar nada, não lança nada.
    clicar("Salvar edição");
    expect(screen.getByText("Nada mudou.")).toBeTruthy();

    fireEvent.change(campo("Valor"), { target: { value: "75" } });
    clicar("Salvar edição");
    expect(screen.getByText("Sucesso. A edição foi lançada.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Pizza" })).toBeTruthy();
    expect(screen.getByText("R$ 75,00")).toBeTruthy();
    expect(screen.getByText("1 edição")).toBeTruthy();

    // A edição abre sozinha: o que mudou, quem editou e quando.
    fireEvent.click(document.querySelector(".edicoes-do-lancamento .linha-despesa"));
    expect(screen.getByRole("heading", { name: "Edição de Pizza" })).toBeTruthy();
    expect(screen.getByText("R$ 60,00")).toBeTruthy();
    expect(screen.getByText("R$ 75,00")).toBeTruthy();
    expect(screen.getByText("Editado por")).toBeTruthy();
    expect(screen.getByText("Editado em")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Duplicar" })).toBeNull();
    clicar("Ver o lançamento editado");
    expect(screen.getByRole("heading", { name: "Pizza" })).toBeTruthy();
  });

  it("a edição aparece no Histórico (aba Edições) e no Recente do painel", () => {
    abrirRepublica();
    lancarAvulsa("40", "Gás");
    voltarAoPainel();
    abrirNoVer("Gás");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(campo("Nome"), { target: { value: "Gás de cozinha" } });
    clicar("Salvar edição");
    voltarAoPainel();

    expect(document.querySelector(".faixa-aviso").textContent).toMatch(/editou a despesa Gás de cozinha/);
    noMenu("Histórico");
    fireEvent.click(screen.getByRole("tab", { name: "Edições" }));
    expect(screen.getByText("Edição de Gás de cozinha")).toBeTruthy();
    fireEvent.click(screen.getByText("Edição de Gás de cozinha"));
    expect(screen.getByText("Gás")).toBeTruthy();
    expect(screen.getAllByText("Gás de cozinha").length).toBeGreaterThan(0);
  });

  it("apagar pela tela de editar some com a despesa e volta para antes dela", () => {
    abrirRepublica();
    lancarAvulsa("30", "Sorvete");
    voltarAoPainel();
    abrirNoVer("Sorvete");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    const confirmar = window.confirm;
    window.confirm = () => true;
    try {
      clicar("Apagar esta despesa");
    } finally {
      window.confirm = confirmar;
    }
    expect(screen.getByRole("heading", { name: /Ver despesas/ })).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Buscar despesa"), { target: { value: "Sorvete" } });
    expect(document.querySelectorAll(".linha-despesa").length).toBe(0);
  });

  it("a cíclica se edita sem trocar de conta, e quem lançou continua o mesmo", () => {
    abrirRepublica();
    const [ficha] = JSON.parse(window.localStorage.getItem("ceder:conjuntos")).conjuntos;
    cleanup();
    const chave = `ceder:conjunto:${ficha.id}`;
    const salvo = JSON.parse(window.localStorage.getItem(chave));
    const e = salvo.estado;
    const luz = e.ciclos.find((c) => c.ativa !== false) ?? e.ciclos[0];
    luz.ativa = true;
    luz.linhas[0].valor = "200";
    luz.lancadoPor = e.moradores[0].id;
    luz.lancadoEm = "2026-11-01T10:00:00.000Z";
    window.localStorage.setItem(chave, JSON.stringify(salvo));
    render(<App />);
    fireEvent.click(screen.getAllByText("Conjuntos")[0]);
    fireEvent.click(screen.getAllByText(ficha.nome)[0]);

    clicar("Ver despesas");
    fireEvent.click(screen.getByRole("tab", { name: "Cíclicas" }));
    const linha = [...document.querySelectorAll(".linha-despesa")].find((l) => l.textContent.includes(luz.nome));
    fireEvent.click(linha);
    clicar("Abrir");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("heading", { name: /Editar despesa/ })).toBeTruthy();
    expect(screen.queryByRole("radiogroup", { name: "Categoria" })).toBeNull();
    const valor = [...document.querySelectorAll(".caixa-com-moeda input")][0];
    expect(valor.value).toBe("200");
    fireEvent.change(valor, { target: { value: "230" } });
    clicar("Salvar edição");
    expect(screen.getByText("1 edição")).toBeTruthy();
    // Quem lançou a conta não muda com a edição: a data de lançamento é a de antes.
    expect(screen.getByText(/^01\/11\/2026/)).toBeTruthy();
  });

  it("Editar lembrete: a lista ganha um item e a edição fica registrada", () => {
    abrirRepublica();
    fireEvent.click(screen.getByRole("tab", { name: "Lembretes" }));
    clicar("Lançar lembretes");
    fireEvent.change(screen.getByPlaceholderText("Mercado da semana"), { target: { value: "Feira" } });
    fireEvent.change(screen.getByPlaceholderText("Novo item"), { target: { value: "Tomate" } });
    clicar("Lançar lista");
    fireEvent.click(screen.getByRole("button", { name: "Ver lembretes" }));
    fireEvent.click(screen.getByText("Feira"));
    clicar("Abrir");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("heading", { name: /Editar lembrete/ })).toBeTruthy();
    expect(screen.getByPlaceholderText("Mercado da semana").value).toBe("Feira");
    fireEvent.change(screen.getByPlaceholderText("Novo item"), { target: { value: "Alface" } });
    clicar("Salvar edição");
    expect(screen.getByRole("button", { name: "Alface" })).toBeTruthy();
    fireEvent.click(document.querySelector(".edicoes-do-lancamento .linha-despesa"));
    expect(screen.getByText("Tomate, Alface")).toBeTruthy();
  });

  it("uma despesa sem data própria continua sem data depois de editar outro campo", () => {
    abrirRepublica();
    lancarAvulsa("20", "Pão");
    sairParaOInicio();
    const [ficha] = JSON.parse(window.localStorage.getItem("ceder:conjuntos")).conjuntos;
    cleanup();
    const chave = `ceder:conjunto:${ficha.id}`;
    const salvo = JSON.parse(window.localStorage.getItem(chave));
    delete salvo.estado.itens.find((i) => i.nome === "Pão").data;
    window.localStorage.setItem(chave, JSON.stringify(salvo));
    render(<App />);
    fireEvent.click(screen.getAllByText("Conjuntos")[0]);
    fireEvent.click(screen.getAllByText(ficha.nome)[0]);
    abrirNoVer("Pão");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(campo("Valor"), { target: { value: "22" } });
    clicar("Salvar edição");
    fireEvent.click(document.querySelector(".edicoes-do-lancamento .linha-despesa"));
    expect(screen.queryByText("Quando foi")).toBeNull();
    sairParaOInicio();
    const depois = JSON.parse(window.localStorage.getItem(chave)).estado.itens.find((i) => i.nome === "Pão");
    expect(depois.data ?? null).toBeNull();
    expect(depois.valor).toBe("22");
  });

  it("quem não pode editar não entra em Editar despesa", () => {
    abrirRepublica();
    lancarAvulsa("80", "Luz extra");
    sairParaOInicio();
    const [ficha] = JSON.parse(window.localStorage.getItem("ceder:conjuntos")).conjuntos;
    cleanup();
    const chave = `ceder:conjunto:${ficha.id}`;
    const salvo = JSON.parse(window.localStorage.getItem(chave));
    const e = salvo.estado;
    e.moradores.push({ ...e.moradores[0], id: "m-bia", nome: "Bia" });
    e.voce = e.moradores[0].id;
    e.admin = "m-bia";
    e.itens.find((i) => i.nome === "Luz extra").lancadoPor = "m-bia";
    window.localStorage.setItem(chave, JSON.stringify(salvo));
    render(<App />);
    fireEvent.click(screen.getAllByText("Conjuntos")[0]);
    fireEvent.click(screen.getAllByText(ficha.nome)[0]);
    abrirNoVer("Luz extra");
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
  });
});
