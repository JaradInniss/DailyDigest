import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Returns the Gemini 2.5 Flash Lite model.
 */
export function getGroundedModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
  });
}