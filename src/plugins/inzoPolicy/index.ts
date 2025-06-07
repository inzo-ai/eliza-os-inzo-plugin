// src/plugins/inzoPolicy/index.ts
import { PluginDefinition } from "@ai16z/eliza";
import { getPolicyActions } from "./actions";

export interface InzoPolicyPluginConfig { /* ... */ }

export const inzoPolicyPlugin = (config: InzoPolicyPluginConfig): PluginDefinition => ({
    name: "inzo-policy-plugin",
    description: "Manages insurance policy applications, viewing, and premium payments.",
    actions: getPolicyActions(config),
    evaluators: []
});
