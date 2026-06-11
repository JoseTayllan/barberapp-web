"use client";

import { useEffect, useMemo, useState } from "react";
import { clientBrand } from "@/brand/client-brand";
import { barberAppApi, clearStoredToken } from "@/lib/barberapp-api";
import type { Appointment, AppointmentStatus, Barber, Service } from "@/lib/barberapp-types";

type AdminScreen = "painel" | "barbeiros" | "servicos" | "agendamentos" | "clientes";

type AdminClientSummary = {
  id: string;
  nomeCompleto: string;
  telefone: string;
  totalAgendamentos: number;
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const localAppointmentTime = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function formatAppointmentTime(value: string) {
  return localAppointmentTime.format(new Date(value));
}

function adminError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (/api|entity changes|inner exception|exception|timestamp|postgres|npgsql/i.test(error.message)) {
    return fallback;
  }
  return error.message;
}

const navItems: Array<{ id: AdminScreen; label: string }> = [
  { id: "painel", label: "Painel" },
  { id: "barbeiros", label: "Barbeiros" },
  { id: "servicos", label: "Servicos" },
  { id: "agendamentos", label: "Agenda" },
  { id: "clientes", label: "Clientes" },
];

const adminRoleLabel = "Admin";

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
});

function countBy<T extends string>(items: T[]) {
  return items.reduce<Record<T, number>>(
    (acc, item) => {
      acc[item] = (acc[item] ?? 0) + 1;
      return acc;
    },
    {} as Record<T, number>,
  );
}

type ApiAppointment = Omit<Appointment, "pagamento"> & {
  pagamento?: Appointment["pagamento"];
};

type ApiBarber = Pick<Barber, "id" | "nome" | "telefone" | "foto">;

function normalizeAppointment(appointment: ApiAppointment): Appointment {
  return {
    ...appointment,
    pagamento: appointment.pagamento ?? "Pendente",
  };
}

function normalizeBarber(barber: ApiBarber): Barber {
  return {
    ...barber,
    agendaHoje: 0,
    ocupacao: 0,
  };
}

function getAvailableMonths(appointments: Appointment[]) {
  return Array.from(
    new Set(appointments.map((appointment) => appointment.dataHora.slice(0, 7))),
  ).sort((a, b) => b.localeCompare(a));
}

function topEntries<T extends string>(items: T[]): Array<[string, number]> {
  return (Object.entries(countBy(items)) as Array<[string, number]>)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 4);
}

