// api/validate-access.js
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Content-Type', 'application/json')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  
  const { q } = req.body
  
  // Validate that q parameter exists and equals 'a'
  if (!q || q !== 'a') {
    res.status(400).json({
      valid: false,
      error: 'Invalid or missing parameter'
    })
    return
  }
  
  // Generate random path on backend
  const part1 = generateHex(32)
  const part2 = generateHex(64)
  const randomPath = `${part1}.${part2}`
  
  res.status(200).json({
    valid: true,
    redirectPath: randomPath,
    message: 'Access granted'
  })
}

function generateHex(length) {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * 16)]
  }
  return result
}
