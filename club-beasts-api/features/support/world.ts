import { setWorldConstructor } from "@cucumber/cucumber";

export class ApiWorld {
  token: string | null = null;
  response: any = null;
  clienteId: string | null = null;
  cedula: string | null = null;
}

setWorldConstructor(ApiWorld);
