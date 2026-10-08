# Gestão Financeira Matrimonial

Aplicativo financeiro compartilhado de Danilo e Thayna.

**Fonte oficial do projeto:** este repositório + GitHub Pages + Supabase. A antiga versão hospedada no Lovable não é mais a versão de desenvolvimento; ela pode servir apenas como referência visual.

- Frontend estático hospedado no GitHub Pages.
- Dados e autenticação no Supabase/PostgreSQL.
- RLS por família; nenhum segredo de servidor é exposto no navegador.
- Alterações de interface e funcionalidades são feitas diretamente neste repositório, sem depender de créditos de edição do Lovable.
- Saldos individuais e familiar, lançamentos, transferências, cartões e parcelas, reembolsos, metas, recorrências, renegociações, conciliação, alertas e exportação CSV.

A chave Supabase presente no frontend é **publishable** e foi projetada para uso em cliente. O acesso aos dados é protegido por autenticação e políticas RLS.
