import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import multer from 'multer';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// CORS configuration
// Allow explicit origins from env or sensible defaults and also allow native/app origins
const envOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
const defaultOrigins = ['http://localhost:5173', 'http://localhost', 'http://127.0.0.1'];
const allowedOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

// Custom CORS handler so we can echo back the Origin header for file:// / null origins
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Accept if origin is in allowed list, or if origin is 'null' (file://) or capacitor app origin
  if (!origin) {
    // No origin header (native WebView or same-origin requests) - allow
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    return next();
  }

  const normalized = origin.trim();
  const isAllowed = allowedOrigins.includes(normalized)
    || normalized === 'null'
    || normalized.endsWith('.vercel.app');

  if (isAllowed) {
    // Echo origin to be stricter than wildcard when Origin present
    res.setHeader('Access-Control-Allow-Origin', normalized === 'null' ? '*' : normalized);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight quickly
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Multer for multipart/form-data (attachments)
const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB per file
    files: 8
  }
});

// Telegram Bot API helper function
async function sendTelegramMessage(chatId, message, parseMode = 'HTML') {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: parseMode,
    disable_web_page_preview: true
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    throw error;
  }
}

// Format bug report message for Telegram
function formatBugReport(data) {
  const { 
    message, user, timestamp, url, userAgent, 
    viewport, screen, language, platform, onLine, 
    cookieEnabled, timezone, isInTelegram, telegramVersion, telegramPlatform 
  } = data;
  
  let formattedMessage = `🐛 <b>Bug Report</b>\n\n`;
  
  // User info
  if (user) {
    formattedMessage += `👤 <b>User:</b> ${user.first_name || 'Unknown'}`;
    if (user.last_name) formattedMessage += ` ${user.last_name}`;
    if (user.username) formattedMessage += ` (@${user.username})`;
    formattedMessage += `\n`;
    if (user.id) formattedMessage += `🆔 <b>User ID:</b> <code>${user.id}</code>\n`;
    if (user.language_code) formattedMessage += `🌍 <b>User Language:</b> ${user.language_code}\n`;
  }
  
  // Timestamp and timezone
  if (timestamp) {
    const date = new Date(timestamp);
    formattedMessage += `⏰ <b>Time:</b> ${date.toLocaleString('en-US', { 
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })} UTC`;
    if (timezone) formattedMessage += ` (${timezone})`;
    formattedMessage += `\n`;
  }
  
  // URL
  if (url) {
    formattedMessage += `🔗 <b>URL:</b> <code>${url}</code>\n`;
  }
  
  // Platform and environment info
  formattedMessage += `\n� <b>Environment:</b>\n`;
  if (isInTelegram) {
    formattedMessage += `📱 <b>Platform:</b> Telegram Web App`;
    if (telegramVersion && telegramVersion !== 'N/A') formattedMessage += ` v${telegramVersion}`;
    if (telegramPlatform && telegramPlatform !== 'N/A') formattedMessage += ` (${telegramPlatform})`;
    formattedMessage += `\n`;
  } else {
    formattedMessage += `🌐 <b>Platform:</b> Web Browser\n`;
  }
  
  if (platform) formattedMessage += `🖥️ <b>OS:</b> ${platform}\n`;
  if (language) formattedMessage += `🌍 <b>Browser Language:</b> ${language}\n`;
  if (viewport) formattedMessage += `📐 <b>Viewport:</b> ${viewport}\n`;
  if (screen) formattedMessage += `🖼️ <b>Screen:</b> ${screen}\n`;
  if (typeof onLine === 'boolean') formattedMessage += `📶 <b>Online:</b> ${onLine ? 'Yes' : 'No'}\n`;
  if (typeof cookieEnabled === 'boolean') formattedMessage += `🍪 <b>Cookies:</b> ${cookieEnabled ? 'Enabled' : 'Disabled'}\n`;
  
  formattedMessage += `\n📝 <b>Report:</b>\n${message}`;
  
  // User agent (collapsed for readability)
  if (userAgent) {
    formattedMessage += `\n\n� <b>User Agent:</b>\n<code>${userAgent}</code>`;
  }
  
  return formattedMessage;
}

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Craft Calculator Bug Report Server',
    version: '1.0.0',
    endpoints: {
      test: '/test',
      health: '/health',
      botInfo: '/api/bot-info',
      bugReport: '/api/bug-report'
    }
  });
});

