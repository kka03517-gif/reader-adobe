export default async function handler(req, res) {
  console.log('🔍 [DEBUG] v3 verification request received')
  console.log('🔍 [DEBUG] Request body:', req.body)
  console.log('🔍 [DEBUG] IP:', req.headers['x-forwarded-for'] || req.connection?.remoteAddress)
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  try {
    const { token, action } = req.body
    console.log('🔍 [DEBUG] Token length:', token?.length)
    console.log('🔍 [DEBUG] Action:', action)
    
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_V3_SECRET_KEY}&response=${token}`
    })
    
    console.log('🔍 [DEBUG] Google response status:', response.status)
    const result = await response.json()
    console.log('🔍 [DEBUG] Google response:', result)
    
    if (result.success) {
      console.log(`✅ [DEBUG] v3 success - Score: ${result.score}`)
    } else {
      console.log('❌ [DEBUG] v3 failed - Errors:', result['error-codes'])
    }
    
    res.json({ success: result.success, score: result.score })
  } catch (error) {
    console.error('❌ [DEBUG] v3 verification error:', error)
    res.status(500).json({ success: false, error: 'Server error' })
  }
}
