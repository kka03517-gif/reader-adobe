export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const clientData = req.body;
    
    // Get IP and basic server info
    const clientIP = getClientIP(req);
    
    // Collect all server-side data
    const serverData = {
      serverIP: clientIP,
      userAgent: req.headers['user-agent'] || 'Unknown',
      acceptLanguage: req.headers['accept-language'] || 'Unknown',
      acceptEncoding: req.headers['accept-encoding'] || 'Unknown',
      referer: req.headers['referer'] || req.headers['referrer'] || 'Direct',
      origin: req.headers['origin'] || 'Unknown',
      host: req.headers.host || 'Unknown',
      xForwardedProto: req.headers['x-forwarded-proto'] || 'Unknown',
      cfRay: req.headers['cf-ray'] || 'Not Cloudflare',
      cfCountry: req.headers['cf-ipcountry'] || 'Unknown',
      serverTimestamp: new Date().toISOString()
    };
    
    // Get detailed location and ISP info from IP
    const locationData = await getLocationData(clientIP);
    
    // Parse User Agent for browser/device info
    const browserData = parseBrowserData(serverData.userAgent);
    
    // Combine all data
    const analytics = {
      // Session info
      sessionId: clientData.sessionId,
      timestamp: clientData.timestamp,
      serverTimestamp: serverData.serverTimestamp,
      
      // Location & Network (from backend IP lookup)
      ...locationData,
      
      // Browser info (parsed from User-Agent)
      ...browserData,
      
      // Client-side data (from frontend)
      ...clientData,
      
      // Server data
      ...serverData
    };
    
    // Send to Telegram
    await sendToTelegram(analytics);
    
    res.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      sessionId: clientData.sessionId 
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to process analytics',
      timestamp: new Date().toISOString()
    });
  }
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.ip ||
         'Unknown';
}

async function getLocationData(ip) {
  if (ip === 'Unknown' || ip === '127.0.0.1' || ip === '::1') {
    return {
      ip: ip,
      city: 'Localhost',
      region: 'Local',
      country: 'Local',
      countryCode: 'LOCAL',
      timezone: 'Local',
      isp: 'Local',
      organization: 'Local',
      asn: 'N/A',
      latitude: 'N/A',
      longitude: 'N/A',
      proxy: false,
      vpn: false
    };
  }

  const providers = [
    {
      url: `https://ipapi.co/${ip}/json/`,
      parse: (data) => ({
        ip: data.ip,
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        country: data.country_name || 'Unknown',
        countryCode: data.country_code || 'Unknown',
        timezone: data.timezone || 'Unknown',
        isp: data.org || 'Unknown',
        organization: data.org || 'Unknown',
        asn: data.asn || 'Unknown',
        latitude: data.latitude || 'Unknown',
        longitude: data.longitude || 'Unknown',
        proxy: data.threat_types?.is_proxy || false,
        vpn: data.threat_types?.is_anonymous || false
      })
    },
    {
      url: `https://freeipapi.com/api/json/${ip}`,
      parse: (data) => ({
        ip: data.ipAddress,
        city: data.cityName || 'Unknown',
        region: data.regionName || 'Unknown',
        country: data.countryName || 'Unknown',
        countryCode: data.countryCode || 'Unknown',
        timezone: data.timeZone || 'Unknown',
        isp: data.isp || 'Unknown',
        organization: data.isp || 'Unknown',
        asn: 'N/A',
        latitude: data.latitude || 'Unknown',
        longitude: data.longitude || 'Unknown',
        proxy: false,
        vpn: false
      })
    },
    {
      url: `https://ipwho.is/${ip}`,
      parse: (data) => ({
        ip: data.ip,
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        country: data.country || 'Unknown',
        countryCode: data.country_code || 'Unknown',
        timezone: data.timezone?.id || 'Unknown',
        isp: data.connection?.isp || 'Unknown',
        organization: data.connection?.org || 'Unknown',
        asn: data.connection?.asn || 'Unknown',
        latitude: data.latitude || 'Unknown',
        longitude: data.longitude || 'Unknown',
        proxy: data.security?.is_proxy || false,
        vpn: data.security?.is_vpn || false
      })
    }
  ];
  
  for (const provider of providers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(provider.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Analytics-Bot/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const parsed = provider.parse(data);
        
        if (parsed.ip && parsed.ip !== 'undefined' && parsed.ip !== ip) {
          return parsed;
        } else if (parsed.city && parsed.city !== 'Unknown') {
          return { ...parsed, ip: ip };
        }
      }
    } catch (error) {
      console.log(`Location provider ${provider.url} failed:`, error.message);
      continue;
    }
  }
  
  // Fallback data
  return {
    ip: ip,
    city: 'Unknown',
    region: 'Unknown',
    country: 'Unknown',
    countryCode: 'Unknown',
    timezone: 'Unknown',
    isp: 'Unknown',
    organization: 'Unknown',
    asn: 'Unknown',
    latitude: 'Unknown',
    longitude: 'Unknown',
    proxy: false,
    vpn: false
  };
}

