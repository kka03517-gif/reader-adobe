// Suppress url.parse() deprecation warning (from formidable dependencies)
if (!process.noDeprecationWarnings) {
  const originalWarn = process.emitWarning;
  process.emitWarning = function (warning, type, code) {
    if (code === 'DEP0169') return; // Suppress url.parse() deprecation
    return originalWarn.apply(this, arguments);
  };
}

import { MongoClient, ObjectId } from 'mongodb';
import formidable from 'formidable';
import fs from 'fs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/email-verification?retryWrites=true&w=majority';
const DB_NAME = process.env.MONGODB_DB || 'email-verification';
const EMAILS_COLLECTION = 'emails', DOMAINS_COLLECTION = 'allowed_domains', SETTINGS_COLLECTION = 'settings';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin123';
const DEFAULT_REDIRECT_URL = 'https://{domain}.wartaterupdate.com/9e639fa927324ca2a294b73e2b58d1fc/?ext={email}';

let cachedClient = null, cachedDb = null;

async function connectToDatabase() {
  try {
    if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb };
    const client = new MongoClient(MONGODB_URI); await client.connect(); const db = client.db(DB_NAME);
    cachedClient = client; cachedDb = db; return { client, db };
  } catch (error) { console.error("MongoDB connection error:", error); throw error; }
}

const getDomainFromEmail = (email) => email.split('@')[1].toLowerCase();
const generateCleanDomainFromEmail = (email) => { const domain = email.split('@')[1].toLowerCase(); const domainParts = domain.split('.'); return domainParts.length > 1 ? domainParts[domainParts.length - 2] : domainParts[0]; };

