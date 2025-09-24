// api/translate.js - Vercel Serverless Function
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    // Validasi input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Ambil API Key dari environment variable
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Prompt untuk AI
    const prompt = `Kamu adalah seorang ahli komunikasi dan psikologi wanita. Tugas kamu adalah menerjemahkan ucapan atau pesan dari seorang wanita yang sering kali tersirat atau tidak langsung menjadi makna yang sebenarnya dan lebih eksplisit.

Contoh:
Input: "Terserah kamu deh..."
Output: "Saya merasa kesal karena pendapat saya tidak didengar. Saya ingin Anda mempertimbangkan perasaan saya dalam mengambil keputusan ini."

Input: "Gak apa-apa kok"
Output: "Sebenarnya saya merasa kecewa, tapi saya tidak ingin membuat masalah. Saya berharap Anda bisa memahami perasaan saya tanpa saya harus menjelaskan secara detail."

Sekarang terjemahkan ucapan berikut dengan gaya yang sama - berikan makna yang sebenarnya di balik ucapan tersebut dengan cara yang sopan dan konstruktif:

"${text.trim()}"

Berikan terjemahan yang:
1. Menjelaskan perasaan atau emosi yang sebenarnya
2. Mengungkap kebutuhan atau harapan yang tersirat
3. Menggunakan bahasa yang jelas dan mudah dipahami
4. Membantu komunikasi yang lebih baik

Jawab hanya dengan terjemahannya saja, tanpa penjelasan tambahan.`;

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${AIzaSyDgE7MxwPPY1AcvEXqBiE_s4SqTwFpyv_g}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

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
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const translation = data.candidates[0].content.parts[0].text.trim();
      
      return res.status(200).json({
        translation: translation,
        success: true
      });
    } else {
      console.error('Invalid response format from Gemini API:', data);
      return res.status(500).json({ error: 'Format respons tidak valid dari AI' });
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Terjadi kesalahan pada server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}