import type {
  Appointment,
  AvailableSlot,
  Barber,
  BarberAvailability,
  Role,
  Service,
} from "@/lib/barberapp-types";

export const activeRole: Role = "Cliente";

export const mockAdminProfile = {
  id: "admin-1",
  nomeCompleto: "Admin BarberApp",
  email: "admin@barberapp.com",
  telefone: "62999990009",
  role: "Admin" as Role,
  tokenPreview: "Bearer eyJ...admin.mock",
};

export const mockClient = {
  id: "client-1",
  nomeCompleto: "Joao Silva",
  email: "joao@email.com",
  telefone: "62999990000",
  tokenPreview: "Bearer eyJ...mock",
};

export const mockBarbers: Barber[] = [
  { id: "barber-1", nome: "Carlos Silva", telefone: "62999990001", foto: null, agendaHoje: 8, ocupacao: 86 },
  { id: "barber-2", nome: "Bruno Rocha", telefone: "62999990002", foto: null, agendaHoje: 6, ocupacao: 72 },
  { id: "barber-3", nome: "Leo Almeida", telefone: "62999990003", foto: null, agendaHoje: 4, ocupacao: 58 },
];

export const mockClients = [
  { id: "client-1", nomeCompleto: "Joao Silva", telefone: "62999990000", totalAgendamentos: 5 },
  { id: "client-2", nomeCompleto: "Rafael Lima", telefone: "62999990011", totalAgendamentos: 3 },
  { id: "client-3", nomeCompleto: "Andre Souza", telefone: "62999990012", totalAgendamentos: 4 },
  { id: "client-4", nomeCompleto: "Marcos Dias", telefone: "62999990013", totalAgendamentos: 2 },
];

export const mockBarberProfile = {
  id: "barber-1",
  userId: "user-barber-1",
  nomeCompleto: "Carlos Silva",
  email: "carlos@barbearia.com",
  telefone: "62999990001",
  role: "Barbeiro" as Role,
  especialidade: "Degrade e barba premium",
  foto: null,
  tokenClaims: {
    role: "Barbeiro" as Role,
    BarbeiroId: "barber-1",
  },
};

export const mockBarberAvailability: BarberAvailability[] = [
  { id: "availability-1", diaSemana: "Segunda", horarioInicio: "08:00", horarioFim: "18:00", ativo: true },
  { id: "availability-2", diaSemana: "Terca", horarioInicio: "08:00", horarioFim: "18:00", ativo: true },
  { id: "availability-3", diaSemana: "Quarta", horarioInicio: "10:00", horarioFim: "20:00", ativo: true },
  { id: "availability-4", diaSemana: "Quinta", horarioInicio: "08:00", horarioFim: "18:00", ativo: true },
  { id: "availability-5", diaSemana: "Sexta", horarioInicio: "08:00", horarioFim: "19:00", ativo: true },
  { id: "availability-6", diaSemana: "Sabado", horarioInicio: "09:00", horarioFim: "15:00", ativo: true },
];

export const mockServices: Service[] = [
  {
    id: "service-1",
    nome: "Corte Degrade",
    descricao: "Corte moderno com maquina e tesoura",
    preco: 45,
    duracaoMinutos: 45,
  },
  {
    id: "service-2",
    nome: "Corte + barba",
    descricao: "Finalizacao completa com toalha quente",
    preco: 85,
    duracaoMinutos: 70,
  },
  {
    id: "service-3",
    nome: "Barba premium",
    descricao: "Desenho, hidratacao e acabamento",
    preco: 55,
    duracaoMinutos: 40,
  },
];

export const mockSlots: AvailableSlot[] = [
  { horario: "08:00", disponivel: true },
  { horario: "08:45", disponivel: false },
  { horario: "09:30", disponivel: true },
  { horario: "10:15", disponivel: false },
  { horario: "11:00", disponivel: true },
  { horario: "14:30", disponivel: true },
];

export const mockAppointments: Appointment[] = [
  {
    id: "appointment-1",
    nomeCliente: "Joao Silva",
    nomeBarbeiro: "Carlos Silva",
    nomeServico: "Corte Degrade",
    precoServico: 45,
    dataHora: "2026-05-10T08:00:00",
    status: "Confirmado",
    pagamento: "Aprovado",
  },
  {
    id: "appointment-2",
    nomeCliente: "Rafael Lima",
    nomeBarbeiro: "Bruno Rocha",
    nomeServico: "Corte + barba",
    precoServico: 85,
    dataHora: "2026-05-10T09:30:00",
    status: "Pendente",
    pagamento: "Pendente",
  },
  {
    id: "appointment-3",
    nomeCliente: "Andre Souza",
    nomeBarbeiro: "Carlos Silva",
    nomeServico: "Barba premium",
    precoServico: 55,
    dataHora: "2026-05-10T10:15:00",
    status: "Confirmado",
    pagamento: "Aprovado",
  },
  {
    id: "appointment-4",
    nomeCliente: "Marcos Dias",
    nomeBarbeiro: "Leo Almeida",
    nomeServico: "Corte Degrade",
    precoServico: 45,
    dataHora: "2026-05-10T14:30:00",
    status: "Pendente",
    pagamento: "Pendente",
  },
  {
    id: "appointment-5",
    nomeCliente: "Joao Silva",
    nomeBarbeiro: "Carlos Silva",
    nomeServico: "Corte + barba",
    precoServico: 85,
    dataHora: "2026-05-11T16:00:00",
    status: "Concluido",
    pagamento: "Aprovado",
  },
  {
    id: "appointment-6",
    nomeCliente: "Rafael Lima",
    nomeBarbeiro: "Leo Almeida",
    nomeServico: "Corte Degrade",
    precoServico: 45,
    dataHora: "2026-05-15T18:00:00",
    status: "Confirmado",
    pagamento: "Aprovado",
  },
  {
    id: "appointment-7",
    nomeCliente: "Andre Souza",
    nomeBarbeiro: "Bruno Rocha",
    nomeServico: "Corte + barba",
    precoServico: 85,
    dataHora: "2026-04-18T11:00:00",
    status: "Concluido",
    pagamento: "Aprovado",
  },
  {
    id: "appointment-8",
    nomeCliente: "Marcos Dias",
    nomeBarbeiro: "Carlos Silva",
    nomeServico: "Barba premium",
    precoServico: 55,
    dataHora: "2026-04-22T15:30:00",
    status: "Cancelado",
    pagamento: "Pendente",
  },
  {
    id: "appointment-9",
    nomeCliente: "Joao Silva",
    nomeBarbeiro: "Bruno Rocha",
    nomeServico: "Corte Degrade",
    precoServico: 45,
    dataHora: "2026-03-07T09:00:00",
    status: "Concluido",
    pagamento: "Aprovado",
  },
  {
    id: "appointment-10",
    nomeCliente: "Rafael Lima",
    nomeBarbeiro: "Carlos Silva",
    nomeServico: "Corte + barba",
    precoServico: 85,
    dataHora: "2026-03-08T10:30:00",
    status: "Concluido",
    pagamento: "Aprovado",
  },
];