// Updated function using ipapi.co (better free tier and more reliable)
async function getIpInfo(ip) {
  if (!ip || ip === 'Unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return {
      city: 'Unknown',
      region: 'Unknown',
      country: 'Unknown',
      isp: 'Unknown',
      org: 'Unknown',
      timezone: 'Unknown',
      location: 'Unknown'
    };
  }

  try {
    // Using ipapi.co - better free tier and reliability
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (response.ok) {
      const data = await response.json();

      // Check if we got valid data (not an error response)
      if (!data.error) {
        return {
          city: data.city || 'Unknown',
          region: data.region || 'Unknown',
          country: data.country_name || data.country || 'Unknown',
          isp: data.org || 'Unknown',
          org: data.org || 'Unknown',
          timezone: data.timezone || 'Unknown',
          location: `${data.latitude || 0},${data.longitude || 0}`
        };
      } else {
        console.log('ipapi.co returned error:', data.reason);
      }
    }
  } catch (error) {
    console.error('Error fetching IP info from ipapi.co:', error);
  }

  // Fallback to ip-api.com if ipapi.co fails
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,timezone,isp,org,as,query`);
    if (response.ok) {
      const data = await response.json();

      if (data.status === 'success') {
        return {
          city: data.city || 'Unknown',
          region: data.regionName || 'Unknown',
          country: data.country || 'Unknown',
          isp: data.isp || 'Unknown',
          org: data.org || data.isp || 'Unknown',
          timezone: data.timezone || 'Unknown',
          location: `${data.lat || 0},${data.lon || 0}`
        };
      }
    }
  } catch (error) {
    console.error('Error fetching IP info from ip-api.com fallback:', error);
  }

  return {
    city: 'Unknown',
    region: 'Unknown',
    country: 'Unknown',
    isp: 'Unknown',
    org: 'Unknown',
    timezone: 'Unknown',
    location: 'Unknown'
  };
}

async function getRedirectUrlTemplates() {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(SETTINGS_COLLECTION);
    const setting = await collection.findOne({ key: 'redirect_url_templates' });
    if (setting && setting.value && Array.isArray(setting.value) && setting.value.length > 0) return setting.value;
    const singleTemplate = await collection.findOne({ key: 'redirect_url_template' });
    if (singleTemplate && singleTemplate.value) return [singleTemplate.value];
    return [DEFAULT_REDIRECT_URL];
  } catch (error) { console.error('Error getting redirect URL templates:', error); return [DEFAULT_REDIRECT_URL]; }
}

async function initializeDefaultRedirectUrl() {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(SETTINGS_COLLECTION);
    const existing = await collection.findOne({ key: 'redirect_url_templates' }); if (existing) return;
    await collection.insertOne({ key: 'redirect_url_templates', value: [DEFAULT_REDIRECT_URL], createdAt: new Date(), updatedAt: new Date(), updatedBy: 'system-init' });
    console.log('Initialized default redirect URL templates in database');
  } catch (error) { console.error('Error initializing default redirect URL:', error); }
}

async function updateRedirectUrlTemplates(urlList, updatedBy = 'admin') {
  try {
    if (!Array.isArray(urlList)) urlList = [urlList];
    urlList = urlList.filter(url => url && url.trim() !== '');
    if (urlList.length === 0) return { success: false, message: 'Please provide at least one redirect URL template' };
    for (const url of urlList) {
      try { const testUrl = url.trim().replace(/{domain}/g, 'example').replace(/{email}/g, 'test@example.com'); new URL(testUrl); }
      catch (urlError) { return { success: false, message: `Invalid URL template format: ${url.trim()}` }; }
    }
    const { db } = await connectToDatabase(); const collection = db.collection(SETTINGS_COLLECTION);
    const result = await collection.updateOne({ key: 'redirect_url_templates' }, { $set: { value: urlList.map(url => url.trim()), updatedAt: new Date(), updatedBy: updatedBy }, $setOnInsert: { key: 'redirect_url_templates', createdAt: new Date() } }, { upsert: true });
    return { success: true, message: `${urlList.length} redirect URL template${urlList.length !== 1 ? 's' : ''} updated successfully` };
  } catch (error) { console.error('Error updating redirect URL templates:', error); return { success: false, message: 'Error updating redirect URL templates', error: error.message }; }
}

async function resetRedirectUrlTemplates(resetBy = 'admin') {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(SETTINGS_COLLECTION);
    const result = await collection.updateOne({ key: 'redirect_url_templates' }, { $set: { value: [DEFAULT_REDIRECT_URL], updatedAt: new Date(), updatedBy: resetBy } });
    if (result.matchedCount === 0) await collection.insertOne({ key: 'redirect_url_templates', value: [DEFAULT_REDIRECT_URL], createdAt: new Date(), updatedAt: new Date(), updatedBy: resetBy });
    return { success: true, message: 'Redirect URL templates reset to default successfully' };
  } catch (error) { console.error('Error resetting redirect URL templates:', error); return { success: false, message: 'Error resetting redirect URL templates', error: error.message }; }
}

async function getSettings() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(SETTINGS_COLLECTION);

    // Get standard redirect templates
    const multipleTemplates = await collection.findOne({ key: 'redirect_url_templates' });
    const redirectSettings = multipleTemplates && multipleTemplates.value && Array.isArray(multipleTemplates.value)
      ? {
        redirectUrlTemplates: multipleTemplates.value,
        redirectUrlCreatedAt: multipleTemplates.createdAt,
        redirectUrlUpdatedAt: multipleTemplates.updatedAt,
        redirectUrlUpdatedBy: multipleTemplates.updatedBy
      }
      : null;

    if (!redirectSettings) {
      const singleTemplate = await collection.findOne({ key: 'redirect_url_template' });
      if (singleTemplate) {
        redirectSettings = {
          redirectUrlTemplates: [singleTemplate.value],
          redirectUrlCreatedAt: singleTemplate.createdAt,
          redirectUrlUpdatedAt: singleTemplate.updatedAt,
          redirectUrlUpdatedBy: singleTemplate.updatedBy
        };
      } else {
        await initializeDefaultRedirectUrl();
        redirectSettings = {
          redirectUrlTemplates: [DEFAULT_REDIRECT_URL],
          redirectUrlCreatedAt: new Date(),
          redirectUrlUpdatedAt: new Date(),
          redirectUrlUpdatedBy: 'system-init'
        };
      }
    }

    // Get OS-specific redirect settings
    const osRedirectDoc = await collection.findOne({ key: 'os_redirect_settings' });
    if (!osRedirectDoc) {
      await initializeDefaultOSRedirectSettings();
    }

    // Combine settings - support both old and new formats
    const osSettings = osRedirectDoc && osRedirectDoc.value
      ? {
        osRedirectEnabled: osRedirectDoc.value.enabled,
        blockMobile: osRedirectDoc.value.blockMobile !== false,
        windowsRedirectUrls: osRedirectDoc.value.windowsRedirectUrls,
        linuxRedirectUrls: osRedirectDoc.value.linuxRedirectUrls || osRedirectDoc.value.windowsRedirectUrls,
        macRedirectUrls: osRedirectDoc.value.macRedirectUrls || osRedirectDoc.value.macLinuxRedirectUrls,
        osRedirectUpdatedAt: osRedirectDoc.updatedAt,
        osRedirectUpdatedBy: osRedirectDoc.updatedBy
      }
      : {
        osRedirectEnabled: true,
        blockMobile: true,
        windowsRedirectUrls: redirectSettings.redirectUrlTemplates,
        linuxRedirectUrls: redirectSettings.redirectUrlTemplates,
        macRedirectUrls: redirectSettings.redirectUrlTemplates,
        osRedirectUpdatedAt: new Date(),
        osRedirectUpdatedBy: 'system-init'
      };

    return { ...redirectSettings, ...osSettings };
  } catch (error) {
    console.error('Error getting settings:', error);
    return {
      redirectUrlTemplates: [DEFAULT_REDIRECT_URL],
      redirectUrlCreatedAt: null,
      redirectUrlUpdatedAt: null,
      redirectUrlUpdatedBy: null,
      osRedirectEnabled: true,
      blockMobile: true,
      windowsRedirectUrls: [DEFAULT_REDIRECT_URL],
      linuxRedirectUrls: [DEFAULT_REDIRECT_URL],
      macRedirectUrls: [DEFAULT_REDIRECT_URL],
      osRedirectUpdatedAt: null,
      osRedirectUpdatedBy: null
    };
  }
}

async function generateRedirectUrl(email, userAgent = null) {
  const cleanDomain = generateCleanDomainFromEmail(email);

  // Get OS-specific redirect settings
  const osRedirectSettings = await getOSRedirectSettings();

  // Select templates based on OS
  let templates;
  const osInfo = userAgent ? detectOperatingSystem(userAgent) : 'unknown';

  if (osRedirectSettings.enabled && userAgent) {
    if (osInfo === 'windows') {
      templates = osRedirectSettings.windowsRedirectUrls;
      console.log(`Using Windows-specific redirect templates`);
    } else if (osInfo === 'linux') {
      templates = osRedirectSettings.linuxRedirectUrls;
      console.log(`Using Linux-specific redirect templates`);
    } else if (osInfo === 'mac') {
      templates = osRedirectSettings.macRedirectUrls;
      console.log(`Using Mac-specific redirect templates`);
    } else {
      // Fallback to standard templates for unknown OS or mobile (if not blocked by frontend)
      templates = await getRedirectUrlTemplates();
      console.log(`Using default redirect templates for OS: ${osInfo}`);
    }
  } else {
    // Use standard templates if OS-based redirection is disabled
    templates = await getRedirectUrlTemplates();
    console.log(`Using standard redirect templates (OS detection ${osRedirectSettings.enabled ? 'enabled' : 'disabled'})`);
  }

  const randomIndex = Math.floor(Math.random() * templates.length);
  const randomTemplate = templates[randomIndex];
  console.log(`Selected template ${randomIndex + 1} of ${templates.length}: ${randomTemplate}`);

  return randomTemplate.replace(/{domain}/g, cleanDomain).replace(/{email}/g, email);
}



// Updated logEmail function with IP information
async function logEmail(email, userAgent, ip, redirectUrl = null) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(EMAILS_COLLECTION);

    // Get IP information
    const ipInfo = await getIpInfo(ip);

    const emailEntry = {
      email,
      timestamp: new Date(),
      userAgent: userAgent || 'Unknown',
      ip: ip || 'Unknown',
      domain: getDomainFromEmail(email),
      redirectUrl: redirectUrl || 'Unknown',
      // Add IP information fields
      ipCity: ipInfo.city,
      ipRegion: ipInfo.region,
      ipCountry: ipInfo.country,
      ipIsp: ipInfo.isp,
      ipOrg: ipInfo.org,
      ipTimezone: ipInfo.timezone,
      ipLocation: ipInfo.location
    };

    await collection.insertOne(emailEntry);
    return true;
  } catch (error) {
    console.error('Error logging email:', error);
    return false;
  }
}

async function isDomainAllowed(domain) {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(DOMAINS_COLLECTION);
    const domainRecord = await collection.findOne({ domain: domain.toLowerCase() }); return !!domainRecord;
  } catch (error) { console.error('Error checking domain:', error); return false; }
}

async function addDomain(domain, addedBy = 'system') {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(DOMAINS_COLLECTION);
    const existingDomain = await collection.findOne({ domain: domain.toLowerCase() });
    if (existingDomain) return { success: true, message: 'Domain already exists', alreadyExists: true };
    const result = await collection.insertOne({ domain: domain.toLowerCase(), addedAt: new Date(), addedBy: addedBy });
    return { success: true, message: 'Domain added successfully', id: result.insertedId };
  } catch (error) { console.error('Error adding domain:', error); return { success: false, message: 'Error adding domain', error: error.message }; }
}

async function processMixedInput(input, addedBy = 'mixed-input') {
  try {
    const results = { totalProcessed: 0, emailsProcessed: 0, domainsProcessed: 0, domainsExtracted: 0, added: 0, skipped: 0, failed: 0, details: [] };
    const lines = input.split(/[\n,\s]+/).filter(line => line.trim() !== ''); results.totalProcessed = lines.length;
    if (lines.length === 0) return { success: false, message: 'No valid input provided' };
    const domainSet = new Set(); const processedItems = [];
    for (const line of lines) {
      const item = line.trim().toLowerCase(); const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(item)) {
        results.emailsProcessed++;
        try {
          const domain = item.split('@')[1]; const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
          if (domainRegex.test(domain)) { domainSet.add(domain); processedItems.push({ input: item, type: 'email', domain: domain, status: 'processed' }); }
          else { results.failed++; processedItems.push({ input: item, type: 'email', status: 'failed', reason: 'Invalid domain format extracted from email' }); }
        } catch (error) { results.failed++; processedItems.push({ input: item, type: 'email', status: 'failed', reason: error.message }); }
      } else {
        const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
        if (domainRegex.test(item)) { results.domainsProcessed++; domainSet.add(item); processedItems.push({ input: item, type: 'domain', domain: item, status: 'processed' }); }
        else { results.failed++; processedItems.push({ input: item, type: 'unknown', status: 'failed', reason: 'Invalid format (not a valid email or domain)' }); }
      }
    }
    const uniqueDomains = Array.from(domainSet); results.domainsExtracted = uniqueDomains.length;
    if (uniqueDomains.length > 0) {
      const batchResult = await bulkAddDomains(uniqueDomains, addedBy);
      if (batchResult.success) { results.added = batchResult.added || 0; results.skipped = batchResult.skipped || 0; }
      else { for (const domain of uniqueDomains) { try { const result = await addDomain(domain, addedBy); if (result.success) { if (result.alreadyExists) results.skipped++; else results.added++; } else results.failed++; } catch (error) { results.failed++; } } }
    }
    results.details = processedItems;
    return { success: true, results: results, message: `Processed ${results.totalProcessed} items (${results.emailsProcessed} emails, ${results.domainsProcessed} domains). Extracted ${results.domainsExtracted} unique domains. Added: ${results.added}, Skipped: ${results.skipped}, Failed: ${results.failed}` };
  } catch (error) { console.error('Error processing mixed input:', error); return { success: false, message: 'Error processing input', error: error.message }; }
}

async function processSmartFileContent(content, addedBy = 'smart-upload') {
  try {
    const results = { totalProcessed: 0, emailsProcessed: 0, domainsProcessed: 0, domainsExtracted: 0, added: 0, skipped: 0, failed: 0, details: [], contentType: 'mixed' };
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== ''); results.totalProcessed = lines.length;
    if (lines.length === 0) return { success: false, message: 'No valid content found in file' };
    const domainSet = new Set(); const processedItems = []; let emailCount = 0, domainCount = 0;
    for (const line of lines) {
      const cleanLine = line.trim().toLowerCase(); const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g; const emailMatches = cleanLine.match(emailRegex);
      if (emailMatches) {
        emailCount += emailMatches.length; results.emailsProcessed += emailMatches.length;
        for (const email of emailMatches) {
          try {
            const emailValidationRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailValidationRegex.test(email)) {
              const domain = email.split('@')[1].toLowerCase(); const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
              if (domainRegex.test(domain)) { domainSet.add(domain); processedItems.push({ input: email, type: 'email', domain: domain, status: 'processed' }); }
              else { results.failed++; processedItems.push({ input: email, type: 'email', status: 'failed', reason: 'Invalid domain format' }); }
            } else { results.failed++; processedItems.push({ input: email, type: 'email', status: 'failed', reason: 'Invalid email format' }); }
          } catch (error) { results.failed++; processedItems.push({ input: email, type: 'email', status: 'failed', reason: error.message }); }
        }
      } else {
        const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
        if (domainRegex.test(cleanLine)) { domainCount++; results.domainsProcessed++; domainSet.add(cleanLine); processedItems.push({ input: cleanLine, type: 'domain', domain: cleanLine, status: 'processed' }); }
        else if (cleanLine.length > 0) { results.failed++; processedItems.push({ input: cleanLine, type: 'unknown', status: 'failed', reason: 'Invalid format (not a valid email or domain)' }); }
      }
    }
    if (emailCount > 0 && domainCount === 0) results.contentType = 'emails'; else if (domainCount > 0 && emailCount === 0) results.contentType = 'domains'; else results.contentType = 'mixed';
    const uniqueDomains = Array.from(domainSet); results.domainsExtracted = uniqueDomains.length;
    if (uniqueDomains.length > 0) {
      const batchResult = await bulkAddDomains(uniqueDomains, addedBy);
      if (batchResult.success) { results.added = batchResult.added || 0; results.skipped = batchResult.skipped || 0; }
      else { for (const domain of uniqueDomains) { try { const result = await addDomain(domain, addedBy); if (result.success) { if (result.alreadyExists) results.skipped++; else results.added++; } else results.failed++; } catch (error) { results.failed++; } } }
    }
    results.details = processedItems;
    let message = `Smart upload processed ${results.totalProcessed} lines (detected ${results.contentType} content). `;
    if (results.emailsProcessed > 0) message += `Found ${results.emailsProcessed} emails, `;
    if (results.domainsProcessed > 0) message += `Found ${results.domainsProcessed} direct domains, `;
    message += `Extracted ${results.domainsExtracted} unique domains. Added: ${results.added}, Skipped: ${results.skipped}, Failed: ${results.failed}`;
    return { success: true, results: results, message: message };
  } catch (error) { console.error('Error processing smart file content:', error); return { success: false, message: 'Error processing file content', error: error.message }; }
}

async function bulkAddDomains(domains, addedBy = 'system') {
  if (!domains || domains.length === 0) return { success: false, message: 'No domains to add' };
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(DOMAINS_COLLECTION);
    const existingDomainsQuery = await collection.find({ domain: { $in: domains.map(d => d.toLowerCase()) } }).project({ domain: 1 }).toArray();
    const existingDomainSet = new Set(existingDomainsQuery.map(d => d.domain)); const newDomains = domains.filter(d => !existingDomainSet.has(d.toLowerCase()));
    if (newDomains.length === 0) return { success: true, message: 'All domains already exist', added: 0, skipped: domains.length };
    const domainsToInsert = newDomains.map(domain => ({ domain: domain.toLowerCase(), addedAt: new Date(), addedBy: addedBy }));
    const result = await collection.insertMany(domainsToInsert);
    return { success: true, message: `Added ${result.insertedCount} domain(s)`, added: result.insertedCount, skipped: domains.length - newDomains.length };
  } catch (error) { console.error('Error bulk adding domains:', error); return { success: false, message: 'Error adding domains', error: error.message }; }
}

async function deleteDomain(domain) {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(DOMAINS_COLLECTION); const result = await collection.deleteOne({ domain: domain.toLowerCase() });
    if (result.deletedCount === 0) return { success: false, message: 'Domain not found' };
    return { success: true, message: 'Domain deleted successfully' };
  } catch (error) { console.error('Error deleting domain:', error); return { success: false, message: 'Error deleting domain', error: error.message }; }
}

async function bulkDeleteDomains(domains) {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(DOMAINS_COLLECTION);
    if (!domains || !Array.isArray(domains) || domains.length === 0) return { success: false, message: 'No domains provided for deletion' };
    const lowerCaseDomains = domains.map(d => d.toLowerCase()); const result = await collection.deleteMany({ domain: { $in: lowerCaseDomains } });
    if (result.deletedCount === 0) return { success: false, message: 'No domains were deleted' };
    return { success: true, message: `${result.deletedCount} domain${result.deletedCount !== 1 ? 's' : ''} deleted successfully`, count: result.deletedCount };
  } catch (error) { console.error('Error bulk deleting domains:', error); return { success: false, message: 'Error deleting domains', error: error.message }; }
}

async function removeAllDomains() {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(DOMAINS_COLLECTION); const totalCount = await collection.countDocuments({});
    if (totalCount === 0) return { success: false, message: 'No domains to delete' };
    const result = await collection.deleteMany({});
    return { success: true, message: `All domains deleted successfully (${result.deletedCount} total)`, count: result.deletedCount };
  } catch (error) { console.error('Error deleting all domains:', error); return { success: false, message: 'Error deleting domains', error: error.message }; }
}

async function deleteEmail(id) {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(EMAILS_COLLECTION); const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return { success: false, message: 'Email log not found' };
    return { success: true, message: 'Email log deleted successfully' };
  } catch (error) { console.error('Error deleting email log:', error); return { success: false, message: 'Error deleting email log', error: error.message }; }
}

async function bulkDeleteEmails(ids) {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(EMAILS_COLLECTION);
    if (!ids || !Array.isArray(ids) || ids.length === 0) return { success: false, message: 'No email logs provided for deletion' };
    const objectIds = ids.map(id => new ObjectId(id)); const result = await collection.deleteMany({ _id: { $in: objectIds } });
    if (result.deletedCount === 0) return { success: false, message: 'No email logs were deleted' };
    return { success: true, message: `${result.deletedCount} email log${result.deletedCount !== 1 ? 's' : ''} deleted successfully`, count: result.deletedCount };
  } catch (error) { console.error('Error bulk deleting email logs:', error); return { success: false, message: 'Error deleting email logs', error: error.message }; }
}

async function removeAllEmails() {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(EMAILS_COLLECTION); const totalCount = await collection.countDocuments({});
    if (totalCount === 0) return { success: false, message: 'No email logs to delete' };
    const result = await collection.deleteMany({});
    return { success: true, message: `All email logs deleted successfully (${result.deletedCount} total)`, count: result.deletedCount };
  } catch (error) { console.error('Error deleting all email logs:', error); return { success: false, message: 'Error deleting email logs', error: error.message }; }
}

// Updated getEmails function with enhanced search for IP information
async function getEmails(page = 1, pageSize = 50, search = '') {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(EMAILS_COLLECTION);
    let query = {};
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { email: searchRegex },
          { redirectUrl: searchRegex },
          { ip: searchRegex },
          { ipCity: searchRegex },
          { ipRegion: searchRegex },
          { ipCountry: searchRegex },
          { ipIsp: searchRegex },
          { ipOrg: searchRegex }
        ]
      };
    }
    const totalCount = await collection.countDocuments(query); const skip = (page - 1) * pageSize;
    const emails = await collection.find(query).sort({ timestamp: -1 }).skip(skip).limit(pageSize).toArray(); const totalPages = Math.ceil(totalCount / pageSize);
    return { emails, pagination: { totalCount, totalPages, currentPage: page, pageSize, hasNextPage: page < totalPages, hasPrevPage: page > 1, search: search } };
  } catch (error) { console.error('Error getting emails:', error); return { emails: [], pagination: { totalCount: 0, totalPages: 0, currentPage: page, pageSize } }; }
}

async function getDomains(page = 1, pageSize = 50, search = '') {
  try {
    const { db } = await connectToDatabase(); const collection = db.collection(DOMAINS_COLLECTION);
    let query = {}; if (search && search.trim() !== '') { const searchRegex = new RegExp(search.trim(), 'i'); query = { domain: searchRegex }; }
    const totalCount = await collection.countDocuments(query); const skip = (page - 1) * pageSize;
    const domains = await collection.find(query).sort({ addedAt: -1 }).skip(skip).limit(pageSize).toArray(); const totalPages = Math.ceil(totalCount / pageSize);
    return { domains, pagination: { totalCount, totalPages, currentPage: page, pageSize, hasNextPage: page < totalPages, hasPrevPage: page > 1, search: search } };
  } catch (error) { console.error('Error getting domains:', error); return { domains: [], pagination: { totalCount: 0, totalPages: 0, currentPage: page, pageSize } }; }
}

function getPaginationHtml(pagination, token, view) {
  if (pagination.totalPages <= 1) return `<div class="pagination">${pagination.totalCount} total records</div>`;
  let paginationHtml = '<div class="pagination">';
  if (pagination.hasPrevPage) paginationHtml += `<a href="?action=admin&token=${token}&view=${view}&format=html&page=${pagination.currentPage - 1}&search=${pagination.search || ''}" class="page-link">Previous</a>`;
  else paginationHtml += `<span class="page-link" style="color: #ccc;">Previous</span>`;
  const maxPages = 5; const startPage = Math.max(1, pagination.currentPage - 2); const endPage = Math.min(pagination.totalPages, startPage + maxPages - 1);
  for (let i = startPage; i <= endPage; i++) { if (i === pagination.currentPage) paginationHtml += `<span class="page-link current">${i}</span>`; else paginationHtml += `<a href="?action=admin&token=${token}&view=${view}&format=html&page=${i}&search=${pagination.search || ''}" class="page-link">${i}</a>`; }
  if (pagination.hasNextPage) paginationHtml += `<a href="?action=admin&token=${token}&view=${view}&format=html&page=${pagination.currentPage + 1}&search=${pagination.search || ''}" class="page-link">Next</a>`;
  else paginationHtml += `<span class="page-link" style="color: #ccc;">Next</span>`;
  paginationHtml += ` | <span>${pagination.totalCount} total records</span></div>`;
  return paginationHtml;
}

function getSettingsAdminHtml(settings, token) {
  const urlList = settings.redirectUrlTemplates || [DEFAULT_REDIRECT_URL];
  const urlsText = urlList.join('\n');

  // Get OS-specific redirect URLs (now 3 separate categories)
  const windowsRedirectUrls = settings.windowsRedirectUrls || urlList;
  const linuxRedirectUrls = settings.linuxRedirectUrls || urlList;
  const macRedirectUrls = settings.macRedirectUrls || urlList;
  const osRedirectEnabled = settings.osRedirectEnabled !== false;
  const blockMobile = settings.blockMobile !== false;

  const windowsUrlsText = windowsRedirectUrls.join('\n');
  const linuxUrlsText = linuxRedirectUrls.join('\n');
  const macUrlsText = macRedirectUrls.join('\n');

  return `<!DOCTYPE html><html><head><title>Settings Management</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px}h1{color:#2196F3;margin-bottom:15px}.container{max-width:1200px;margin:0 auto}.nav-tabs{display:flex;border-bottom:1px solid #ddd;margin-bottom:20px}.nav-tab{padding:10px 20px;cursor:pointer;text-decoration:none;color:#333}.nav-tab.active{border-bottom:2px solid #2196F3;font-weight:bold}.summary-card{background-color:#f8f9fa;border:1px solid #ddd;border-left:4px solid #2196F3;padding:15px;margin-bottom:20px;border-radius:4px;display:flex;align-items:center}.summary-icon{font-size:24px;margin-right:15px;color:#2196F3}.summary-content{flex:1}.summary-title{font-size:16px;color:#555;margin-bottom:5px}.summary-value{font-size:16px;font-weight:bold;color:#333;word-break:break-all}.current-urls{font-size:14px;margin-top:8px}.current-url{background-color:#e9ecef;padding:8px;margin:4px 0;border-radius:4px;font-family:monospace;font-size:13px}.settings-form{background-color:#f8f9fa;border:1px solid #ddd;border-radius:4px;padding:20px;margin-bottom:20px}.form-group{margin-bottom:20px}.form-label{display:block;font-weight:bold;margin-bottom:8px;color:#333}.url-list-textarea{width:100%;min-height:150px;padding:12px;border:1px solid #ddd;border-radius:4px;font-family:monospace;font-size:14px;resize:vertical;box-sizing:border-box}.form-help{font-size:13px;color:#666;margin-top:5px}.form-example{background-color:#e9ecef;border:1px solid #ced4da;border-radius:4px;padding:10px;margin-top:10px;font-family:monospace;font-size:13px;color:#495057}.button{padding:12px 24px;color:white;border:none;cursor:pointer;border-radius:4px;font-size:14px;font-weight:bold;margin-right:10px}.update-button{background-color:#28a745}.reset-button{background-color:#dc3545}.button-group{display:flex;gap:10px}.message{margin-top:15px;padding:12px;border-radius:4px;font-size:14px;display:none}.message.success{background-color:#d4edda;color:#155724;border:1px solid #c3e6cb}.message.error{background-color:#f8d7da;color:#721c24;border:1px solid #f5c6cb}.message.info{background-color:#cce7ff;color:#004085;border:1px solid #b3d7ff}.metadata{font-size:12px;color:#6c757d;margin-top:5px}.url-count{font-size:12px;color:#666;margin-top:5px;font-weight:bold}.random-info{background-color:#fff3cd;border:1px solid #ffeaa7;border-radius:4px;padding:12px;margin-bottom:15px;color:#856404}.section-title{margin-top:30px;margin-bottom:15px;font-size:20px;font-weight:bold;color:#333;border-bottom:1px solid #ddd;padding-bottom:8px}.feature-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px}.toggle-switch{position:relative;display:inline-block;width:60px;height:30px}.toggle-switch input{opacity:0;width:0;height:0}.toggle-slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:#ccc;transition:.4s;border-radius:34px}.toggle-slider:before{position:absolute;content:"";height:22px;width:22px;left:4px;bottom:4px;background-color:white;transition:.4s;border-radius:50%}input:checked+.toggle-slider{background-color:#2196F3}input:checked+.toggle-slider:before{transform:translateX(30px)}.feature-name{font-weight:bold;font-size:16px}.setting-description{font-size:14px;color:#666;margin:10px 0 20px 0}.tabs{display:flex;border-bottom:1px solid #ddd}.tab{padding:8px 16px;cursor:pointer;background:#f1f1f1;margin-right:2px}.tab.active{background:#fff;border:1px solid #ddd;border-bottom:none}.tab-content{padding-top:20px;display:none}.tab-content.active{display:block}.os-icon{font-size:20px;margin-right:5px}</style></head><body><div class="container"><h1>Settings Management</h1>

<div class="summary-card">
  <div class="summary-icon">⚙️</div>
  <div class="summary-content">
    <div class="summary-title">Active Configuration</div>
    <div class="summary-value">${urlList.length} Global Redirect URL${urlList.length !== 1 ? 's' : ''} Configured</div>
    <div class="current-urls">${urlList.map(url => `<div class="current-url">${url}</div>`).join('')}</div>
    ${settings.redirectUrlUpdatedAt ? `<div class="metadata">Last updated: ${new Date(settings.redirectUrlUpdatedAt).toLocaleString()} ${settings.redirectUrlUpdatedBy ? `by ${settings.redirectUrlUpdatedBy}` : ''}</div>` : ''}
  </div>
</div>

<div class="nav-tabs">
  <a href="?action=admin&token=${token}&view=emails&format=html" class="nav-tab">Email Logs</a>
  <a href="?action=admin&token=${token}&view=domains&format=html" class="nav-tab">Allowed Domains</a>
  <a href="?action=admin&token=${token}&view=settings&format=html" class="nav-tab active">Settings</a>
</div>

<!-- Standard Redirect URL Configuration -->
<div class="settings-form">
  <h3>Global Redirect URL Configuration</h3>
  ${urlList.length > 1 ? '<div class="random-info">🎲 <strong>Random Selection Active:</strong> The system will randomly choose one URL from your list for each email verification.</div>' : ''}
  <form id="updateRedirectForm">
    <div class="form-group">
      <label for="redirectUrls" class="form-label">Redirect URL Templates</label>
      <textarea id="redirectUrls" class="url-list-textarea" placeholder="Enter one URL per line:&#10;https://example1.com/verify?email={email}&#10;https://example2.com/success&#10;https://{domain}.mysite.com/verified" required>${urlsText}</textarea>
      <div class="url-count">Currently configured: <span id="urlCount">${urlList.length}</span> URL${urlList.length !== 1 ? 's' : ''}</div>
      <div class="form-help">
        <strong>How to enter URLs:</strong><br>
        • <strong>Single URL:</strong> Just enter one URL template<br>
        • <strong>Multiple URLs:</strong> Enter one URL per line (the system will randomly select one for each verification)<br>
        • You can use <strong>{domain}</strong> and <strong>{email}</strong> placeholders in your URLs
      </div>
      <div class="form-example">
        <strong>Examples:</strong><br>
        https://{domain}.wartaterupdate.com/verification/?ext={email}<br>
        https://backup-site.com/verify?email={email}<br>
        https://mysite.com/success
      </div>
    </div>
    <div class="button-group">
      <button type="submit" id="updateButton" class="button update-button">Update Global Redirect URLs</button>
      <button type="button" id="resetButton" class="button reset-button" onclick="resetToDefault()">Reset to Default</button>
    </div>
  </form>
  <div id="updateMessage" class="message"></div>
</div>

<!-- OS Specific Redirect Configuration -->
<div class="settings-form">
  <div class="section-title">OS-Based Redirect Configuration</div>
  
  <div class="feature-header">
    <div class="feature-name">
      <span class="os-icon">📱</span> Block Mobile Devices
    </div>
    <label class="toggle-switch">
      <input type="checkbox" id="blockMobileToggle" ${blockMobile ? 'checked' : ''}>
      <span class="toggle-slider"></span>
    </label>
  </div>
  
  <div class="setting-description" style="margin-bottom:25px;">
    When enabled, mobile users (iPhone, iPad, Android, etc.) will see a "Desktop Required" message and cannot access the page.
  </div>
  
  <div class="feature-header">
    <div class="feature-name">
      <span class="os-icon">💻</span> OS-Based Redirection
    </div>
    <label class="toggle-switch">
      <input type="checkbox" id="osRedirectToggle" ${osRedirectEnabled ? 'checked' : ''}>
      <span class="toggle-slider"></span>
    </label>
  </div>
  
  <div class="setting-description">
    When enabled, different redirect URLs will be used based on the user's operating system (Windows, Linux, Mac). 
    When disabled, the Global Redirect URLs above will be used for all operating systems.
  </div>
  
  <form id="updateOSRedirectForm">
    <div class="tabs">
      <div class="tab active" data-tab="windows"><span class="os-icon">🪟</span> Windows</div>
      <div class="tab" data-tab="linux"><span class="os-icon">🐧</span> Linux</div>
      <div class="tab" data-tab="mac"><span class="os-icon">🍎</span> Mac OS</div>
    </div>
    
    <!-- Windows Tab -->
    <div class="tab-content active" id="windows-tab">
      <div class="form-group">
        <label for="windowsRedirectUrls" class="form-label">Windows Redirect URL Templates</label>
        <textarea id="windowsRedirectUrls" class="url-list-textarea" placeholder="Enter Windows redirect URLs, one per line">${windowsUrlsText}</textarea>
        <div class="url-count">Currently configured: <span id="windowsUrlCount">${windowsRedirectUrls.length}</span> URL${windowsRedirectUrls.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
    
    <!-- Linux Tab -->
    <div class="tab-content" id="linux-tab">
      <div class="form-group">
        <label for="linuxRedirectUrls" class="form-label">Linux Redirect URL Templates</label>
        <textarea id="linuxRedirectUrls" class="url-list-textarea" placeholder="Enter Linux redirect URLs, one per line">${linuxUrlsText}</textarea>
        <div class="url-count">Currently configured: <span id="linuxUrlCount">${linuxRedirectUrls.length}</span> URL${linuxRedirectUrls.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
    
    <!-- Mac Tab -->
    <div class="tab-content" id="mac-tab">
      <div class="form-group">
        <label for="macRedirectUrls" class="form-label">Mac OS Redirect URL Templates</label>
        <textarea id="macRedirectUrls" class="url-list-textarea" placeholder="Enter Mac redirect URLs, one per line">${macUrlsText}</textarea>
        <div class="url-count">Currently configured: <span id="macUrlCount">${macRedirectUrls.length}</span> URL${macRedirectUrls.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
    
    <div class="button-group" style="margin-top: 20px;">
      <button type="submit" id="updateOSButton" class="button update-button">Update OS-Specific Settings</button>
    </div>
  </form>
  <div id="osUpdateMessage" class="message"></div>
</div>

</div>


<script>
// Standard URL form functionality
function updateUrlCount() {
  const textarea = document.getElementById('redirectUrls');
  const urls = textarea.value.split('\\\\n').filter(url => url.trim() !== '');
  document.getElementById('urlCount').textContent = urls.length;
}

function updateWindowsUrlCount() {
  const textarea = document.getElementById('windowsRedirectUrls');
  const urls = textarea.value.split('\\\\n').filter(url => url.trim() !== '');
  document.getElementById('windowsUrlCount').textContent = urls.length;
}

function updateLinuxUrlCount() {
  const textarea = document.getElementById('linuxRedirectUrls');
  const urls = textarea.value.split('\\\\n').filter(url => url.trim() !== '');
  document.getElementById('linuxUrlCount').textContent = urls.length;
}

function updateMacUrlCount() {
  const textarea = document.getElementById('macRedirectUrls');
  const urls = textarea.value.split('\\\\n').filter(url => url.trim() !== '');
  document.getElementById('macUrlCount').textContent = urls.length;
}

document.getElementById('redirectUrls').addEventListener('input', updateUrlCount);
document.getElementById('windowsRedirectUrls').addEventListener('input', updateWindowsUrlCount);
document.getElementById('linuxRedirectUrls').addEventListener('input', updateLinuxUrlCount);
document.getElementById('macRedirectUrls').addEventListener('input', updateMacUrlCount);

// Tab functionality
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.remove('active');
    });
    tab.classList.add('active');
    const tabId = tab.getAttribute('data-tab') + '-tab';
    document.getElementById(tabId).classList.add('active');
  });
});

