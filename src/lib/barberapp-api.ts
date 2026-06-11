import { apiEnvironment, barberAppEndpoints } from "@/lib/api-contract";

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  nome: string;
  email: string;
  roles: string[];
  expiraEm: string;
};

export type AuthTokenClaims = {
  nameId?: string;
  email?: string;
  name?: string;
  role?: string;
  barbeiroId?: string;
  exp?: number;
};

export type RegistroRequest = {
  nomeCompleto: string;
  email: string;
  telefone: string;
  password: string;
};

export type CriarBarbeiroRequest = {
  nomeCompleto: string;
  email: string;
  telefone: string;
  senha: string;
  foto?: string | null;
};

export type CriarServicoRequest = {
  nome: string;
  preco: number;
  duracaoMinutos: number;
  descricao?: string | null;
};

export type CriarAgendamentoRequest = {
  barbeiroId: string;
  servicoId: string;
  dataHora: string;
  observacao?: string | null;
};

export type CriarDisponibilidadeRequest = {
  diaSemana: string;
  horarioInicio: string;
  horarioFim: string;
};

export type HorariosDisponiveisParams = {
  barbeiroId: string;
  servicoId: string;
  data: string;
};

export type AtualizarPerfilRequest = {
  nomeCompleto: string;
  telefone: string;
};

export type AlterarSenhaRequest = {
  senhaAtual: string;
  novaSenha: string;
};

export class BarberAppApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BarberAppApiError";
    this.status = status;
  }
}

const authTokenKey = "barberapp.auth.token";
const authRoleKey = "barberapp.auth.role";
export const authChangedEvent = "barberapp.auth.changed";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(authTokenKey);
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(authTokenKey, token);
}

export function getStoredRole() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(authRoleKey);
}

export function setStoredRole(role: string) {
  window.localStorage.setItem(authRoleKey, role);
  window.dispatchEvent(new Event(authChangedEvent));
}

export function clearStoredToken() {
  window.localStorage.removeItem(authTokenKey);
  window.localStorage.removeItem(authRoleKey);
  window.dispatchEvent(new Event(authChangedEvent));
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");
  if (!payload) return null;

  const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json = window.atob(normalizedPayload);

  return JSON.parse(json) as Record<string, unknown>;
}

export function getStoredTokenClaims(): AuthTokenClaims | null {
  const token = getStoredToken();
  if (!token || typeof window === "undefined") return null;

  try {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;

    return {
      nameId: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] as string | undefined,
      email: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] as string | undefined,
      name: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as string | undefined,
      role: payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] as string | undefined,
      barbeiroId: payload.BarbeiroId as string | undefined,
      exp: payload.exp as number | undefined,
    };
  } catch {
    return null;
  }
}

function buildUrl(path: string) {
  return `${apiEnvironment.baseUrl}${path}`;
}

async function request<TResponse>(path: string, init: RequestInit = {}) {
  const token = getStoredToken();
  const headers = new Headers(init.headers);

  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set(apiEnvironment.authHeaderName, `${apiEnvironment.tokenPrefix} ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.mensagem ?? data?.title ?? "Falha ao chamar API";
    throw new BarberAppApiError(message, response.status);
  }

  return data as TResponse;
}

export const barberAppApi = {
  async login(payload: LoginRequest) {
    const auth = await request<AuthResponse>(barberAppEndpoints.auth.login, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setStoredToken(auth.token);
    setStoredRole(auth.roles[0] ?? "Cliente");
    return auth;
  },

  async register(payload: RegistroRequest) {
    const auth = await request<AuthResponse>(barberAppEndpoints.auth.register, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setStoredToken(auth.token);
    setStoredRole(auth.roles[0] ?? "Cliente");
    return auth;
  },

  getPerfil<TResponse>() {
    return request<TResponse>(barberAppEndpoints.perfil);
  },

  getMeuPerfilCliente<TResponse>() {
    return request<TResponse>(barberAppEndpoints.meuPerfilCliente);
  },

  atualizarPerfil<TResponse>(payload: AtualizarPerfilRequest) {
    return request<TResponse>(barberAppEndpoints.perfil, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  alterarSenha<TResponse>(payload: AlterarSenhaRequest) {
    return request<TResponse>(`${barberAppEndpoints.perfil}/alterar-senha`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  getBarbeiros<TResponse>() {
    return request<TResponse>(barberAppEndpoints.barbeiros);
  },

  createBarbeiro<TResponse>(payload: CriarBarbeiroRequest) {
    return request<TResponse>(barberAppEndpoints.barbeiros, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getServicos<TResponse>() {
    return request<TResponse>(barberAppEndpoints.servicos);
  },

  createServico<TResponse>(payload: CriarServicoRequest) {
    return request<TResponse>(barberAppEndpoints.servicos, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getAgendamentos<TResponse>() {
    return request<TResponse>(barberAppEndpoints.agendamentos);
  },

  createAgendamento<TResponse>(payload: CriarAgendamentoRequest) {
    return request<TResponse>(barberAppEndpoints.agendamentos, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  confirmarAgendamento<TResponse>(id: string) {
    return request<TResponse>(barberAppEndpoints.confirmarAgendamento(id), {
      method: "PATCH",
    });
  },

  cancelarAgendamento<TResponse>(id: string) {
    return request<TResponse>(barberAppEndpoints.cancelarAgendamento(id), {
      method: "PATCH",
    });
  },

  pagarAgendamento<TResponse>(id: string) {
    return request<TResponse>(barberAppEndpoints.pagamento(id), {
      method: "POST",
    });
  },

  getHorariosDisponiveis<TResponse>(params: HorariosDisponiveisParams) {
    const search = new URLSearchParams(params);
    return request<TResponse>(`${barberAppEndpoints.horariosDisponiveis}?${search.toString()}`);
  },

  getDisponibilidades<TResponse>(barbeiroId: string) {
    return request<TResponse>(barberAppEndpoints.disponibilidades(barbeiroId));
  },

  createDisponibilidade<TResponse>(barbeiroId: string, payload: CriarDisponibilidadeRequest) {
    return request<TResponse>(barberAppEndpoints.disponibilidades(barbeiroId), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
