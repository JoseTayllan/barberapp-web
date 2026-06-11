# BarberApp Web

Frontend responsivo e white-label para gestao de barbearias, desenvolvido com Next.js, React e TypeScript.

O projeto oferece experiencias especificas para clientes, barbeiros e administradores. Sua identidade visual pode ser adaptada para diferentes estabelecimentos por meio da troca centralizada de marca, dominio e paleta de cores.

## Visao geral

O BarberApp Web foi criado com foco em uso mobile, sem deixar de oferecer uma experiencia completa em desktop. A aplicacao consome a API do BarberApp e possui suporte a dados simulados para desenvolvimento e validacao visual.

### Cliente

- Cadastro e autenticacao
- Visualizacao da barbearia, servicos e profissionais
- Consulta de barbeiros e horarios disponiveis por data
- Criacao, acompanhamento e cancelamento de agendamentos
- Pagamento de agendamentos
- Edicao de perfil e alteracao de senha

### Barbeiro

- Fila de atendimentos do dia
- Agenda aberta e historico de atendimentos
- Visualizacao de clientes, servicos e pagamentos
- Configuracao do expediente semanal
- Consulta dos dados profissionais

### Administrador

- Painel com indicadores operacionais
- Cadastro e acompanhamento de barbeiros
- Cadastro e gerenciamento de servicos
- Consulta de agendamentos com filtros
- Metricas de servicos e dias mais movimentados
- Consulta de clientes e historico individual

## Tecnologias

- Next.js com App Router
- React
- TypeScript
- CSS responsivo com propriedades customizadas
- API REST com autenticacao JWT
- ESLint

## Identidade white-label

As configuracoes da marca ficam centralizadas em [`src/brand/client-brand.ts`](src/brand/client-brand.ts).

Para personalizar o produto para outra barbearia, altere:

- Nome comercial e razao exibida
- Iniciais ou marca do logotipo
- Tema e paleta de cores
- Cidade, telefone e dominio
- Endereco da API

Os temas visuais sao aplicados por propriedades CSS definidas em [`src/app/globals.css`](src/app/globals.css). Essa estrutura permite utilizar o mesmo produto em dominios diferentes com identidade propria para cada cliente.

## Requisitos

- Node.js 20 ou superior
- npm
- API BarberApp em execucao para o modo integrado

## Configuracao

1. Instale as dependencias:

```bash
npm install
```

2. Crie o arquivo `.env.local` com base em `.env.example`:

```env
NEXT_PUBLIC_API_BASE_URL=/backend
NEXT_PUBLIC_DATA_MODE=api
```

Valores aceitos em `NEXT_PUBLIC_DATA_MODE`:

- `api`: utiliza o backend real
- `mock`: utiliza os dados locais de demonstracao

3. Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

4. Acesse [http://localhost:3000](http://localhost:3000).

Por padrao, o proxy de desenvolvimento encaminha as requisicoes de `/backend` para a API em `http://127.0.0.1:5087`.

## Scripts

| Comando | Descricao |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera a versao otimizada para producao |
| `npm run start` | Inicia a aplicacao em modo de producao |
| `npm run lint` | Executa a analise estatica do codigo |

## Estrutura principal

```text
src/
|-- app/          # Layout, pagina inicial e estilos globais
|-- brand/        # Configuracao white-label da marca
|-- components/   # Interfaces de cliente, barbeiro e administrador
`-- lib/          # Cliente HTTP, contratos, tipos e dados simulados
```

## Integracao com o backend

Os endpoints consumidos pelo frontend estao centralizados em [`src/lib/api-contract.ts`](src/lib/api-contract.ts), enquanto requisicoes, sessao JWT e tratamento de erros ficam em [`src/lib/barberapp-api.ts`](src/lib/barberapp-api.ts).

Em producao, configure `NEXT_PUBLIC_API_BASE_URL` de acordo com o dominio ou gateway utilizado no deploy.

## Responsividade

A interface foi projetada com prioridade para celulares, considerando que clientes e barbeiros utilizam o sistema principalmente em dispositivos moveis. Os paineis administrativos tambem se adaptam a tablets e desktops.

## Autor

Desenvolvido por **José Tayllan Pinto Almeida**.

## Licenca

Este projeto e de uso privado. A redistribuicao, comercializacao ou modificacao por terceiros depende de autorizacao do autor.
