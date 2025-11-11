# 🤖 Bot WhatsApp – Agendador Automático de Mensagens com Painel Web

Este projeto é um **bot para WhatsApp** desenvolvido com **Node.js** e a biblioteca [`whatsapp-web.js`](https://wwebjs.dev/).  
Agora com **painel web interativo**, ele permite **cadastrar contatos, mensagens e agendamentos personalizados**, com horários e dias específicos de envio.  
O sistema utiliza **SQLite** como banco de dados local e pode enviar mensagens **tanto agendadas quanto imediatas**.

---

## 📑 Sumário

1. [Funcionalidades](#-funcionalidades)  
2. [Tecnologias Utilizadas](#-tecnologias-utilizadas)  
3. [Estrutura do Projeto](#-estrutura-do-projeto)  
4. [Instalação e Configuração](#-instalação-e-configuração)  
5. [Como Rodar o Projeto](#-como-rodar-o-projeto)  
6. [Uso do Painel Web](#-uso-do-painel-web)  
7. [Banco de Dados](#-banco-de-dados)  
8. [Evite subir dados sensíveis](#-evite-subir-dados-sensíveis)  
9. [Possíveis Erros e Soluções](#-possíveis-erros-e-soluções)  
10. [Melhorias Futuras](#-melhorias-futuras)  
11. [Licença](#-licença)

---

## 🚀 Funcionalidades

- ✅ Login persistente utilizando sessão local  
- 📲 QR Code para autenticação (somente na primeira inicialização)  
- 💬 Cadastro de contatos e mensagens personalizadas  
- ⏰ Agendamento de mensagens por hora e dias da semana  
- ⚡ Envio imediato de mensagens diretamente pelo painel  
- 💾 Armazenamento local em banco **SQLite**  
- 🔁 Atualização dinâmica dos agendamentos sem reiniciar o bot  
- 🧠 Envio para números diretos ou contatos salvos  

---

## 🧰 Tecnologias Utilizadas

| Tecnologia | Descrição |
|------------|------------|
| **Node.js** | Ambiente de execução JavaScript |
| **Express** | Framework para criação do servidor HTTP |
| **whatsapp-web.js** | Integração com o WhatsApp Web |
| **node-cron** | Agendador de tarefas |
| **sqlite3** | Banco de dados local leve |
| **QRCode** / **QRCode-terminal** | Geração e exibição do QR Code de login |

---

## 📂 Estrutura do Projeto

```
bot-whatsapp/
│
├── .wwebjs_auth/             # Sessão persistente de login
├── .wwebjs_cache/            # Cache da sessão
├── node_modules/             # Dependências do projeto
│
├── public/
│   └── index.html            # Painel front-end (interface do bot)
│
├── app.js                    # Ponto de entrada do servidor Node
├── painel.js                 # Controla as rotas e API do painel web
├── envio.js                  # Responsável por envios imediatos de mensagens
├── agenda.js                 # Controle e agendamento de mensagens
├── database.js               # Conexão e manipulação do banco SQLite
├── database.db               # Banco de dados local
│
├── package.json              # Dependências e scripts
├── package-lock.json
├── .gitignore
└── README.md
```

---

## 🔧 Instalação e Configuração

### 1️⃣ Clonar o repositório

```bash
git clone https://github.com/LucasDias777/bot-whatsapp.git
cd bot-whatsapp
```

### 2️⃣ Instalar dependências

```bash
npm install
```

### 3️⃣ Executar o projeto

```bash
node app.js
```

Na **primeira inicialização**, o QR Code será exibido diretamente no painel web **(http://localhost:3000)**.

Acesse o painel, escaneie o QR Code via WhatsApp:
Aparelhos Conectados → Conectar Aparelho.

Após escanear, a sessão ficará salva e o QR Code não será solicitado novamente ✅

Se desejar encerrar a sessão futuramente, acesse o mesmo caminho de conexão no WhatsApp,
selecione a sessão ativa e clique em Encerrar.

---

## 💻 Uso do Painel Web

Após iniciar o projeto, acesse:

```
http://localhost:3000
```

O painel permite:

- 📇 **Cadastrar contatos** (número e grupo opcional)  
- 💬 **Cadastrar mensagens**  
- 🗓️ **Agendar mensagens** para horários e dias específicos  
- ⚡ **Enviar mensagens instantaneamente** a qualquer número cadastrado  

---

## 🗄️ Banco de Dados

O projeto utiliza **SQLite** (`database.db`) como armazenamento local.  
A estrutura é criada automaticamente ao rodar o projeto.

Essas tabelas armazenam:
- **Contatos**: números e grupos opcionais  
- **Mensagens**: textos prontos para envio  
- **Agendamentos**: mensagens programadas com horário e dias  
- **Grupos**: categorias de contatos  
- **Grupo_contatos**: relação entre grupos e contatos  

---

## 🛑 Evite subir dados sensíveis

As sessões do WhatsApp são salvas localmente nas pastas:

```
.wwebjs_auth/
.wwebjs_cache/
```

> ⚠️ **Nunca envie essas pastas para o GitHub.**  
> Elas contêm informações da sua sessão autenticada.

---

## ❗ Possíveis Erros e Soluções

| Erro | Causa | Solução |
|------|--------|----------|
| ❌ `auth_failure` | Sessão corrompida | Apague `.wwebjs_auth` e gere um novo QR Code |
| 🤳 QR Code não aparece | Sessão anterior ainda ativa | Exclua a pasta `.wwebjs_auth` e reinicie |
| 📂 `SQLITE_BUSY` | Banco sendo acessado por outro processo | Feche processos paralelos e reinicie |
| 🛑 Servidor cai após login | Instabilidade na sessão | Reinicie o projeto e aguarde reconexão |

---

## 📈 Melhorias Futuras

- Envio de mídias (imagens, PDFs, áudios, vídeos)  
- Histórico completo de mensagens enviadas  
- Controle de múltiplas contas de WhatsApp  
- Dashboard com estatísticas de envios  
- Exportação de logs e backups do banco  

---

## 📜 Licença

Este projeto é de uso **pessoal e privado** do autor **Lucas Dias**.  
Distribuição ou uso comercial não autorizado é proibido.

---
