"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clientBrand } from "@/brand/client-brand";
import { barberAppApi, clearStoredToken, getStoredTokenClaims, type AuthTokenClaims } from "@/lib/barberapp-api";
import type { Appointment, BarberAvailability, WeekDay } from "@/lib/barberapp-types";

type BarberScreen = "hoje" | "agenda" | "disponibilidade" | "perfil";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const localAppointmentTime = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const localAppointmentDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const localDateKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
});

function formatAppointmentTime(value: string) {
  return localAppointmentTime.format(new Date(value));
}

function formatAppointmentDate(value: string) {
  return localAppointmentDate.format(new Date(value));
}

function barberError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (/api|entity changes|inner exception|exception|timestamp|postgres|npgsql/i.test(error.message)) {
    return fallback;
  }
  return error.message;
}

const navItems: Array<{ id: BarberScreen; label: string }> = [
  { id: "hoje", label: "Hoje" },
  { id: "agenda", label: "Agenda" },
  { id: "disponibilidade", label: "Expediente" },
  { id: "perfil", label: "Perfil" },
];

const barberRoleLabel = "Barbeiro";
const weekDays: WeekDay[] = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

type BarberProfile = {
  id: string;
  nomeCompleto: string;
  email: string;
  telefone: string;
  roles: string[];
};

type ApiAppointment = Omit<Appointment, "pagamento"> & {
  pagamento?: Appointment["pagamento"];
};

type ApiBarberAvailability = Partial<BarberAvailability> & {
  diaSemana: string;
  horarioInicio: string;
  horarioFim: string;
};

function normalizeAppointment(appointment: ApiAppointment): Appointment {
  return {
    ...appointment,
    pagamento: appointment.pagamento ?? "Pendente",
  };
}

