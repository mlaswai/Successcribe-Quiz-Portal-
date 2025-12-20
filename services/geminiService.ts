
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getExplanation = async (question: string, options: string[], correctAnswer: string, userAnswer: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context: A student took a quiz.
      Question: ${question}
      Options: ${options.join(', ')}
      Correct Answer: ${correctAnswer}
      User's Answer: ${userAnswer}
      
      Task: Provide a concise, encouraging, and clear explanation of why the correct answer is right and why the user's answer was either right or wrong. Keep it professional and helpful in a "Successcribe" educational tone.`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 250,
      }
    });
    
    return response.text || "Sorry, I couldn't generate an explanation at this time.";
  } catch (error) {
    console.error("Gemini Explanation Error:", error);
    return "Explanation currently unavailable.";
  }
};
