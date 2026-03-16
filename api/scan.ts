import { GoogleGenAI, Type } from '@google/genai';

export const config = {
    maxDuration: 60,
};

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { imageBase64, promptText } = req.body;

        if (!imageBase64 || !promptText) {
            return res.status(400).json({ error: 'Missing imageBase64 or promptText in request body' });
        }

        if (!process.env.VITE_GEMINI_API_KEY && !process.env.API_KEY) {
            console.error("Missing Gemini API Key in environment variables");
            return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        }

        const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
                {
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                        { text: promptText }
                    ]
                }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ["Input", "Output"] },
                        formatCode: { type: Type.STRING },
                        date: { type: Type.STRING, description: "YYYY-MM-DD" },
                        invoiceNo: { type: Type.STRING },
                        taxId: { type: Type.STRING },
                        amount: { type: Type.NUMBER },
                        tax: { type: Type.NUMBER },
                        total: { type: Type.NUMBER },
                        category: { type: Type.STRING },
                        note: { type: Type.STRING, description: "Format: '商家名稱 - 商品'. Language: Traditional Chinese." }
                    },
                    required: ["type", "date", "amount", "total"]
                }
            }
        });

        let text = response.text || '{}';
        if (text.startsWith('```')) {
            text = text.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
        }

        const result = JSON.parse(text);
        return res.status(200).json(result);
    } catch (error: any) {
        console.error("API Scan Error:", error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
