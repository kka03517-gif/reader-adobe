export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { token } = req.body
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'No token provided' })
    }
    
    const secret = process.env.HCAPTCHA_SECRET_KEY || '0x0000000000000000000000000000000000000000'
    
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`
    })
    
    const data = await response.json()
    return res.status(200).json(data)
    
  } catch (error) {
    console.error('hCaptcha error:', error)
    return res.status(500).json({ success: false, message: 'Verification failed' })
  }
}
