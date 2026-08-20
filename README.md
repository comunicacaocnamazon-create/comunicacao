# 📚 Biblioteca de Descanso — CNA

Sistema web de leitura e descanso corporativo. Sem login e sem senha: o funcionário
escaneia o QR Code da estante, vê o catálogo, pega um livro, informa o nome e a data
de devolução — tudo registrado e compartilhado entre todos os aparelhos.

## Como funciona o armazenamento

- **Na Netlify (produção):** os dados ficam no **Netlify Blobs** (armazenamento nativo
  da Netlify), acessados por uma **Netlify Function**. Todos os funcionários veem os
  mesmos livros e empréstimos, em tempo real. Nenhuma chave/segredo fica no HTML.
- **Localmente (sem servidor):** o sistema detecta que não há backend e continua
  funcionando usando o `localStorage` do navegador (bom para testar o visual/fluxo).

## Estrutura

```
index.html                      → todo o site (HTML + CSS + JS + logo)
netlify/functions/library.mjs   → API (leitura/gravação no Blob Store)
netlify.toml                    → configuração de deploy da Netlify
package.json                    → dependências da Function (@netlify/blobs)
README.md                       → este arquivo
```

## Testar localmente

Basta abrir o `index.html` no navegador. Você verá os dados de demonstração
(livros de exemplo) e o indicador no topo mostrará **“Modo local (sem servidor)”**.

## Publicar na Netlify (via GitHub)

1. **Crie um repositório no GitHub** e suba os arquivos deste projeto
   (todos eles: `index.html`, a pasta `netlify/`, `netlify.toml`, `package.json`).
2. Na Netlify: **Add new site → Import an existing project → GitHub**.
3. Escolha o repositório. A Netlify detecta o `netlify.toml` automaticamente
   (build command vazio, publish na raiz).
4. Clique em **Deploy site**.

Após o deploy, a página abre com o catálogo **vazio** e o indicador **“Sincronizado”**.

### Carregando os livros (uma única vez)

1. Abra o site publicado.
2. Role até **“⚙️ Importar planilha de livros”**.
3. Clique em **Escolher planilha** e selecione seu arquivo `.xlsx`, `.xls` ou `.csv`
   (colunas: `Título`, `Autor`, `Categoria` e `Capa (URL)` — o sistema identifica
   os cabeçalhos automaticamente).
4. Pronto: os livros são gravados no servidor e ficam visíveis para todos.

> Dica: para não gerar dados duplicados, faça a importação por **uma pessoa**
> (o responsável pela biblioteca). Use **“⬇️ Baixar modelo”** para ver o formato esperado.

## Endpoint da API (referência)

| Método | Chamada | Descrição |
|---|---|---|
| GET | `/.netlify/functions/library?type=books` | Lista livros |
| GET | `/.netlify/functions/library?type=loans` | Lista empréstimos |
| POST | `{ action: "saveBooks", books: [...] }` | Substitui livros (importação) |
| POST | `{ action: "borrow", loan: {...} }` | Registra retirada |
| POST | `{ action: "return", loanId, returnedAt }` | Registra devolução |

## Observações

- **Sem autenticação (por decisão de projeto):** qualquer pessoa com o link pode
  ler e escrever. Para uso interno, o endereço/QR Code funciona como a “chave” de acesso.
- O Netlify Blobs é otimizado para **muitas leituras e poucas escritas**, ideal para
  uma biblioteca de pequeno porte. Cada empréstimo é gravado em uma chave própria,
  evitando conflitos quando duas pessoas pegam livros ao mesmo tempo.
- Quando o acervo crescer muito (ou você quiser relatórios/consultas complexas),
  dá para migrar para o **Netlify Postgres/Neon** mantendo a mesma interface.
