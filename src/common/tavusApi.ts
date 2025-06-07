// src/common/tavusApi.ts
import axios from 'axios';
// Ensure TAVUS_API_KEY is available, typically through runtime config or .env
// For ElizaOS plugins, direct .env access might not be standard;
// API keys are usually passed in plugin configuration.
// For this example, we'll assume it can be accessed or is passed in config.

const TAVUS_BASE_URL = 'https://tavusapi.com/v2'; // Corrected URL

export async function createTavusConversation(
    apiKey: string, 
    replicaId: string, 
    conversationName: string, 
    conversationalContext: string
): Promise<{ conversation_url?: string, conversation_id?: string, error?: string }> {
    try {
        const response = await axios.post(`${TAVUS_BASE_URL}/conversations`, {
            replica_id: replicaId,
            conversation_name: conversationName,
            conversational_context: conversationalContext
        }, { headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey }});
        
        if (response.data && response.data.conversation_url && response.data.conversation_id) {
            return {
                conversation_url: response.data.conversation_url,
                conversation_id: response.data.conversation_id
            };
        } else {
            console.error("Tavus API response missing expected fields:", response.data);
            return { error: "Tavus API response malformed." };
        }
    } catch (error: any) {
        console.error("Error creating Tavus conversation:", error.response?.data || error.message);
        return { error: error.response?.data?.message || error.message || "Failed to create Tavus conversation." };
    }
}

// Add function to get Tavus conversation details if needed (their API might not have a simple status poll)
