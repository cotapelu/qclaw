import { ExtensionAPI, defineTool } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function(pi: ExtensionAPI) {
  pi.on("agent_start", () => {
    console.log("Hello World extension loaded!");
  });

  pi.registerTool({
    name: "hello",
    label: "Hello",
    description: "Say hello to someone",
    parameters: Type.Object({
      name: Type.Optional(Type.String({ description: "Name to greet" })),
      style: Type.Optional(Type.Union([
        Type.Literal("friendly"),
        Type.Literal("formal"),
        Type.Literal("sarcastic")
      ], { description: "Greeting style" }))
    })),
    execute: async (ctx, params: any) => {
      const { name = "World", style = "friendly" } = params;
      const greetings = {
        friendly: `👋 Hello, ${name}! Welcome!`,
        formal: `Greetings, ${name}. It is a pleasure to assist you.`,
        sarcastic: `Oh great, it's ${name}... what do you want now?`
      };
      return {
        content: [{ type: "text", text: greetings[style] }],
        details: { style }
      };
    },
  });
}