function parseBrowserData(userAgent) {
  // Parse browser name and version
  const getBrowserInfo = (ua) => {
    const browsers = [
      { name: 'Microsoft Edge', pattern: /Edg\/([0-9.]+)/, condition: ua => ua.includes('Edg/') },
      { name: 'Google Chrome', pattern: /Chrome\/([0-9.]+)/, condition: ua => ua.includes('Chrome/') && !ua.includes('Edg/') },
      { name: 'Mozilla Firefox', pattern: /Firefox\/([0-9.]+)/, condition: ua => ua.includes('Firefox/') },
      { name: 'Safari', pattern: /Version\/([0-9.]+)/, condition: ua => ua.includes('Safari/') && !ua.includes('Chrome/') },
      { name: 'Opera', pattern: /(?:Opera|OPR)\/([0-9.]+)/, condition: ua => ua.includes('Opera/') || ua.includes('OPR/') },
      { name: 'Internet Explorer', pattern: /rv:([0-9.]+)/, condition: ua => ua.includes('Trident/') }
    ];
    
    for (const browser of browsers) {
      if (browser.condition(ua)) {
        const match = ua.match(browser.pattern);
        return { 
          name: browser.name, 
          version: match ? match[1] : 'Unknown' 
        };
      }
    }
    
    return { name: 'Unknown Browser', version: 'Unknown' };
  };
  
  // Parse platform/OS
  const getPlatform = (ua) => {
    if (ua.includes('Windows NT 10.0')) return 'Windows 10/11';
    if (ua.includes('Windows NT 6.3')) return 'Windows 8.1';
    if (ua.includes('Windows NT 6.2')) return 'Windows 8';
    if (ua.includes('Windows NT 6.1')) return 'Windows 7';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS X')) {
      const match = ua.match(/Mac OS X ([0-9_]+)/);
      return match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
    }
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) {
      const match = ua.match(/Android ([0-9.]+)/);
      return match ? `Android ${match[1]}` : 'Android';
    }
    if (ua.includes('iPhone OS') || ua.includes('iOS')) {
      const match = ua.match(/(?:iPhone )?OS ([0-9_]+)/);
      return match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
    }
    return 'Unknown';
  };
  
  // Parse device info
  const getDeviceInfo = (ua) => {
    const isMobile = /Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
    
    return {
      deviceType: isTablet ? 'Tablet' : (isMobile ? 'Mobile' : 'Desktop'),
      mobile: isMobile,
      tablet: isTablet
    };
  };
  
  const browserInfo = getBrowserInfo(userAgent);
  const deviceInfo = getDeviceInfo(userAgent);
  const platform = getPlatform(userAgent);
  
  return {
    browser: browserInfo.name,
    browserVersion: browserInfo.version,
    platform: platform,
    ...deviceInfo,
    userAgent: userAgent.substring(0, 200) + (userAgent.length > 200 ? '...' : '')
  };
}

async function sendToTelegram(data) {
  try {
    const message = formatTelegramMessage(data);
    
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram API error:', errorText);
    }
  } catch (error) {
    console.error('Failed to send to Telegram:', error);
  }
}

