import Groq from "groq-sdk";

export const GROQ_MODEL = "llama-3.3-70b-versatile";

let _groq: Groq | null = null;

export function getGroq(): Groq {
  if (_groq) return _groq;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is required");
  }

  _groq = new Groq({ apiKey });
  return _groq;
}
