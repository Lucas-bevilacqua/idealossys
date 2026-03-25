# Como Publicar o IdealOS no Railway

> Guia passo a passo para quem não é técnico. Siga na ordem e tudo vai funcionar.

---

## O que você vai precisar

- Uma conta gratuita no [Railway.app](https://railway.app) (crie com o Google ou GitHub)
- Uma conta no [GitHub.com](https://github.com) (para guardar o código — se o código ainda não estiver lá)
- Sua chave da API do Gemini (veja como pegar abaixo)

---

## Visão geral do processo

```
GitHub (código) → Railway (hospedagem) → PostgreSQL (banco de dados)
```

O Railway cuida de tudo: instala as dependências, compila o frontend React,
inicia o servidor Python e conecta ao banco. Você só precisa das variáveis.

---

## Parte 1 — Pegar a chave do Gemini

1. Acesse [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Clique em **"Create API key"**
3. Copie a chave gerada (começa com `AIza...`)
4. Guarde em algum lugar seguro — você vai usar ela na Parte 5

---

## Parte 2 — Colocar o código no GitHub

Se o código já está no GitHub, pule para a **Parte 3**.

1. Crie uma conta em [github.com](https://github.com) se ainda não tiver
2. Clique em **"New repository"** (botão verde no canto superior direito)
3. Dê um nome (ex: `idealos`)
4. Deixe como **Private** (privado)
5. Clique em **"Create repository"**
6. Siga as instruções mostradas na página para enviar os arquivos do projeto para o GitHub

---

## Parte 3 — Criar o projeto no Railway

1. Acesse [railway.app](https://railway.app) e faça login
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Autorize o Railway a acessar seu GitHub (botão verde)
5. Selecione o repositório do IdealOS
6. Railway vai detectar o projeto automaticamente — clique em **"Deploy"**

O Railway vai construir e iniciar o app. Isso leva alguns minutos na primeira vez.

---

## Parte 4 — Adicionar o banco de dados PostgreSQL

O IdealOS precisa de um banco de dados para salvar os projetos e usuários.

1. Dentro do seu projeto no Railway, clique em **"New"** (botão no canto superior)
2. Selecione **"Database"** → **"PostgreSQL"**
3. Railway cria o banco e conecta automaticamente ao seu app
4. O Railway preenche a variável `DATABASE_URL` sozinho — você não precisa fazer nada aqui

---

## Parte 5 — Configurar as variáveis de ambiente

Estas são as "configurações secretas" do app. Você precisa adicioná-las manualmente.

1. No Railway, clique no serviço do seu app (não no PostgreSQL)
2. Clique na aba **"Variables"**
3. Adicione cada variável abaixo clicando em **"New Variable"**:

| Nome da variável | Valor |
|---|---|
| `GEMINI_API_KEY` | A chave que você copiou na Parte 1 |
| `SECRET_KEY` | Clique [aqui](https://generate-secret.vercel.app/64) para gerar uma chave forte e cole o resultado neste campo |
| `ENVIRONMENT` | `production` |
| `ALLOWED_ORIGINS` | Cole a URL do seu app (ex: `https://idealos.up.railway.app`) |
| `TRUSTED_HOSTS` | O domínio do seu app sem `https://` (ex: `idealos.up.railway.app`) |

> **Como saber a URL do seu app?**
> Clique na aba **"Settings"** do seu serviço → seção **"Domains"** → Railway mostra a URL gerada.
> Você pode usar essa URL no `ALLOWED_ORIGINS` e `TRUSTED_HOSTS`.

4. Após adicionar todas as variáveis, o Railway reinicia o app automaticamente.

---

## Parte 6 — Acessar o app

1. Clique na aba **"Settings"** → **"Domains"**
2. Clique na URL gerada (ex: `https://idealos-production.up.railway.app`)
3. O IdealOS vai abrir no navegador

**Login inicial:**
- Usuário: `admin`
- Senha: `idealos123`

> **Importante:** Troque a senha do admin logo após o primeiro login! Vá em Configurações → Conta.

---

## Solução de problemas

### O deploy falhou / app não abre

1. No Railway, clique no serviço do app
2. Clique na aba **"Deployments"**
3. Clique no deploy com erro (ícone vermelho)
4. Leia os logs — geralmente indicam o problema com clareza

### Esqueci de adicionar uma variável

1. Vá em **"Variables"**
2. Adicione a variável que faltou
3. O Railway reinicia sozinho — aguarde 1-2 minutos

### O app ficou lento ou travou

1. Vá em **"Metrics"** para ver o uso de memória
2. Se estiver no limite, clique em **"Settings"** → aumente o plano (Railway tem plano gratuito com $5/mês de crédito)

---

## Próximo passo (opcional) — Usar um domínio próprio (ex: meuapp.com.br)

1. Clique em **"Settings"** → **"Domains"** → **"Custom Domain"**
2. Siga as instruções para apontar seu domínio para o Railway
3. Atualize `ALLOWED_ORIGINS` e `TRUSTED_HOSTS` com o novo domínio
