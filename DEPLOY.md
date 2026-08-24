# Subir no Vercel

O CDR é um site estático: não tem servidor, banco nem variável de ambiente.
Tudo roda no navegador de quem usa.

## Pelo painel

1. Suba o projeto para um repositório no GitHub.
2. No Vercel, **Add New → Project** e escolha o repositório.
3. O Vercel detecta Vite sozinho. Confira que ficou assim:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Deploy**.

Não há nada a configurar em Environment Variables.

## Pela linha de comando

```bash
npm i -g vercel
vercel        # primeira vez: responde as perguntas e sobe um preview
vercel --prod # publica no domínio de produção
```

## O build roda os testes

`npm run build` executa `tsc --noEmit` e a suíte de testes antes de gerar o
`dist/`. Se algum teste falhar, o deploy falha — de propósito. Um erro de
cálculo que chega ao usuário custa mais caro que um deploy que não sai.

Se algum dia você precisar publicar com a suíte vermelha, use
`npx vite build` direto, sabendo o que está fazendo.

## Antes de mandar o link para alguém

- [ ] Abrir no celular. A maioria vai usar assim, e a mensagem de coleta é
      copiada direto para o grupo do WhatsApp.
- [ ] Preencher uma casa, fechar a aba, abrir de novo: os dados têm que estar
      lá.
- [ ] Testar em aba anônima. O CDR funciona sem armazenamento, só não salva.
- [ ] Conferir o botão de copiar a mensagem. A área de transferência exige
      HTTPS — no Vercel isso já vem pronto, mas em `http://localhost` de outro
      aparelho na rede, não.

## O que ainda não existe

Não há conta, sincronização nem servidor. Os dados ficam no `localStorage`
daquele navegador: trocar de aparelho, limpar dados do site ou usar aba
anônima começa do zero.

Isso é proposital nesta fase. Dá para testar com repúblicas reais sem
infraestrutura nenhuma, e é o que permite descobrir se salvar tem valor antes
de construir contas de usuário.
