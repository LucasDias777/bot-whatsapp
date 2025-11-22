# 🤖 Bot WhatsApp – Agendador Automático de Mensagens com Painel Web

Projeto completo para **envio automático e imediato de mensagens WhatsApp**, com **painel web** para gerenciamento de contatos, mensagens, grupos e agendamentos.

Biblioteca principal utilizada: **whatsapp-web.js** — [https://wwebjs.dev/](https://wwebjs.dev/)

---

## 📌 Visão Geral

* **Backend:** Express + Node + whatsapp-web.js + SQLite + node-cron
* **Frontend:** React + Vite + React Router
* **Raiz do Projeto:** Script unificado via `concurrently` para rodar Backend + Frontend

---

## 🔗 Repositório Oficial

Clonar diretamente pelo GitHub:
**[GITHUB LUCAS DO BOT WHATSAPP ](https://github.com/LucasDias777/bot-whatsapp)**

---

## 🗂️ Estrutura do Projeto (Atualizada)

```
bot-whatsapp/
│
├── backend/
│   ├── database/          # banco SQLite + scripts de criação de tabelas
│   ├── .wwebjs_auth/      # sessão persistente do WhatsApp (NÃO subir ao Git)
│   ├── .wwebjs_cache/     # cache do WhatsApp (NÃO subir ao Git)
│   ├── agenda.js          # agendador usando node-cron
│   ├── envio.js           # envio rápido + validações de números
│   ├── painel.js          # rotas que atendem o frontend
│   ├── app.js             # inicialização do Express + whatsapp-web.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/        # imagens do projeto
│   │   ├── components/    # componentes reutilizáveis
│   │   ├── context/       # contexts para atualizar listas/estados
│   │   ├── hooks/         # hooks personalizados
│   │   ├── pages/         # páginas do sistema
│   │   ├── services/      # requisições GET/POST/DELETE
│   │   ├── styles/        # CSS global
│   │   ├── App.jsx        # rotas principais
│   │   └── main.jsx       # inicialização do React
│   └── package.json
│
├── package.json           # scripts que rodam backend + frontend juntos
└── README.md
```

---

## 🧭 Descrição dos Principais Arquivos (Backend)

* **app.js**
Inicia Express, carrega middlewares e conecta com whatsapp-web.js.

* **painel.js**
API usada pelo frontend (QR Code, contatos, mensagens, agendamentos).

* **envio.js**
Envio rápido + validações antes do disparo.

* **agenda.js**
Agendador usando node-cron que verifica o banco constantemente.

* **database/**
Arquivos SQLite + scripts de criação de tabelas.

---

## 🧩 Tecnologias Utilizadas

### **Backend**

* Express
* whatsapp-web.js
* node-cron
* sqlite3
* qrcode / qrcode-terminal
* CORS

### **Frontend**

* React 18
* Vite
* React Router DOM

### **Raiz do Projeto**

* concurrently (para rodar backend + frontend com um único comando)

---

## 💻 Requisitos

* **Node.js (v18+) instalado — [INSTALAR NODE](https://nodejs.org/pt/download)**
* **Git (para clonar o projeto) — [INSTALAR GIT](https://git-scm.com/install/windows)**
* Navegador moderno

---

## 🛠️ Instalação Passo a Passo

1️⃣ Clone o repositório:

```bash
git clone https://github.com/LucasDias777/bot-whatsapp.git
cd bot-whatsapp
```

2️⃣ Instale dependências do Backend:

```bash
cd backend
npm install
```

3️⃣ Instale dependências do Frontend:

```bash
cd ../frontend
npm install
```

4️⃣ Volte para a raiz e execute tudo junto:

```bash
cd ..
npm run dev
```

### 🔥 Após iniciar:

* Backend → [http://localhost:3000](http://localhost:3000)
* Frontend → [http://localhost:5173](http://localhost:5173) (porta padrão do Vite)

---

## 🚀 Uso do Painel Web

1. Acesse: **[http://localhost:5173](http://localhost:5173)**
2. O painel se comunica automaticamente com o backend (porta 3000)
3. Na primeira execução, será exibido o **QR Code no painel**
4. Escaneie via WhatsApp: *Aparelhos Conectados → Conectar Aparelho*
5. A sessão será salva e não pedirá QR Code novamente

Para encerrar a sessão: vá em *Aparelhos Conectados* no WhatsApp e finalize manualmente.

---

## 🔐 Segurança

Não envie para o GitHub:

```
backend/.wwebjs_auth/
backend/.wwebjs_cache/
backend/database/database.db
```

Esses arquivos contêm **sessão do WhatsApp** + **dados reais**.

---

## 🔮 Melhorias Futuras

* Autenticação por usuário/senha no painel
* Dashboard com métricas
* Suporte a banco remoto (Postgres / MySQL)
* Filas de envio em massa
* WebSockets para atualizações em tempo real

---

## 📝 Licença

Projeto privado — desenvolvido por **Lucas Dias**.