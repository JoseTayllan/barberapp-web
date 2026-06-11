import { clientBrand } from "@/brand/client-brand";
import { mockAppointments, mockBarbers, mockServices, mockSlots } from "@/lib/mock-data";

export const apiEnvironment = {
  baseUrl: clientBrand.apiBaseUrl,
  dataMode: clientBrand.dataMode,
  authHeaderName: "Authorization",
  tokenPrefix: "Bearer",
};

export const barberAppEndpoints = {
  auth: {
    register: "/api/Auth/registro",
    login: "/api/Auth/login",
  },
  perfil: "/api/perfil",
  barbeiros: "/api/Barbeiros",
  servicos: "/api/Servicos",
  agendamentos: "/api/Agendamentos",
  horariosDisponiveis: "/api/Agendamentos/horarios-disponiveis",
  pagamentos: "/api/Pagamentos",
  clientes: "/api/Clientes",
  meuPerfilCliente: "/api/Clientes/meu-perfil",
  disponibilidades: (barbeiroId: string) => `/api/barbeiros/${barbeiroId}/disponibilidades`,
  agendamento: (id: string) => `/api/Agendamentos/${id}`,
  confirmarAgendamento: (id: string) => `/api/Agendamentos/${id}/confirmar`,
  cancelarAgendamento: (id: string) => `/api/Agendamentos/${id}/cancelar`,
  pagamento: (agendamentoId: string) => `/api/Pagamentos/${agendamentoId}`,
};

export const barberAppMock = {
  appointments: mockAppointments,
  barbers: mockBarbers,
  services: mockServices,
  slots: mockSlots,
};
