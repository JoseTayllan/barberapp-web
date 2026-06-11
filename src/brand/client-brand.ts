export type ThemeName = "premium-gold" | "graphite" | "emerald-gold";

export type ClientBrand = {
  name: string;
  legalName: string;
  logoMark: string;
  theme: ThemeName;
  city: string;
  phone: string;
  accentLabel: string;
  domain: string;
  apiBaseUrl: string;
  dataMode: "mock" | "api";
};

export const clientBrand: ClientBrand = {
  name: "BarberApp",
  legalName: "BarberApp Prime Studio",
  logoMark: "BA",
  theme: "premium-gold",
  city: "Sao Paulo",
  phone: "(11) 90000-0000",
  accentLabel: "Dark premium",
  domain: "barbearia-x.com",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/backend",
  dataMode: process.env.NEXT_PUBLIC_DATA_MODE === "api" ? "api" : "mock",
};
