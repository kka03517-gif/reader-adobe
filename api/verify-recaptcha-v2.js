export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ 
      success: false, 
      error: 'Token is required' 
    });
  }

  try {
    const requestBody = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    });
    
    const verificationResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestBody,
    });
    
    const data = await verificationResponse.json();
    
    if (data.success) {
      return res.status(200).json({ 
        success: true,
        timestamp: new Date().toISOString()
      });
    } else {
      // Only log failures in production
      console.error('Turnstile verification failed:', data['error-codes']);
      
      return res.status(400).json({ 
        success: false, 
        error: 'Verification failed'
      });
    }
  } catch (error) {
    console.error('Turnstile verification error:', error.message);
    
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error'
    });
  }
}
