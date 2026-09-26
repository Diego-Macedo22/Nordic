# Nordic — primeiro laboratório Node.js + MySQL

Este pacote contém uma **API de teste** e uma página `/lab` para criar um mundo, entrar com outro apelido em uma segunda aba e atacar. A página principal `/` mostra o Nordic atual, que ainda usa o progresso local do navegador. **O laboratório não sincroniza a economia nem as tropas da página principal.** Ele é o primeiro passo para testar a comunicação entre navegador, servidor e MySQL.

## Arquivos

- `schema.sql`: cria `worlds`, `players` e `attacks` no MySQL.
- `server.js`: servidor HTTP e rotas `/api/...`. Usa consultas com parâmetros (`?`) e transações na criação de mundo e no ataque.
- `rules.js`: fórmula simplificada de batalha.
- `public/lab.html`: interface de teste com duas abas.
- `public/index.html`: versão atual do jogo, para referência visual e integração futura.
- `.env.example`: nomes das variáveis de conexão. A senha real fica em `.env`, que está no `.gitignore`.

## Rodar no Linux Mint

1. Instale Node.js (versão 20 ou superior) e MySQL Server. Confira no terminal com `node -v`, `npm -v` e `mysql --version`.
2. Na pasta extraída, execute `npm install`.
3. Crie o banco e as tabelas: `sudo mysql < schema.sql`. Se seu usuário root do MySQL usa senha, execute `mysql -u root -p < schema.sql`.
4. Abra o console do MySQL com `sudo mysql` e crie um usuário **local** para a API, escolhendo sua própria senha:

   ```sql
   CREATE USER 'nordic'@'localhost' IDENTIFIED BY 'SENHA_ESCOLHIDA_POR_VOCE';
   GRANT SELECT, INSERT, UPDATE ON nordic.* TO 'nordic'@'localhost';
   EXIT;
   ```

5. Faça uma cópia de `.env.example` chamada `.env`. Troque `DB_PASSWORD` pela senha escolhida. Não envie `.env` ao GitHub.
6. Execute `npm run dev` e abra `http://localhost:3000/lab` em duas abas.
7. Na primeira aba, crie o mundo. Copie o código `N-...`; na segunda, entre com **outro apelido**. Após entrar, cada aba vê as duas aldeias. Ataque e confira o relatório em ambas (atualização a cada 3 segundos).

`npm test` verifica a fórmula de batalha e as entradas sem depender do MySQL. `http://localhost:3000/api/health` verifica a conexão com o banco depois de iniciar o servidor.

## Rotas iniciais da API

| Método | Endereço | Função |
| --- | --- | --- |
| `POST` | `/api/worlds` | Cria mundo e seu primeiro jogador (`name`, `nickname`) |
| `GET` | `/api/worlds/:code` | Consulta o mundo |
| `POST` | `/api/worlds/:code/join` | Cria outro jogador (`nickname`); apelido repetido recebe HTTP 409 |
| `GET` | `/api/worlds/:code/players` | Lista tropas e vitórias |
| `POST` | `/api/worlds/:code/attacks` | Ataca (`attackerId`, `defenderId`, `spear`, `sword`) |
| `GET` | `/api/worlds/:code/attacks` | Lista os últimos relatórios |

## Como evoluir a estrutura

O banco muda **quando o novo recurso precisa de outra forma de guardar dados**. Exemplo: inventário exige uma tabela `inventory`; uma descrição da aldeia pode exigir uma coluna nova. Uma mudança só visual no mapa não exige SQL. Mesmo quando há SQL novo, o navegador não fala diretamente com MySQL: o navegador chama a API; o servidor valida a ação e consulta o banco.

**Não edite `schema.sql` para refazer um banco que já contém progresso.** Quando chegarmos às contas, criaremos um arquivo de migração, por exemplo `migrations/002_accounts.sql`, com novas tabelas ou `ALTER TABLE`. Assim o progresso existente é preservado.

## Publicação no Render

O serviço Node deve ser um **Web Service** com Build Command `npm install` e Start Command `npm start`. Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` em Environment. **Não publique este laboratório como sistema de contas**: ainda não há senha nem sessão, então qualquer visitante poderia enviar ataques usando o ID de outra pessoa. O MySQL local é gratuito para estudar; para manter MySQL dentro do Render, a instalação documentada usa disco persistente, disponível em serviço pago. O código de teste pode ser estudado localmente antes de escolher onde manter o banco online.
