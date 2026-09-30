import { NextRequest, NextResponse } from 'next/server';

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

let currentKeyIndex = 0;

function getNextApiKey(): string {
  if (apiKeys.length === 0) {
    throw new Error("No API keys configured in environment variables.");
  }
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
}

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = getNextApiKey();

    const base64Data = image.split(',')[1] || image;
    const mimeType = image.split(';')[0].split(':')[1] || 'image/jpeg';

    const prompt = `Analyze this food image completely and thoroughly. Identify EVERY SINGLE individual food item and dish visible in the image (such as different types of sushi, rolls, dumplings, fried dishes, side items, etc.). 
    Estimate the realistic total calories, protein, carbs, and fat for the entire meal, and provide a detailed breakdown for EACH individual item with its specific name, description, calories, protein, carbs, fat, weight in grams, and servings. Do not skip any item.

    Return ONLY a valid JSON object matching this exact schema. Do not use double quotes inside string values (use single quotes ' if needed):
    {
      "foodTitle": "Name of the meal spread",
      "totalCalories": 1500,
      "totalProtein": 70,
      "totalCarbs": 180,
      "totalFat": 50,
      "items": [
        {
          "name": "Exact item name",
          "description": "Brief description",
          "calories": 250,
          "protein": 12,
          "carbs": 30,
          "fat": 8,
          "weightGrams": 150,
          "servings": 1
        }
      ]
    }`;

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
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json"
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