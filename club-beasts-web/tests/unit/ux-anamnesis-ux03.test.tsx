// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "c1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));
import { render, screen } from "@testing-library/react";
import AnamnesisEditor from "@/components/anamnesis/AnamnesisEditor";
import AnamnesisVista from "@/components/anamnesis/AnamnesisVista";

const cliente = { id: "c1", nombreCompleto: "Juan", numeroDocumento: "123", numeroContacto: "300", correoElectronico: "a@b.com" } as any;

describe("UX-03 sensibles muestran Informacion confidencial (RED)", () => {
  it("editor: 5 sensibles muestran el aviso", () => {
    render(<AnamnesisEditor clienteId="c1" cliente={cliente} inicial={null} onGuardado={() => {}} onDescartar={() => {}} />);
    expect(screen.getAllByText(/Informacion confidencial/i)).toHaveLength(5);
  });
  it("vista: 5 sensibles muestran el aviso", () => {
    render(<AnamnesisVista datos={{
  rh: "O+",
  antecedentesMedicos: ["Alergias"],
  antecedentesFamiliares: "diabetes",
  enfermedadRelevante: "SI",
  cualEnfermedad: "asma",
} as any} />);
    expect(screen.getAllByText(/Informacion confidencial/i)).toHaveLength(5);
  });
});