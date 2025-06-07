// src/common/contractInteractions.ts
import { ethers } from "ethers";
// Assume ABIs are loaded similarly to your bot, or managed by ElizaOS runtime if plugins are sandboxed.
// For simplicity, let's assume these are configured within the plugin or runtime.

// Placeholder types - these should match your actual contract ABI outputs
interface ClaimDecision { timestamp: ethers.BigNumber; isApproved: boolean; payoutAmount: ethers.BigNumber; /* ... other fields */ }
interface PolicyEssentialDetails { policyId: ethers.BigNumber; policyHolder: string; currentStatus: number; coverageAmount: ethers.BigNumber; }
interface PolicyFinancialTerms { premium: ethers.BigNumber; coverage: ethers.BigNumber; riskTier: number; }

// These would be configured when the plugin is initialized
let rpcUrl: string;
let oraclePrivateKey: string; // For oracle actions
let clientOrchestratorPrivateKey: string; // For admin-like actions
let claimOracleRelayAddress: string;
let policyLedgerAddress: string;
let inzoUSDAddress: string;
let insuranceFundManagerAddress: string;

let provider: ethers.providers.JsonRpcProvider;
let oracleWalletSigner: ethers.Wallet;
let clientOrchestratorWalletSigner: ethers.Wallet;

// ABIs would be loaded here (e.g., from JSON files or constants)
let claimOracleRelayAbi: any;
let policyLedgerAbi: any;
let inzoUSDAbi: any;
let insuranceFundManagerAbi: any;

// Call this during plugin initialization or runtime setup
export function initializeBlockchain(config: {
    rpcUrl: string;
    oraclePrivateKey: string;
    clientOrchestratorPrivateKey: string;
    claimOracleRelayAddress: string;
    claimOracleRelayAbiJson: any; // Pass ABI directly
    policyLedgerAddress: string;
    policyLedgerAbiJson: any;
    inzoUSDAddress: string;
    inzoUSDAbiJson: any;
    insuranceFundManagerAddress: string;
    insuranceFundManagerAbiJson: any;
}) {
    rpcUrl = config.rpcUrl;
    oraclePrivateKey = config.oraclePrivateKey;
    clientOrchestratorPrivateKey = config.clientOrchestratorPrivateKey;
    claimOracleRelayAddress = config.claimOracleRelayAddress;
    claimOracleRelayAbi = config.claimOracleRelayAbiJson;
    policyLedgerAddress = config.policyLedgerAddress;
    policyLedgerAbi = config.policyLedgerAbiJson;
    inzoUSDAddress = config.inzoUSDAddress;
    inzoUSDAbi = config.inzoUSDAbiJson;
    insuranceFundManagerAddress = config.insuranceFundManagerAddress;
    insuranceFundManagerAbi = config.insuranceFundManagerAbiJson;
    
    provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    oracleWalletSigner = new ethers.Wallet(oraclePrivateKey, provider);
    clientOrchestratorWalletSigner = new ethers.Wallet(clientOrchestratorPrivateKey, provider);
    console.log("Blockchain interface initialized for Inzo plugins.");
}


export async function updateKycOnChain(inzoWalletAddress: string, isVerified: boolean): Promise<{success: boolean, txHash?: string, error?: string}> {
    if (!claimOracleRelayContract) return { success: false, error: "ClaimOracleRelay not initialized." };
    try {
        const contract = new ethers.Contract(claimOracleRelayAddress, claimOracleRelayAbi, oracleWalletSigner);
        const tx = await contract.updateKycStatus(inzoWalletAddress, isVerified);
        await tx.wait();
        return { success: true, txHash: tx.hash };
    } catch (e: any) {
        console.error("updateKycOnChain error:", e);
        return { success: false, error: e.message };
    }
}

