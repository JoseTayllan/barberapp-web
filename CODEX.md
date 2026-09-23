# CODEX.md

Este arquivo orienta qualquer agente que altere este frontend. Leia-o antes de editar código e mantenha as decisões abaixo alinhadas com o estado real do repositório.

## Visão geral da arquitetura

O BarberApp Web é uma aplicação Next.js 16 com React 19 e TypeScript em modo `strict`, usando o App Router. Hoje há uma única rota pública, `src/app/page.tsx` (`/`), que monta `ClientMobileApp`. O layout raiz aplica metadados, idioma e o tema white-label. Não existe React Router nem outra biblioteca de roteamento: as telas de cliente, administrador e barbeiro são selecionadas no cliente por estado local e renderização condicional. O papel salvo após a autenticação determina se `ClientMobileApp` entrega a experiência de cliente, `AdminApp` ou `BarberProfileApp`.

Os três arquivos em `src/components/` funcionam como containers de cada experiência. Eles concentram navegação interna, estado, carregamento, mutações e composição de subcomponentes de tela definidos no mesmo arquivo. O estado é local, com hooks nativos (`useState`, `useEffect`, `useMemo`, `useCallback` e `useSyncExternalStore`); não há Redux, Zustand, Context global nem biblioteca de cache de servidor. A autenticação usa JWT e papel persistidos em `localStorage`, e um evento customizado sincroniza mudanças de sessão na aba.

Toda comunicação REST deve passar por `src/lib/barberapp-api.ts`. Esse módulo adiciona headers, injeta o bearer token, normaliza erros e expõe operações de domínio. Os caminhos ficam centralizados em `src/lib/api-contract.ts`; tipos de domínio compartilhados ficam em `src/lib/barberapp-types.ts`; adaptações de respostas incompletas são feitas nos containers antes de chegar à UI. O proxy local `/backend` aponta para `http://127.0.0.1:5087` por um rewrite em `next.config.ts`.

A identidade white-label fica em `src/brand/client-brand.ts`. O tema selecionado é aplicado como `data-theme` no elemento `<html>`, e `src/app/globals.css` implementa todo o design com CSS global, classes semânticas e custom properties. Não há biblioteca de componentes, CSS Modules, Tailwind, Sass, CSS-in-JS ou pacote de ícones.

### Estrutura atual

```text
src/
├── app/
│   ├── globals.css       # tokens, temas, componentes visuais e responsividade
│   ├── layout.tsx        # layout, metadata e aplicação do tema
│   └── page.tsx          # única rota; monta a aplicação cliente
├── brand/
│   └── client-brand.ts   # configuração white-label e ambiente público
├── components/
│   ├── admin-app.tsx
│   ├── barber-profile-app.tsx
│   └── client-mobile-app.tsx
└── lib/
    ├── api-contract.ts   # endpoints e referências aos mocks
    ├── barberapp-api.ts  # sessão, cliente HTTP e operações REST
    ├── barberapp-types.ts
    └── mock-data.ts
```

Observação importante: `NEXT_PUBLIC_DATA_MODE` e `mock-data.ts` existem, mas o cliente HTTP não possui atualmente um desvio para modo mock. As telas chamam `barberAppApi`, que sempre usa `fetch`. Não assuma que `NEXT_PUBLIC_DATA_MODE=mock` torna a aplicação independente do backend sem implementar e testar essa integração.

## Stack e decisões vigentes

- Framework: Next.js 16, App Router.
- UI/runtime: React 19 e React DOM 19.
- Linguagem: TypeScript 6, `strict: true`, sem emissão pelo compilador.
- Pacotes: npm, com `package-lock.json` versionado.
- Estado: hooks nativos e `localStorage` para sessão; sem gerenciador externo.
- Roteamento: somente App Router na raiz; telas internas por estado local.
- Dados: `fetch` encapsulado por `barberAppApi`; REST + JWT bearer.
- Styling/design system: CSS global próprio, custom properties por tema e classes em kebab-case.
- Qualidade: ESLint 9 com `eslint-config-next/core-web-vitals` e regras TypeScript do Next.
- Testes e Storybook: não configurados no estado atual.

## Convenções obrigatórias

