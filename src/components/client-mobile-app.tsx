"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { clientBrand } from "@/brand/client-brand";
import { BarberAppApiError, authChangedEvent, barberAppApi, clearStoredToken, getStoredRole, getStoredToken } from "@/lib/barberapp-api";
import { AdminApp } from "@/components/admin-app";
import { BarberProfileApp } from "@/components/barber-profile-app";
import type { Appointment, AvailableSlot, Barber, Service } from "@/lib/barberapp-types";

type Screen =
  | "inicio"
  | "cliente"
  | "entrar"
  | "cadastro"
  | "agendar"
  | "agenda"
  | "perfil";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const localAppointmentDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const localAppointmentTime = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const navItems: Array<{ id: Screen; label: string }> = [
  { id: "cliente", label: "Inicio" },
  { id: "agendar", label: "Agendar" },
  { id: "agenda", label: "Agenda" },
  { id: "perfil", label: "Perfil" },
];

type ApiBarber = Pick<Barber, "id" | "nome" | "telefone" | "foto">;
type ApiAppointment = Omit<Appointment, "pagamento"> & {
  pagamento?: Appointment["pagamento"];
};
type ClientProfile = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
};
type BarberSlots = {
  barber: Barber;
  slots: AvailableSlot[];
  freeSlots: AvailableSlot[];
};

function normalizeBarber(barber: ApiBarber): Barber {
  return {
    ...barber,
    agendaHoje: 0,
    ocupacao: 0,
  };
}

function normalizeAppointment(appointment: ApiAppointment): Appointment {
  return {
    ...appointment,
    pagamento: appointment.pagamento ?? "Pendente",
  };
}

function dateForOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const localOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - localOffset).toISOString().slice(0, 10);
}

function formatAppointmentDate(value: string) {
  return localAppointmentDate.format(new Date(value));
}

function formatAppointmentTime(value: string) {
  return localAppointmentTime.format(new Date(value));
}

function formatBookingDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function freeTimeLabel(count: number) {
  return count === 1 ? "1 horario livre" : `${count} horarios livres`;
}

function appointmentStatusLabel(status: Appointment["status"]) {
  const labels: Record<Appointment["status"], string> = {
    Pendente: "Aguardando confirmacao",
    Confirmado: "Confirmado",
    Concluido: "Concluido",
    Cancelado: "Cancelado",
  };

  return labels[status];
}

function paymentStatusLabel(status: Appointment["pagamento"]) {
  const labels: Record<Appointment["pagamento"], string> = {
    Pendente: "Pendente",
    Aprovado: "Aprovado",
    Reembolsado: "Reembolsado",
    Recusado: "Recusado",
  };

  return labels[status];
}

function canPayAppointment(appointment: Appointment) {
  return appointment.status !== "Cancelado"
    && appointment.status !== "Concluido"
    && appointment.pagamento !== "Aprovado";
}

function clientError(error: unknown, fallback: string) {
  if (error instanceof BarberAppApiError && error.status === 403) {
    return "Voce nao tem permissao para acessar este agendamento.";
  }
  if (!(error instanceof Error)) return fallback;
  if (/api|entity changes|inner exception|exception|timestamp|postgres|npgsql/i.test(error.message)) {
    return fallback;
  }
  return error.message;
}

function subscribeToAuthChanges(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(authChangedEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(authChangedEvent, callback);
  };
}

function getAuthRoleSnapshot() {
  const token = getStoredToken();
  const role = getStoredRole();

  return token && role ? role : null;
}

function getServerAuthRoleSnapshot() {
  return null;
}

function useAuthRole() {
  return useSyncExternalStore(subscribeToAuthChanges, getAuthRoleSnapshot, getServerAuthRoleSnapshot);
}

