import type { Metadata } from "next";
import { clientBrand } from "@/brand/client-brand";
import "./globals.css";

export const metadata: Metadata = {
  title: `${clientBrand.name} | Gestao de barbearias`,
  description: "Frontend white-label para gestao de agenda, equipe e atendimento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-theme={clientBrand.theme}>
      <body>{children}</body>
    </html>
  );
}
