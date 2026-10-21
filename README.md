# Solutech — Assistência Técnica (HTML, CSS e JavaScript)

Site institucional responsivo com painel demonstrativo de ordens de serviço, impressão de OS e dados empresariais configuráveis.

## Arquivos
- `index.html`: página pública
- `admin.html`: painel de demonstração
- `css/style.css`: identidade visual azul-marinho, ciano e branco
- `js/app.js`: menu mobile e formulário de contato que prepara uma mensagem de WhatsApp
- `js/admin.js`: login demonstrativo, CRUD de ordens, dashboard, exportação JSON e impressão
- `logo-solutech.png`: logo fornecida

## Executar
Abra `index.html` no navegador ou use a extensão Live Server no VS Code. Não há etapa de build.

## Acesso de demonstração
- Usuário: `admin`
- Senha: `solutech2026`

## Importante — armazenamento e segurança
Esta versão é 100% front-end. Ordens e dados da empresa ficam no `localStorage` do navegador, e a sessão de demonstração fica no `sessionStorage`. Isso significa:
- os dados não sincronizam entre computadores ou navegadores;
- limpar os dados do navegador pode apagar os registros;
- o login é apenas uma demonstração, não é autenticação segura;
- não cadastre dados pessoais reais ou informações sensíveis nesta versão.

Para produção, conecte o front-end a um backend com autenticação real e banco de dados (por exemplo, Supabase). Configure regras de acesso/RLS e nunca coloque chaves secretas no JavaScript do navegador. O Vercel hospeda estes arquivos estáticos, mas não executa PHP. O formulário usa um número de WhatsApp fictício em `js/app.js`; troque `5587999990101` pelo número oficial antes de publicar.

## Publicar no GitHub e Vercel
1. Crie um repositório GitHub e envie os arquivos desta pasta.
2. No Vercel, importe o repositório.
3. Framework preset: `Other`; Build Command: deixe vazio; Output Directory: `.`.
4. Publique. Para testar localmente, também pode usar Live Server.

## Dados fictícios
Endereço: Rua Joaquim Godoy, 145 — Centro, Serra Talhada - PE.
Telefone: (87) 99999-0101.
E-mail: contato@solutech.example.
CNPJ: 00.000.000/0001-00.
Substitua os dados fictícios antes de usar comercialmente.
