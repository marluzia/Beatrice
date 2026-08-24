import { useState } from "react";
import {
  Campo,
  Pastilha,
  Rotulo,
  Segmentado,
  Seletor,
} from "../componentes/index.js";
import { corDe, nomeOu, reais } from "../nucleo/formato.js";
import { rateiosDoItem, totalDeclaradoPorHora } from "../nucleo/adaptador.js";

const NOMES_DOS_RATEIOS = {
  igual: "igual",
  dias: "por dias",
  presenca: "por presença",
  uso: "por uso",
};

const EXPLICACOES_DOS_RATEIOS = {
  dias: "Cada um paga na proporção dos dias que passou em casa.",
  presenca: "O custo de cada dia é dividido entre quem estava em casa naquele dia. Quem ficou sozinho num dia paga aquele dia inteiro — é o certo para aparelho que gasta o mesmo com uma ou com várias pessoas.",
};

export default function CartaoItem({ item, moradores, indicePorId, resultado, acoes }) {
  const [aberto, setAberto] = useState(false);
  const calculado = resultado.itens.find((x) => x.id === item.id);
  const set = (campo, valor) => acoes.editarItem(item.id, campo, valor);
  const rateios = rateiosDoItem(item);

  return (
    <div className="cartao-item">
      <div className="item-topo">
        <input
          type="text"
          className="item-nome"
          value={item.nome}
          aria-label="Nome do item"
          onChange={(e) => set("nome", e.target.value)}
        />
        <span className="item-valor">
          {calculado ? `R$ ${reais(calculado.custoTotal)}` : "—"}
        </span>
        <button
          type="button"
          className="item-acao"
          aria-expanded={aberto}
          onClick={() => setAberto(!aberto)}
        >
          {aberto ? "fechar" : "ajustar"}
        </button>
        <button
          type="button"
          className="item-acao item-acao--remover"
          aria-label={`Remover ${item.nome}`}
          onClick={() => acoes.removerItem(item.id)}
        >
          ×
        </button>
      </div>

      {aberto && (
        <div className="item-corpo">
          {item.dica && <p className="dica">{item.dica}</p>}

          <div className="linha-campos">
            {item.especie === "consumo" && (
              <>
                <Campo
                  rotulo="Consumo no mês"
                  valor={item.quantidade}
                  aoMudar={(v) => set("quantidade", v)}
                  largura="campo--curto"
                  placeholder="0"
                />
                <Seletor
                  rotulo="Unidade"
                  valor={item.unidade}
                  aoMudar={(v) => set("unidade", v)}
                  opcoes={[
                    { valor: "kwh", texto: "kWh · sai da luz" },
                    { valor: "m3", texto: "m³ · sai da água" },
                  ]}
                  texto
                />
              </>
            )}

            {item.especie === "porHora" && (
              <>
                <Campo
                  rotulo="Consumo do aparelho"
                  sufixo={item.unidade === "kwh" ? "kWh/h" : "m³/h"}
                  valor={item.porHora}
                  aoMudar={(v) => set("porHora", v)}
                  largura="campo--curto"
                  placeholder="0"
                />
                <Campo
                  rotulo="Horas ligado no mês"
                  sufixo="h"
                  valor={item.horas}
                  aoMudar={(v) => set("horas", v)}
                  largura="campo--curto"
                  placeholder="0"
                />
                <Seletor
                  rotulo="Unidade"
                  valor={item.unidade}
                  aoMudar={(v) => set("unidade", v)}
                  opcoes={[
                    { valor: "kwh", texto: "kWh · sai da luz" },
                    { valor: "m3", texto: "m³ · sai da água" },
                  ]}
                  texto
                />
              </>
            )}

            {item.especie === "porUso" && (
              <>
                <Seletor
                  rotulo="Cada uso sai de"
                  valor={item.origemUso}
                  aoMudar={(v) => set("origemUso", v)}
                  opcoes={[
                    { valor: "fatura", texto: "da fatura de luz e água" },
                    { valor: "reais", texto: "do bolso, em reais" },
                  ]}
                  texto
                />
                {item.origemUso === "reais" ? (
                  <Campo
                    rotulo="Cada uso custa"
                    sufixo="R$"
                    valor={item.valorPorUso}
                    aoMudar={(v) => set("valorPorUso", v)}
                    largura="campo--curto"
                    placeholder="0,00"
                  />
                ) : (
                  <>
                    <Campo
                      rotulo="Cada uso gasta"
                      sufixo="kWh"
                      valor={item.kwhPorUso}
                      aoMudar={(v) => set("kwhPorUso", v)}
                      largura="campo--curto"
                    />
                    <Campo
                      rotulo="Cada uso gasta"
                      sufixo="m³"
                      valor={item.m3PorUso}
                      aoMudar={(v) => set("m3PorUso", v)}
                      largura="campo--curto"
                    />
                  </>
                )}
                {item.rateio !== "uso" && (
                  <Campo
                    rotulo="Usos no mês"
                    valor={item.usos}
                    aoMudar={(v) => set("usos", v)}
                    largura="campo--minimo"
                    placeholder="0"
                    tipoDeTeclado="numeric"
                  />
                )}
              </>
            )}

            {item.especie === "reais" && (
              <Campo
                rotulo="Valor"
                sufixo="R$"
                valor={item.valor}
                aoMudar={(v) => set("valor", v)}
                largura="campo--curto"
                placeholder="0,00"
              />
            )}
          </div>

          {item.especie === "porHora" && totalDeclaradoPorHora(item) > 0 && (
            <p className="dica">
              Dá {totalDeclaradoPorHora(item).toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
              })}{" "}
              {item.unidade === "kwh" ? "kWh" : "m³"} no mês, descontados da fatura antes do
              uso comum.
            </p>
          )}

          <div className="grupo">
            <Rotulo>Quem paga</Rotulo>
            <div className="pastilhas">
              {moradores.map((m) => (
                <Pastilha
                  key={m.id}
                  cor={corDe(indicePorId[m.id])}
                  nome={nomeOu(m.nome, indicePorId[m.id])}
                  ativo={item.participantes.includes(m.id)}
                  aoClicar={() => acoes.alternarParticipante(item.id, m.id)}
                />
              ))}
            </div>
          </div>

          <div className="grupo">
            <Rotulo>Como divide</Rotulo>
            <Segmentado
              rotuloDoGrupo="Como divide"
              opcoes={rateios.map((r) => ({ valor: r, texto: NOMES_DOS_RATEIOS[r] }))}
              valor={item.rateio}
              aoMudar={(v) => set("rateio", v)}
            />
            {EXPLICACOES_DOS_RATEIOS[item.rateio] && (
              <p className="dica">{EXPLICACOES_DOS_RATEIOS[item.rateio]}</p>
            )}
          </div>

          {item.rateio === "uso" && item.participantes.length > 0 && (
            <div className="grupo">
              <Rotulo>Usos de cada um</Rotulo>
              <div className="linha-campos">
                {item.participantes.map((id) => {
                  const m = moradores.find((x) => x.id === id);
                  if (!m) return null;
                  return (
                    <Campo
                      key={id}
                      rotulo={nomeOu(m.nome, indicePorId[id])}
                      valor={item.usosPorPessoa[id] ?? ""}
                      aoMudar={(v) =>
                        set("usosPorPessoa", { ...item.usosPorPessoa, [id]: v })
                      }
                      largura="campo--minimo"
                      placeholder="0"
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
