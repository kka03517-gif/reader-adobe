export const config = {
  api: {
    bodyParser: true
  }
};

export default async function handler(req, res) {
  const startTime = Date.now();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      isBot: true, 
      reason: 'Method not allowed' 
    });
  }
  
  let body = req.body;
  if (!body || Object.keys(body).length === 0) {
    try {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch (e) {
      body = {};
    }
  }
  
  const emailScannerUA = [
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'whatsapp', 'telegrambot', 'slack', 'discord',
    'microsoft office', 'ms-office', 'outlook', 'excel',
    'proofpoint', 'barracuda', 'mimecast', 'forcepoint',
    'symantec', 'mcafee', 'fireeye', 'zscaler', 'websense',
    'fortinet', 'sophos', 'trendmicro', 'kaspersky',
    'mailchimp', 'sendgrid', 'postmark', 'mailgun',
    'ahrefsbot', 'semrushbot', 'dotbot', 'rogerbot',
    'screaming frog', 'curl', 'wget', 'python-requests',
    'go-http-client', 'java', 'libwww', 'httpunit'
  ];
  
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const isKnownScanner = emailScannerUA.some(ua => userAgent.includes(ua));
  
  if (isKnownScanner) {
    console.log('🚫 Email scanner blocked by UA:', userAgent);
    return res.status(403).json({ 
      isBot: true, 
      reason: 'Email scanner detected' 
    });
  }
  
  console.log('🤖 Bot detection started:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']
  });
  
  try {
    const { requestId, visitorId } = body;
    
    if (!requestId) {
      console.log('❌ Missing requestId');
      return res.status(400).json({ 
        isBot: true,
        error: 'Missing requestId',
        reason: 'Invalid request'
      });
    }
    
    console.log('🌐 Calling FingerprintJS API...');
    const apiUrl = `https://api.fpjs.io/events/${requestId}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Auth-API-Key': process.env.FINGERPRINT_SECRET_KEY
      }
    });
    
    if (!response.ok) {
      console.log('❌ FingerprintJS API error:', response.status);
      
      if (response.status === 403) {
        console.error('Authentication failed - check your SECRET API key');
      }
      
      throw new Error(`FingerprintJS API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const botResult = data.products?.botd?.data?.bot?.result;
    const suspectScore = data.products?.suspectScore?.data?.result || 0;
    const tamperingResult = data.products?.tampering?.data?.result;
    const developerToolsResult = data.products?.developerTools?.data?.result;
    
    let isBot = false;
    let blockReason = [];
    
    if (botResult === 'bad') {
      isBot = true;
      blockReason.push('Bot detected');
    }
    
    if (tamperingResult === true) {
      isBot = true;
      blockReason.push('Browser tampering detected');
    }
    
    if (developerToolsResult === true) {
      isBot = true;
      blockReason.push('Developer tools detected');
    }
    
    if (suspectScore > 20) {
      isBot = true;
      blockReason.push(`High suspect score: ${suspectScore}`);
    }
    
    console.log('🔒 Detection results:', {
      botResult,
      suspectScore,
      tamperingResult,
      developerToolsResult,
      isBot,
      blockReason: blockReason.join(', ') || 'None',
      visitorId: data.products?.identification?.data?.visitorId,
      processingTime: `${Date.now() - startTime}ms`
    });
    
    const responseData = { 
      isBot,
      requestId: data.products?.identification?.data?.requestId,
      reason: blockReason.length > 0 ? blockReason.join(', ') : 'Passed all checks'
    };
    
    if (isBot) {
      responseData.details = {
        botDetection: botResult,
        suspectScore: suspectScore,
        tamperingDetected: tamperingResult === true,
        developerToolsDetected: developerToolsResult === true
      };
    }
    
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Bot detection error:', error);
    res.status(500).json({ 
      isBot: true,
      error: 'Detection failed',
      reason: 'System error - blocking by default'
    });
  }
}
