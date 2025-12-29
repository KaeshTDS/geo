
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Adventure } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateAdventure = async (topic: string, language: string = 'English'): Promise<Adventure> => {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Create an educational story for children (6-12) about ${topic}. 
    CRITICAL: The entire response (title, summary, sections text, quiz questions, and options) MUST be written in the ${language} language.
    The story should be divided into 3 distinct parts. 
    Include 3 quiz questions at the end based on the story.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          location: { type: Type.STRING },
          era: { type: Type.STRING },
          summary: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING }
              }
            }
          },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                correctAnswer: { type: Type.INTEGER }
              }
            }
          }
        },
        required: ["title", "location", "era", "summary", "sections", "quiz"]
      }
    }
  });

  const response = await model;
  const result = JSON.parse(response.text);
  
  // Create unique IDs
  const adventure: Adventure = {
    ...result,
    id: Math.random().toString(36).substr(2, 9),
    sections: result.sections.map((s: any, i: number) => ({ ...s, id: `s-${i}` })),
    quiz: result.quiz.map((q: any, i: number) => ({ ...q, id: `q-${i}` })),
  };

  return adventure;
};

export const generateStoryImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A vibrant, friendly, high-quality 3D digital art illustration for a children's history book: ${prompt}. Bright colors, adventurous atmosphere.` }],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Image generation failed", error);
  }
  return `https://picsum.photos/seed/${Math.random()}/800/450`;
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this story part clearly for a child: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // "Kore" is a friendly, balanced voice suitable for storytelling.
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS generation failed", error);
    return undefined;
  }
};