export function ClientMobileApp() {
  const authenticatedRole = useAuthRole();
  const [screen, setScreen] = useState<Screen>("inicio");
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [clientDataMessage, setClientDataMessage] = useState("");
  const [isLoadingClientData, setIsLoadingClientData] = useState(false);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>([]);
  const [privateDataMessage, setPrivateDataMessage] = useState("");
  const [isLoadingPrivateData, setIsLoadingPrivateData] = useState(false);

  const visibleScreen = authenticatedRole === "Cliente" && screen === "inicio"
    ? "cliente"
    : authenticatedRole !== "Cliente" && screen === "cliente"
      ? "inicio"
      : screen;

  const screenTitle = useMemo(() => {
    const active = navItems.find((item) => item.id === visibleScreen);
    if (active) return active.label;
    if (visibleScreen === "inicio") return "Inicio";
    if (visibleScreen === "entrar") return "Entrar";
    if (visibleScreen === "cadastro") return "Criar conta";
    return "Inicio";
  }, [visibleScreen]);

  async function loadClientData() {
    setIsLoadingClientData(true);
    setClientDataMessage("");

    try {
      const [servicesResponse, barbersResponse] = await Promise.all([
        barberAppApi.getServicos<Service[]>(),
        barberAppApi.getBarbeiros<ApiBarber[]>(),
      ]);

      const normalizedBarbers = barbersResponse.map(normalizeBarber);

      setServices(servicesResponse);
      setBarbers(normalizedBarbers);
      setClientDataMessage(`${servicesResponse.length} servicos e ${normalizedBarbers.length} profissionais disponiveis`);
    } catch (error) {
      setClientDataMessage(clientError(error, "Nao foi possivel carregar os dados agora."));
    } finally {
      setIsLoadingClientData(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadClientData();
    });
  }, []);

  const loadPrivateClientData = useCallback(async () => {
    if (authenticatedRole !== "Cliente") return;

    setIsLoadingPrivateData(true);
    setPrivateDataMessage("");

    try {
      const [profileResponse, appointmentsResponse] = await Promise.all([
        barberAppApi.getMeuPerfilCliente<ClientProfile>(),
        barberAppApi.getAgendamentos<ApiAppointment[]>(),
      ]);

      setClientProfile(profileResponse);
      setClientAppointments(appointmentsResponse.map(normalizeAppointment));
      setPrivateDataMessage(
        appointmentsResponse.length === 1
          ? "1 agendamento encontrado na sua conta"
          : `${appointmentsResponse.length} agendamentos encontrados na sua conta`,
      );
    } catch (error) {
      setPrivateDataMessage(clientError(error, "Nao foi possivel carregar sua agenda agora."));
    } finally {
      setIsLoadingPrivateData(false);
    }
  }, [authenticatedRole]);

  useEffect(() => {
    if (authenticatedRole !== "Cliente") {
      return;
    }

    queueMicrotask(() => {
      void loadPrivateClientData();
    });
  }, [authenticatedRole, loadPrivateClientData]);

  if (authenticatedRole === "Admin") {
    return <AdminApp onLogout={() => setScreen("inicio")} />;
  }

  if (authenticatedRole === "Barbeiro") {
    return <BarberProfileApp onLogout={() => setScreen("inicio")} />;
  }

  return (
    <main className="app-frame">
      <header className="app-header">
        <a className="brand" href="#" onClick={() => setScreen("inicio")} aria-label={clientBrand.name}>
          <span className="brand-mark">{clientBrand.logoMark}</span>
          <span>
            <strong>{clientBrand.name}</strong>
            <small>{clientBrand.legalName}</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Navegacao principal">
          {navItems.map((item) => (
            <button
              className={visibleScreen === item.id ? "active" : ""}
              key={item.id}
              type="button"
              onClick={() => setScreen(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="header-side">
          <span className="tenant-chip">{clientBrand.domain}</span>
          {authenticatedRole === "Cliente" ? (
            <button
              className="header-action"
              type="button"
              onClick={() => {
                clearStoredToken();
                setScreen("inicio");
              }}
            >
              Sair
            </button>
          ) : (
            <button className="header-action" type="button" onClick={() => setScreen("entrar")}>
              Entrar
            </button>
          )}
        </div>
      </header>

      <section className="mobile-title">
        <span>Atendimento online</span>
        <h1>{screenTitle}</h1>
      </section>

      <section className="screen-shell">
        {visibleScreen === "inicio" && (
          <HomeScreen
            barbers={barbers}
            dataMessage={clientDataMessage}
            isLoadingData={isLoadingClientData}
            onStart={() => setScreen(authenticatedRole === "Cliente" ? "agendar" : "entrar")}
            onLogin={() => setScreen("entrar")}
            services={services}
          />
        )}

        {visibleScreen === "entrar" && (
          <LoginScreen
            onCreateAccount={() => setScreen("cadastro")}
            onDone={(role) => {
              if (role === "Cliente") setScreen("cliente");
            }}
          />
        )}

        {visibleScreen === "cadastro" && (
          <RegisterScreen
            onBackToLogin={() => setScreen("entrar")}
            onDone={(role) => {
              if (role === "Cliente") setScreen("cliente");
            }}
          />
        )}

        {visibleScreen === "cliente" && (
          <ClientDashboardScreen
            barbers={barbers}
            appointments={clientAppointments}
            onBook={() => setScreen("agendar")}
            onProfile={() => setScreen("perfil")}
            services={services}
          />
        )}

        {visibleScreen === "agendar" && authenticatedRole === "Cliente" && (
          <BookingScreen
            barbers={barbers}
            services={services}
            onDone={() => {
              void loadPrivateClientData();
              setScreen("agenda");
            }}
          />
        )}

        {visibleScreen === "agendar" && authenticatedRole !== "Cliente" && (
          <AuthenticationRequiredScreen onLogin={() => setScreen("entrar")} />
        )}

        {visibleScreen === "agenda" && authenticatedRole === "Cliente" && (
          <AppointmentsScreen
            appointments={clientAppointments}
            dataMessage={privateDataMessage}
            isLoading={isLoadingPrivateData}
            onChanged={loadPrivateClientData}
          />
        )}

        {visibleScreen === "agenda" && authenticatedRole !== "Cliente" && (
          <AuthenticationRequiredScreen onLogin={() => setScreen("entrar")} />
        )}

        {visibleScreen === "perfil" && authenticatedRole === "Cliente" && (
          <ProfileScreen
            profile={clientProfile}
            onSaved={loadPrivateClientData}
          />
        )}

        {visibleScreen === "perfil" && authenticatedRole !== "Cliente" && (
          <AuthenticationRequiredScreen onLogin={() => setScreen("entrar")} />
        )}
      </section>

      <footer className="app-footer">
        <div>
          <strong>{clientBrand.legalName}</strong>
          <small>{clientBrand.city} - {clientBrand.phone}</small>
        </div>
        <small>Agendamento online seguro - {clientBrand.domain}</small>
      </footer>

      <nav className="bottom-nav" aria-label="Navegacao mobile">
        {navItems.map((item) => (
          <button
            className={visibleScreen === item.id ? "active" : ""}
            key={item.id}
            type="button"
            onClick={() => setScreen(item.id)}
          >
            {item.label}
          </button>
        ))}
        {authenticatedRole === "Cliente" && (
          <button
            type="button"
            onClick={() => {
              clearStoredToken();
              setScreen("inicio");
            }}
          >
            Sair
          </button>
        )}
      </nav>
    </main>
  );
}

function ClientDashboardScreen({
  appointments,
  barbers,
  onBook,
  onProfile,
  services,
}: {
  appointments: Appointment[];
  barbers: Barber[];
  onBook: () => void;
  onProfile: () => void;
  services: Service[];
}) {
  const nextAppointment = appointments
    .filter((appointment) => appointment.status !== "Cancelado")
    .sort((left, right) => left.dataHora.localeCompare(right.dataHora))[0];
  const featuredServices = services.slice(0, 3);
  const featuredBarbers = barbers.slice(0, 3);

  return (
    <div className="screen-grid client-home-grid">
      <section className="hero-panel">
        <span className="eyebrow">Area do cliente</span>
        <h2>{clientBrand.legalName}</h2>
        <p>
          Sessao ativa. Escolha seu servico, confira a equipe e agende o proximo horario sem precisar ligar.
        </p>
        <div className="action-row">
          <button className="primary-button" type="button" onClick={onBook}>Novo agendamento</button>
          <button className="ghost-button" type="button" onClick={onProfile}>Meu perfil</button>
        </div>
      </section>

      <section className="summary-panel">
        <span>Barbearia</span>
        <strong>{clientBrand.phone}</strong>
        <small>{clientBrand.city} - {clientBrand.domain}</small>
        <small>Segunda a sabado - 08:00 as 18:00</small>
      </section>

      <section className="panel client-info-panel">
        <span className="eyebrow">Servicos</span>
        <h2>Disponiveis para agendar</h2>
        <div className="mini-list">
          {featuredServices.map((service) => (
            <article key={service.id}>
              <div>
                <strong>{service.nome}</strong>
                <small>{service.duracaoMinutos} min</small>
              </div>
              <b>{money.format(service.preco)}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="panel client-info-panel">
        <span className="eyebrow">Equipe</span>
        <h2>Escolha seu barbeiro</h2>
        <div className="mini-list">
          {featuredBarbers.map((barber) => (
            <article key={barber.id}>
              <span className="avatar">{barber.nome.slice(0, 1)}</span>
              <div>
                <strong>{barber.nome}</strong>
                <small>{barber.telefone}</small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="summary-panel">
        <span>Proximo agendamento</span>
        <strong>{nextAppointment ? formatAppointmentTime(nextAppointment.dataHora) : "--:--"}</strong>
        <small>
          {nextAppointment
            ? `${nextAppointment.nomeServico} com ${nextAppointment.nomeBarbeiro}`
            : "Voce ainda nao tem horario reservado"}
        </small>
      </section>
    </div>
  );
}

function HomeScreen({
  barbers,
  dataMessage,
  isLoadingData,
  onStart,
  onLogin,
  services,
}: {
  barbers: Barber[];
  dataMessage: string;
  isLoadingData: boolean;
  onStart: () => void;
  onLogin: () => void;
  services: Service[];
}) {
  const featuredServices = services.slice(0, 3);
  const featuredBarbers = barbers.slice(0, 3);

  return (
    <div className="screen-grid client-home-grid">
      <section className="hero-panel">
        <span className="eyebrow">{clientBrand.city}</span>
        <h2>{clientBrand.legalName}</h2>
        <p>
          Barbearia premium com agenda online, profissionais selecionados e servicos pensados para uma experiencia sem espera.
        </p>
        <p className="integration-status">
          {isLoadingData && "Carregando servicos e profissionais..."}
          {!isLoadingData && dataMessage}
        </p>
        <div className="action-row">
          <button className="primary-button" type="button" onClick={onStart}>Agendar agora</button>
          <button className="ghost-button" type="button" onClick={onLogin}>Entrar</button>
        </div>
      </section>

      <section className="summary-panel">
        <span>Contato</span>
        <strong>{clientBrand.phone}</strong>
        <small>{clientBrand.domain}</small>
        <small>Segunda a sabado - 08:00 as 18:00</small>
      </section>

      <section className="panel client-info-panel">
        <span className="eyebrow">Servicos</span>
        <h2>Mais procurados</h2>
        <div className="mini-list">
          {featuredServices.map((service) => (
            <article key={service.id}>
              <div>
                <strong>{service.nome}</strong>
                <small>{service.duracaoMinutos} min</small>
              </div>
              <b>{money.format(service.preco)}</b>
            </article>
          ))}
        </div>
      </section>

      <section className="panel client-info-panel">
        <span className="eyebrow">Equipe</span>
        <h2>Barbeiros disponiveis</h2>
        <div className="mini-list">
          {featuredBarbers.map((barber) => (
            <article key={barber.id}>
              <span className="avatar">{barber.nome.slice(0, 1)}</span>
              <div>
                <strong>{barber.nome}</strong>
                <small>{barber.telefone}</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function LoginScreen({
  onCreateAccount,
  onDone,
}: {
  onCreateAccount: () => void;
  onDone: (role: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    setIsSubmitting(true);
    setMessage("");

    try {
      const auth = await barberAppApi.login({ email, password });
      const role = auth.roles[0] ?? "Cliente";
      setMessage(`Bem-vindo, ${auth.nome}.`);
      onDone(role);
    } catch (error) {
      setMessage(clientError(error, "Nao foi possivel entrar. Confira os dados informados."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="panel">
        <span className="eyebrow">Area do cliente</span>
        <h2>Entrar</h2>
        <form className="form-stack">
          <label>
            Email
            <input value={email} type="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Senha
            <input value={password} type="password" autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="primary-button" type="button" disabled={isSubmitting} onClick={handleLogin}>
            {isSubmitting ? "Entrando..." : "Acessar conta"}
          </button>
        </form>
        {message && <p className="form-message">{message}</p>}

        <div className="auth-switch">
          <span>Ainda nao tem cadastro?</span>
          <button className="link-button" type="button" onClick={onCreateAccount}>
            Criar conta
          </button>
        </div>
      </section>
    </div>
  );
}

function RegisterScreen({
  onBackToLogin,
  onDone,
}: {
  onBackToLogin: () => void;
  onDone: (role: string) => void;
}) {
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    setIsSubmitting(true);
    setMessage("");

    try {
      const auth = await barberAppApi.register({ nomeCompleto, email, telefone, password });
      const role = auth.roles[0] ?? "Cliente";
      setMessage(`Cadastro concluido. Bem-vindo, ${auth.nome}.`);
      onDone(role);
    } catch (error) {
      setMessage(clientError(error, "Nao foi possivel concluir seu cadastro."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="panel">
        <span className="eyebrow">Novo cliente</span>
        <h2>Criar conta</h2>
        <form className="form-stack">
          <label>
            Nome completo
            <input required value={nomeCompleto} autoComplete="name" onChange={(event) => setNomeCompleto(event.target.value)} />
          </label>
          <label>
            Email
            <input value={email} type="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Telefone
            <input required value={telefone} type="tel" autoComplete="tel" onChange={(event) => setTelefone(event.target.value)} />
          </label>
          <label>
            Senha
            <input value={password} type="password" autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="primary-button" type="button" disabled={isSubmitting} onClick={handleRegister}>
            {isSubmitting ? "Criando..." : "Criar e continuar"}
          </button>
        </form>
        {message && <p className="form-message">{message}</p>}

        <div className="auth-switch">
          <span>Ja tenho cadastro.</span>
          <button className="link-button" type="button" onClick={onBackToLogin}>
            Entrar
          </button>
        </div>
      </section>
    </div>
  );
}

function BookingScreen({
  barbers,
  services,
  onDone,
}: {
  barbers: Barber[];
  services: Service[];
  onDone: () => void;
}) {
  const [bookingDate, setBookingDate] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [availableBarbers, setAvailableBarbers] = useState<BarberSlots[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityRevision, setAvailabilityRevision] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const selectedService = services.find((service) => service.id === selectedServiceId) ?? services[0];
  const selectedAvailability = availableBarbers.find((item) => item.barber.id === selectedBarberId)
    ?? availableBarbers[0];

  useEffect(() => {
    queueMicrotask(() => {
      setBookingDate(dateForOffset(0));
    });
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      async function loadAvailableBarbers() {
        if (!bookingDate || !selectedService) return;

        setIsLoadingAvailability(true);
        setAvailabilityMessage("");
        setSubmitMessage("");

        try {
          const responses = await Promise.all(
            barbers.map(async (barber) => {
              try {
                const slots = await barberAppApi.getHorariosDisponiveis<AvailableSlot[]>({
                  barbeiroId: barber.id,
                  servicoId: selectedService.id,
                  data: bookingDate,
                });

                return { barber, slots, freeSlots: slots.filter((slot) => slot.disponivel) };
              } catch {
                return { barber, slots: [], freeSlots: [] };
              }
            }),
          );
          const scheduled = responses.filter((item) => item.slots.length > 0);
          const withFreeTimes = scheduled.filter((item) => item.freeSlots.length > 0);
          const firstChoice = withFreeTimes[0] ?? scheduled[0];

          setAvailableBarbers(scheduled);
          setSelectedBarberId(firstChoice?.barber.id ?? "");
          setSelectedTime(firstChoice?.freeSlots[0]?.horario ?? "");
          setAvailabilityMessage(
            withFreeTimes.length > 0
              ? withFreeTimes.length === 1
                ? "1 profissional com horarios livres nesta data"
                : `${withFreeTimes.length} profissionais com horarios livres nesta data`
              : "Nenhum profissional tem horario livre nesta data. Escolha outro dia.",
          );
        } finally {
          setIsLoadingAvailability(false);
        }
      }

      void loadAvailableBarbers();
    });
  }, [availabilityRevision, barbers, bookingDate, selectedService]);

  function selectBarber(barberId: string) {
    const availability = availableBarbers.find((item) => item.barber.id === barberId);
    setSelectedBarberId(barberId);
    setSelectedTime(availability?.freeSlots[0]?.horario ?? "");
  }

  async function handleCreateAppointment() {
    if (!selectedService || !selectedAvailability || !selectedTime || !bookingDate) return;

    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      await barberAppApi.createAgendamento<unknown>({
        barbeiroId: selectedAvailability.barber.id,
        servicoId: selectedService.id,
        dataHora: `${bookingDate}T${selectedTime}:00`,
        observacao: null,
      });
      onDone();
    } catch (error) {
      setSubmitMessage(clientError(error, "Nao foi possivel confirmar o agendamento. Tente novamente."));
      setAvailabilityRevision((revision) => revision + 1);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="screen-grid client-booking-grid">
      <section className="panel booking-control-panel">
        <span className="eyebrow">Novo agendamento</span>
        <h2>Escolha quando quer ser atendido</h2>
        <div className="quick-date-row">
          <button className={bookingDate === dateForOffset(0) ? "active" : ""} type="button" onClick={() => setBookingDate(dateForOffset(0))}>Hoje</button>
          <button className={bookingDate === dateForOffset(1) ? "active" : ""} type="button" onClick={() => setBookingDate(dateForOffset(1))}>Amanha</button>
        </div>
        <label className="booking-date-field">
          Outra data
          <input
            type="date"
            min={dateForOffset(0)}
            value={bookingDate}
            onChange={(event) => setBookingDate(event.target.value)}
          />
        </label>
      </section>

      <section className="panel booking-control-panel">
        <span className="eyebrow">Servico</span>
        <h2>O que voce deseja fazer?</h2>
        <div className="booking-option-list">
          {services.map((service) => (
            <button
              className={selectedService?.id === service.id ? "selected" : ""}
              key={service.id}
              type="button"
              onClick={() => setSelectedServiceId(service.id)}
            >
              <span>{service.nome}</span>
              <small>{service.duracaoMinutos} min</small>
              <strong>{money.format(service.preco)}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="panel available-barbers-panel">
        <span className="eyebrow">Horarios do dia</span>
        <h2>Escolha um profissional</h2>

        <p className="integration-status">
          {isLoadingAvailability ? "Buscando horarios livres..." : availabilityMessage}
        </p>
        {!isLoadingAvailability && availableBarbers.length > 0 && (
          <div className="slot-legend" aria-label="Legenda de horarios">
            <span><i className="legend-free" />Livre para agendar</span>
            <span><i className="legend-busy" />Ocupado</span>
          </div>
        )}
        <button
          className="ghost-button refresh-slots-button"
          type="button"
          disabled={isLoadingAvailability}
          onClick={() => setAvailabilityRevision((revision) => revision + 1)}
        >
          {isLoadingAvailability ? "Atualizando..." : "Atualizar horarios"}
        </button>

        <div className="available-barber-list">
          {availableBarbers.map(({ barber, slots, freeSlots }) => {
            const currentFreeSlots = freeSlots ?? slots.filter((slot) => slot.disponivel);

            return (
            <button
              className={selectedAvailability?.barber.id === barber.id ? "selected" : ""}
              key={barber.id}
              type="button"
              onClick={() => selectBarber(barber.id)}
            >
              <span className="avatar">{barber.nome.slice(0, 1)}</span>
              <strong>{barber.nome}</strong>
              <small>{currentFreeSlots.length > 0 ? freeTimeLabel(currentFreeSlots.length) : "Sem horario livre"}</small>
            </button>
            );
          })}
        </div>

        {selectedAvailability && (
          <>
            <h3 className="booking-subtitle">Escolha o horario</h3>
            <div className="slot-grid">
              {selectedAvailability.slots.map((slot) => (
                <button
                  className={selectedTime === slot.horario ? "active" : ""}
                  key={slot.horario}
                  type="button"
                  disabled={!slot.disponivel}
                  onClick={() => setSelectedTime(slot.horario)}
                >
                  <strong>{slot.horario}</strong>
                  <small>{slot.disponivel ? "Livre" : "Ocupado"}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="summary-panel booking-review">
        <span>Confirmacao</span>
        <strong>{selectedService ? money.format(selectedService.preco) : "--"}</strong>
        <small>{selectedService?.nome ?? "Escolha um servico"}</small>
        <small>{selectedAvailability?.barber.nome ?? "Escolha uma data disponivel"}</small>
        <small>{bookingDate && selectedTime ? `${formatBookingDate(bookingDate)} as ${selectedTime}` : "Escolha um horario"}</small>
        {submitMessage && <p className="form-message">{submitMessage}</p>}
        <button
          className="primary-button"
          type="button"
          disabled={!selectedAvailability || !selectedTime || isSubmitting}
          onClick={handleCreateAppointment}
        >
          {isSubmitting ? "Confirmando..." : "Confirmar agendamento"}
        </button>
      </section>
    </div>
  );
}

function AppointmentsScreen({
  appointments,
  dataMessage,
  isLoading,
  onChanged,
}: {
  appointments: Appointment[];
  dataMessage: string;
  isLoading: boolean;
  onChanged: () => Promise<void>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  async function cancelAppointment(appointment: Appointment) {
    setCancellingId(appointment.id);
    setActionMessage("");

    try {
      await barberAppApi.cancelarAgendamento<unknown>(appointment.id);
      setActionMessage("Agendamento cancelado. Esse horario voltou a ficar disponivel.");
      setConfirmCancelId(null);
      setConfirmPaymentId(null);
      await onChanged();
    } catch (error) {
      setActionMessage(clientError(error, "Nao foi possivel cancelar este agendamento agora."));
    } finally {
      setCancellingId(null);
    }
  }

  async function payAppointment(appointment: Appointment) {
    setPayingId(appointment.id);
    setActionMessage("");

    try {
      await barberAppApi.pagarAgendamento<unknown>(appointment.id);
      setActionMessage("Pagamento aprovado. Sua agenda foi atualizada.");
      setConfirmPaymentId(null);
      await onChanged();
    } catch (error) {
      setActionMessage(clientError(error, "Nao foi possivel processar o pagamento agora."));
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="panel client-agenda-panel">
      <span className="eyebrow">Minha agenda</span>
      <h2>Seus agendamentos</h2>
      <p className="integration-status">{isLoading ? "Carregando sua agenda..." : dataMessage}</p>
      {actionMessage && <p className="form-message">{actionMessage}</p>}
      <div className="list-screen compact-list">
        {!isLoading && appointments.length === 0 && (
          <p className="muted-copy">Voce ainda nao possui agendamentos.</p>
        )}
        {appointments.map((appointment) => (
          <div className="appointment-entry" key={appointment.id}>
            <article className="list-card appointment-card">
              <time>{formatAppointmentTime(appointment.dataHora)}</time>
              <div>
                <span>{appointmentStatusLabel(appointment.status)}</span>
                <h2>{appointment.nomeServico}</h2>
                <p>Com {appointment.nomeBarbeiro} em {formatAppointmentDate(appointment.dataHora)}</p>
              </div>
              <div className="appointment-actions">
                <strong>{money.format(appointment.precoServico)}</strong>
                <button
                  className="ghost-button detail-button"
                  type="button"
                  onClick={() => {
                    setExpandedId(expandedId === appointment.id ? null : appointment.id);
                    setConfirmCancelId(null);
                    setConfirmPaymentId(null);
                    setActionMessage("");
                  }}
                >
                  {expandedId === appointment.id ? "Fechar" : "Detalhes"}
                </button>
              </div>
            </article>

            {expandedId === appointment.id && (
              <section className="appointment-detail" aria-label={`Detalhes de ${appointment.nomeServico}`}>
                <div>
                  <span>Profissional</span>
                  <strong>{appointment.nomeBarbeiro}</strong>
                </div>
                <div>
                  <span>Data e horario</span>
                  <strong>{formatAppointmentDate(appointment.dataHora)} as {formatAppointmentTime(appointment.dataHora)}</strong>
                </div>
                <div>
                  <span>Pagamento</span>
                  <strong>{paymentStatusLabel(appointment.pagamento)}</strong>
                </div>
                {canPayAppointment(appointment) && (
                  <div className="appointment-payment">
                    {confirmPaymentId === appointment.id ? (
                      <>
                        <p>Confirmar pagamento de {money.format(appointment.precoServico)}?</p>
                        <div className="action-row">
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={payingId === appointment.id}
                            onClick={() => setConfirmPaymentId(null)}
                          >
                            Agora nao
                          </button>
                          <button
                            className="primary-button"
                            type="button"
                            disabled={payingId === appointment.id}
                            onClick={() => void payAppointment(appointment)}
                          >
                            {payingId === appointment.id ? "Processando..." : "Confirmar pagamento"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => {
                          setConfirmPaymentId(appointment.id);
                          setConfirmCancelId(null);
                        }}
                      >
                        Pagar agora
                      </button>
                    )}
                  </div>
                )}
                {appointment.status !== "Cancelado" && appointment.status !== "Concluido" && (
                  <div className="appointment-cancel">
                    {confirmCancelId === appointment.id ? (
                      <>
                        <p>Tem certeza que deseja cancelar este horario?</p>
                        <div className="action-row">
                          <button
                            className="ghost-button"
                            type="button"
                            disabled={cancellingId === appointment.id}
                            onClick={() => setConfirmCancelId(null)}
                          >
                            Manter horario
                          </button>
                          <button
                            className="cancel-button"
                            type="button"
                            disabled={cancellingId === appointment.id}
                            onClick={() => void cancelAppointment(appointment)}
                          >
                            {cancellingId === appointment.id ? "Cancelando..." : "Confirmar cancelamento"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className="cancel-button"
                        type="button"
                        onClick={() => {
                          setConfirmCancelId(appointment.id);
                          setConfirmPaymentId(null);
                        }}
                      >
                        Cancelar agendamento
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileScreen({
  profile,
  onSaved,
}: {
  profile: ClientProfile | null;
  onSaved: () => Promise<void>;
}) {
  const [nomeCompleto, setNomeCompleto] = useState(profile?.nome ?? "");
  const [telefone, setTelefone] = useState(profile?.telefone ?? "");
  const [profileMessage, setProfileMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setNomeCompleto(profile?.nome ?? "");
      setTelefone(profile?.telefone ?? "");
    });
  }, [profile]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nomeCompleto.trim() || !telefone.trim()) return;

    setIsSaving(true);
    setProfileMessage("");

    try {
      await barberAppApi.atualizarPerfil<unknown>({
        nomeCompleto: nomeCompleto.trim(),
        telefone: telefone.trim(),
      });
      await onSaved();
      setProfileMessage("Dados atualizados com sucesso.");
    } catch (error) {
      setProfileMessage(clientError(error, "Nao foi possivel atualizar seus dados agora."));
    } finally {
      setIsSaving(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!senhaAtual || !novaSenha) return;

    setIsChangingPassword(true);
    setPasswordMessage("");

    try {
      await barberAppApi.alterarSenha<unknown>({ senhaAtual, novaSenha });
      setSenhaAtual("");
      setNovaSenha("");
      setPasswordMessage("Senha alterada com sucesso.");
    } catch (error) {
      setPasswordMessage(clientError(error, "Nao foi possivel alterar sua senha agora."));
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="screen-grid client-profile-grid">
      <section className="panel profile-overview-panel">
        <span className="eyebrow">Minha conta</span>
        <h2>Meu perfil</h2>
        <div className="profile-box">
          <span className="avatar large">{profile?.nome.slice(0, 1) ?? "C"}</span>
          <strong>{profile?.nome ?? "Carregando..."}</strong>
          <small>{profile?.email ?? ""}</small>
          <small>{profile?.telefone ?? ""}</small>
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">Dados pessoais</span>
        <h2>Editar cadastro</h2>
        <form className="form-stack" onSubmit={saveProfile}>
          <label>
            Nome
            <input value={nomeCompleto} autoComplete="name" onChange={(event) => setNomeCompleto(event.target.value)} />
          </label>
          <label>
            Telefone
            <input value={telefone} type="tel" autoComplete="tel" onChange={(event) => setTelefone(event.target.value)} />
          </label>
          <label>
            E-mail
            <input value={profile?.email ?? ""} type="email" readOnly />
            <small className="field-note">Este e-mail e usado para entrar na conta e nao pode ser alterado por aqui.</small>
          </label>
          {profileMessage && <p className="form-message">{profileMessage}</p>}
          <button className="primary-button" type="submit" disabled={isSaving || !profile}>
            {isSaving ? "Salvando..." : "Salvar alteracoes"}
          </button>
        </form>
      </section>

      <section className="panel profile-security-panel">
        <span className="eyebrow">Seguranca</span>
        <h2>Alterar senha</h2>
        <p className="muted-copy">Use sua senha atual para cadastrar uma nova senha de acesso.</p>
        <form className="form-stack password-form" onSubmit={changePassword}>
          <label>
            Senha atual
            <input required value={senhaAtual} type="password" autoComplete="current-password" onChange={(event) => setSenhaAtual(event.target.value)} />
          </label>
          <label>
            Nova senha
            <input required value={novaSenha} type="password" autoComplete="new-password" onChange={(event) => setNovaSenha(event.target.value)} />
          </label>
          {passwordMessage && <p className="form-message">{passwordMessage}</p>}
          <button className="ghost-button" type="submit" disabled={isChangingPassword}>
            {isChangingPassword ? "Alterando..." : "Alterar senha"}
          </button>
        </form>
      </section>
    </div>
  );
}

function AuthenticationRequiredScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="auth-screen">
      <section className="panel access-panel">
        <span className="eyebrow">Acesso reservado</span>
        <h2>Entre para continuar</h2>
        <p className="muted-copy">Agendamentos e historico sao exibidos somente para o cliente autenticado.</p>
        <button className="primary-button" type="button" onClick={onLogin}>Entrar</button>
      </section>
    </div>
  );
}