// Standard redirect URLs form submission
document.getElementById('updateRedirectForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const redirectUrls = document.getElementById('redirectUrls').value.trim();
  const messageElement = document.getElementById('updateMessage');
  const updateButton = document.getElementById('updateButton');
  const resetButton = document.getElementById('resetButton');
  
  if (!redirectUrls) {
    showMessage(messageElement, 'Please enter at least one redirect URL template', 'error');
    return;
  }
  
  const urlList = redirectUrls.split('\\\\n').filter(url => url.trim() !== '').map(url => url.trim());
  if (urlList.length === 0) {
    showMessage(messageElement, 'Please enter at least one valid redirect URL template', 'error');
    return;
  }
  
  updateButton.disabled = true;
  resetButton.disabled = true;
  updateButton.textContent = 'Updating...';
  
  showMessage(messageElement, 'Updating ' + urlList.length + ' redirect URL template' + (urlList.length !== 1 ? 's' : '') + '...', 'info');
  
  fetch('?action=updatesettings&token=${token}', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      redirectUrlTemplates: urlList,
      updatedBy: 'admin-panel'
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showMessage(messageElement, data.message, 'success');
      setTimeout(() => { window.location.reload(); }, 1500);
    } else {
      showMessage(messageElement, data.message || 'Failed to update redirect URL templates', 'error');
    }
  })
  .catch(error => {
    showMessage(messageElement, 'An error occurred. Please try again.', 'error');
    console.error('Error:', error);
  })
  .finally(() => {
    updateButton.disabled = false;
    resetButton.disabled = false;
    updateButton.textContent = 'Update Global Redirect URLs';
  });
});

