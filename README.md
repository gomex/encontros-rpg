# encontros-rpg

Controle de HP e iniciativa para RPG de mesa. Roda localmente na sua rede Wi-Fi, sem instalação nos celulares — só o navegador.

- **Mestre**: cria encontros, cadastra jogadores, adiciona criaturas, controla HP.
- **Jogadores**: acessam por um link, veem a ordem de iniciativa e ajustam dano/cura/iniciativa da própria ficha, sem ver o HP real.

## Requisitos

- [Node.js](https://nodejs.org) instalado (sem dependências externas — nada para instalar com `npm`).

## Como rodar

No terminal, dentro da pasta do projeto:

```
node servidor.js
```

O terminal mostra algo como:

```
Mestre:   http://localhost:3000/mestre
Jogadores (mesma rede Wi-Fi): http://192.168.x.x:3000/jogador?id=...
```

- **No seu computador/celular (mestre)**: acesse `http://localhost:3000/mestre`.
- **Jogadores**: precisam estar na mesma rede Wi-Fi que o computador rodando o servidor, e acessar pelo IP mostrado no terminal (não `localhost`, que só funciona na própria máquina).

Deixe o terminal aberto enquanto for usar — fechar o comando encerra o servidor.

## Fluxo de uso

1. Abra `/mestre` e cadastre os jogadores uma vez (nome + HP máximo) — eles ficam salvos para qualquer encontro futuro.
2. Crie um encontro (ex: "Emboscada na ponte").
3. Na tela do encontro, use "Adicionar todos ao encontro" para trazer o grupo, ou adicione monstros manualmente (nome + HP máximo).
4. Copie o link de jogador que aparece na tela e mande para o grupo (WhatsApp, etc.).
5. Cada jogador abre o link no próprio celular, ajusta a iniciativa da própria criatura quando for rolada, e usa os botões `+`/`-` para reportar dano e cura.
6. O botão "Terminei a ação" (jogador) ou "Próximo turno" (mestre) avança o turno; a próxima criatura da ordem fica destacada.

## Persistência

Os dados ficam salvos em dois arquivos na pasta do projeto, e sobrevivem a reinícios do servidor:

- `encontros.json` — encontros e suas criaturas.
- `jogadores.json` — jogadores cadastrados.

Ambos são gerados automaticamente e ficam fora do controle de versão (`.gitignore`).
