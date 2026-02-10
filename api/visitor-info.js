// api/visitor-info.js
export default async function handler(req, res) {
  // Get the visitor's IP address
  const visitorIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress;

  // Skip localhost/private IPs
  if (!visitorIP || visitorIP === '127.0.0.1' || visitorIP === '::1' || visitorIP.startsWith('192.168.')) {
    return res.json({ info: 'Location: Local • ISP: Unknown' });
  }

  try {
    const response = await fetch(`https://ipwho.is/${visitorIP}`, {
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; LocationService/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if API returned success
    if (!data.success) {
      throw new Error(`API Error: ${data.message}`);
    }
    
    const city = data.city || 'Unknown';
    const region = data.region || 'Unknown';
    const country = data.country || 'Unknown';
    const isp = data.connection?.org || data.connection?.isp || 'Unknown';
    
    const result = `${city}, ${region} • ${country} • ISP: ${isp}`;
    
    return res.json({ 
      info: result,
      ip: visitorIP 
    });
    
  } catch (error) {
    console.warn(`ipwho.is failed:`, error.message);
    
    return res.json({ 
      info: 'Location: Unknown • ISP: Unknown',
      ip: visitorIP,
      error: error.message 
    });
  }
}