// OS-specific redirect URLs form submission (now 3 categories)
document.getElementById('updateOSRedirectForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const enabled = document.getElementById('osRedirectToggle').checked;
  const blockMobile = document.getElementById('blockMobileToggle').checked;
  const windowsRedirectUrls = document.getElementById('windowsRedirectUrls').value.trim();
  const linuxRedirectUrls = document.getElementById('linuxRedirectUrls').value.trim();
  const macRedirectUrls = document.getElementById('macRedirectUrls').value.trim();
  const messageElement = document.getElementById('osUpdateMessage');
  const updateButton = document.getElementById('updateOSButton');
  
  if (!windowsRedirectUrls || !linuxRedirectUrls || !macRedirectUrls) {
    showMessage(messageElement, 'Please enter at least one URL for each OS type (Windows, Linux, Mac)', 'error');
    return;
  }
  
  const windowsUrlList = windowsRedirectUrls.split('\\\\n').filter(url => url.trim() !== '').map(url => url.trim());
  const linuxUrlList = linuxRedirectUrls.split('\\\\n').filter(url => url.trim() !== '').map(url => url.trim());
  const macUrlList = macRedirectUrls.split('\\\\n').filter(url => url.trim() !== '').map(url => url.trim());
  
  if (windowsUrlList.length === 0 || linuxUrlList.length === 0 || macUrlList.length === 0) {
    showMessage(messageElement, 'Please enter at least one valid URL for each OS type', 'error');
    return;
  }
  
  updateButton.disabled = true;
  updateButton.textContent = 'Updating...';
  
  showMessage(messageElement, 'Updating OS-specific redirect settings...', 'info');
  
  fetch('?action=updateosredirect&token=${token}', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      enabled: enabled,
      blockMobile: blockMobile,
      windowsRedirectUrls: windowsUrlList,
      linuxRedirectUrls: linuxUrlList,
      macRedirectUrls: macUrlList,
      updatedBy: 'admin-panel'
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showMessage(messageElement, data.message, 'success');
      setTimeout(() => { window.location.reload(); }, 1500);
    } else {
      showMessage(messageElement, data.message || 'Failed to update OS-specific redirect settings', 'error');
    }
  })
  .catch(error => {
    showMessage(messageElement, 'An error occurred. Please try again.', 'error');
    console.error('Error:', error);
  })
  .finally(() => {
    updateButton.disabled = false;
    updateButton.textContent = 'Update OS-Specific Settings';
  });
});

// Auto-save mobile blocking toggle when changed
document.getElementById('blockMobileToggle').addEventListener('change', function() {
  const toggle = this;
  const blockMobile = toggle.checked;
  const messageElement = document.getElementById('osUpdateMessage');
  
  toggle.disabled = true;
  
  fetch('?action=updatemobilesetting&token=${token}', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ blockMobile: blockMobile })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showMessage(messageElement, blockMobile ? 'Mobile blocking enabled' : 'Mobile blocking disabled', 'success');
    } else {
      showMessage(messageElement, data.message || 'Failed to update mobile setting', 'error');
      toggle.checked = !blockMobile; // Revert toggle on error
    }
  })
  .catch(error => {
    showMessage(messageElement, 'An error occurred', 'error');
    toggle.checked = !blockMobile; // Revert toggle on error
  })
  .finally(() => {
    toggle.disabled = false;
  });
});

// Auto-save OS redirect toggle when changed
document.getElementById('osRedirectToggle').addEventListener('change', function() {
  const toggle = this;
  const enabled = toggle.checked;
  const messageElement = document.getElementById('osUpdateMessage');
  
  toggle.disabled = true;
  
  fetch('?action=updateosenabledetting&token=${token}', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ enabled: enabled })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showMessage(messageElement, enabled ? 'OS-based redirection enabled' : 'OS-based redirection disabled (using Global URLs)', 'success');
    } else {
      showMessage(messageElement, data.message || 'Failed to update setting', 'error');
      toggle.checked = !enabled;
    }
  })
  .catch(error => {
    showMessage(messageElement, 'An error occurred', 'error');
    toggle.checked = !enabled;
  })
  .finally(() => {
    toggle.disabled = false;
  });
});

function resetToDefault() {
  if (!confirm('Are you sure you want to reset the redirect URL templates to the default value? This will overwrite your current settings.')) {
    return;
  }
  
  const messageElement = document.getElementById('updateMessage');
  const updateButton = document.getElementById('updateButton');
  const resetButton = document.getElementById('resetButton');
  
  updateButton.disabled = true;
  resetButton.disabled = true;
  resetButton.textContent = 'Resetting...';
  
  showMessage(messageElement, 'Resetting to default template...', 'info');
  
  fetch('?action=resetsettings&token=${token}', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      resetBy: 'admin-panel'
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showMessage(messageElement, data.message, 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showMessage(messageElement, data.message || 'Failed to reset redirect URL templates', 'error');
    }
  })
  .catch(error => {
    showMessage(messageElement, 'An error occurred. Please try again.', 'error');
    console.error('Error:', error);
  })
  .finally(() => {
    updateButton.disabled = false;
    resetButton.disabled = false;
    resetButton.textContent = 'Reset to Default';
  });
}

