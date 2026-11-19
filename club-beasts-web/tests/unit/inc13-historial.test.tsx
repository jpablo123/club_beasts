// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HistorialCliente from "@/components/HistorialCliente";

describe("INC-13 web historial", () => {
  it("HistorialCliente tabs solo lectura", () => {
    render(<HistorialCliente clienteId="c1" />);
    expect(screen.getByText("todos")).toBeDefined();
  });
  it("portal historial sin actor", () => {
    render(<HistorialCliente clienteId="c1" actor={false} />);
    expect(screen.queryByText(/actor/i)).toBeNull();
  });
});
