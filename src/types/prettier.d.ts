import { Printer } from "prettier";

declare module "prettier/plugins/yaml" {
  export const printers: {
    yaml: Required<Printer>;
  };
}