// Serve test page
app.get('/test', (req, res) => {
  res.sendFile(join(__dirname, 'test.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Bug report endpoint
// Accept either JSON or multipart/form-data with files
app.post('/api/bug-report', upload.array('files', 8), async (req, res) => {
  try {
    // If multipart/form-data was used, multer will populate req.files and req.body
    const isMultipart = Array.isArray(req.files) && req.files.length > 0;

    const bodySource = isMultipart ? req.body : req.body;

    // For multipart we may receive a 'metadata' field containing JSON
    let metadata = {};
    if (isMultipart && req.body?.metadata) {
      try { metadata = JSON.parse(req.body.metadata); } catch (e) { metadata = {}; }
    }

    const combined = Object.assign({}, metadata, bodySource);

    const { 
      type, message, user, timestamp, url, userAgent,
      viewport, screen, language, platform, onLine, 
      cookieEnabled, timezone, isInTelegram, telegramVersion, telegramPlatform
    } = combined;
    
    // Validate required fields
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    if (type !== 'bug_report') {
      return res.status(400).json({
        success: false,
        error: 'Invalid report type'
      });
    }
    
  // Check if bot token and chat ID are configured
  if (!BOT_TOKEN) {
      console.error('BOT_TOKEN not configured');
      return res.status(500).json({
        success: false,
        error: 'Bot not configured'
      });
    }
    
    if (!CHAT_ID) {
      console.warn('CHAT_ID not configured, bug report will be logged but not sent');
      console.log('Bug Report:', req.body);
      return res.json({
        success: true,
        message: 'Bug report logged (chat not configured)'
      });
    }
    
    // Format and send message with all available data
    const formattedMessage = formatBugReport({
      message: message.trim(),
      user,
      timestamp,
      url,
      userAgent,
      viewport,
      screen,
      language,
      platform,
      onLine,
      cookieEnabled,
      timezone,
      isInTelegram,
      telegramVersion,
      telegramPlatform
    });

    // If multipart and files exist, upload them first to Telegram
    if (isMultipart && Array.isArray(req.files) && req.files.length > 0) {
      console.log(`Uploading ${req.files.length} attachment(s) to Telegram...`);

      for (const file of req.files) {
        try {
          const form = new FormData();
          form.append('chat_id', CHAT_ID);

          // Decide between photo and document by mime type
          if (file.mimetype && file.mimetype.startsWith('image/')) {
            form.append('photo', file.buffer, {
              filename: file.originalname,
              contentType: file.mimetype
            });
            const uploadRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
              method: 'POST',
              body: form
            });
            const uploadJson = await uploadRes.json();
            if (!uploadJson.ok) console.warn('Telegram upload warning:', uploadJson.description || uploadJson);
          } else {
            form.append('document', file.buffer, {
              filename: file.originalname,
              contentType: file.mimetype
            });
            const uploadRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
              method: 'POST',
              body: form
            });
            const uploadJson = await uploadRes.json();
            if (!uploadJson.ok) console.warn('Telegram upload warning:', uploadJson.description || uploadJson);
          }
        } catch (uploadErr) {
          console.error('Failed to upload attachment to Telegram:', uploadErr);
        }
      }
    }

    const result = await sendTelegramMessage(CHAT_ID, formattedMessage);
    
    console.log('Bug report sent successfully:', {
      messageId: result.result.message_id,
      chatId: CHAT_ID,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Bug report sent successfully',
      telegramMessageId: result.result.message_id
    });
    
  } catch (error) {
    console.error('Error processing bug report:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send bug report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get bot info (for testing)
app.get('/api/bot-info', async (req, res) => {
  try {
    if (!BOT_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'Bot token not configured'
      });
    }
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const result = await response.json();
    
    if (!result.ok) {
      throw new Error(`Telegram API error: ${result.description}`);
    }
    
    res.json({
      success: true,
      bot: result.result
    });
    
  } catch (error) {
    console.error('Error getting bot info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GraphQL Proxy для buddy.farm API
app.post('/api/graphql', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Proxying GraphQL request to buddy.farm API...');
    }
    
    const response = await fetch('https://api.buddy.farm/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Craft Calculator Bot',
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Добавляем CORS заголовки для всех источников
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ GraphQL request successful, items received: ${data.data?.items?.length || 0}`);
    }
    res.json(data);
    
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ GraphQL proxy error:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to fetch from buddy.farm API',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Обработка OPTIONS запросов для CORS
app.options('/api/graphql', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.status(200).end();
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Craft Calculator Bug Report Server running on port ${PORT}`);
  console.log(`📱 Bot Token: ${BOT_TOKEN ? 'Configured' : 'Not configured'}`);
  console.log(`💬 Chat ID: ${CHAT_ID || 'Not configured'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS Origins: ${allowedOrigins.join(', ')}`);
});
