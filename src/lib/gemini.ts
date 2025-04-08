import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const aiSummariseCommit = async (diff: string) => {
  const prompt =
    "I have given you a commit diff. Please summarise it in few lines for a person who hasn't used this repo before can understand clearly. here is the commit diff: ";

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt + diff,
  });

  return response?.text ?? "No summary found";
};
