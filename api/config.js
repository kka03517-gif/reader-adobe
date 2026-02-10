export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { token } = req.body;
  
  const config = {
    'domainNameFallback': process.env.VITE_DOMAIN_NAME_FALLBACK || 'example.com',
    'logoFallback': process.env.VITE_LOGO_FALLBACK || 'empty'
  };
  
  res.send(config[token] || '');
}
