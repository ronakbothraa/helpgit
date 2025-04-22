import { GoogleGenAI } from "@google/genai";
import {Document} from "langchain/document";

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

export const summariseCode = async (doc: Document) => {
  const code = doc.pageContent.slice(0,10000);
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: "summarise this within 100 words in layman terms for me:  " + code,
  })
  return response.text ?? "No summary found";
}

export const generateEmbedding = async (summary: string) => {
  const response = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: summary,
  })
  return response;
}