### Organização e responsabilidades

- Use o alias `@/*` para imports a partir de `src`; evite subir diretórios com cadeias de `../`.
- Mantenha configuração da marca exclusivamente em `src/brand/client-brand.ts`. Não espalhe nome, domínio, telefone, cores ou URL-base da API pelos componentes.
- Centralize caminhos de endpoints em `src/lib/api-contract.ts` e chamadas HTTP em `src/lib/barberapp-api.ts`. Componentes nunca devem chamar `fetch` diretamente.
- Coloque tipos de domínio reutilizados por mais de uma experiência em `src/lib/barberapp-types.ts`. Tipos exclusivos de uma tela podem permanecer próximos do componente.
- Normalize DTOs da API em funções explícitas antes de armazená-los como tipos de domínio. Não masque campos ausentes com casts amplos.
- Preserve a separação atual entre containers de perfil (`ClientMobileApp`, `AdminApp`, `BarberProfileApp`) e telas apresentacionais. Ao adicionar uma tela ou fluxo substancial, prefira um arquivo próprio em vez de ampliar ainda mais esses arquivos grandes; mantenha carregamento e mutações no container ou em um hook dedicado.
- Use `"use client"` somente em módulos que realmente dependam de hooks, eventos ou APIs do navegador. Mantenha componentes como Server Components quando isso for possível.

### Nomeação e formato

- Arquivos de componentes e módulos: kebab-case, por exemplo `barber-profile-app.tsx`.
- Componentes e tipos: PascalCase. Funções, handlers, variáveis e propriedades: camelCase.
- Hooks customizados devem começar com `use` e encapsular comportamento reutilizável, não apenas renomear uma chamada simples.
- Handlers devem indicar a ação (`handleCreateService`, `handleLogout`); carregadores assíncronos devem usar o prefixo `load`.
- Classes CSS devem usar kebab-case e descrever função/estado (`booking-review`, `is-loading`, `selected`). Reutilize classes estruturais existentes antes de criar variantes quase idênticas.
- Siga a formatação já adotada: aspas duplas, ponto e vírgula, vírgula final em estruturas multilinha e imports agrupados no topo.

### TypeScript, React e dados

- Preserve `strict: true`; não introduza `any`, `@ts-ignore` ou coerções inseguras para contornar contratos.
- Prefira `import type` para imports usados apenas pelo sistema de tipos.
- Tipar props explicitamente e manter contratos pequenos. Estados finitos devem ser uniões literais, como os tipos de tela, papel e status existentes.
- Não mutar arrays ou objetos guardados em estado; crie novas coleções ao ordenar, filtrar ou atualizar.
- Efeitos devem declarar dependências corretas. Funções assíncronas reutilizadas por efeitos devem ser estáveis quando necessário (`useCallback`).
- Toda operação remota precisa tratar carregamento, sucesso e erro, mantendo mensagens adequadas ao usuário e sem expor detalhes internos do backend.
- Datas exibidas ao usuário devem respeitar `America/Sao_Paulo`; valores enviados à API devem manter o contrato existente. Valores monetários usam `Intl.NumberFormat` com `pt-BR` e `BRL`.
- O token e o papel usam as chaves e helpers de `barberapp-api.ts`. Não leia ou grave diretamente outras chaves de autenticação em componentes.

### CSS e interface

- Cores, superfícies, raios e demais decisões de tema devem usar custom properties. Ao criar um token de cor obrigatório, forneça valor coerente para todos os temas em `globals.css`.
- Preserve a abordagem responsiva/mobile-first e valide pelo menos os breakpoints atuais: até `480px`, até `860px` e a faixa `861px–1120px`.
- Evite estilos inline para decisões visuais permanentes. Use classes em `globals.css` enquanto esta for a estratégia do projeto.
- Mantenha HTML semântico, `aria-label` em navegações/controles que precisem de contexto, `type="button"` em botões que não submetem formulário e estados `disabled` durante mutações.
- Não introduza uma biblioteca de UI, styling ou ícones sem necessidade comprovada e avaliação do impacto no bundle e na identidade white-label.

## Comandos essenciais

Pré-requisito documentado: Node.js 20 ou superior e npm.

