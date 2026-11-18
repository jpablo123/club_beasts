// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "c1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));
import { render, screen, fireEvent } from "@testing-library/react";
import AnamnesisEditor from "@/components/anamnesis/AnamnesisEditor";

const cliente = { id: "c1", nombreCompleto: "Juan", numeroDocumento: "123", numeroContacto: "300", correoElectronico: "a@b.com" } as any;

describe("UX-04 condicionales 12/18b (RED)", () => {
  it("con 11=NO y 12 presente muestra senalamiento inline de contradiccion", () => {
    render(<AnamnesisEditor clienteId="c1" cliente={cliente} inicial={{ practicaDeporte: "NO", cualDeporte: "futbol" } as any} onGuardado={() => {}} onDescartar={() => {}} />);
    screen.getByText(/contradiccion/i);
  });
  it("con 11=SI muestra hint de 12", () => {
    render(<AnamnesisEditor clienteId="c1" cliente={cliente} inicial={{ practicaDeporte: "SI" } as any} onGuardado={() => {}} onDescartar={() => {}} />);
    screen.getByText(/Solo si practica deporte/i);
  });
});