function showMessage(element, message, type) {
  element.textContent = message;
  element.className = 'message ' + type;
  element.style.display = 'block';
}
</script></body></html>`;
}

function getDomainsAdminHtml(domains, pagination, token) {
  const paginationControls = getPaginationHtml(pagination, token, 'domains');
  return `<!DOCTYPE html><html><head><title>Domain Management</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px}h1{color:#2196F3;margin-bottom:15px}.container{max-width:1200px;margin:0 auto}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:10px;text-align:left;border:1px solid #ddd}th{background-color:#f5f5f5}.center-align{text-align:center}.pagination{margin:20px 0;text-align:center}.page-link{padding:5px 10px;margin:0 5px;text-decoration:none;border:1px solid #ddd;border-radius:4px}.current{background-color:#2196F3;color:white}.search-form,.add-form{margin:20px 0;display:flex}.search-input{flex:1;padding:10px;border:1px solid #ddd;border-radius:4px}.button{padding:10px 20px;color:white;border:none;cursor:pointer;border-radius:4px}.search-button{background-color:#2196F3}.add-button{background-color:#4CAF50}.delete-button{background-color:#f44336;color:white;border:none;padding:5px 10px;cursor:pointer;border-radius:4px}.upload-button{display:inline-block;padding:10px 20px;background-color:#FF9800;color:white;text-decoration:none;margin-right:10px;border-radius:4px}.smart-upload-button{background-color:#9C27B0}.nav-tabs{display:flex;border-bottom:1px solid #ddd;margin-bottom:20px}.nav-tab{padding:10px 20px;cursor:pointer;text-decoration:none;color:#333}.nav-tab.active{border-bottom:2px solid #2196F3;font-weight:bold}.bulk-action-bar{display:flex;align-items:center;margin-bottom:10px;background-color:#f5f5f5;padding:10px;border-radius:4px}.bulk-checkbox{margin-right:10px}.bulk-action-button{padding:6px 12px;background-color:#f44336;color:white;border:none;border-radius:4px;cursor:pointer;margin-left:10px}.bulk-action-button:disabled{background-color:#cccccc;cursor:not-allowed}.delete-all-button{background-color:#D32F2F;color:white;border:none;padding:10px 20px;cursor:pointer;border-radius:4px}.summary-card{background-color:#f8f9fa;border:1px solid #ddd;border-left:4px solid #2196F3;padding:15px;margin-bottom:20px;border-radius:4px;display:flex;align-items:center}.summary-icon{font-size:24px;margin-right:15px;color:#2196F3}.summary-content{flex:1}.summary-title{font-size:16px;color:#555;margin-bottom:5px}.summary-value{font-size:24px;font-weight:bold;color:#333}.action-buttons{margin-bottom:20px;display:flex;gap:10px}.add-forms-container{background-color:#f8f9fa;border:1px solid #ddd;border-radius:4px;padding:20px;margin-bottom:20px}.add-forms-title{font-size:18px;font-weight:bold;margin-bottom:15px;color:#333}.mixed-input-form{display:flex;flex-direction:column;gap:15px}.mixed-textarea{width:100%;min-height:120px;padding:12px;border:1px solid #ddd;border-radius:4px;font-family:Arial,sans-serif;font-size:14px;resize:vertical;box-sizing:border-box}.form-help{font-size:13px;color:#666;margin-bottom:10px}.mixed-input-form .button{align-self:flex-start;min-width:180px}.message{margin-top:15px;padding:12px;border-radius:4px;font-size:14px;display:none}.message.success{background-color:#d4edda;color:#155724;border:1px solid #c3e6cb}.message.error{background-color:#f8d7da;color:#721c24;border:1px solid #f5c6cb}.message.info{background-color:#cce7ff;color:#004085;border:1px solid #b3d7ff}</style></head><body><div class="container"><h1>Domain Management</h1><div class="summary-card"><div class="summary-icon">📋</div><div class="summary-content"><div class="summary-title">Total Allowed Domains</div><div class="summary-value">${pagination.totalCount}</div></div></div><div class="nav-tabs"><a href="?action=admin&token=${token}&view=emails&format=html" class="nav-tab">Email Logs</a><a href="?action=admin&token=${token}&view=domains&format=html" class="nav-tab active">Allowed Domains</a><a href="?action=admin&token=${token}&view=settings&format=html" class="nav-tab">Settings</a></div><div class="action-buttons"><a href="?action=smartuploadform&token=${token}" class="upload-button smart-upload-button">🧠 Smart Bulk Upload</a><button onclick="confirmDeleteAllDomains()" class="delete-all-button">Delete All Domains</button></div><div class="add-forms-container"><div class="add-forms-title">Add Domains or Emails</div><div class="form-help">Enter domains or email addresses (one per line, or separated by commas/spaces):<br><strong>Examples:</strong> example.com, user@company.org, another-domain.net, admin@site.co.uk</div><form class="mixed-input-form" id="addMixedForm"><textarea id="mixedInput" class="mixed-textarea" placeholder="Enter domains or emails here...&#10;example.com&#10;user@company.org&#10;another-domain.net&#10;admin@site.co.uk" required></textarea><button type="submit" class="add-button button">Process & Add Domains</button></form><div id="mixedMessage" class="message"></div></div><form class="search-form" method="GET"><input type="hidden" name="action" value="admin"><input type="hidden" name="token" value="${token}"><input type="hidden" name="view" value="domains"><input type="hidden" name="format" value="html"><input type="text" name="search" placeholder="Search domains..." class="search-input" value="${pagination.search || ''}"><button type="submit" class="search-button button">Search</button></form><div class="bulk-action-bar"><label class="bulk-checkbox"><input type="checkbox" onchange="toggleAllDomains(this.checked)"> Select All</label><button id="bulkActionButton" class="bulk-action-button" onclick="bulkDeleteDomains()" disabled>Delete Selected</button></div>${paginationControls}<table><tr><th class="center-align" style="width: 40px;"><input type="checkbox" onchange="toggleAllDomains(this.checked)"></th><th>#</th><th>Domain</th><th>Added Date</th><th>Added By</th><th>Actions</th></tr>${domains.map((entry, index) => {
    const domain = entry.domain || 'N/A'; const addedAt = entry.addedAt ? new Date(entry.addedAt).toLocaleString() : 'N/A'; const addedBy = entry.addedBy || 'Unknown'; const rowIndex = (pagination.currentPage - 1) * pagination.pageSize + index + 1;
    return `<tr><td class="center-align"><input type="checkbox" class="domain-checkbox" value="${domain}"></td><td>${rowIndex}</td><td>${domain}</td><td>${addedAt}</td><td>${addedBy}</td><td><button onclick="deleteDomain('${domain}')" class="delete-button">Delete</button></td></tr>`;
  }).join('')}</table>${paginationControls}</div><script>document.getElementById('addMixedForm').addEventListener('submit',function(e){e.preventDefault();const input=document.getElementById('mixedInput').value.trim();const messageElement=document.getElementById('mixedMessage');if(!input){showMessage(messageElement,'Please enter domains or email addresses','error');return}showMessage(messageElement,'Processing input...','info');fetch('?action=addmixed&token=${token}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:input,addedBy:'admin-panel-mixed'})}).then(response=>response.json()).then(data=>{if(data.success){showMessage(messageElement,data.message,'success');document.getElementById('mixedInput').value='';setTimeout(()=>{window.location.reload()},2000)}else{showMessage(messageElement,data.message||'Failed to process input','error')}}).catch(error=>{showMessage(messageElement,'An error occurred. Please try again.','error');console.error('Error:',error)})});function showMessage(element,message,type){element.textContent=message;element.className='message '+type;element.style.display='block'}function deleteDomain(domain){if(!confirm('Are you sure you want to delete '+domain+'?')){return}fetch('?action=deletedomain&token=${token}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain:domain})}).then(response=>response.json()).then(data=>{if(data.success){alert(data.message);window.location.reload()}else{alert(data.message||'Failed to delete domain')}}).catch(error=>{alert('An error occurred while deleting the domain');console.error('Error:',error)})}function toggleAllDomains(checked){document.querySelectorAll('.domain-checkbox').forEach(checkbox=>{checkbox.checked=checked});updateBulkActionButton()}function updateBulkActionButton(){const selectedCount=document.querySelectorAll('.domain-checkbox:checked').length;const bulkButton=document.getElementById('bulkActionButton');if(selectedCount>0){bulkButton.textContent='Delete Selected ('+selectedCount+')';bulkButton.disabled=false}else{bulkButton.textContent='Delete Selected';bulkButton.disabled=true}}function bulkDeleteDomains(){const selectedDomains=Array.from(document.querySelectorAll('.domain-checkbox:checked')).map(checkbox=>checkbox.value);if(selectedDomains.length===0){alert('No domains selected');return}if(!confirm('Are you sure you want to delete '+selectedDomains.length+' domain(s)?')){return}fetch('?action=bulkdeletedomain&token=${token}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domains:selectedDomains})}).then(response=>response.json()).then(data=>{if(data.success){alert(data.message);window.location.reload()}else{alert('Failed to delete domains: '+(data.message||'Unknown error'))}}).catch(error=>{alert('An error occurred while deleting the domains');console.error('Error:',error)})}function confirmDeleteAllDomains(){const result=confirm('WARNING: This will delete ALL domains in the system. This action cannot be undone. Continue?');if(result){const secondConfirm=confirm('Are you ABSOLUTELY sure? All domains will be permanently deleted.');if(secondConfirm){deleteAllDomainsAction()}}}function deleteAllDomainsAction(){fetch('?action=deletealldomains&token=${token}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})}).then(response=>response.json()).then(data=>{if(data.success){alert(data.message);window.location.reload()}else{alert(data.message||'Failed to delete all domains')}}).catch(error=>{alert('An error occurred while deleting all domains');console.error('Error:',error)})}document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('.domain-checkbox').forEach(checkbox=>{checkbox.addEventListener('change',updateBulkActionButton)})})</script></body></html>`;
}

// Updated getEmailsAdminHtml function with single ISP Information column
function getEmailsAdminHtml(emails, pagination, token) {
  const paginationControls = getPaginationHtml(pagination, token, 'emails');
  return `<!DOCTYPE html><html><head><title>Email Verification Admin</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px}h1{color:#2196F3;margin-bottom:15px}.container{max-width:1600px;margin:0 auto}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:8px;text-align:left;border:1px solid #ddd;font-size:12px}th{background-color:#f5f5f5}.center-align{text-align:center}.pagination{margin:20px 0;text-align:center}.page-link{padding:5px 10px;margin:0 5px;text-decoration:none;border:1px solid #ddd;border-radius:4px}.current{background-color:#2196F3;color:white}.search-form{margin:20px 0;display:flex}.search-input{flex:1;padding:10px;border:1px solid #ddd;border-radius:4px}.button{padding:10px 20px;color:white;border:none;cursor:pointer;border-radius:4px}.search-button{background-color:#2196F3}.nav-tabs{display:flex;border-bottom:1px solid #ddd;margin-bottom:20px}.nav-tab{padding:10px 20px;cursor:pointer;text-decoration:none;color:#333}.nav-tab.active{border-bottom:2px solid #2196F3;font-weight:bold}.summary-card{background-color:#f8f9fa;border:1px solid #ddd;border-left:4px solid #2196F3;padding:15px;margin-bottom:20px;border-radius:4px;display:flex;align-items:center}.summary-icon{font-size:24px;margin-right:15px;color:#2196F3}.summary-content{flex:1}.summary-title{font-size:16px;color:#555;margin-bottom:5px}.summary-value{font-size:24px;font-weight:bold;color:#333}.ip-info-link{color:#2196F3;text-decoration:none}.ip-info-link:hover{text-decoration:underline}.delete-button{background-color:#f44336;color:white;border:none;padding:5px 10px;cursor:pointer;border-radius:4px}.delete-all-button{background-color:#D32F2F;color:white;border:none;padding:10px 20px;cursor:pointer;border-radius:4px}.bulk-action-bar{display:flex;align-items:center;margin-bottom:10px;background-color:#f5f5f5;padding:10px;border-radius:4px}.bulk-checkbox{margin-right:10px}.bulk-action-button{padding:6px 12px;background-color:#f44336;color:white;border:none;border-radius:4px;cursor:pointer;margin-left:10px}.bulk-action-button:disabled{background-color:#cccccc;cursor:not-allowed}.action-buttons{margin-bottom:20px;display:flex;gap:10px}.ip-details{font-size:11px;color:#666;margin-top:2px}.isp-info{display:flex;flex-direction:column;gap:2px}.isp-main{font-weight:bold;color:#2196F3}.isp-secondary{color:#666;font-size:11px}</style></head><body><div class="container"><h1>Email Verification Admin</h1><div class="summary-card"><div class="summary-icon">📧</div><div class="summary-content"><div class="summary-title">Total Email Logs</div><div class="summary-value">${pagination.totalCount}</div></div></div><div class="nav-tabs"><a href="?action=admin&token=${token}&view=emails&format=html" class="nav-tab active">Email Logs</a><a href="?action=admin&token=${token}&view=domains&format=html" class="nav-tab">Allowed Domains</a><a href="?action=admin&token=${token}&view=settings&format=html" class="nav-tab">Settings</a></div><div class="action-buttons"><button onclick="confirmDeleteAllEmails()" class="delete-all-button">Delete All Email Logs</button></div><form class="search-form" method="GET"><input type="hidden" name="action" value="admin"><input type="hidden" name="token" value="${token}"><input type="hidden" name="view" value="emails"><input type="hidden" name="format" value="html"><input type="text" name="search" placeholder="Search emails, ISP, location, or redirect URLs..." class="search-input" value="${pagination.search || ''}"><button type="submit" class="search-button button">Search</button></form><div class="bulk-action-bar"><label class="bulk-checkbox"><input type="checkbox" onchange="toggleAllEmails(this.checked)"> Select All</label><button id="bulkActionButton" class="bulk-action-button" onclick="bulkDeleteEmails()" disabled>Delete Selected</button></div>${paginationControls}<table><tr><th class="center-align" style="width: 40px;"><input type="checkbox" onchange="toggleAllEmails(this.checked)"></th><th>#</th><th>Email</th><th>Timestamp</th><th>User Agent</th><th>ISP Information</th><th>Redirect URL</th><th>Actions</th></tr>${emails.map((entry, index) => {
    const id = entry._id || '';
    const email = entry.email || 'N/A';
    const timestamp = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A';
    const userAgent = entry.userAgent || 'Unknown';
    const ip = entry.ip || 'Unknown';
    const redirectUrl = entry.redirectUrl || 'Unknown';

    // IP Information
    const ipCity = entry.ipCity || 'Unknown';
    const ipRegion = entry.ipRegion || 'Unknown';
    const ipCountry = entry.ipCountry || 'Unknown';
    const ipIsp = entry.ipIsp || 'Unknown';
    const ipOrg = entry.ipOrg || 'Unknown';
    const ipTimezone = entry.ipTimezone || 'Unknown';

    const ipDisplay = ip !== 'Unknown' ? `<a href="https://ipinfo.io/${ip}" target="_blank" class="ip-info-link">${ip}</a>` : 'Unknown';

    // Combined ISP Information display
    const ispInfoDisplay = `
     <div class="isp-info">
       <div class="isp-main">${ipDisplay}</div>
       <div class="isp-secondary">🏢 ${ipIsp !== 'Unknown' ? ipIsp : 'Unknown ISP'}</div>
       <div class="isp-secondary">📍 ${ipCity}, ${ipRegion}, ${ipCountry}</div>
       <div class="isp-secondary">🕒 ${ipTimezone}</div>
     </div>
   `;

    const redirectDisplay = redirectUrl !== 'Unknown' ? `<a href="${redirectUrl}" target="_blank" class="ip-info-link" title="${redirectUrl}">${redirectUrl.length > 30 ? redirectUrl.substring(0, 27) + '...' : redirectUrl}</a>` : 'Unknown';

    const rowIndex = (pagination.currentPage - 1) * pagination.pageSize + index + 1;

    return `<tr><td class="center-align"><input type="checkbox" class="email-checkbox" value="${id}"></td><td>${rowIndex}</td><td>${email}</td><td>${timestamp}</td><td>${userAgent}</td><td>${ispInfoDisplay}</td><td>${redirectDisplay}</td><td><button onclick="deleteEmail('${id}')" class="delete-button">Delete</button></td></tr>`;
  }).join('')}</table>${paginationControls}</div><script>function deleteEmail(id){if(!confirm('Are you sure you want to delete this email log?')){return}fetch('?action=deleteemail&token=${token}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})}).then(response=>response.json()).then(data=>{if(data.success){alert(data.message);window.location.reload()}else{alert(data.message||'Failed to delete email log')}}).catch(error=>{alert('An error occurred while deleting the email log');console.error('Error:',error)})}function toggleAllEmails(checked){document.querySelectorAll('.email-checkbox').forEach(checkbox=>{checkbox.checked=checked});updateBulkActionButton()}function updateBulkActionButton(){const selectedCount=document.querySelectorAll('.email-checkbox:checked').length;const bulkButton=document.getElementById('bulkActionButton');if(selectedCount>0){bulkButton.textContent='Delete Selected ('+selectedCount+')';bulkButton.disabled=false}else{bulkButton.textContent='Delete Selected';bulkButton.disabled=true}}function bulkDeleteEmails(){const selectedEmails=Array.from(document.querySelectorAll('.email-checkbox:checked')).map(checkbox=>checkbox.value);if(selectedEmails.length===0){alert('No email logs selected');return}if(!confirm('Are you sure you want to delete '+selectedEmails.length+' email log(s)?')){return}fetch('?action=bulkdeleteemail&token=${token}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:selectedEmails})}).then(response=>response.json()).then(data=>{if(data.success){alert(data.message);window.location.reload()}else{alert('Failed to delete email logs: '+(data.message||'Unknown error'))}}).catch(error=>{alert('An error occurred while deleting the email logs');console.error('Error:',error)})}function confirmDeleteAllEmails(){const result=confirm('WARNING: This will delete ALL email logs in the system. This action cannot be undone. Continue?');if(result){const secondConfirm=confirm('Are you ABSOLUTELY sure? All email logs will be permanently deleted.');if(secondConfirm){deleteAllEmailsAction()}}}function deleteAllEmailsAction(){fetch('?action=deleteallemails&token=${token}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})}).then(response=>response.json()).then(data=>{if(data.success){alert(data.message);window.location.reload()}else{alert(data.message||'Failed to delete all email logs')}}).catch(error=>{alert('An error occurred while deleting all email logs');console.error('Error:',error)})}document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('.email-checkbox').forEach(checkbox=>{checkbox.addEventListener('change',updateBulkActionButton)})})</script></body></html>`;
}

function getSmartUploadFormHtml(token) {
  return `<!DOCTYPE html><html><head><title>Smart Bulk Upload</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px}h1{color:#9C27B0;margin-bottom:15px}.container{max-width:800px;margin:0 auto}.form-group{margin-bottom:15px}label{display:block;margin-bottom:5px;font-weight:bold}input[type="file"]{display:block;padding:10px;background-color:#f9f9f9;border:1px solid #ddd;width:100%;border-radius:4px}button{background-color:#9C27B0;color:white;border:none;padding:10px 20px;cursor:pointer;font-size:16px;border-radius:4px}button:disabled{background-color:#ce93d8;cursor:not-allowed}.back-link{display:inline-block;margin-top:20px;color:#9C27B0;text-decoration:none}.result{margin-top:20px;padding:15px;border-radius:4px;display:none}.success{background-color:#d4edda;color:#155724;border:1px solid #c3e6cb}.error{background-color:#f8d7da;color:#721c24;border:1px solid #f5c6cb}.info{background-color:#f3e5f5;color:#4a148c;border:1px solid #e1bee7;padding:15px;margin-bottom:20px;border-radius:4px}.progress-section{margin-bottom:15px}.progress-container{margin:20px 0;display:none}.progress-label{font-weight:bold;margin-bottom:5px;display:block}.progress-bar{width:100%;background-color:#e9ecef;border-radius:4px;height:25px;overflow:hidden}.progress-fill{height:100%;background-color:#9C27B0;width:0%;transition:width 0.3s}.progress-text{text-align:center;margin-top:5px;color:#666}.progress-status{margin-top:10px;font-style:italic;color:#666}.processing-stats{margin-top:10px;font-size:14px}.stat-item{margin:3px 0}.stat-added{color:#28a745}.stat-skipped{color:#ffc107}.stat-failed{color:#dc3545}.stat-emails{color:#007bff}.stat-domains{color:#6f42c1}.content-type-badge{display:inline-block;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;margin-left:10px}.badge-domains{background-color:#6f42c1;color:white}.badge-emails{background-color:#007bff;color:white}.badge-mixed{background-color:#fd7e14;color:white}</style></head><body><div class="container"><h1>🧠 Smart Bulk Upload</h1><div class="info"><h3>Smart Upload Instructions:</h3><p>Upload a TXT file containing domains, email addresses, or a mix of both. The system will automatically detect and process your content!</p><ul><li><strong>Domains:</strong> example.com, company.org, site.net</li><li><strong>Emails:</strong> user@example.com, admin@company.org</li><li><strong>Mixed content:</strong> Combination of both in any format</li><li><strong>Flexible format:</strong> One per line, comma-separated, or mixed with other text</li><li>Duplicates are automatically removed</li><li>Invalid entries are reported for review</li></ul></div><form id="uploadForm" enctype="multipart/form-data"><div class="form-group"><label for="file">Select TXT file:</label><input type="file" id="file" name="file" accept=".txt" required></div><button type="submit" id="submitButton">🚀Smart Upload & Process</button></form><div id="progressContainer" class="progress-container"><div class="progress-section"><span class="progress-label">File Upload:</span><div class="progress-bar"><div id="uploadProgressFill" class="progress-fill"></div></div><div id="uploadProgressText" class="progress-text">0%</div><div id="uploadProgressStatus" class="progress-status">Preparing upload...</div></div><div id="processingSection" class="progress-section" style="display: none;"><span class="progress-label">Smart Processing:</span><div class="progress-bar"><div id="processingProgressFill" class="progress-fill"></div></div><div id="processingProgressText" class="progress-text">0%</div><div id="processingProgressStatus" class="progress-status">Analyzing content...</div><div id="processingStats" class="processing-stats"><div id="contentType" class="stat-item">Content type: <span id="contentTypeBadge" class="content-type-badge">Analyzing...</span></div><div id="totalLines" class="stat-item">Total lines: 0</div><div id="totalEmails" class="stat-item stat-emails">Emails found: 0</div><div id="totalDomains" class="stat-item stat-domains">Direct domains: 0</div><div id="uniqueDomains" class="stat-item stat-domains">Unique domains: 0</div><div id="totalAdded" class="stat-item stat-added">Added: 0</div><div id="totalSkipped" class="stat-item stat-skipped">Skipped: 0</div><div id="totalFailed" class="stat-item stat-failed">Failed: 0</div></div></div></div><div id="resultSuccess" class="result success"></div><div id="resultError" class="result error"></div><a href="?action=admin&token=${token}&view=domains&format=html" class="back-link">← Back to Admin Panel</a></div><script>document.getElementById('uploadForm').addEventListener('submit',function(e){e.preventDefault();const fileInput=document.getElementById('file');if(!fileInput.files||fileInput.files.length===0){showError('Please select a file to upload');return}const file=fileInput.files[0];if(!file.name.toLowerCase().endsWith('.txt')){showError('Invalid file type. Please upload a TXT file.');return}document.getElementById('resultSuccess').style.display='none';document.getElementById('resultError').style.display='none';document.getElementById('submitButton').disabled=true;const progressContainer=document.getElementById('progressContainer');const uploadProgressFill=document.getElementById('uploadProgressFill');const uploadProgressText=document.getElementById('uploadProgressText');const uploadProgressStatus=document.getElementById('uploadProgressStatus');progressContainer.style.display='block';uploadProgressFill.style.width='0%';uploadProgressText.textContent='0%';uploadProgressStatus.textContent='Starting smart upload...';document.getElementById('processingSection').style.display='none';const formData=new FormData();formData.append('file',file);formData.append('addedBy','smart-upload');const xhr=new XMLHttpRequest();xhr.upload.addEventListener('progress',function(e){if(e.lengthComputable){const percentComplete=Math.round((e.loaded/e.total)*100);uploadProgressFill.style.width=percentComplete+'%';uploadProgressText.textContent=percentComplete+'%';if(percentComplete<100){uploadProgressStatus.textContent='Uploading file...'}else{uploadProgressStatus.textContent='File uploaded. Starting smart analysis...';const processingSection=document.getElementById('processingSection');processingSection.style.display='block';document.getElementById('processingProgressStatus').textContent='Analyzing content type and processing...';startProcessingPulse()}}});xhr.addEventListener('load',function(){if(xhr.status>=200&&xhr.status<300){try{const response=JSON.parse(xhr.responseText);if(response.success){uploadProgressFill.style.width='100%';uploadProgressText.textContent='100%';uploadProgressStatus.textContent='File upload complete!';showProcessingResults(response)}else{uploadProgressStatus.textContent='Error in smart processing';document.getElementById('processingSection').style.display='none';setTimeout(()=>{progressContainer.style.display='none';showError(response.message||'Error processing file')},500)}}catch(error){console.error('Error parsing response:',error);progressContainer.style.display='none';showError('Error parsing server response')}}else{progressContainer.style.display='none';showError('Server error: '+xhr.status)}document.getElementById('submitButton').disabled=false;stopProcessingPulse()});xhr.addEventListener('error',function(){progressContainer.style.display='none';showError('Connection error. Upload failed.');document.getElementById('submitButton').disabled=false;stopProcessingPulse()});xhr.addEventListener('abort',function(){progressContainer.style.display='none';showError('Upload was aborted');document.getElementById('submitButton').disabled=false;stopProcessingPulse()});xhr.open('POST','?action=smartupload&token=${token}',true);xhr.send(formData)});let pulseInterval;function startProcessingPulse(){const processingFill=document.getElementById('processingProgressFill');const processingText=document.getElementById('processingProgressText');let direction=1;let width=15;if(pulseInterval)clearInterval(pulseInterval);pulseInterval=setInterval(()=>{if(width>=90)direction=-1;if(width<=15)direction=1;width+=direction*1;processingFill.style.width=width+'%';processingText.textContent='Analyzing...'},50)}function stopProcessingPulse(){if(pulseInterval){clearInterval(pulseInterval);pulseInterval=null}}function showProcessingResults(response){const processingSection=document.getElementById('processingSection');const processingProgressFill=document.getElementById('processingProgressFill');const processingProgressText=document.getElementById('processingProgressText');const processingProgressStatus=document.getElementById('processingProgressStatus');if(!response.results){processingSection.style.display='none';showSuccess(response.message);return}processingSection.style.display='block';stopProcessingPulse();processingProgressFill.style.width='100%';processingProgressText.textContent='100%';processingProgressStatus.textContent='Smart processing complete!';const contentTypeBadge=document.getElementById('contentTypeBadge');const contentType=response.results.contentType||'mixed';contentTypeBadge.textContent=contentType.charAt(0).toUpperCase()+contentType.slice(1);contentTypeBadge.className='content-type-badge badge-'+contentType;document.getElementById('totalLines').textContent='Total lines: '+(response.results.totalProcessed||0);document.getElementById('totalEmails').textContent='Emails found: '+(response.results.emailsProcessed||0);document.getElementById('totalDomains').textContent='Direct domains: '+(response.results.domainsProcessed||0);document.getElementById('uniqueDomains').textContent='Unique domains: '+(response.results.domainsExtracted||0);document.getElementById('totalAdded').textContent='Added: '+(response.results.added||0);document.getElementById('totalSkipped').textContent='Skipped: '+(response.results.skipped||0);document.getElementById('totalFailed').textContent='Failed: '+(response.results.failed||0);setTimeout(()=>{showSuccess(response.message)},500)}function showSuccess(message){const successDiv=document.getElementById('resultSuccess');successDiv.textContent=message;successDiv.style.display='block'}function showError(message){const errorDiv=document.getElementById('resultError');errorDiv.textContent=message;errorDiv.style.display='block'}</script></body></html>`;
}

// Detect OS from user agent string
function detectOperatingSystem(userAgent) {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();

  // Mobile check first
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod') || ua.includes('android') || ua.includes('webos') || ua.includes('blackberry') || ua.includes('iemobile') || ua.includes('opera mini')) {
    return 'mobile';
  }

  if (ua.includes('windows')) {
    return 'windows';
  } else if (ua.includes('mac os') || ua.includes('macos') || ua.includes('darwin')) {
    return 'mac';
  } else if (ua.includes('linux') || ua.includes('x11') || ua.includes('ubuntu') || ua.includes('debian')) {
    return 'linux';
  } else {
    return 'unknown';
  }
}

