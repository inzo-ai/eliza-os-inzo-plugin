// src/plugins/index.ts
import { inzoKycPlugin, InzoKycPluginConfig } from "./inzoKyc";
import { inzoPolicyPlugin, InzoPolicyPluginConfig } from "./inzoPolicy";
// ... import other Inzo plugins when created

// You might create a single InzoSwarmConfig that aggregates all needed configs
export interface InzoSwarmPluginConfig {
    kycConfig: InzoKycPluginConfig;
    policyConfig: InzoPolicyPluginConfig;
    // ... other configs
    // Also include the common blockchain config here
    rpcUrl: string;
    oraclePrivateKey: string;
    clientOrchestratorPrivateKey: string;
    claimOracleRelayAddress: string;
    claimOracleRelayAbiJson: any;
    policyLedgerAddress: string;
    policyLedgerAbiJson: any;
    inzoUSDAddress: string;
    inzoUSDAbiJson: any;
    insuranceFundManagerAddress: string;
    insuranceFundManagerAbiJson: any;
}

// This function would be called by your main ElizaOS setup
export const getInzoPlugins = (config: InzoSwarmPluginConfig) => {
    // Initialize blockchain interactions globally for all plugins if not done per plugin
    const { initializeBlockchain } = require("../common/contractInteractions"); // Relative path
    initializeBlockchain({
        rpcUrl: config.rpcUrl,
        oraclePrivateKey: config.oraclePrivateKey,
        clientOrchestratorPrivateKey: config.clientOrchestratorPrivateKey,
        claimOracleRelayAddress: config.claimOracleRelayAddress,
        claimOracleRelayAbiJson: config.claimOracleRelayAbiJson,
        policyLedgerAddress: config.policyLedgerAddress,
        policyLedgerAbiJson: config.policyLedgerAbiJson,
        inzoUSDAddress: config.inzoUSDAddress,
        inzoUSDAbiJson: config.inzoUSDAbiJson,
        insuranceFundManagerAddress: config.insuranceFundManagerAddress,
        insuranceFundManagerAbiJson: config.insuranceFundManagerAbiJson,
    });


    return [
        inzoKycPlugin(config.kycConfig), // Pass specific parts of config
        inzoPolicyPlugin(config.policyConfig),
        // ... add other Inzo plugins here
    ];
};
