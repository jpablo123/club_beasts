// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "c1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));
import { render, screen } from "@testing-library/react";
import AnamnesisEditor from "@/components/anamnesis/AnamnesisEditor";

const cliente = { id: "c1", nombreCompleto: "Juan", numeroDocumento: "123", numeroContacto: "300", correoElectronico: "a@b.com" } as any;

const CAMPOS = [
  { label: "Nombre completo", hint: "Tal como aparece en tu documento de identidad." },
  { label: "Número de documento", hint: "Cedula o documento de identidad." },
  { label: "Sexo", hint: "Selecciona FEMENINO o MASCULINO." },
  { label: "RH", hint: "Grupo sanguineo con factor (ej. O+)." },
  { label: "Edad", hint: "Edad en anos (13 a 100)." },
  { label: "Fecha de nacimiento", hint: "Fecha (YYYY-MM-DD) y lugar de nacimiento." },
  { label: "Lugar de nacimiento", hint: "Fecha (YYYY-MM-DD) y lugar de nacimiento." },
  { label: "Estado civil", hint: "Opcional." },
  { label: "Dirección de residencia", hint: "Direccion actual de residencia." },
  { label: "Número de contacto", hint: "Telefono de contacto." },
  { label: "Correo electrónico", hint: "Opcional; formato de correo valido." },
  { label: "Practica algún deporte", hint: "Selecciona SI o NO." },
  { label: "Cual deporte", hint: "Solo si practica deporte (SI en la pregunta anterior)." },
  { label: "Tiempo que practica", hint: "Tiempo que lleva practicandolo." },
  { label: "Contacto de emergencia", hint: "Nombre y numero de la persona a contactar en emergencia." },
  { label: "EPS", hint: "EPS actual." },
  { label: "Antecedentes médicos", hint: "Marca lo que aplique; \"Ninguno\" excluye el resto." },
  { label: "Antecedentes familiares", hint: "Indica parentesco (padres, abuelos, hermanos) y cuales." },
  { label: "Enfermedad relevante", hint: "Selecciona SI o NO." },
  { label: "Cual enfermedad", hint: "Solo si respondio SI en la pregunta anterior." },
  { label: "Objetivos de entrenamiento", hint: "Describe los objetivos que deseas al entrenar." },
  { label: "Nivel de actividad", hint: "Elige el nivel que mejor te describa (sin considerar el deporte)." },
  { label: "Días que no puede entrenar", hint: "Marca los dias de la semana que no puede entrenar." },
  { label: "Hora para acostarse", hint: "Formato HH:mm." },
  { label: "Comidas al día", hint: "Numero de comidas por dia (1 a 12)." },
];

describe("UX-02 paridad label/hint (RED)", () => {
  it("renderiza los 25 labels y hints", () => {
    render(
      <AnamnesisEditor clienteId="c1" cliente={cliente} inicial={null} onGuardado={() => {}} onDescartar={() => {}} />
    );
    for (const c of CAMPOS) {
      screen.getByText(c.label);
      expect(screen.getAllByText(c.hint).length).toBeGreaterThan(0);
    }
  });
});