export type Role = "Admin" | "Barbeiro" | "Cliente";

export type AppointmentStatus = "Pendente" | "Confirmado" | "Concluido" | "Cancelado";

export type PaymentStatus = "Pendente" | "Aprovado" | "Reembolsado" | "Recusado";

export type WeekDay = "Domingo" | "Segunda" | "Terca" | "Quarta" | "Quinta" | "Sexta" | "Sabado";

export type Barber = {
  id: string;
  nome: string;
  telefone: string;
  foto: string | null;
  agendaHoje: number;
  ocupacao: number;
};

export type Service = {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  duracaoMinutos: number;
};

export type AvailableSlot = {
  horario: string;
  disponivel: boolean;
};

export type Appointment = {
  id: string;
  nomeCliente: string;
  nomeBarbeiro: string;
  nomeServico: string;
  precoServico: number;
  dataHora: string;
  status: AppointmentStatus;
  pagamento: PaymentStatus;
};

export type BarberAvailability = {
  id: string;
  diaSemana: WeekDay;
  horarioInicio: string;
  horarioFim: string;
  ativo: boolean;
};
