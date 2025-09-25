// api/translate.js - Vercel Serverless Function
export default async function handler(req, res) {
  // Set CORS headers untuk semua response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    console.log(`Method ${req.method} not allowed`);
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['POST'],
      receivedMethod: req.method 
    });
  }

  try {
    console.log('Received request body:', req.body);
    
    const { text } = req.body;

    // Validasi input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required and must be a non-empty string' });
    }

    // Ambil API Key dari environment variable
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'Server configuration error - API key missing' });
    }

    // Prompt untuk AI
    const prompt = `Kamu adalah seorang ahli komunikasi dan psikologi wanita. Tugas kamu adalah menerjemahkan ucapan atau pesan dari seorang wanita yang sering kali tersirat atau tidak langsung menjadi makna yang sebenarnya dan lebih eksplisit.

Contoh:
Input: "Terserah kamu deh..."
Output: "Saya merasa kesal karena pendapat saya tidak didengar. Saya ingin Anda mempertimbangkan perasaan saya dalam mengambil keputusan ini."

Input: "Gak apa-apa kok"
Output: "Sebenarnya saya merasa kecewa, tapi saya tidak ingin membuat masalah. Saya berharap Anda bisa memahami perasaan saya tanpa saya harus menjelaskan secara detail."

Sekarang terjemahkan ucapan berikut dengan gaya yang sama - berikan makna yang sebenarnya di balik ucapan tersebut dengan cara yang sopan dan konstruktif:

"${text.trim()}""

Berikan terjemahan yang:
1. Menjelaskan perasaan atau emosi yang sebenarnya
2. Mengungkap kebutuhan atau harapan yang tersirat
3. Menggunakan bahasa yang jelas dan mudah dipahami
4. Membantu komunikasi yang lebih baik

Setelah terjemahan, berikan 3 pilihan balasan yang sopan dan konstruktif, masing-masing dengan alasan singkat mengapa balasan tersebut baik.

Format respons sebagai JSON:
{
  "translation": "terjemahan di sini",
  "suggestions": [
    {"text": "balasan 1", "reason": "alasan 1"},
    {"text": "balasan 2", "reason": "alasan 2"},
    {"text": "balasan 3", "reason": "alasan 3"}
  ]
}

Jawab hanya dengan JSON saja, tanpa penjelasan tambahan.`;

    console.log('Calling Gemini API...');
    
    // Call Gemini API
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    console.log('Gemini API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API error:', response.status, errorData);
      
      if (response.status === 403) {
        return res.status(500).json({ error: 'API key tidak valid atau tidak memiliki akses' });
      } else if (response.status === 429) {
        return res.status(429).json({ error: 'Quota API telah habis' });
      } else {
        return res.status(500).json({ error: 'Error dari layanan AI' });
      }
    }

    const data = await response.json();
    
    // Extract the text from Gemini response
    const aiText = data.candidates[0].content.parts[0].text.trim();
    
    // Find JSON in the response (in case there's extra text)
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Respons AI tidak mengandung JSON valid');
    }
    
    // Parse the JSON
    let parsedData;
    try {
      parsedData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error('Respons AI tidak valid');
    }

    res.status(200).json(parsedData);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Terjadi kesalahan pada server',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}