const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const PORTA = 3000;
const ARQUIVO_ENCONTROS = path.join(__dirname, "encontros.json");
const ARQUIVO_JOGADORES = path.join(__dirname, "jogadores.json");

function carregarJson(caminho) {
  if (!fs.existsSync(caminho)) return {};
  return JSON.parse(fs.readFileSync(caminho, "utf8"));
}

function salvarEncontros() {
  fs.writeFileSync(ARQUIVO_ENCONTROS, JSON.stringify(encontros, null, 2));
}

function salvarJogadores() {
  fs.writeFileSync(ARQUIVO_JOGADORES, JSON.stringify(jogadores, null, 2));
}

let encontros = carregarJson(ARQUIVO_ENCONTROS);
let jogadores = carregarJson(ARQUIVO_JOGADORES);

function gerarId(colecao) {
  let id;
  do {
    id = crypto.randomBytes(4).toString("hex");
  } while (colecao[id]);
  return id;
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let corpo = "";
    req.on("data", (trecho) => (corpo += trecho));
    req.on("end", () => resolve(corpo));
    req.on("error", reject);
  });
}

function enviarArquivo(res, nomeArquivo) {
  const caminho = path.join(__dirname, nomeArquivo);
  fs.readFile(caminho, (erro, conteudo) => {
    if (erro) {
      res.writeHead(404);
      res.end("Não encontrado");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(conteudo);
  });
}

function enviarJson(res, dados, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(dados));
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const partes = url.pathname.split("/").filter(Boolean);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/mestre")) {
    return enviarArquivo(res, "mestre.html");
  }
  if (req.method === "GET" && url.pathname === "/jogador") {
    return enviarArquivo(res, "jogador.html");
  }

  if (url.pathname === "/api/encontros" && req.method === "GET") {
    const lista = Object.entries(encontros).map(([id, encontro]) => ({ id, nome: encontro.nome }));
    return enviarJson(res, lista);
  }

  if (url.pathname === "/api/encontros" && req.method === "POST") {
    const corpo = await lerCorpo(req);
    const { nome } = JSON.parse(corpo);
    const id = gerarId(encontros);
    encontros[id] = { nome: nome || "Encontro sem nome", criaturas: [], turnoAtualId: null, rodada: 1 };
    salvarEncontros();
    return enviarJson(res, { id, ...encontros[id] });
  }

  if (url.pathname === "/api/encontros" && req.method === "DELETE") {
    encontros = {};
    salvarEncontros();
    return enviarJson(res, { ok: true });
  }

  if (url.pathname === "/api/jogadores" && req.method === "GET") {
    const lista = Object.entries(jogadores).map(([id, jogador]) => ({ id, ...jogador }));
    return enviarJson(res, lista);
  }

  if (url.pathname === "/api/jogadores" && req.method === "POST") {
    const corpo = await lerCorpo(req);
    const { nome, hpMaximo, resistencias, imunidades } = JSON.parse(corpo);
    const id = gerarId(jogadores);
    jogadores[id] = {
      nome: nome || "Jogador sem nome",
      hpMaximo: Number(hpMaximo) || 0,
      resistencias: resistencias || [],
      imunidades: imunidades || []
    };
    salvarJogadores();
    return enviarJson(res, { id, ...jogadores[id] });
  }

  if (partes[0] === "api" && partes[1] === "jogadores" && partes[2] && req.method === "DELETE") {
    const id = partes[2];
    if (!jogadores[id]) return enviarJson(res, { erro: "Jogador não encontrado" }, 404);
    delete jogadores[id];
    salvarJogadores();
    return enviarJson(res, { ok: true });
  }

  if (partes[0] === "api" && partes[1] === "encontros" && partes[2]) {
    const id = partes[2];

    if (req.method === "GET") {
      if (!encontros[id]) return enviarJson(res, { erro: "Encontro não encontrado" }, 404);
      return enviarJson(res, encontros[id]);
    }

    if (req.method === "POST") {
      if (!encontros[id]) return enviarJson(res, { erro: "Encontro não encontrado" }, 404);
      const corpo = await lerCorpo(req);
      try {
        encontros[id] = JSON.parse(corpo);
        salvarEncontros();
        return enviarJson(res, encontros[id]);
      } catch (erro) {
        return enviarJson(res, { erro: "JSON inválido" }, 400);
      }
    }

    if (req.method === "DELETE") {
      if (!encontros[id]) return enviarJson(res, { erro: "Encontro não encontrado" }, 404);
      delete encontros[id];
      salvarEncontros();
      return enviarJson(res, { ok: true });
    }
  }

  res.writeHead(404);
  res.end("Não encontrado");
});

function listarIpsLocais() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const nome of Object.keys(interfaces)) {
    for (const info of interfaces[nome]) {
      if (info.family === "IPv4" && !info.internal) ips.push(info.address);
    }
  }
  return ips;
}

servidor.listen(PORTA, () => {
  console.log(`Mestre:   http://localhost:${PORTA}/mestre`);
  for (const ip of listarIpsLocais()) {
    console.log(`Jogadores (mesma rede Wi-Fi): http://localhost:${PORTA}/jogador?id=...`);
  }
});
