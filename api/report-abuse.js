export default async function handler(req, res) {
  console.log('🚨 [DEBUG] Abuse report request received')
  console.log('🚨 [DEBUG] Request body:', req.body)
  console.log('🚨 [DEBUG] IP:', req.headers['x-forwarded-for'] || req.connection?.remoteAddress)
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  
  try {
    const { issueType, description, email, evidence, referenceId } = req.body
    console.log('🚨 [DEBUG] Issue type:', issueType)
    console.log('🚨 [DEBUG] Description length:', description?.length)
    
    // Basic validation
    if (!issueType || !description) {
      console.log('❌ [DEBUG] Missing required fields')
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    if (description.length < 10 || description.length > 1000) {
      console.log('❌ [DEBUG] Invalid description length')
      return res.status(400).json({ error: 'Description must be 10-1000 characters' })
    }
    
    // Generate report ID
    const reportId = `RPT-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 6)}`.toUpperCase()
    console.log('🚨 [DEBUG] Generated report ID:', reportId)
    
    // Format Telegram message
    const timestamp = new Date().toLocaleString()
    const clientIp = req.headers['x-forwarded-for'] || 'unknown'
    
    const message = `🚨 *ABUSE REPORT* 🚨

*Report ID:* \`${reportId}\`
*Timestamp:* ${timestamp}
*Issue Type:* ${issueType}
*Reference ID:* ${referenceId || 'N/A'}

*Description:*
${description.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')}

*Reporter Email:* ${email || 'Not provided'}
*Evidence URL:* ${evidence || 'Not provided'}
*Client IP:* ${clientIp}`

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
    console.log('🚨 [DEBUG] Sending to Telegram...')
    
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    })
    
    console.log('🚨 [DEBUG] Telegram response status:', telegramResponse.status)
    const telegramResult = await telegramResponse.json()
    console.log('🚨 [DEBUG] Telegram response:', telegramResult)
    
    if (telegramResponse.ok) {
      console.log('✅ [DEBUG] Report sent successfully')
      res.json({ success: true, reportId })
    } else {
      console.log('❌ [DEBUG] Telegram send failed')
      res.status(500).json({ error: 'Failed to send report' })
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Report submission error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}
