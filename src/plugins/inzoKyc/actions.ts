// src/plugins/inzoKyc/actions.ts
import { Action, IAgentRuntime, Memory, State, Content } from "@ai16z/eliza";
import { KycStatusResponse, WalletAddressContent } from "../../common/types";
import { createDocumentInquiry, generateDocumentLink, getDocumentInquiryDetails } from "../../common/personaApi";
import { createTavusConversation } from "../../common/tavusApi";
import { updateKycOnChain, createInzoWalletForUser, mintInzoUSD } from "../../common/contractInteractions";

// These would be passed in plugin config
interface InzoKycPluginConfig {
    personaApiKey: string; // Should be configured securely
    tavusApiKey: string;
    tavusKycReplicaId: string;
}

// In-memory store for demo - replace with persistent storage
const kycProgressStore: Record<string, {
    personaInquiryId?: string;
    tavusConversationId?: string;
    status: string;
    inzoWalletAddress?: string;
    inzoWalletPk?: string; // DEMO ONLY - HIGHLY INSECURE
}> = {};


export const getKycActions = (config: InzoKycPluginConfig): Action[] => [
    {
        name: "START_INZO_KYC",
        description: "Starts the multi-step KYC process for a new Inzo user, beginning with document/selfie verification.",
        examples: [[{ user: "user", content: { text: "I want to start KYC with Inzo" } }]],
        handler: async (runtime: IAgentRuntime, message: Memory): Promise<KycStatusResponse> => {
            const telegramUserId = message.user; // Assuming message.user contains a unique ID like telegramUserId
            kycProgressStore[telegramUserId] = { status: 'initiating_doc_verification' };
            try {
                // Persona's createInquiry doesn't take apiKey directly, it's used by personaApi.ts internally
                const inquiryResponse = await createDocumentInquiry(`inzo-user-${telegramUserId}`);
                if (!inquiryResponse.data?.id) throw new Error("Failed to create document inquiry session.");
                
                const inquiryId = inquiryResponse.data.id;
                const linkResponse = await generateDocumentLink(inquiryId);
                const oneTimeLink = linkResponse.meta?.["one-time-link-short"] || linkResponse.meta?.["one-time-link"];

                if (!oneTimeLink) throw new Error("Failed to generate document verification link.");

                kycProgressStore[telegramUserId] = { personaInquiryId: inquiryId, status: 'pending_doc_completion' };
                return {
                    success: true,
                    kycStatus: 'pending_doc',
                    message: `Document/selfie verification started. Please use this link: ${oneTimeLink}\n\nAfter completing it, tell me 'I finished the document verification'.`
                };
            } catch (error: any) {
                console.error("START_INZO_KYC Error:", error);
                return { success: false, message: `Error starting KYC: ${error.message}` };
            }
        }
    },
    {
        name: "CHECK_DOC_VERIFICATION_AND_START_INTERVIEW",
        description: "Checks document verification status. If passed, starts the AI KYC interview.",
        examples: [[{ user: "user", content: { text: "I finished the document verification" } }]],
        handler: async (runtime: IAgentRuntime, message: Memory): Promise<KycStatusResponse> => {
            const telegramUserId = message.user;
            const userState = kycProgressStore[telegramUserId];
            if (!userState?.personaInquiryId || userState.status !== 'pending_doc_completion') {
                return { success: false, message: "Please start KYC or complete document verification first." };
            }
            try {
                const inquiryDetails = await getDocumentInquiryDetails(userState.personaInquiryId);
                const docStatus = inquiryDetails.data.attributes.status;

                if (docStatus === 'completed') { // Assuming 'completed' means 'passed' for Persona sandbox
                    userState.status = 'doc_verified_pending_tavus';
                    const conversationalContext = `You are an Inzo insurance KYC agent... (full context as in bot)... tell user to say 'I finished the KYC interview'.`;
                    const tavusResult = await createTavusConversation(
                        config.tavusApiKey, 
                        config.tavusKycReplicaId, 
                        `Inzo KYC Interview - User ${telegramUserId}`, 
                        conversationalContext
                    );

                    if (tavusResult.error || !tavusResult.conversation_url || !tavusResult.conversation_id) {
                        throw new Error(tavusResult.error || "Failed to create Tavus interview session.");
                    }
                    userState.tavusConversationId = tavusResult.conversation_id;
                    return { 
                        success: true, 
                        kycStatus: 'pending_tavus',
                        message: `Document verification passed! Please join the AI interview: ${tavusResult.conversation_url}\n\nThen say 'I finished the KYC interview'.`,
                        tavusConversationUrl: tavusResult.conversation_url,
                        tavusConversationId: tavusResult.conversation_id
                    };
                } else if (['created', 'pending', 'needs_review'].includes(docStatus)) {
                    return { success: true, kycStatus: 'pending_doc', message: `Document verification is still '${docStatus}'. Try again in a moment.`};
                } else {
                    userState.status = 'doc_verification_failed';
                    return { success: false, kycStatus: 'failed', message: `Document verification status: '${docStatus}'. Please restart KYC.`};
                }
            } catch (error: any) {
                console.error("CHECK_DOC_VERIFICATION Error:", error);
                return { success: false, message: `Error checking document verification: ${error.message}` };
            }
        }
    },
    {
        name: "FINALIZE_INZO_KYC_AND_CREATE_WALLET",
        description: "Finalizes KYC after AI interview, creates Inzo Wallet, updates on-chain status, and mints initial InzoUSD.",
        examples: [[{ user: "user", content: { text: "I finished the KYC interview" } }]],
        handler: async (runtime: IAgentRuntime, message: Memory): Promise<KycStatusResponse> => {
            const telegramUserId = message.user;
            const userState = kycProgressStore[telegramUserId];
            if (!userState?.tavusConversationId || userState.status !== 'doc_verified_pending_tavus') { // Or 'pending_tavus_interview'
                return { success: false, message: "Please complete the document verification and AI interview first." };
            }
            // For demo, assume Tavus interview is "passed" upon user confirmation
            try {
                const walletResult = await createInzoWalletForUser();
                if ("error" in walletResult || !walletResult.address) {
                     throw new Error(walletResult.error || "Failed to create Inzo Wallet.");
                }
                userState.inzoWalletAddress = walletResult.address;
                userState.inzoWalletPk = walletResult.privateKey; // DEMO ONLY - INSECURE
                console.log(`Eliza Plugin: Generated Inzo Wallet for ${telegramUserId}: ${walletResult.address}`);

                const kycUpdateResult = await updateKycOnChain(walletResult.address, true);
                if (!kycUpdateResult.success) {
                    throw new Error(kycUpdateResult.error || "Failed to update KYC status on-chain.");
                }
                
                const mintResult = await mintInzoUSD(walletResult.address, "3000"); // Mint 3000 InzoUSD
                if (!mintResult.success) {
                    // Non-critical for KYC completion, but log it
                    console.warn(`Failed to mint initial InzoUSD for ${walletResult.address}: ${mintResult.error}`);
                }

                userState.status = 'verified_on_chain';
                return {
                    success: true,
                    kycStatus: 'verified_on_chain',
                    message: `🎉 KYC complete! Your Inzo Wallet is ready: ${walletResult.address}. It has been credited with 3000 InzoUSD. Please fund it with WND for gas.`,
                    inzoWalletAddress: walletResult.address
                };
            } catch (error: any) {
                console.error("FINALIZE_INZO_KYC Error:", error);
                userState.status = 'setup_failed';
                return { success: false, message: `Error finalizing KYC: ${error.message}` };
            }
        }
    }
];