function normalizeAvailability(availability: ApiBarberAvailability, index: number): BarberAvailability {
  return {
    id: availability.id ?? `${availability.diaSemana}-${availability.horarioInicio}-${availability.horarioFim}-${index}`,
    diaSemana: availability.diaSemana as WeekDay,
    horarioInicio: availability.horarioInicio,
    horarioFim: availability.horarioFim,
    ativo: availability.ativo ?? true,
  };
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

function isActiveAppointment(appointment: Appointment) {
  return appointment.status !== "Cancelado" && appointment.status !== "Concluido";
}

function sortByAppointmentDate(appointments: Appointment[]) {
  return [...appointments].sort((first, second) => (
    new Date(first.dataHora).getTime() - new Date(second.dataHora).getTime()
  ));
}

function isPastAppointment(appointment: Appointment) {
  const appointmentDay = localDateKey.format(new Date(appointment.dataHora));
  const today = localDateKey.format(new Date());

  return appointmentDay < today;
}

function getTodayAppointments(appointments: Appointment[]) {
  const today = localDateKey.format(new Date());
  return appointments.filter((appointment) => (
    isActiveAppointment(appointment)
    &&
    localDateKey.format(new Date(appointment.dataHora)) === today
  ));
}

function getFallbackProfile(claims: AuthTokenClaims | null): BarberProfile {
  return {
    id: claims?.nameId ?? "",
    nomeCompleto: claims?.name ?? "Carregando perfil...",
    email: claims?.email ?? "",
    telefone: "",
    roles: [claims?.role ?? barberRoleLabel],
  };
}

export function BarberProfileApp({ onLogout }: { onLogout?: () => void }) {
  const [screen, setScreen] = useState<BarberScreen>("hoje");
  const [claims, setClaims] = useState<AuthTokenClaims | null>(null);
  const [profile, setProfile] = useState<BarberProfile>(() => getFallbackProfile(null));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoadingHome, setIsLoadingHome] = useState(false);
  const [homeError, setHomeError] = useState("");
  const [availability, setAvailability] = useState<BarberAvailability[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");

  const screenTitle = useMemo(() => {
    return navItems.find((item) => item.id === screen)?.label ?? "Perfil";
  }, [screen]);

  const loadAvailability = useCallback(async (barbeiroId: string) => {
    setIsLoadingAvailability(true);
    setAvailabilityMessage("");

    try {
      const response = await barberAppApi.getDisponibilidades<ApiBarberAvailability[]>(barbeiroId);
      const normalizedAvailability = response.map(normalizeAvailability);

      setAvailability(normalizedAvailability);
      setAvailabilityMessage(`${normalizedAvailability.length} regras semanais ativas`);
    } catch (error) {
      setAvailabilityMessage(barberError(error, "Nao foi possivel carregar seu expediente."));
    } finally {
      setIsLoadingAvailability(false);
    }
  }, []);

  const loadBarberHome = useCallback(async () => {
    setIsLoadingHome(true);
    setHomeError("");

    try {
      const tokenClaims = getStoredTokenClaims();
      setClaims(tokenClaims);

      const [profileResponse, appointmentsResponse] = await Promise.all([
        barberAppApi.getPerfil<BarberProfile>(),
        barberAppApi.getAgendamentos<ApiAppointment[]>(),
      ]);

      setProfile(profileResponse);
      setAppointments(appointmentsResponse.map(normalizeAppointment));

      if (tokenClaims?.barbeiroId) {
        await loadAvailability(tokenClaims.barbeiroId);
      } else {
        setAvailabilityMessage("Nao foi possivel identificar sua agenda. Entre novamente.");
      }
    } catch (error) {
      setHomeError(barberError(error, "Nao foi possivel carregar sua area profissional."));
    } finally {
      setIsLoadingHome(false);
    }
  }, [loadAvailability]);

  async function handleCreateAvailability(payload: {
    diaSemana: WeekDay;
    horarioInicio: string;
    horarioFim: string;
  }) {
    const barbeiroId = claims?.barbeiroId ?? getStoredTokenClaims()?.barbeiroId;

    if (!barbeiroId) {
      setAvailabilityMessage("Nao foi possivel identificar sua conta. Entre novamente.");
      return;
    }

    setIsSavingAvailability(true);
    setAvailabilityMessage("");

    try {
      await barberAppApi.createDisponibilidade<unknown>(barbeiroId, payload);
      await loadAvailability(barbeiroId);
    } catch (error) {
      setAvailabilityMessage(barberError(error, "Nao foi possivel salvar o expediente."));
    } finally {
      setIsSavingAvailability(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadBarberHome();
    });
  }, [loadBarberHome]);

  function handleLogout() {
    clearStoredToken();
    onLogout?.();
  }

  return (
    <main className="app-frame barber-mode">
      <header className="app-header">
        <a className="brand" href="#" onClick={() => setScreen("perfil")} aria-label={clientBrand.name}>
          <span className="brand-mark">{clientBrand.logoMark}</span>
          <span>
            <strong>{clientBrand.name}</strong>
            <small>{clientBrand.legalName}</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Navegacao do barbeiro">
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
          <span className="tenant-chip">{barberRoleLabel}</span>
          <button className="header-action" type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <section className="mobile-title">
        <span>Area profissional</span>
        <h1>{screenTitle}</h1>
      </section>

      <section className="screen-shell">
        {screen === "hoje" && (
          <TodayScreen
            appointments={appointments}
            homeError={homeError}
            isLoadingHome={isLoadingHome}
            profile={profile}
          />
        )}
        {screen === "agenda" && <BarberAgendaScreen appointments={appointments} />}
        {screen === "disponibilidade" && (
          <AvailabilityScreen
            availability={availability}
            availabilityMessage={availabilityMessage}
            canManageSchedule={Boolean(claims?.barbeiroId)}
            isLoadingAvailability={isLoadingAvailability}
            isSavingAvailability={isSavingAvailability}
            onCreateAvailability={handleCreateAvailability}
          />
        )}
        {screen === "perfil" && (
          <BarberProfileScreen
            appointments={appointments}
            homeError={homeError}
            isLoadingHome={isLoadingHome}
            profile={profile}
          />
        )}
      </section>

      <footer className="app-footer">
        <div>
          <strong>{profile.nomeCompleto}</strong>
          <small>{profile.email}</small>
        </div>
        <small>Agenda e expediente profissional.</small>
      </footer>

      <nav className="bottom-nav barber-bottom-nav" aria-label="Navegacao mobile do barbeiro">
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

function BarberProfileScreen({
  appointments,
  homeError,
  isLoadingHome,
  profile,
}: {
  appointments: Appointment[];
  homeError: string;
  isLoadingHome: boolean;
  profile: BarberProfile;
}) {
  const activeAppointments = appointments.filter(isActiveAppointment);
  const revenue = activeAppointments.reduce((sum, item) => sum + item.precoServico, 0);
  const todayAppointments = getTodayAppointments(appointments);
  const primaryRole = profile.roles[0] ?? barberRoleLabel;

  return (
    <div className="screen-grid barber-profile-grid">
      <section className="hero-panel barber-identity">
        <span className="eyebrow">Perfil profissional</span>
        <div className="barber-hero-row">
          <span className="avatar xlarge">{profile.nomeCompleto.slice(0, 1)}</span>
          <div>
            <h2>{profile.nomeCompleto}</h2>
            <p>{profile.email}</p>
          </div>
        </div>
        <p className="integration-status">
          {isLoadingHome && "Carregando perfil e agenda..."}
          {!isLoadingHome && homeError && homeError}
          {!isLoadingHome && !homeError && `${activeAppointments.length} agendamentos ativos`}
        </p>
        <div className="profile-metrics">
          <article>
            <span>Hoje</span>
            <strong>{todayAppointments.length}</strong>
            <small>atendimentos</small>
          </article>
          <article>
            <span>Receita</span>
            <strong>{money.format(revenue)}</strong>
            <small>prevista</small>
          </article>
          <article>
            <span>Perfil</span>
            <strong>{primaryRole}</strong>
            <small>profissional</small>
          </article>
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">Dados pessoais</span>
        <h2>Dados profissionais</h2>
        <form className="form-stack">
          <label>Nome completo<input value={profile.nomeCompleto} readOnly /></label>
          <label>Email<input value={profile.email} type="email" readOnly /></label>
          <label>Telefone<input value={profile.telefone} readOnly /></label>
          <label>Funcao<input value={primaryRole} readOnly /></label>
          <button className="primary-button" type="button">Salvar perfil</button>
        </form>
      </section>

      <section className="panel">
        <span className="eyebrow">Seguranca</span>
        <h2>Acesso a conta</h2>
        <div className="claim-list">
          <div><span>Conta</span><strong>{profile.email || "Carregando..."}</strong></div>
          <div><span>Tipo de acesso</span><strong>{primaryRole}</strong></div>
        </div>
        <button className="ghost-button full-button" type="button">Alterar senha</button>
      </section>
    </div>
  );
}

function TodayScreen({
  appointments,
  homeError,
  isLoadingHome,
  profile,
}: {
  appointments: Appointment[];
  homeError: string;
  isLoadingHome: boolean;
  profile: BarberProfile;
}) {
  const activeAppointments = appointments.filter(isActiveAppointment);
  const todayAppointments = sortByAppointmentDate(getTodayAppointments(appointments));
  const upcomingAppointments = sortByAppointmentDate(activeAppointments.filter((appointment) => !isPastAppointment(appointment)));
  const nextAppointment = todayAppointments[0] ?? upcomingAppointments[0];

  return (
    <div className="screen-grid booking-grid">
      <section className="summary-panel">
        <span>Primeiro atendimento</span>
        <strong>{nextAppointment ? formatAppointmentTime(nextAppointment.dataHora) : "--:--"}</strong>
        <small>{nextAppointment?.nomeCliente ?? "Sem cliente"}</small>
      </section>
      <section className="panel">
        <span className="eyebrow">Atendimentos</span>
        <h2>Fila de hoje</h2>
        <p className="integration-status">
          {isLoadingHome && "Carregando agenda..."}
          {!isLoadingHome && homeError && homeError}
          {!isLoadingHome && !homeError && `${profile.nomeCompleto}: ${todayAppointments.length} atendimentos hoje`}
        </p>
        <AppointmentList appointments={todayAppointments} emptyMessage="Nenhum atendimento encontrado para hoje." />
      </section>
    </div>
  );
}

function BarberAgendaScreen({ appointments }: { appointments: Appointment[] }) {
  const openAppointments = sortByAppointmentDate(
    appointments.filter((appointment) => isActiveAppointment(appointment) && !isPastAppointment(appointment)),
  );
  const historyAppointments = sortByAppointmentDate(
    appointments.filter((appointment) => !isActiveAppointment(appointment) || isPastAppointment(appointment)),
  ).reverse();

  return (
    <div className="screen-grid barber-agenda-sections">
      <section className="panel">
        <span className="eyebrow">Agenda profissional</span>
        <h2>Agenda aberta</h2>
        <p className="muted-copy">Somente atendimentos de hoje e dos proximos dias ocupam horario.</p>
        <AppointmentList appointments={openAppointments} emptyMessage="Nenhum horario ocupado daqui para frente." />
      </section>

      <section className="panel cancelled-history-panel">
        <span className="eyebrow">Historico</span>
        <h2>Dias anteriores</h2>
        <p className="muted-copy">Depois que o dia passa, o atendimento sai da agenda aberta e fica aqui.</p>
        <AppointmentList appointments={historyAppointments} emptyMessage="Nenhum atendimento no historico ainda." />
      </section>
    </div>
  );
}

function AppointmentList({
  appointments,
  emptyMessage,
}: {
  appointments: Appointment[];
  emptyMessage: string;
}) {
  if (appointments.length === 0) {
    return <p className="muted-copy">{emptyMessage}</p>;
  }

  return (
    <div className="list-screen compact-list">
      {appointments.map((appointment) => (
        <article className="list-card appointment-card" key={appointment.id}>
          <time>
            <strong>{formatAppointmentTime(appointment.dataHora)}</strong>
            <span>{formatAppointmentDate(appointment.dataHora)}</span>
          </time>
          <div>
            <span>{appointment.status} - pagamento {appointment.pagamento}</span>
            <h2>{appointment.nomeCliente}</h2>
            <p>{appointment.nomeServico}</p>
          </div>
          <strong>{money.format(appointment.precoServico)}</strong>
        </article>
      ))}
    </div>
  );
}

function AvailabilityScreen({
  availability,
  availabilityMessage,
  canManageSchedule,
  isLoadingAvailability,
  isSavingAvailability,
  onCreateAvailability,
}: {
  availability: BarberAvailability[];
  availabilityMessage: string;
  canManageSchedule: boolean;
  isLoadingAvailability: boolean;
  isSavingAvailability: boolean;
  onCreateAvailability: (payload: {
    diaSemana: WeekDay;
    horarioInicio: string;
    horarioFim: string;
  }) => void;
}) {
  const [diaSemana, setDiaSemana] = useState<WeekDay>("Segunda");
  const [horarioInicio, setHorarioInicio] = useState("08:00");
  const [horarioFim, setHorarioFim] = useState("18:00");

  return (
    <div className="screen-grid two-column">
      <section className="panel">
        <span className="eyebrow">Expediente de atendimento</span>
        <h2>Regras semanais</h2>
        <p className="integration-status">
          {isLoadingAvailability && "Carregando expediente..."}
          {!isLoadingAvailability && availabilityMessage}
        </p>
        <div className="availability-note">
          <strong>Estas regras se repetem toda semana</strong>
          <p>Elas definem quando voce atende em cada dia da semana. A agenda real fica em Agenda aberta; o que passou aparece no historico.</p>
        </div>
        <div className="availability-list">
          {availability.length === 0 && (
            <p className="muted-copy">Nenhuma regra semanal cadastrada para este barbeiro.</p>
          )}
          {availability.map((availabilityItem) => (
            <article className="availability-row" key={availabilityItem.id}>
              <div>
                <strong>{availabilityItem.diaSemana}</strong>
                <small>{availabilityItem.ativo ? "Repete toda semana" : "Inativo"}</small>
              </div>
              <span>{formatTime(availabilityItem.horarioInicio)} - {formatTime(availabilityItem.horarioFim)}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">Cadastro de expediente</span>
        <h2>Nova regra semanal</h2>
        <form className="form-stack">
          <label>
            Dia da semana
            <select value={diaSemana} onChange={(event) => setDiaSemana(event.target.value as WeekDay)}>
              {weekDays.map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </label>
          <label>
            Inicio
            <input value={horarioInicio} type="time" onChange={(event) => setHorarioInicio(event.target.value)} />
          </label>
          <label>
            Fim
            <input value={horarioFim} type="time" onChange={(event) => setHorarioFim(event.target.value)} />
          </label>
          <button
            className="primary-button"
            type="button"
            disabled={isSavingAvailability || !canManageSchedule}
            onClick={() => onCreateAvailability({ diaSemana, horarioInicio, horarioFim })}
          >
            {isSavingAvailability ? "Salvando..." : "Salvar regra semanal"}
          </button>
        </form>
        <p className="muted-copy">
          {canManageSchedule ? "Esta tela cria um expediente fixo da semana, nao um horario para uma data unica." : "Entre novamente para gerenciar seu expediente."}
        </p>
      </section>
    </div>
  );
}
