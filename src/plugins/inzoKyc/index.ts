// src/plugins/inzoPolicy/actions.ts
import { Action, IAgentRuntime, Memory, State } from "@ai16z/eliza";
import { PolicyApplicationDetails, PolicyApplicationResponse } from "../../common/types";
import { createTavusConversation } from "../../common/tavusApi";
import { applyForPolicyFull /*, other policy contract fns */ } from "../../common/contractInteractions";

interface InzoPolicyPluginConfig { tavusApiKey: string; tavusPolicyReplicaId: string; /* ... */ }
const policyApplicationStore: Record<string, {data?: PolicyApplicationDetails, tavusConvId?: string, status: string}> = {};

export const getPolicyActions = (config: InzoPolicyPluginConfig): Action[] => [
    {
        name: "INITIATE_POLICY_APPLICATION",
        description: "Gathers initial details for an insurance policy application.",
        // ... examples ...
        handler: async (runtime: IAgentRuntime, message: Memory): Promise<any> => {
            const telegramUserId = message.user;
            const details = message.content as PolicyApplicationDetails; // Agent needs to fill this
            policyApplicationStore[telegramUserId] = {data: details, status: 'pending_tavus_call'};

            // ... (call createTavusConversation with TAVUS_REPLICA_ID_POLICY) ...
            // return { success: true, message: "Join call...", tavusConversationUrl, tavusConversationId };
            return { success: false, message: "Policy application initiated (Tavus call stubbed)." };
        }
    },
    {
        name: "FINALIZE_POLICY_APPLICATION",
        description: "Finalizes policy application after AI call and creates it on-chain.",
        // ... examples ...
        handler: async (runtime: IAgentRuntime, message: Memory): Promise<PolicyApplicationResponse> => {
            const telegramUserId = message.user;
            const appState = policyApplicationStore[telegramUserId];
            // ... (Check appState.status, then call applyForPolicyFull) ...
            // const result = await applyForPolicyFull(userInzoWalletAddress, appState.data);
            // delete policyApplicationStore[telegramUserId];
            // return { success: result.success, message: result.error || `Policy created: ${result.policyId}`, policyId: result.policyId };
            return { success: false, message: "Policy finalization stubbed." };
        }
    }
    // ... GET_POLICY_DETAILS, PAY_POLICY_PREMIUM actions ...
];
