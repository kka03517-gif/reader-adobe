export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ success: false, message: 'Token is required' });
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.VITE_TURNSTILE_SECRET_KEY}&response=${token}`
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
}