export async function createInzoWalletForUser(): Promise<{address: string, privateKey: string} | {error: string}> {
    // In a real system, this is highly sensitive and involves secure key management.
    // For ElizaOS plugin demo, we generate it. The PK should NOT be returned to the agent normally.
    try {
        const wallet = ethers.Wallet.createRandom();
        return { address: wallet.address, privateKey: wallet.privateKey }; // Again, PK handling is for demo.
    } catch(e: any) {
        return { error: "Failed to generate wallet."}
    }
}

export async function mintInzoUSD(toAddress: string, amountFormatted: string): Promise<{success: boolean, txHash?: string, error?: string}> {
    if (!inzoUSDContract) return { success: false, error: "InzoUSD contract not initialized." };
    try {
        const contract = new ethers.Contract(inzoUSDAddress, inzoUSDAbi, clientOrchestratorWalletSigner); // Assuming orchestrator/deployer can mint
        const amountWei = ethers.utils.parseUnits(amountFormatted, 18);
        const tx = await contract.mint(toAddress, amountWei);
        await tx.wait();
        return { success: true, txHash: tx.hash };
    } catch (e: any) {
        console.error("mintInzoUSD error:", e);
        return { success: false, error: e.message };
    }
}

// Add more functions here:
// - createPolicyOnChain(policyInput): Promise<{success, policyId?, error?}>
// - getPolicyDetailsFromChain(policyId): Promise<{success, details?, error?}>
// - collectPremiumOnChain(policyId, payerInzoWalletAddress, premiumAmount): Promise<{success, txHash?, error?}>
// - activatePolicyOnChain(policyId): Promise<{success, txHash?, error?}>
// - fileClaimOnChain(policyId): Promise<{success, txHash?, error?}> (Updates status to ClaimUnderReview)
// - submitOracleClaimDecisionOnChain(policyId, claimId, isApproved, payoutAmount): Promise<{success, txHash?, error?}>
// - processPayoutOnChain(policyId, beneficiary, amount): Promise<{success, txHash?, error?}>
// - finalizeClaimStatusOnChain(policyId, newStatus): Promise<{success, txHash?, error?}>
// - getInzoWalletBalances(inzoWalletAddress): Promise<{wnd?, inzousd?, error?}>
// - transferInzoUSDFromInzoWallet(inzoWalletPrivateKey, toAddress, amountFormatted): Promise<{success, txHash?, error?}>

// Placeholder for a complex function
export async function applyForPolicyFull(
    policyHolderInzoWallet: string,
    policyInput: any // Define a proper type based on PolicyLedger.CreatePolicyInput
): Promise<{success: boolean, policyId?: string, error?: string}> {
    if (!policyLedgerContract) return { success: false, error: "PolicyLedger not initialized." };
    try {
        const contract = new ethers.Contract(policyLedgerAddress, policyLedgerAbi, clientOrchestratorWalletSigner);
        // Map your policyInput to the format expected by policyLedgerContract.createPolicy
        const formattedInput = {
            policyHolder: policyHolderInzoWallet,
            riskTier: policyInput.riskTier, // e.g., 0
            premiumAmount: ethers.utils.parseUnits(policyInput.premiumAmount.toString(), 18),
            coverageAmount: ethers.utils.parseUnits(policyInput.coverageAmount.toString(), 18),
            startDate: policyInput.startDate, // unix timestamp
            endDate: policyInput.endDate, // unix timestamp
            assetIdentifier: policyInput.assetIdentifier,
            policyDetailsHash: ethers.utils.id(policyInput.policyDetailsHashContent || "default details")
        };
        const tx = await contract.createPolicy(formattedInput);
        const receipt = await tx.wait();
        const event = receipt.events?.find((e: any) => e.event === "PolicyCreated");
        if (event?.args?.policyId) {
            return { success: true, policyId: event.args.policyId.toString() };
        }
        return { success: false, error: "PolicyCreated event not found." };
    } catch (e: any) {
        console.error("applyForPolicyFull error:", e);
        return { success: false, error: e.message };
    }
}

// Add other contract interaction stubs here as needed by actions
// ... (getPolicyDetailsFromChain, collectPremiumOnChain, etc.)