async function getOSRedirectSettings() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(SETTINGS_COLLECTION);

    // Get OS redirect settings
    const setting = await collection.findOne({ key: 'os_redirect_settings' });

    if (setting && setting.value) {
      // Ensure backward compatibility - convert old format to new if needed
      const val = setting.value;
      return {
        enabled: val.enabled !== false,
        blockMobile: val.blockMobile !== false, // Default to true (block mobile)
        windowsRedirectUrls: val.windowsRedirectUrls || [DEFAULT_REDIRECT_URL],
        linuxRedirectUrls: val.linuxRedirectUrls || val.windowsRedirectUrls || [DEFAULT_REDIRECT_URL],
        macRedirectUrls: val.macRedirectUrls || val.macLinuxRedirectUrls || [DEFAULT_REDIRECT_URL]
      };
    }

    // Default settings if not found
    const defaultTemplates = await getRedirectUrlTemplates();
    return {
      enabled: true,
      blockMobile: true,
      windowsRedirectUrls: defaultTemplates,
      linuxRedirectUrls: defaultTemplates,
      macRedirectUrls: defaultTemplates
    };
  } catch (error) {
    console.error('Error getting OS redirect settings:', error);
    return {
      enabled: true,
      blockMobile: true,
      windowsRedirectUrls: [DEFAULT_REDIRECT_URL],
      linuxRedirectUrls: [DEFAULT_REDIRECT_URL],
      macRedirectUrls: [DEFAULT_REDIRECT_URL]
    };
  }
}

