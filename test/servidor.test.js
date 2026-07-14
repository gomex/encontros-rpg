const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const PORTA = 3000;
const BASE_URL = `http://localhost:${PORTA}`;
const RAIZ = path.join(__dirname, "..");
const ARQUIVO_ENCONTROS = path.join(RAIZ, "encontros.json");
const ARQUIVO_JOGADORES = path.join(RAIZ, "jogadores.json");

let processo;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function esperarServidorPronto() {
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    try {
      await fetch(`${BASE_URL}/api/encontros`);
      return;
    } catch (erro) {
      await esperar(200);
    }
  }
  throw new Error("Servidor não iniciou a tempo");
}

before(async () => {
  fs.rmSync(ARQUIVO_ENCONTROS, { force: true });
  fs.rmSync(ARQUIVO_JOGADORES, { force: true });
  processo = spawn("node", ["servidor.js"], { cwd: RAIZ });
  await esperarServidorPronto();
});

after(() => {
  processo.kill();
  fs.rmSync(ARQUIVO_ENCONTROS, { force: true });
  fs.rmSync(ARQUIVO_JOGADORES, { force: true });
});

test("cria e lista encontros", async () => {
  const criado = await fetch(`${BASE_URL}/api/encontros`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Encontro de teste" }),
  }).then((r) => r.json());

  assert.ok(criado.id);
  assert.equal(criado.nome, "Encontro de teste");

  const lista = await fetch(`${BASE_URL}/api/encontros`).then((r) => r.json());
  assert.ok(lista.some((e) => e.id === criado.id));
});

test("persiste criaturas em um encontro", async () => {
  const encontro = await fetch(`${BASE_URL}/api/encontros`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Emboscada" }),
  }).then((r) => r.json());

  const estado = {
    nome: "Emboscada",
    criaturas: [{ id: 1, nome: "Goblin", iniciativa: 12, hpMaximo: 10, hp: 10 }],
    turnoAtualId: 1,
    rodada: 1,
  };

  await fetch(`${BASE_URL}/api/encontros/${encontro.id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(estado),
  });

  const carregado = await fetch(`${BASE_URL}/api/encontros/${encontro.id}`).then((r) => r.json());
  assert.deepEqual(carregado, estado);
});

test("encontro inexistente retorna 404", async () => {
  const resposta = await fetch(`${BASE_URL}/api/encontros/nao-existe`);
  assert.equal(resposta.status, 404);
});

test("remove um encontro especifico", async () => {
  const encontro = await fetch(`${BASE_URL}/api/encontros`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Para remover" }),
  }).then((r) => r.json());

  await fetch(`${BASE_URL}/api/encontros/${encontro.id}`, { method: "DELETE" });

  const resposta = await fetch(`${BASE_URL}/api/encontros/${encontro.id}`);
  assert.equal(resposta.status, 404);
});

test("apaga todos os encontros", async () => {
  await fetch(`${BASE_URL}/api/encontros`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Vai ser apagado" }),
  });

  await fetch(`${BASE_URL}/api/encontros`, { method: "DELETE" });

  const lista = await fetch(`${BASE_URL}/api/encontros`).then((r) => r.json());
  assert.deepEqual(lista, []);
});

test("POST /api/encontros com JSON invalido retorna erro claro", async () => {
  const resposta = await fetch(`${BASE_URL}/api/encontros`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalido",
  });

  assert.equal(resposta.status, 400);
  const corpo = await resposta.json();
  assert.ok(corpo.erro);
});

test("POST /api/jogadores com JSON invalido retorna erro claro", async () => {
  const resposta = await fetch(`${BASE_URL}/api/jogadores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalido",
  });

  assert.equal(resposta.status, 400);
  const corpo = await resposta.json();
  assert.ok(corpo.erro);
});

test("cadastra, lista e remove jogadores", async () => {
  const jogador = await fetch(`${BASE_URL}/api/jogadores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Aria", hpMaximo: 24 }),
  }).then((r) => r.json());

  assert.ok(jogador.id);

  let lista = await fetch(`${BASE_URL}/api/jogadores`).then((r) => r.json());
  assert.ok(lista.some((j) => j.id === jogador.id));

  await fetch(`${BASE_URL}/api/jogadores/${jogador.id}`, { method: "DELETE" });

  lista = await fetch(`${BASE_URL}/api/jogadores`).then((r) => r.json());
  assert.ok(!lista.some((j) => j.id === jogador.id));
});

test("mestre.html mostra HP, jogador.html nunca expoe o HP real", () => {
  const mestre = fs.readFileSync(path.join(RAIZ, "mestre.html"), "utf8");
  const jogador = fs.readFileSync(path.join(RAIZ, "jogador.html"), "utf8");

  assert.ok(mestre.includes("HP:"), "mestre.html deveria mostrar o HP da criatura");
  assert.ok(!jogador.includes("HP:"), "jogador.html nao deve expor o HP real da criatura");
});

test("formulario do mestre nao pede iniciativa ao criar criatura", () => {
  const mestre = fs.readFileSync(path.join(RAIZ, "mestre.html"), "utf8");
  assert.ok(!mestre.includes('id="input-iniciativa"'), "mestre nao deve pedir iniciativa ao criar criatura");
});
