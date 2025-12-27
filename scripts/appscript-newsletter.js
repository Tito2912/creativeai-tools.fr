/**
 * Google Apps Script for Newsletter Subscriptions
 * Deploy as Web App to handle form submissions from CreativeAI Tools
 */

// Configuration
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE', // Replace with your Google Sheet ID
  SHEET_NAME: 'Subscriptions',
  SECRET_KEY: 'YOUR_SECRET_KEY', // Optional: for additional security
  MAX_REQUESTS_PER_MINUTE: 100
};

// Main function to handle POST requests
function doPost(e) {
  try {
    // Validate request
    if (!validateRequest(e)) {
      return createResponse(400, { error: 'Invalid request' });
    }
    
    // Parse and validate data
    const data = parseData(e);
    if (!data || !data.email) {
      return createResponse(400, { error: 'Invalid data' });
    }
    
    // Check rate limiting
    if (!checkRateLimit(data.email)) {
      return createResponse(429, { error: 'Too many requests' });
    }
    
    // Save to Google Sheets
    const result = saveToSheet(data);
    
    if (result.success) {
      // Optional: Send confirmation email
      sendConfirmationEmail(data);
      
      return createResponse(200, { 
        success: true, 
        message: 'Subscription saved successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      return createResponse(500, { error: 'Failed to save subscription' });
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}

// Handle GET requests (for testing)
function doGet(e) {
  return createResponse(200, { 
    message: 'Newsletter endpoint is running',
    timestamp: new Date().toISOString(),
    version: '1.0'
  });
}

/**
 * Validate incoming request
 */
function validateRequest(e) {
  // Check if it's a POST request
  if (e.postData === undefined) {
    return false;
  }
  
  // Optional: Add origin validation
  // const validOrigins = ['https://creativeai-tools.fr', 'https://www.creativeai-tools.fr'];
  // if (!validOrigins.includes(e.parameter.origin)) {
  //   return false;
  // }
  
  return true;
}

/**
 * Parse and validate form data
 */
function parseData(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Basic validation
    if (!data.email || !isValidEmail(data.email)) {
      return null;
    }
    
    // Clean and structure data
    return {
      timestamp: data.timestamp || new Date().toISOString(),
      email: data.email.toLowerCase().trim(),
      page: data.page || 'unknown',
      lang: data.lang || 'en',
      utm_source: data.utm_source || 'direct',
      consent: Boolean(data.consent),
      ip: getClientIP(e),
      user_agent: e.parameter['User-Agent'] || 'unknown'
    };
    
  } catch (error) {
    console.error('Error parsing data:', error);
    return null;
  }
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Basic rate limiting
 */
function checkRateLimit(email) {
  const cache = CacheService.getScriptCache();
  const key = 'rate_limit_' + email;
  const requests = cache.get(key);
  
  if (requests && parseInt(requests) >= 3) { // Max 3 requests per hour per email
    return false;
  }
  
  cache.put(key, (parseInt(requests) || 0) + 1, 3600); // 1 hour cache
  return true;
}

/**
 * Save subscription data to Google Sheets
 */
function saveToSheet(data) {
  try {
    const sheet = getSheet();
    
    // Check if email already exists
    if (isDuplicateEmail(sheet, data.email)) {
      return { success: true, message: 'Email already subscribed' };
    }
    
    // Prepare row data
    const rowData = [
      data.timestamp,
      data.email,
      data.page,
      data.lang,
      data.utm_source,
      data.consent,
      data.ip,
      data.user_agent,
      'pending' // status
    ];
    
    // Append to sheet
    sheet.appendRow(rowData);
    
    // Apply formatting to new row
    const lastRow = sheet.getLastRow();
    const range = sheet.getRange(lastRow, 1, 1, rowData.length);
    
    // Set basic formatting
    range.setHorizontalAlignment('left');
    range.setVerticalAlignment('middle');
    
    return { success: true };
    
  } catch (error) {
    console.error('Error saving to sheet:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Get or create the spreadsheet sheet
 */
function getSheet() {
  let spreadsheet;
  
  try {
    spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } catch (error) {
    // Create new spreadsheet if doesn't exist
    spreadsheet = createNewSpreadsheet();
  }
  
  let sheet = spreadsheet.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.SHEET_NAME);
    initializeSheet(sheet);
  }
  
  return sheet;
}

/**
 * Create a new spreadsheet with proper structure
 */
function createNewSpreadsheet() {
  const spreadsheet = SpreadsheetApp.create('CreativeAI Tools Newsletter Subscriptions');
  const sheet = spreadsheet.getActiveSheet();
  
  initializeSheet(sheet);
  
  // Store the new spreadsheet ID for future use
  // You might want to save this somewhere permanent
  console.log('New spreadsheet created with ID:', spreadsheet.getId());
  
  return spreadsheet;
}

/**
 * Initialize sheet with headers and formatting
 */
function initializeSheet(sheet) {
  const headers = [
    'Timestamp',
    'Email',
    'Page',
    'Language',
    'UTM Source',
    'Consent Given',
    'IP Address',
    'User Agent',
    'Status'
  ];
  
  // Set headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4f46e5');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  
  // Set column widths
  sheet.setColumnWidth(1, 180); // Timestamp
  sheet.setColumnWidth(2, 250); // Email
  sheet.setColumnWidth(3, 150); // Page
  sheet.setColumnWidth(4, 100); // Language
  sheet.setColumnWidth(5, 120); // UTM Source
  sheet.setColumnWidth(6, 100); // Consent
  sheet.setColumnWidth(7, 120); // IP
  sheet.setColumnWidth(8, 200); // User Agent
  sheet.setColumnWidth(9, 100); // Status
  
  // Freeze header row
  sheet.setFrozenRows(1);
}

/**
 * Check for duplicate email addresses
 */
function isDuplicateEmail(sheet, email) {
  const data = sheet.getDataRange().getValues();
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] && data[i][1].toLowerCase() === email.toLowerCase()) {
      return true;
    }
  }
  
  return false;
}

/**
 * Send confirmation email (optional)
 */
function sendConfirmationEmail(data) {
  try {
    const subject = data.lang === 'fr' 
      ? 'Confirmation de votre inscription - CreativeAI Tools'
      : 'Subscription Confirmation - CreativeAI Tools';
    
    const htmlBody = data.lang === 'fr' 
      ? createFrenchEmailTemplate(data)
      : createEnglishEmailTemplate(data);
    
    MailApp.sendEmail({
      to: data.email,
      subject: subject,
      htmlBody: htmlBody,
      name: 'CreativeAI Tools'
    });
    
    console.log('Confirmation email sent to:', data.email);
    
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}

/**
 * Create English email template
 */
function createEnglishEmailTemplate(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Welcome to CreativeAI Tools!</h2>
      <p>Thank you for subscribing to our newsletter. You'll now receive:</p>
      <ul>
        <li>Weekly AI video tips and strategies</li>
        <li>New tool announcements and reviews</li>
        <li>Exclusive content creation insights</li>
      </ul>
      <p><strong>What to expect:</strong></p>
      <p>We send 1-2 emails per week with actionable advice for content creators. No spam, just valuable insights.</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Subscription Details:</strong></p>
        <p>Email: ${data.email}</p>
        <p>Language: English</p>
        <p>Date: ${new Date().toLocaleDateString('en-US')}</p>
      </div>
      <p>If you didn't subscribe or wish to unsubscribe, please <a href="https://creativeai-tools.fr/unsubscribe?email=${encodeURIComponent(data.email)}">click here</a>.</p>
      <hr>
      <p style="color: #6b7280; font-size: 12px;">
        CreativeAI Tools · Honest AI tool reviews for content creators<br>
        <a href="https://creativeai-tools.fr">Visit our website</a>
      </p>
    </div>
  `;
}

/**
 * Create French email template
 */
function createFrenchEmailTemplate(data) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Bienvenue chez CreativeAI Tools !</h2>
      <p>Merci de vous être abonné à notre newsletter. Vous recevrez désormais :</p>
      <ul>
        <li>Des conseils hebdomadaires sur la vidéo IA</li>
        <li>Des annonces de nouveaux outils et avis</li>
        <li>Des insights exclusifs sur la création de contenu</li>
      </ul>
      <p><strong>À quoi s'attendre :</strong></p>
      <p>Nous envoyons 1-2 emails par semaine avec des conseils actionnables pour les créateurs de contenu. Pas de spam, juste des insights précieux.</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Détails de l'abonnement :</strong></p>
        <p>Email : ${data.email}</p>
        <p>Langue : Français</p>
        <p>Date : ${new Date().toLocaleDateString('fr-FR')}</p>
      </div>
      <p>Si vous ne vous êtes pas abonné ou souhaitez vous désabonner, <a href="https://creativeai-tools.fr/fr/desabonnement?email=${encodeURIComponent(data.email)}">cliquez ici</a>.</p>
      <hr>
      <p style="color: #6b7280; font-size: 12px;">
        CreativeAI Tools · Avis honnêtes d'outils IA pour créateurs de contenu<br>
        <a href="https://creativeai-tools.fr/fr">Visitez notre site</a>
      </p>
    </div>
  `;
}

/**
 * Get client IP address
 */
function getClientIP(e) {
  // This is a simplified version - actual IP detection may vary
  return e.parameter['X-Forwarded-For'] || 
         e.parameter['X-Real-IP'] || 
         'unknown';
}

/**
 * Create standardized response
 */
function createResponse(statusCode, data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    });
}

/**
 * Utility function to test the script
 */
function testScript() {
  const testData = {
    email: 'test@example.com',
    page: '/test',
    lang: 'en',
    utm_source: 'test',
    consent: true
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    },
    parameter: {
      'User-Agent': 'Test Script'
    }
  };
  
  const result = doPost(mockEvent);
  console.log('Test result:', result);
}