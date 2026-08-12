// backend/routes/realtime.ts
const express =require('express');

const router = express.Router();

// Parse raw SDP payloads
router.use(express.text({ 
  type: ['application/sdp', 'text/plain'] 
}));

// POST /api/realtime/sdp - Exchange SDP with OpenAI
router.post('/sdp', async (req, res) => {
  try {
    const sdpOffer = req.body; // Raw SDP text from browser
    
    if (!sdpOffer) {
      return res.status(400).json({ error: 'Missing SDP offer' });
    }

    // Get the ephemeral token from headers (sent by browser)
    const ephemeralToken = req.headers['x-ephemeral-token'];
    if (!ephemeralToken) {
      return res.status(400).json({ error: 'Missing ephemeral token' });
    }

    console.log('📤 Exchanging SDP with OpenAI Realtime API...');

    // Session configuration for GA API
    const sessionConfig = JSON.stringify({
      type: "realtime",
      model: "gpt-realtime", // or gpt-realtime-2
      audio: {
        output: {
          voice: "marin"
        }
      }
    });

    // Create FormData for the GA API
    const formData = new FormData();
    formData.append('sdp', sdpOffer);
    formData.append('session', sessionConfig);

    // Exchange with OpenAI
    const response = await fetch(
      'https://api.openai.com/v1/realtime/calls',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          // Optional: Add safety identifier for user tracking
          // 'OpenAI-Safety-Identifier': hashedUserId,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ SDP exchange failed:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'Failed to exchange SDP with OpenAI',
        details: errorText 
      });
    }

    // Get the answer SDP
    const answerSdp = await response.text();
    console.log('✅ SDP exchange successful');

    // Return the answer SDP to the browser
    res.setHeader('Content-Type', 'application/sdp');
    res.send(answerSdp);

  } catch (error) {
    console.error('❌ SDP exchange error:', error);
    res.status(500).json({ 
      error: 'SDP exchange failed',
      details: error ? error.message : error
    });
  }
});

module.exports = router;