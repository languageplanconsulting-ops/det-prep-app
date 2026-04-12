/**
 * Max input length for TTS routes (scenarios can be long). Inworld allows 2k chars per request — the API
 * falls back to Gemini for longer text when using Inworld. This caps abuse for the route overall.
 */
export const SPEECH_SYNTHESIS_MAX_CHARS = 12_000;