```bash
npm ci             # instala exatamente o package-lock.json
npm run dev        # servidor de desenvolvimento em http://localhost:3000
npm run build      # build otimizado de produção
npm run start      # serve o build de produção
npm run lint       # ESLint em todo o repositório
npx tsc --noEmit   # verificação de tipos explícita (não há script typecheck)
```

Crie `.env.local` a partir de `.env.example` quando usar a API:

```env
NEXT_PUBLIC_API_BASE_URL=/backend
NEXT_PUBLIC_DATA_MODE=api
```

Não existem scripts `test`, `test:e2e` ou `storybook`, nem arquivos de configuração de Jest, Vitest, Testing Library, Playwright, Cypress ou Storybook. Portanto, esses comandos não devem ser citados como disponíveis nem ter sucesso presumido.

## Estratégia de testes

O repositório ainda não possui infraestrutura nem testes automatizados. Até que ela seja criada, a validação mínima de qualquer mudança é `npm run lint`, `npx tsc --noEmit` e `npm run build`, acompanhada de verificação manual responsiva e dos três papéis afetados.

Ao introduzir a primeira suíte, use uma decisão explícita e documentada, adicione scripts ao `package.json` e cubra estas camadas:

- unitário: normalizadores, formatação, regras de status/data e tratamento de erros;
- componente: estados de carregamento, erro, vazio e sucesso, navegação interna, formulários e acessibilidade;
- e2e: autenticação e redirecionamento por papel, criação/confirmação/cancelamento/pagamento de agendamento, cadastros administrativos e expediente do barbeiro.

Todo comportamento novo ou correção de bug deve vir com teste automatizado. Se a infraestrutura necessária ainda não existir, configurá-la faz parte da mudança; não deixe apenas um teste manual como solução permanente.

## Regras de ouro — nunca fazer

- Nunca alterar props, tipos ou comportamento de um componente compartilhado sem localizar e avaliar todos os usos.
- Nunca chamar uma API diretamente de um componente, hardcodar URL/endpoints ou duplicar lógica de autenticação fora da camada de serviço.
- Nunca alterar um contrato de endpoint ou DTO com base em suposição; confira backend/contrato e adapte a resposta de forma tipada.
- Nunca colocar segredo em variável `NEXT_PUBLIC_*`, no código, em mocks ou no repositório. Tudo com esse prefixo é público no bundle do navegador.
- Nunca registrar JWT, senha, payload sensível ou resposta completa de autenticação em console, mensagem de erro ou fixture versionada.
- Nunca considerar a presença de `NEXT_PUBLIC_DATA_MODE=mock` como suporte funcional a mocks enquanto o cliente HTTP não implementar esse caminho.
- Nunca introduzir `any`, desabilitar regras de lint/TypeScript ou usar cast para esconder incompatibilidade sem justificar e corrigir a causa.
- Nunca mutar estado React diretamente, disparar efeitos sem dependências corretas ou deixar promessas de mutação sem tratamento de erro e estado de carregamento.
- Nunca adicionar um fluxo/componente sem cobrir carregamento, erro, vazio, sucesso, acessibilidade e responsividade relevantes.
- Nunca entregar comportamento novo ou correção sem teste automatizado; se for a primeira mudança testada, inclua a configuração mínima da suíte.
- Nunca mudar tokens, temas ou dados white-label em apenas um ponto visual. Use `client-brand.ts` e custom properties e confira todos os temas.
- Nunca adicionar dependência, framework de estado, roteador ou design system para resolver um caso isolado sem avaliar manutenção, bundle e consistência arquitetural.
- Nunca afirmar que lint, tipos, build ou testes passaram se o comando correspondente não foi executado com dependências instaladas.

## Checklist antes de entregar uma mudança

1. Identifique quais papéis e telas usam o contrato alterado.
2. Mantenha UI, estado, normalização e acesso à API nas respectivas camadas.
3. Adicione ou atualize testes proporcionais ao fluxo.
4. Execute `npm run lint`, `npx tsc --noEmit` e `npm run build`.
5. Verifique estados assíncronos, acessibilidade, tema e layouts mobile/desktop.
6. Documente qualquer novo script, variável de ambiente, endpoint ou decisão arquitetural.