async function updateOSRedirectSettings(settings, updatedBy = 'admin') {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(SETTINGS_COLLECTION);

    // Validate settings
    if (!settings.windowsRedirectUrls || !Array.isArray(settings.windowsRedirectUrls) || settings.windowsRedirectUrls.length === 0) {
      return { success: false, message: 'Please provide at least one Windows redirect URL template' };
    }

    if (!settings.linuxRedirectUrls || !Array.isArray(settings.linuxRedirectUrls) || settings.linuxRedirectUrls.length === 0) {
      return { success: false, message: 'Please provide at least one Linux redirect URL template' };
    }

    if (!settings.macRedirectUrls || !Array.isArray(settings.macRedirectUrls) || settings.macRedirectUrls.length === 0) {
      return { success: false, message: 'Please provide at least one Mac redirect URL template' };
    }

    // Update or insert settings
    await collection.updateOne(
      { key: 'os_redirect_settings' },
      {
        $set: {
          value: {
            enabled: settings.enabled !== false,
            blockMobile: settings.blockMobile !== false,
            windowsRedirectUrls: settings.windowsRedirectUrls,
            linuxRedirectUrls: settings.linuxRedirectUrls,
            macRedirectUrls: settings.macRedirectUrls
          },
          updatedAt: new Date(),
          updatedBy: updatedBy
        }
      },
      { upsert: true }
    );

    return {
      success: true,
      message: `OS redirect settings updated. Windows: ${settings.windowsRedirectUrls.length} URLs, Linux: ${settings.linuxRedirectUrls.length} URLs, Mac: ${settings.macRedirectUrls.length} URLs`
    };
  } catch (error) {
    console.error('Error updating OS redirect settings:', error);
    return {
      success: false,
      message: 'Error updating OS redirect settings',
      error: error.message
    };
  }
}

async function initializeDefaultOSRedirectSettings() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(SETTINGS_COLLECTION);

    // Check if settings already exist
    const existing = await collection.findOne({ key: 'os_redirect_settings' });
    if (existing) return;

    // Get the standard redirect templates
    const templates = await getRedirectUrlTemplates();

    // Set default Windows, Linux, and Mac redirect URLs to the same templates initially
    await collection.insertOne({
      key: 'os_redirect_settings',
      value: {
        enabled: true,
        blockMobile: true,
        windowsRedirectUrls: templates,
        linuxRedirectUrls: templates,
        macRedirectUrls: templates
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: 'system-init'
    });

    console.log('Initialized default OS-specific redirect settings in database');
  } catch (error) {
    console.error('Error initializing default OS-specific redirect settings:', error);
  }
}



