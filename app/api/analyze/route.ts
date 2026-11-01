import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Upstash Redis ইনিশিয়ালাইজ করা (সার্ভারলেস স্টেট ধরে রাখার জন্য)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const apiKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
  process.env.GEMINI_API_KEY_7,
  process.env.GEMINI_API_KEY_8,
  process.env.GEMINI_API_KEY_9,
  process.env.GEMINI_API_KEY_10,
].filter(Boolean) as string[];

// রেডিস ব্যবহার করে অ্যাটমিক রাউন্ড-রবিন কি রোটেশন
async function getNextApiKey(): Promise<string> {
  if (apiKeys.length === 0) {
    throw new Error("No API keys configured in environment variables.");
  }
  
  const counter = await redis.incr('global_api_key_counter');
  const currentKeyIndex = (counter - 1) % apiKeys.length;
  
  return apiKeys[currentKeyIndex];
}

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // রেডিস থেকে এপিআই কি ফেচ করার জন্য await ব্যবহার করা হয়েছে
    const apiKey = await getNextApiKey();

    const base64Data = image.split(',')[1] || image;
    const mimeType = image.split(';')[0].split(':')[1] || 'image/jpeg';

    const prompt = `Analyze this food image completely and thoroughly. Identify EVERY SINGLE individual food item and dish visible in the image. 
    Estimate the realistic total calories, protein, carbs, and fat for the entire meal, and provide a detailed breakdown for EACH individual item with its specific name, description, calories, protein, carbs, fat, weight in grams, and servings. Do not skip any item. Do not assume or hallucinate ingredients that are not clearly visible.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.0, // হ্যালুসিনেশন ও জেসন ভেঙে যাওয়া রোধ করার জন্য জিরো টেম্পারেচার
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            // জেসন পার্সিং এরর চিরতরে দূর করতে কঠোর স্কিমা ডিফাইন করা হলো
            responseSchema: {
              type: "OBJECT",
              properties: {
                foodTitle: { type: "STRING" },
                totalCalories: { type: "NUMBER" },
                totalProtein: { type: "NUMBER" },
                totalCarbs: { type: "NUMBER" },
                totalFat: { type: "NUMBER" },
                items: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      name: { type: "STRING" },
                      description: { type: "STRING" },
                      calories: { type: "NUMBER" },
                      protein: { type: "NUMBER" },
                      carbs: { type: "NUMBER" },
                      fat: { type: "NUMBER" },
                      weightGrams: { type: "NUMBER" },
                      servings: { type: "NUMBER" }
                    },
                    required: ["name", "description", "calories", "protein", "carbs", "fat", "weightGrams", "servings"]
                  }
                }
              },
              required: ["foodTitle", "totalCalories", "totalProtein", "totalCarbs", "totalFat", "items"]
            }
          }
        })
      }
    );

    const resultData = await response.json();

    if (!response.ok) {
      throw new Error(resultData.error?.message || 'Failed to fetch from Gemini API');
    }

    const responseText = resultData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error('Empty response received from Gemini API');
    }

    let cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
    }

    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (err) {
      const fixedText = cleanedText.replace(/[\u0000-\u001F]+/g, "");
      data = JSON.parse(fixedText);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error analyzing image:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze food image' }, { status: 500 });
  }
}