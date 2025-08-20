# 🎬 GrupoCine — Sistema de Gerenciamento de Assentos com QR Code

Sistema completo para gerenciamento de assentos de cinema com geração/validação de códigos únicos (QR/alfanuméricos), atualização em tempo real via WebSocket e painel administrativo para controle e monitoramento.

## Visão Geral

- Usuários acessam a página pública e validam o código do ingresso para ocupar uma cadeira.
- Administradores acessam o Dashboard para gerar códigos por cadeira e acompanhar a ocupação em tempo real.
- Estados visualizados no mapa de assentos (UI):
	- Aguarando validação (cinza)
	- Ocupada (vermelho)
	- VIP (fileira A destacada)

Observação: Internamente existe o estado lógico “purchased” (quando um código foi gerado e ainda não usado), mas visualmente ele aparece como “Aguarando validação” (cinza) tanto no site público quanto no dashboard.

## Tecnologias

- Node.js + Express (API e servidor estático)
- Socket.IO (tempo real)
- MySQL (persistência)
- mysql2/promise (pool de conexões)
- Front-end em HTML/CSS/JavaScript puro (páginas públicas e dashboard)

## Requisitos

- Node.js 16+ (recomendado 18+)
- MySQL 8+ (ou compatível)

## Instalação e Setup

1) Clonar o repositório e instalar dependências

```powershell
cd d:\Pablo\GrupoCine
npm install
```

2) Configure o arquivo `.env` na raiz do projeto:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=1234
DB_DATABASE=cinema_seats
DB_PORT=3306

# Opções
CODE_EXPIRY_HOURS=2            # Validade (horas) do código gerado
# SESSION_TIMEOUT_MINUTES=120   # (Opcional) Tempo de sessão ativa
```

Notas:
- A aplicação utiliza `DB_DATABASE`. Se você já usa `DB_NAME`, o sistema faz fallback para `cinema_seats`, mas prefira `DB_DATABASE` para evitar ambiguidade.
- O servidor inicializa e garante a estrutura do banco (tabelas) automaticamente se ainda não existir.

3) Executar o servidor

Ambiente de desenvolvimento (com reload, se usar nodemon):

```powershell
npm run dev
```

Produção/local simples:

```powershell
npm start
```

Aplicações:
- Público: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard

## Estrutura de Pastas

```
package.json
server.js
database/
	connection.js      # Pool MySQL + helpers (queries e geração de códigos)
	init.js            # Criação do schema e dados iniciais (A1–E10)
	init.sql           # Script SQL (referência)
public/
	index.html         # Página pública (validação de cadeiras)
	css/index.css      # Estilos do site público
	js/index.js        # Lógica do site público (fetch + WebSocket)
dashboard/
	dashboard.html     # Painel administrativo
	css/dashboard.css  # Estilos do dashboard
	js/dashboard.js    # Lógica do dashboard (fetch + WebSocket)
```

## Estados das Cadeiras (UI)

- Aguarando validação (cinza): cadeira com código ativo aguardando ser validado OU sem código.
- Ocupada (vermelho): código validado; cadeira em uso; persiste no banco até ser liberada.
- VIP: marcação visual para cadeiras especiais (ex.: A1–A5).

Regra de negócio resumida:
- Gerar código (dashboard) cria um código único e ativo para a cadeira (internamente “purchased”).
- Validar código (página pública) marca o código como usado e cria uma sessão ativa para a cadeira (estado “occupied”).
- Finalizar sessão (endpoint) libera a cadeira (volta a “aguardando validação”).

## API

Base URL: `http://localhost:3000`

- GET `/api/seats` — Lista todas as cadeiras com status e metadados relevantes.
- POST `/api/validate-seat` — Valida o código informado e ocupa a cadeira.
	- Body JSON: `{ "seatCode": "A1", "uniqueCode": "ABCDE", "userIP": "opcional" }`
- POST `/api/generate-code` — Gera um novo código para uma cadeira.
	- Body JSON: `{ "seatCode": "A1" }`
- POST `/api/end-session` — Finaliza a sessão ativa da cadeira e libera o assento.
	- Body JSON: `{ "seatCode": "A1" }`
- GET `/api/seat-history/:seatCode` — Retorna histórico de uso da cadeira.

Retornos de erro seguem o padrão `{ success: false, message: "..." }` e HTTP adequados (400/404/500).

## Tempo Real (WebSocket)

Eventos emitidos pelo servidor (Socket.IO):
- `seatStatusUpdate` — `{ seatCode, status, timestamp }` quando uma cadeira é ocupada/liberada.
- `newCodeGenerated` — `{ seatCode, uniqueCode, expiresAt }` ao gerar novo código.

O front-end escuta esses eventos para espelhar o estado em tempo real no site público e no dashboard.

## Banco de Dados

Tabelas principais:
- `seats` — cadeiras (A1–E10), VIP, etc.
- `seat_codes` — códigos únicos por cadeira; flags `is_active`, `is_used` e `expires_at`.
- `seat_sessions` — sessões de uso (histórico), com status `active/completed/expired`.

Chaves do fluxo:
- Ao validar um código: `seat_codes.is_used = 1` e cria-se uma linha em `seat_sessions` com `status = 'active'`.
- O status “occupied” é derivado da existência de sessão ativa; “purchased” é derivado de código ativo não usado (na UI aparece como “Aguarando validação”).

## Desenvolvimento

- Scripts:
	- `npm run dev` — execução em desenvolvimento (requer nodemon instalado globalmente ou ajuste).
	- `npm start` — execução simples com Node.
- Principais libs: `express`, `socket.io`, `mysql2`, `dotenv`, `cors`.

## Licença

Este projeto é disponibilizado nos termos especificados pelo autor do repositório.
