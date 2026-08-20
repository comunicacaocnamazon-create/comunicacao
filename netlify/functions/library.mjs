// Biblioteca de Descanso — API (Netlify Function + Netlify Blobs)
// Roteiro simples: um único endpoint que responde a GET (leitura) e POST (escrita).
// Nenhum segredo fica no HTML: esta function roda nos servidores da Netlify e
// acessa o Blob Store com as credenciais injetadas automaticamente pela plataforma.

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'biblioteca-descanso';
const BOOKS_KEY = 'books';
const LOAN_PREFIX = 'loan:';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function getBooks(store) {
  const books = await store.get(BOOKS_KEY, { type: 'json' });
  return Array.isArray(books) ? books : [];
}

// Cada empréstimo é gravado como uma chave própria (loan:{id}). Assim, dois
// funcionários pegando livros ao mesmo tempo não sobrescrevem os dados um do outro.
async function getLoans(store) {
  const { blobs } = await store.list({ prefix: LOAN_PREFIX });
  const loans = [];
  for (const b of blobs) {
    try {
      const loan = await store.get(b.key, { type: 'json' });
      if (loan && loan.id) loans.push(loan);
    } catch (_) {
      // ignora chave corrompida
    }
  }
  return loans;
}

// Fábrica de handler (facilita testes e permite injeção de dependência).
// A exportação `default` é o que a Netlify usa em produção.
export function createHandler(storeFactory) {
  return async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const store = storeFactory();

    try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const type = url.searchParams.get('type');
      if (type === 'books') return json({ books: await getBooks(store) });
      if (type === 'loans') return json({ loans: await getLoans(store) });
      return json({ ok: true, name: STORE_NAME });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const { action } = body;

      // Importação de planilha: substitui a lista completa de livros.
      if (action === 'saveBooks') {
        const books = Array.isArray(body.books) ? body.books : [];
        await store.setJSON(BOOKS_KEY, books);
        return json({ ok: true, count: books.length });
      }

      // Retirada: grava um empréstimo novo (chave única).
      if (action === 'borrow') {
        const loan = body.loan;
        if (!loan || !loan.id || !loan.bookId) {
          return json({ ok: false, error: 'Dados do empréstimo inválidos.' }, 400);
        }
        await store.setJSON(LOAN_PREFIX + loan.id, loan);
        return json({ ok: true });
      }

      // Devolução: marca a data/hora de devolução no empréstimo existente.
      if (action === 'return') {
        const { loanId, returnedAt } = body;
        if (!loanId) return json({ ok: false, error: 'ID do empréstimo obrigatório.' }, 400);
        const key = LOAN_PREFIX + loanId;
        const loan = await store.get(key, { type: 'json' });
        if (!loan) return json({ ok: false, error: 'Empréstimo não encontrado.' }, 404);
        loan.returnedAt = returnedAt || new Date().toISOString();
        await store.setJSON(key, loan);
        return json({ ok: true });
      }

      return json({ ok: false, error: 'Ação desconhecida.' }, 400);
    }

    return json({ ok: false, error: 'Método não suportado.' }, 405);
    } catch (err) {
      return json({ ok: false, error: String((err && err.message) || err) }, 500);
    }
  };
}

export default createHandler(() => getStore(STORE_NAME));
