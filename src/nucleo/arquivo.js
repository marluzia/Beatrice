// O nome do conjunto virando nome de arquivo, para o Baixar.

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