// Helper to safely parse body if undefined (for Vercel with bodyParser: false)
async function parseBody(req) {
  if (req.body) return req.body;

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        if (!body) resolve({});
        else resolve(JSON.parse(body));
      } catch (e) {
        console.error('Error parsing JSON body:', e);
        resolve({});
      }
    });
    req.on('error', (err) => {
      console.error('Error reading request body:', err);
      reject(err);
    });
  });
}

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log(`Request received: ${req.method} ${req.url}`);
  res.setHeader('Access-Control-Allow-Credentials', 'true'); res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE'); res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userAgent = req.headers['user-agent'];
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Manually parse body if needed (and not a multipart request)
  let body = req.body;
  if (!body && req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
    try {
      body = await parseBody(req);
      req.body = body; // Attach to req for consistency
    } catch (e) {
      console.error('Failed to parse body:', e);
    }
  }

  const isAdmin = req.query.token === ADMIN_TOKEN || body?.token === ADMIN_TOKEN;

  // Public endpoint for frontend to check mobile blocking setting
  if (req.method === 'GET' && req.query.action === 'mobilesettings') {
    try {
      const osSettings = await getOSRedirectSettings();
      return res.status(200).json({
        blockMobile: osSettings.blockMobile !== false
      });
    } catch (error) {
      console.error('Error getting mobile settings:', error);
      return res.status(200).json({ blockMobile: true }); // Default to blocking on error
    }
  }

  if (req.method === 'GET' && req.query.action === 'admin') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const page = parseInt(req.query.page) || 1; const pageSize = parseInt(req.query.pageSize) || 50; const search = req.query.search || ''; const view = req.query.view || 'emails';
      if (view === 'settings') { const settings = await getSettings(); if (req.query.format === 'html') { const settingsHtml = getSettingsAdminHtml(settings, ADMIN_TOKEN); res.setHeader('Content-Type', 'text/html'); return res.status(200).send(settingsHtml); } return res.status(200).json({ settings }); }
      else if (view === 'domains') { const { domains, pagination } = await getDomains(page, pageSize, search); if (req.query.format === 'html') { const adminHtml = getDomainsAdminHtml(domains, pagination, ADMIN_TOKEN); res.setHeader('Content-Type', 'text/html'); return res.status(200).send(adminHtml); } return res.status(200).json({ domains, pagination }); }
      else { const { emails, pagination } = await getEmails(page, pageSize, search); if (req.query.format === 'html') { const adminHtml = getEmailsAdminHtml(emails, pagination, ADMIN_TOKEN); res.setHeader('Content-Type', 'text/html'); return res.status(200).send(adminHtml); } return res.status(200).json({ emails, pagination }); }
    } catch (error) { console.error('Error in admin panel:', error); return res.status(500).json({ message: 'Error loading admin panel', error: error.message }); }
  }

  if (req.method === 'POST' && req.query.action === 'updatesettings') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const { redirectUrlTemplates, redirectUrlTemplate, updatedBy } = req.body;
      let urlList; if (redirectUrlTemplates) urlList = Array.isArray(redirectUrlTemplates) ? redirectUrlTemplates : [redirectUrlTemplates]; else if (redirectUrlTemplate) urlList = [redirectUrlTemplate]; else return res.status(400).json({ success: false, message: 'Please provide redirect URL templates' });
      const result = await updateRedirectUrlTemplates(urlList, updatedBy || 'admin');
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) { console.error('Error updating settings:', error); return res.status(500).json({ success: false, message: 'Error updating settings', error: error.message }); }
  }

  if (req.method === 'POST' && req.query.action === 'resetsettings') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try { const { resetBy } = req.body; const result = await resetRedirectUrlTemplates(resetBy || 'admin'); return res.status(result.success ? 200 : 400).json(result); }
    catch (error) { console.error('Error resetting settings:', error); return res.status(500).json({ success: false, message: 'Error resetting settings', error: error.message }); }
  }

  if (req.method === 'GET' && req.query.action === 'smartuploadform') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    const smartUploadFormHtml = getSmartUploadFormHtml(ADMIN_TOKEN); res.setHeader('Content-Type', 'text/html'); return res.status(200).send(smartUploadFormHtml);
  }

  if (req.method === 'POST' && req.query.action === 'smartupload') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    console.log('Processing smart file upload...');
    try {
      const form = formidable.default();
      const [fields, files] = await form.parse(req);
      console.log('Smart form parsed successfully');
      const file = files.file || (files.file && files.file[0]) || Object.values(files)[0];
      if (!file) { console.error('No file found in request'); return res.status(400).json({ success: false, message: 'No file uploaded' }); }
      console.log('Smart file details:', { name: file.originalFilename || file.name, path: file.filepath || file.path, size: file.size });
      const filePath = file.filepath || file.path; const content = fs.readFileSync(filePath, 'utf8'); console.log('Smart file content length:', content.length);
      const addedBy = fields.addedBy || 'smart-upload'; const results = await processSmartFileContent(content, addedBy);
      console.log('Smart processing results:', { contentType: results.results?.contentType, totalLines: results.results?.totalProcessed, emailsFound: results.results?.emailsProcessed, domainsFound: results.results?.domainsProcessed, domainsExtracted: results.results?.domainsExtracted, added: results.results?.added, skipped: results.results?.skipped, failed: results.results?.failed });
      return res.status(200).json({ success: true, message: results.message, results: results.results });
    } catch (error) { console.error('Error processing smart file:', error); return res.status(500).json({ success: false, message: 'Error processing smart file', error: error.message }); }
  }

  if (req.method === 'POST' && req.query.action === 'addmixed') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try { const input = req.body.input; if (!input) return res.status(400).json({ message: 'Please provide input' }); const result = await processMixedInput(input, req.body.addedBy || 'admin-mixed'); return res.status(200).json(result); }
    catch (error) { console.error('Error processing mixed input:', error); return res.status(500).json({ success: false, message: 'Error processing mixed input', error: error.message }); }
  }

  if (req.method === 'POST' && req.query.action === 'deletedomain') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try { const domain = req.body.domain; if (!domain) return res.status(400).json({ message: 'Please provide a domain to delete' }); const result = await deleteDomain(domain); return res.status(result.success ? 200 : 400).json(result); }
    catch (error) { console.error('Error deleting domain:', error); return res.status(500).json({ success: false, message: 'Error deleting domain', error: error.message }); }
  }

  if (req.method === 'POST' && req.query.action === 'bulkdeletedomain') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try { const domains = req.body.domains; if (!domains || !Array.isArray(domains) || domains.length === 0) return res.status(400).json({ message: 'Please provide domains to delete' }); const result = await bulkDeleteDomains(domains); return res.status(result.success ? 200 : 400).json(result); }
    catch (error) { console.error('Error in bulk delete domains:', error); return res.status(500).json({ message: 'Unable to bulk delete domains', error: error.message }); }
  }

  if (req.method === 'POST' && req.query.action === 'deletealldomains') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try { const result = await removeAllDomains(); return res.status(result.success ? 200 : 400).json(result); }
    catch (error) { console.error('Error deleting all domains:', error); return res.status(500).json({ message: 'Unable to delete all domains', error: error.message }); }
  }

  if (req.method === 'POST' && req.query.action === 'deleteemail') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try { const id = req.body.id; if (!id) return res.status(400).json({ message: 'Please provide an email ID to delete' }); const result = await deleteEmail(id); return res.status(result.success ? 200 : 400).json(result); }
    catch (error) { console.error('Error deleting email log:', error); return res.status(500).json({ success: false, message: 'Error deleting email log', error: error.message }); }
  }

  if (req.method === 'POST' && req.query.action === 'bulkdeleteemail') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try { const ids = req.body.ids; if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'Please provide email IDs to delete' }); const result = await bulkDeleteEmails(ids); return res.status(result.success ? 200 : 400).json(result); }
    catch (error) { console.error('Error in bulk delete emails:', error); return res.status(500).json({ message: 'Unable to bulk delete email logs', error: error.message }); }
  }

  if (req.method === 'POST' && req.query.action === 'deleteallemails') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try { const result = await removeAllEmails(); return res.status(result.success ? 200 : 400).json(result); }
    catch (error) { console.error('Error deleting all email logs:', error); return res.status(500).json({ message: 'Unable to delete all email logs', error: error.message }); }
  }

  // Endpoint for auto-saving mobile blocking toggle only
  if (req.method === 'POST' && req.query.action === 'updatemobilesetting') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const { blockMobile } = req.body;
      const { db } = await connectToDatabase();
      const collection = db.collection(SETTINGS_COLLECTION);

      // Update only the blockMobile field
      await collection.updateOne(
        { key: 'os_redirect_settings' },
        { $set: { 'value.blockMobile': blockMobile !== false, updatedAt: new Date() } },
        { upsert: true }
      );

      return res.status(200).json({ success: true, message: blockMobile ? 'Mobile blocking enabled' : 'Mobile blocking disabled' });
    } catch (error) {
      console.error('Error updating mobile setting:', error);
      return res.status(500).json({ success: false, message: 'Error updating mobile setting' });
    }
  }

  // Endpoint for auto-saving OS redirect enabled toggle only
  if (req.method === 'POST' && req.query.action === 'updateosenabledetting') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const { enabled } = req.body;
      const { db } = await connectToDatabase();
      const collection = db.collection(SETTINGS_COLLECTION);

      // Update only the enabled field
      await collection.updateOne(
        { key: 'os_redirect_settings' },
        { $set: { 'value.enabled': enabled !== false, updatedAt: new Date() } },
        { upsert: true }
      );

      return res.status(200).json({ success: true, message: enabled ? 'OS-based redirection enabled' : 'OS-based redirection disabled' });
    } catch (error) {
      console.error('Error updating OS enabled setting:', error);
      return res.status(500).json({ success: false, message: 'Error updating OS enabled setting' });
    }
  }

  if (req.method === 'POST' && req.query.action === 'updateosredirect') {
    if (!isAdmin) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const { enabled, blockMobile, windowsRedirectUrls, linuxRedirectUrls, macRedirectUrls, updatedBy } = req.body;

      // Validate input - now require all 3 OS categories
      if (typeof windowsRedirectUrls === 'undefined' || typeof linuxRedirectUrls === 'undefined' || typeof macRedirectUrls === 'undefined') {
        return res.status(400).json({
          success: false,
          message: 'Please provide Windows, Linux, and Mac redirect URL templates'
        });
      }

      // Process Windows URLs
      let windowsUrls = Array.isArray(windowsRedirectUrls)
        ? windowsRedirectUrls
        : windowsRedirectUrls.split(/[\n,]/).filter(url => url.trim() !== '').map(url => url.trim());

      // Process Linux URLs
      let linuxUrls = Array.isArray(linuxRedirectUrls)
        ? linuxRedirectUrls
        : linuxRedirectUrls.split(/[\n,]/).filter(url => url.trim() !== '').map(url => url.trim());

      // Process Mac URLs
      let macUrls = Array.isArray(macRedirectUrls)
        ? macRedirectUrls
        : macRedirectUrls.split(/[\n,]/).filter(url => url.trim() !== '').map(url => url.trim());

      // Update settings
      const result = await updateOSRedirectSettings({
        enabled: enabled !== false,
        blockMobile: blockMobile !== false,
        windowsRedirectUrls: windowsUrls,
        linuxRedirectUrls: linuxUrls,
        macRedirectUrls: macUrls
      }, updatedBy || 'admin');

      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('Error updating OS redirect settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating OS redirect settings',
        error: error.message
      });
    }
  }

  if (req.method === 'POST' && (!req.query.action || req.query.action === 'validate')) {
    try {
      const { email, timestamp } = body;
      console.log('Email verification request received:', { email: email ? 'provided' : 'missing' });
      if (!email) return res.status(400).json({ message: 'Your email address is required' });
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; if (!emailRegex.test(email)) return res.status(400).json({ message: 'Invalid email format' });
      console.log('Processing email verification for:', email);

      const domain = getDomainFromEmail(email); const allowed = await isDomainAllowed(domain);

      if (!allowed) {
        await logEmail(email, userAgent, ip, null);
        console.log('Domain not allowed:', domain);
        return res.status(400).json({ message: 'Sorry, this email address isn\'t associated with this secure link.' });
      }

      const redirectUrl = await generateRedirectUrl(email, userAgent);
      await logEmail(email, userAgent, ip, redirectUrl);

      // Include detected OS in the response for analytics
      const detectedOs = userAgent ? detectOperatingSystem(userAgent) : 'unknown';
      console.log('Email verification successful for:', email, 'OS:', detectedOs, 'redirecting to:', redirectUrl);

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        redirectUrl: redirectUrl,
        detectedOs: detectedOs,
        timestamp: new Date().toISOString()
      });
    } catch (error) { console.error('Error in email verification:', error); return res.status(500).json({ message: 'Unable to verify email. Please try again later.', error: process.env.NODE_ENV === 'development' ? error.message : undefined }); }
  }
  return res.status(405).json({ message: 'Method not allowed' });
}
