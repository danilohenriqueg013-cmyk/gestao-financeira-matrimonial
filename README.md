# Gestão Financeira Matrimonial

Aplicativo financeiro compartilhado de Danilo e Thayna.

- Frontend estático hospedado no GitHub Pages.
- Dados e autenticação no Supabase/PostgreSQL.
- RLS por família; nenhum segredo de servidor é exposto no navegador.
- Saldos individuais e familiar, lançamentos, transferências, cartões e parcelas, reembolsos, metas, recorrências, renegociações, conciliação, alertas e exportação CSV.

A chave Supabase presente no frontend é **publishable** e foi projetada para uso em cliente. O acesso aos dados é protegido por autenticação e políticas RLS.