function formatTelegramMessage(data) {
  // Security flags
  const securityFlags = [];
  if (data.proxy) securityFlags.push('🚨 Proxy');
  if (data.vpn) securityFlags.push('🚨 VPN');
  if (data.webdriver) securityFlags.push('⚠️ WebDriver');
  if (data.cfRay && data.cfRay !== 'Not Cloudflare') securityFlags.push('☁️ Cloudflare');
  
  // Format memory info
  const formatMemory = (memInfo) => {
    if (typeof memInfo === 'object' && memInfo !== null) {
      return `Used: ${memInfo.used}MB, Total: ${memInfo.total}MB, Limit: ${memInfo.limit}MB`;
    }
    return memInfo || 'Not available';
  };
  
  // Format battery info
  const formatBattery = (batteryInfo) => {
    if (typeof batteryInfo === 'object' && batteryInfo !== null) {
      return `Level: ${batteryInfo.level}%, Charging: ${batteryInfo.charging ? 'Yes' : 'No'}`;
    }
    return batteryInfo || 'Not available';
  };

  // Format performance data
  const formatPerformance = (perfData) => {
    if (typeof perfData === 'object' && perfData !== null) {
      return {
        loadTime: typeof perfData.loadTime === 'number' ? `${Math.round(perfData.loadTime)}ms` : perfData.loadTime,
        domReady: typeof perfData.domReady === 'number' ? `${Math.round(perfData.domReady)}ms` : perfData.domReady,
        firstPaint: typeof perfData.firstPaint === 'number' ? `${Math.round(perfData.firstPaint)}ms` : perfData.firstPaint
      };
    }
    return { loadTime: 'Unknown', domReady: 'Unknown', firstPaint: 'Unknown' };
  };

  const performance = formatPerformance(data.performanceData);

  return `🔍 <b>New Visitor Analytics</b>

📍 <b>Location &amp; Network</b>
- IP Address: <code>${data.ip || data.serverIP}</code>
- Location: ${data.city}, ${data.region}
- Country: ${data.country} (${data.countryCode})
- Coordinates: ${data.latitude}, ${data.longitude}
- ISP: ${data.isp}
- Organization: ${data.organization}
- ASN: ${data.asn}
- Timezone: ${data.timezone}
${securityFlags.length > 0 ? `- Security: ${securityFlags.join(', ')}` : ''}

🌐 <b>Browser &amp; System</b>
- Browser: ${data.browser} ${data.browserVersion}
- Platform: ${data.platform}
- Languages: ${data.languages || data.language || data.acceptLanguage}
- Online Status: ${data.onlineStatus}
- Cookies: ${data.cookieEnabled ? '✅ Enabled' : '❌ Disabled'}
- Do Not Track: ${data.doNotTrack}
- Java: ${data.javaEnabled ? '✅ Enabled' : '❌ Disabled'}

📱 <b>Device Information</b>
- Device Type: ${data.deviceType}
- Mobile: ${data.mobile ? '📱 Yes' : '💻 No'} | Tablet: ${data.tablet ? '📱 Yes' : '❌ No'}
- Screen: ${data.screenResolution}
- Available: ${data.availableScreen}
- Viewport: ${data.viewportSize}
- Color Depth: ${data.colorDepth}
- Pixel Ratio: ${data.pixelRatio}
- Touch: ${data.touchSupport ? '✅ Yes' : '❌ No'} (Max: ${data.maxTouchPoints})
- Orientation: ${data.orientation}

📄 <b>Page Information</b>
- URL: ${data.url}
- Title: ${data.title ? (data.title.length > 50 ? data.title.substring(0, 50) + '...' : data.title) : 'Unknown'}
- Protocol: ${data.protocol}
- Referrer: ${data.referrer}
- Origin: ${data.origin}

🌐 <b>Network &amp; Connection</b>
- Connection: ${data.networkData?.connectionType || 'Unknown'}
- Speed Type: ${data.networkData?.effectiveType || 'Unknown'}
- Download Speed: ${data.networkData?.downlink || 'Unknown'}
- Latency: ${data.networkData?.rtt || 'Unknown'}

⚡ <b>Performance</b>
- Page Load: ${performance.loadTime}
- DOM Ready: ${performance.domReady}
- First Paint: ${performance.firstPaint}

🔧 <b>Technical Details</b>
- CPU Cores: ${data.hardwareConcurrency}
- Memory: ${formatMemory(data.memoryInfo)}
- Battery: ${formatBattery(data.battery)}
- Plugins: ${data.plugins || 'None detected'}

⏱️ <b>Session Information</b>
- Session ID: <code>${data.sessionId}</code>
- Visit Time: ${data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Unknown'}
- Server Time: ${new Date(data.serverTimestamp).toLocaleString()}

🖥️ <b>Server Details</b>
- Server IP: ${data.serverIP}
- Host: ${data.host}
- CF Ray: ${data.cfRay}
- Accept-Language: ${data.acceptLanguage?.substring(0, 50) || 'Unknown'}
- Accept-Encoding: ${data.acceptEncoding || 'Unknown'}

🔍 <b>User Agent</b>
<code>${data.userAgent}</code>`;
}
