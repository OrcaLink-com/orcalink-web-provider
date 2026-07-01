# orca-link-provider

App do **Prestador** do OrcaLink (React + Vite + Capacitor). Roda na porta **5174**.

## Pré-requisitos
- Node 20+ e o backend `api/` rodando (http://localhost:3000) com CORS liberado para 5174.

## Setup
```bash
cp .env.example .env          # (Windows: copy .env.example .env)
npm install
npm run dev                   # http://localhost:5174
```

## Acesso
- **Primeiro acesso (convite):** abra o link `http://localhost:5174/?token=<TOKEN>` gerado pelo admin
  (`POST /admin/invites`). Complete o cadastro → status `PENDING_APPROVAL`.
- **Após aprovação** (admin aprova em `/admin/providers/:id/approve`): o app libera Oportunidades/Conversas.
- **Logins seguintes:** OTP por e-mail/telefone (o usuário já existe como `PROVIDER`).

## Telas
- **Oportunidades** — orçamentos abertos; iniciar conversa / propor.
- **Conversas** — chats com clientes; enviar mensagem e **proposta**.

## Tipos da API
```bash
npm run gen:api   # gera src/lib/api-schema.d.ts a partir de ../api/openapi.json
```

Compartilha a marca via `@orcalink/design-tokens` (`file:../design-tokens`).
