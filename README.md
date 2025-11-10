# 🤖 Bot WhatsApp – Agendador Automático de Mensagens

Este projeto é um bot para WhatsApp desenvolvido com **Node.js** utilizando a biblioteca [`whatsapp-web.js`](https://wwebjs.dev/).  
Ele permite **agendar envios automáticos de mensagens** para contatos específicos através de um arquivo JSON.

---

## 📑 Sumário

1. [Funcionalidades](#-funcionalidades)
2. [Tecnologias Utilizadas](#-tecnologias-utilizadas)
3. [Estrutura do Projeto](#-estrutura-do-projeto)
4. [Instalação e Configuração](#-instalação-e-configuração)
5. [Como Rodar o Projeto](#-como-rodar-o-projeto)
6. [Gerenciando Agendamentos](#-gerenciando-agendamentos)
7. [Evite subir dados sensíveis](#-evite-subir-dados-sensíveis)
8. [Possíveis Erros e Soluções](#-possíveis-erros-e-soluções)
9. [Licença](#-licença)
10. [Melhorias Futuras](#-melhorias-futuras)
11. [Suporte](#-suporte)

---

## 🚀 Funcionalidades

- ✅ Login persistente utilizando sessão local  
- 📲 QR Code para login (somente na primeira inicialização)  
- ⏰ Agendamento automático de mensagens usando `cron`  
- 🔁 Atualiza agendamentos sem reiniciar o bot  
- 🧠 Envia mensagem para contatos salvos ou números diretos  
- 🛡️ Evita envio para o próprio número do bot  

---

## 🧰 Tecnologias Utilizadas

| Tecnologia | Descrição |
|------------|------------|
| Node.js | Ambiente de execução |
| whatsapp-web.js | Integração com o WhatsApp Web |
| node-cron | Agendador de tarefas |
| qrcode-terminal | Exibição do QR Code no terminal |
| fs / path | Leitura e manipulação de arquivos |

---

## 📂 Estrutura do Projeto

```
bot-whatsapp/
│
├── agendamentos.json       # Configurações dos envios automáticos
├── app.js                  # Código principal do bot
├── package.json

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

### 3️⃣ Crie o arquivo ou edite `agendamentos.json`

Modelo inicial:

```json
[
  {
    "hora": "08:31",
    "mensagem": "🚛 Olá! Mensagem automática de teste",
    "destinatarios": [
      { "nome": "NOME SALVO NOS CONTATOS", "numero": "NUMERO DO CONTATO EX: 5544997990099" }
    ]
  }
]
```

---

## ▶️ Como Rodar o Projeto

```bash
node app.js
```

Na primeira vez, será exibido um QR Code no terminal.  
Escaneie via WhatsApp: **Aparelhos Conectados → Conectar Aparelho**.

Após autenticado, o login será salvo e não precisará escanear novamente ✅

---

## 📝 Gerenciando Agendamentos

- Todas as tarefas são carregadas a partir do `agendamentos.json`
- Ao editar este arquivo e salvar, o bot detecta a mudança e recarrega automaticamente

📍 **Não é necessário reiniciar o projeto para aplicar alterações**

---

## 🛑 Evite vazar dados sensíveis

A sessão do WhatsApp é salva localmente nas pastas:

```
.wwebjs_auth/
.wwebjs_cache/
```
---

## ❗ Possíveis Erros e Soluções

| Erro | Causa | Solução |
|------|--------|----------|
| ❌ `auth_failure` | Sessão corrompida | Apague `.wwebjs_auth` e gere um novo QR Code |
| 📂 `agendamentos.json inválido` | JSON mal formatado | Use um validador de JSON antes de salvar |
| 🤳 QR Code não aparece | Sessão anterior ainda ativa | Remova a pasta `.wwebjs_auth` e reinicie |
| 🛑 Bot parou sozinho em servidor grátis | Serviço suspendeu | Migrar para VPS ou serviço de uptime |

---

## 📈 Melhorias Futuras

- Envio de mídia (imagens, PDFs, áudios)
- Painel Web para gerenciar agendamentos
- Histórico de mensagens enviadas (log)
- Agendamentos por data específica (e não apenas diário)
- Sistema de respostas automáticas e chatbot com IA

---

## 📜 Licença

Este projeto é de uso pessoal/privado do autor Lucas Dias.  

---