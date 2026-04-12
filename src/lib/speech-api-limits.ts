/**
 * Max input length for TTS routes (scenarios can be long). Amazon Polly allows 3k per request — the API
 * falls back to Gemini for longer text when using Polly. This caps abuse for the route overall.
 */
export const SPEECH_SYNTHESIS_MAX_CHARS = 12_000;
