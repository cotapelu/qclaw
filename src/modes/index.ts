export { runInteractiveMode } from "./interactive.js";
export { runPrintMode } from "./print.js";
export { runRpcMode } from "./rpc.js";

export enum Mode {
  INTERACTIVE = "interactive",
  PRINT = "print",
  RPC = "rpc",
}