export function AdminApp({ onLogout }: { onLogout?: () => void }) {
  const [screen, setScreen] = useState<AdminScreen>("painel");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [confirmingAppointmentId, setConfirmingAppointmentId] = useState<string | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isLoadingBarbers, setIsLoadingBarbers] = useState(false);
  const [isCreatingBarber, setIsCreatingBarber] = useState(false);
  const [barbersError, setBarbersError] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [servicesError, setServicesError] = useState("");

  const screenTitle = useMemo(() => {
    return navItems.find((item) => item.id === screen)?.label ?? "Painel";
  }, [screen]);

  async function loadAppointments() {
    setIsLoadingAppointments(true);
    setAppointmentsError("");

    try {
      const response = await barberAppApi.getAgendamentos<ApiAppointment[]>();
      setAppointments(response.map(normalizeAppointment));
    } catch (error) {
      setAppointmentsError(adminError(error, "Nao foi possivel carregar a agenda."));
    } finally {
      setIsLoadingAppointments(false);
    }
  }

  async function loadBarbers() {
    setIsLoadingBarbers(true);
    setBarbersError("");

    try {
      const response = await barberAppApi.getBarbeiros<ApiBarber[]>();
      setBarbers(response.map(normalizeBarber));
    } catch (error) {
      setBarbersError(adminError(error, "Nao foi possivel carregar barbeiros."));
    } finally {
      setIsLoadingBarbers(false);
    }
  }

  async function loadServices() {
    setIsLoadingServices(true);
    setServicesError("");

    try {
      const response = await barberAppApi.getServicos<Service[]>();
      setServices(response);
    } catch (error) {
      setServicesError(adminError(error, "Nao foi possivel carregar servicos."));
    } finally {
      setIsLoadingServices(false);
    }
  }

  async function handleCreateBarber(payload: {
    nomeCompleto: string;
    email: string;
    telefone: string;
    senha: string;
    foto?: string | null;
  }) {
    setIsCreatingBarber(true);
    setBarbersError("");

    try {
      await barberAppApi.createBarbeiro<unknown>(payload);
      await loadBarbers();
    } catch (error) {
      setBarbersError(adminError(error, "Nao foi possivel criar barbeiro."));
    } finally {
      setIsCreatingBarber(false);
    }
  }

  async function handleCreateService(payload: {
    nome: string;
    preco: number;
    duracaoMinutos: number;
    descricao?: string | null;
  }) {
    setIsCreatingService(true);
    setServicesError("");

    try {
      await barberAppApi.createServico<unknown>(payload);
      await loadServices();
    } catch (error) {
      setServicesError(adminError(error, "Nao foi possivel criar servico."));
    } finally {
      setIsCreatingService(false);
    }
  }

  async function handleConfirmAppointment(id: string) {
    setConfirmingAppointmentId(id);
    setAppointmentsError("");

    try {
      await barberAppApi.confirmarAgendamento<unknown>(id);
      await loadAppointments();
    } catch (error) {
      setAppointmentsError(adminError(error, "Nao foi possivel confirmar o agendamento."));
    } finally {
      setConfirmingAppointmentId(null);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadAppointments();
      void loadBarbers();
      void loadServices();
    });
  }, []);

  function handleLogout() {
    clearStoredToken();
    onLogout?.();
  }

  return (
    <main className="app-frame admin-mode">
      <header className="app-header">
        <a className="brand" href="#" onClick={() => setScreen("painel")} aria-label={clientBrand.name}>
          <span className="brand-mark">{clientBrand.logoMark}</span>
          <span>
            <strong>{clientBrand.name}</strong>
            <small>{clientBrand.legalName}</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Navegacao do administrador">
          {navItems.map((item) => (
            <button
              className={screen === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => setScreen(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="header-side">
          <span className="tenant-chip">{adminRoleLabel}</span>
          <button className="header-action" type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <section className="mobile-title">
        <span>Area administrativa</span>
        <h1>{screenTitle}</h1>
      </section>

      <section className="screen-shell">
        {screen === "painel" && (
          <DashboardScreen
            appointments={appointments}
            appointmentsError={appointmentsError}
            barbers={barbers}
            confirmingAppointmentId={confirmingAppointmentId}
            isLoadingAppointments={isLoadingAppointments}
            onConfirmAppointment={handleConfirmAppointment}
            onBarbers={() => setScreen("barbeiros")}
            onClients={() => setScreen("clientes")}
            onPending={() => setScreen("agendamentos")}
            onServices={() => setScreen("servicos")}
          />
        )}
        {screen === "barbeiros" && (
          <BarbersAdminScreen
            barbers={barbers}
            barbersError={barbersError}
            isCreatingBarber={isCreatingBarber}
            isLoadingBarbers={isLoadingBarbers}
            onCreateBarber={handleCreateBarber}
          />
        )}
        {screen === "servicos" && (
          <ServicesAdminScreen
            isCreatingService={isCreatingService}
            isLoadingServices={isLoadingServices}
            onCreateService={handleCreateService}
            services={services}
            servicesError={servicesError}
          />
        )}
        {screen === "agendamentos" && (
          <AppointmentsAdminScreen
            appointments={appointments}
            barbers={barbers}
            confirmingAppointmentId={confirmingAppointmentId}
            onConfirmAppointment={handleConfirmAppointment}
          />
        )}
        {screen === "clientes" && <ClientsAdminScreen appointments={appointments} />}
      </section>

      <footer className="app-footer">
        <div>
          <strong>{clientBrand.legalName}</strong>
          <small>Area administrativa</small>
        </div>
        <small>Gestao de equipe, catalogo e agendamentos.</small>
      </footer>

      <nav className="bottom-nav" aria-label="Navegacao mobile do administrador">
        {navItems.map((item) => (
          <button
            className={screen === item.id ? "active" : ""}
            key={item.id}
            type="button"
            onClick={() => setScreen(item.id)}
          >
            {item.label}
          </button>
        ))}
        <button type="button" onClick={handleLogout}>Sair</button>
      </nav>
    </main>
  );
}

function DashboardScreen({
  appointments,
  appointmentsError,
  barbers,
  confirmingAppointmentId,
  isLoadingAppointments,
  onConfirmAppointment,
  onBarbers,
  onClients,
  onPending,
  onServices,
}: {
  appointments: Appointment[];
  appointmentsError: string;
  barbers: Barber[];
  confirmingAppointmentId: string | null;
  isLoadingAppointments: boolean;
  onConfirmAppointment: (id: string) => void;
  onBarbers: () => void;
  onClients: () => void;
  onPending: () => void;
  onServices: () => void;
}) {
  const pendingAppointments = appointments.filter((appointment) => appointment.status === "Pendente");
  const revenue = appointments.reduce((total, appointment) => total + appointment.precoServico, 0);

  return (
    <div className="screen-grid admin-dashboard-grid">
      <section className="hero-panel admin-hero">
        <span className="eyebrow">Foco do gestor</span>
        <h2>O que precisa de decisao agora.</h2>
        <p>
          Painel resumido para confirmar agenda, acompanhar movimento, manter equipe e servicos atualizados.
        </p>
        <p className="integration-status">
          {isLoadingAppointments && "Carregando agenda..."}
          {!isLoadingAppointments && appointmentsError && appointmentsError}
          {!isLoadingAppointments && !appointmentsError && `${appointments.length} agendamentos carregados`}
        </p>
        <div className="admin-metrics">
          <article><span>Receita</span><strong>{money.format(revenue)}</strong><small>prevista</small></article>
          <article><span>Equipe</span><strong>{barbers.length}</strong><small>barbeiros ativos</small></article>
          <article><span>Pendentes</span><strong>{pendingAppointments.length}</strong><small>aguardando confirmacao</small></article>
        </div>
      </section>

      <section className="panel command-panel">
        <span className="eyebrow">Atalhos</span>
        <h2>Acoes frequentes</h2>
        <div className="admin-command-grid">
          <button type="button" onClick={onPending}>
            <strong>Confirmar agenda</strong>
            <small>{pendingAppointments.length} pendentes</small>
          </button>
          <button type="button" onClick={onBarbers}>
            <strong>Equipe</strong>
            <small>Criar ou revisar barbeiros</small>
          </button>
          <button type="button" onClick={onServices}>
            <strong>Catalogo</strong>
            <small>Precos e duracoes</small>
          </button>
          <button type="button" onClick={onClients}>
            <strong>Clientes</strong>
            <small>Historico por pessoa</small>
          </button>
        </div>
      </section>

      <section className="panel attention-panel">
        <span className="eyebrow">Pendencias</span>
        <h2>Precisa de atencao</h2>
        <div className="list-screen compact-list">
          {pendingAppointments.map((appointment) => (
            <article className="admin-action-card" key={appointment.id}>
              <div>
                <strong>{appointment.nomeCliente}</strong>
                <small>{appointment.nomeServico} - {formatAppointmentTime(appointment.dataHora)}</small>
              </div>
              <button
                className="ghost-button"
                type="button"
                disabled={confirmingAppointmentId === appointment.id}
                onClick={() => onConfirmAppointment(appointment.id)}
              >
                {confirmingAppointmentId === appointment.id ? "..." : "Confirmar"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel analytics-panel">
        <span className="eyebrow">Metricas</span>
        <h2>Cortes mais realizados</h2>
        <RankingList entries={topEntries(appointments.map((appointment) => appointment.nomeServico))} />
      </section>

      <section className="panel analytics-panel">
        <span className="eyebrow">Movimento</span>
        <h2>Dias mais fortes</h2>
        <RankingList
          entries={topEntries(
            appointments.map((appointment) => dayFormatter.format(new Date(appointment.dataHora))),
          )}
        />
      </section>
    </div>
  );
}

function RankingList({ entries }: { entries: Array<[string, number]> }) {
  const maxValue = Math.max(...entries.map(([, value]) => value), 1);

  return (
    <div className="ranking-list">
      {entries.map(([label, value], index) => (
        <article className="ranking-row" key={label}>
          <span>{index + 1}</span>
          <div>
            <strong>{label}</strong>
            <i style={{ width: `${(value / maxValue) * 100}%` }} />
          </div>
          <small>{value} agend.</small>
        </article>
      ))}
    </div>
  );
}

function BarbersAdminScreen({
  barbers,
  barbersError,
  isCreatingBarber,
  isLoadingBarbers,
  onCreateBarber,
}: {
  barbers: Barber[];
  barbersError: string;
  isCreatingBarber: boolean;
  isLoadingBarbers: boolean;
  onCreateBarber: (payload: {
    nomeCompleto: string;
    email: string;
    telefone: string;
    senha: string;
    foto?: string | null;
  }) => void;
}) {
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");

  return (
    <div className="screen-grid two-column">
      <section className="panel">
        <span className="eyebrow">Equipe</span>
        <h2>Barbeiros ativos</h2>
        <p className="integration-status">
          {isLoadingBarbers && "Carregando barbeiros..."}
          {!isLoadingBarbers && barbersError && barbersError}
          {!isLoadingBarbers && !barbersError && `${barbers.length} barbeiros cadastrados`}
        </p>
        <div className="list-screen compact-list">
          {barbers.map((barber) => (
            <article className="list-card admin-list-card" key={barber.id}>
              <span className="avatar">{barber.nome.slice(0, 1)}</span>
              <div>
                <span>{barber.foto ? "Com foto" : "Sem foto"}</span>
                <h2>{barber.nome}</h2>
                <p>{barber.telefone}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">Cadastro de profissional</span>
        <h2>Novo barbeiro</h2>
        <form className="form-stack">
          <label>
            Nome completo
            <input value={nomeCompleto} onChange={(event) => setNomeCompleto(event.target.value)} />
          </label>
          <label>
            Email
            <input value={email} type="email" onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Telefone
            <input value={telefone} onChange={(event) => setTelefone(event.target.value)} />
          </label>
          <label>
            Senha inicial
            <input value={senha} type="password" onChange={(event) => setSenha(event.target.value)} />
          </label>
          <button
            className="primary-button"
            type="button"
            disabled={isCreatingBarber}
            onClick={() => onCreateBarber({ nomeCompleto, email, telefone, senha, foto: null })}
          >
            {isCreatingBarber ? "Criando..." : "Criar barbeiro"}
          </button>
        </form>
      </section>
    </div>
  );
}

function ServicesAdminScreen({
  isCreatingService,
  isLoadingServices,
  onCreateService,
  services,
  servicesError,
}: {
  isCreatingService: boolean;
  isLoadingServices: boolean;
  onCreateService: (payload: {
    nome: string;
    preco: number;
    duracaoMinutos: number;
    descricao?: string | null;
  }) => void;
  services: Service[];
  servicesError: string;
}) {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [duracaoMinutos, setDuracaoMinutos] = useState("");
  const [descricao, setDescricao] = useState("");

  return (
    <div className="screen-grid two-column">
      <section className="panel">
        <span className="eyebrow">Catalogo</span>
        <h2>Catalogo de servicos</h2>
        <p className="integration-status">
          {isLoadingServices && "Carregando servicos..."}
          {!isLoadingServices && servicesError && servicesError}
          {!isLoadingServices && !servicesError && `${services.length} servicos cadastrados`}
        </p>
        <div className="list-screen compact-list">
          {services.map((service) => (
            <article className="list-card service-admin-card" key={service.id}>
              <div>
                <span>{service.duracaoMinutos} min</span>
                <h2>{service.nome}</h2>
                <p>{service.descricao}</p>
              </div>
              <strong>{money.format(service.preco)}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">Novo item do catalogo</span>
        <h2>Novo servico</h2>
        <form className="form-stack">
          <label>
            Nome
            <input value={nome} onChange={(event) => setNome(event.target.value)} />
          </label>
          <label>
            Preco
            <input value={preco} onChange={(event) => setPreco(event.target.value)} />
          </label>
          <label>
            Duracao em minutos
            <input value={duracaoMinutos} onChange={(event) => setDuracaoMinutos(event.target.value)} />
          </label>
          <label>
            Descricao
            <input value={descricao} onChange={(event) => setDescricao(event.target.value)} />
          </label>
          <button
            className="primary-button"
            type="button"
            disabled={isCreatingService}
            onClick={() => onCreateService({
              nome,
              preco: Number(preco.replace(",", ".")),
              duracaoMinutos: Number(duracaoMinutos),
              descricao,
            })}
          >
            {isCreatingService ? "Cadastrando..." : "Cadastrar servico"}
          </button>
        </form>
      </section>
    </div>
  );
}

function AppointmentsAdminScreen({
  appointments,
  barbers,
  confirmingAppointmentId,
  onConfirmAppointment,
}: {
  appointments: Appointment[];
  barbers: Barber[];
  confirmingAppointmentId: string | null;
  onConfirmAppointment: (id: string) => void;
}) {
  const availableMonths = useMemo(() => getAvailableMonths(appointments), [appointments]);
  const [barberFilter, setBarberFilter] = useState("todos");
  const [monthFilter, setMonthFilter] = useState(availableMonths[0] ?? "todos");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "todos">("todos");
  const [clientFilter, setClientFilter] = useState("");

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesBarber = barberFilter === "todos" || appointment.nomeBarbeiro === barberFilter;
    const matchesMonth = monthFilter === "todos" || appointment.dataHora.startsWith(monthFilter);
    const matchesStatus = statusFilter === "todos" || appointment.status === statusFilter;
    const matchesClient = appointment.nomeCliente.toLowerCase().includes(clientFilter.toLowerCase().trim());

    return matchesBarber && matchesMonth && matchesStatus && matchesClient;
  });

  const filteredRevenue = filteredAppointments.reduce((total, appointment) => total + appointment.precoServico, 0);

  function clearFilters() {
    setBarberFilter("todos");
    setMonthFilter("todos");
    setStatusFilter("todos");
    setClientFilter("");
  }

  return (
    <div className="screen-grid admin-agenda-grid">
      <section className="panel">
        <span className="eyebrow">Organizacao da agenda</span>
        <h2>Filtros da agenda</h2>
        <p className="filter-helper">
          A agenda abre no mes mais atual. Use Limpar para ver todo o historico.
        </p>
        <div className="quick-filter-row" aria-label="Filtros rapidos">
          <button type="button" onClick={() => setStatusFilter("Pendente")}>Pendentes</button>
          <button type="button" onClick={() => setMonthFilter(availableMonths[0] ?? "todos")}>Mes atual</button>
          <button type="button" onClick={() => setBarberFilter("todos")}>Todos barbeiros</button>
          <button type="button" onClick={clearFilters}>Limpar</button>
        </div>
        <div className="filter-grid">
          <label>
            Barbeiro
            <select value={barberFilter} onChange={(event) => setBarberFilter(event.target.value)}>
              <option value="todos">Todos</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.nome}>{barber.nome}</option>
              ))}
            </select>
          </label>

          <label>
            Mes
            <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
              <option value="todos">Todos</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {monthFormatter.format(new Date(`${month}-01T00:00:00`))}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as AppointmentStatus | "todos")}
            >
              <option value="todos">Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Concluido">Concluido</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </label>

          <label>
            Cliente
            <input
              placeholder="Buscar por nome"
              value={clientFilter}
              onChange={(event) => setClientFilter(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="panel admin-filter-summary">
        <span className="eyebrow">Resultado</span>
        <h2>{filteredAppointments.length} agendamentos</h2>
        <strong>{money.format(filteredRevenue)}</strong>
        <small>Receita filtrada no periodo selecionado</small>
      </section>

      <section className="panel admin-agenda-list">
        <span className="eyebrow">Lista filtrada</span>
        <h2>Agendamentos</h2>
        <div className="list-screen compact-list">
          {filteredAppointments.map((appointment) => (
            <article className="list-card appointment-card admin-appointment-card" key={appointment.id}>
              <time>{formatAppointmentTime(appointment.dataHora)}</time>
              <div>
                <span>{appointment.pagamento}</span>
                <h2>{appointment.nomeCliente}</h2>
                <p>{appointment.nomeServico} com {appointment.nomeBarbeiro}</p>
              </div>
              <StatusBadge status={appointment.status} />
              <strong>{money.format(appointment.precoServico)}</strong>
              {appointment.status === "Pendente" && (
                <button
                  className="primary-button"
                  type="button"
                  disabled={confirmingAppointmentId === appointment.id}
                  onClick={() => onConfirmAppointment(appointment.id)}
                >
                  {confirmingAppointmentId === appointment.id ? "Confirmando..." : "Confirmar"}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="panel analytics-panel">
        <span className="eyebrow">Metricas filtradas</span>
        <h2>Cortes mais realizados</h2>
        <RankingList entries={topEntries(filteredAppointments.map((appointment) => appointment.nomeServico))} />
      </section>

      <section className="panel analytics-panel">
        <span className="eyebrow">Movimento filtrado</span>
        <h2>Dias mais movimentados</h2>
        <RankingList
          entries={topEntries(
            filteredAppointments.map((appointment) => dayFormatter.format(new Date(appointment.dataHora))),
          )}
        />
      </section>
    </div>
  );
}

function ClientsAdminScreen({ appointments }: { appointments: Appointment[] }) {
  const clients = useMemo<AdminClientSummary[]>(() => {
    const clientMap = new Map<string, AdminClientSummary>();

    appointments.forEach((appointment) => {
      const id = appointment.nomeCliente;
      const current = clientMap.get(id);

      clientMap.set(id, {
        id,
        nomeCompleto: appointment.nomeCliente,
        telefone: "Telefone nao informado",
        totalAgendamentos: (current?.totalAgendamentos ?? 0) + 1,
      });
    });

    return Array.from(clientMap.values()).sort((left, right) =>
      right.totalAgendamentos - left.totalAgendamentos,
    );
  }, [appointments]);

  const [selectedClientId, setSelectedClientId] = useState("");
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clients[0];
  const clientHistory = appointments.filter(
    (appointment) => appointment.nomeCliente === selectedClient?.nomeCompleto,
  );

  return (
    <div className="screen-grid two-column">
      <section className="panel">
        <span className="eyebrow">Relacionamento</span>
        <h2>Clientes recentes</h2>
        <div className="list-screen compact-list">
          {clients.map((client) => (
            <article className="list-card admin-list-card" key={client.id}>
              <span className="avatar">{client.nomeCompleto.slice(0, 1)}</span>
              <div>
                <span>{client.totalAgendamentos} agendamentos</span>
                <h2>{client.nomeCompleto}</h2>
                <p>{client.telefone}</p>
              </div>
              <button className="ghost-button" type="button" onClick={() => setSelectedClientId(client.id)}>
                Historico
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">Historico por cliente</span>
        <h2>{selectedClient?.nomeCompleto ?? "Selecione um cliente"}</h2>
        <div className="list-screen compact-list">
          {clientHistory.map((appointment) => (
            <article className="history-row" key={appointment.id}>
              <div>
                <strong>{appointment.nomeServico}</strong>
                <small>{appointment.nomeBarbeiro} - {appointment.dataHora.slice(0, 10)}</small>
              </div>
              <StatusBadge status={appointment.status} />
              <b>{money.format(appointment.precoServico)}</b>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status}</span>;
}
