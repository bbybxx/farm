// Vercel Serverless Function for Bug Reports
// This handles multipart/form-data with file uploads

export const config = {
  api: {
    bodyParser: false, // Disable default body parser to handle multipart
  },
};

export default async function handler(req, res) {
  // Enable CORS
  const origin = req.headers.origin || '*';
  const isAllowedOrigin = 
    !origin || 
    origin === 'null' ||
    origin.includes('localhost') ||
    origin.includes('craft-calculator.com') ||
    origin.includes('farmcraftcalculator.infy.uk') ||
    origin.includes('vercel.app');

  res.setHeader('Access-Control-Allow-Origin', isAllowedOrigin ? (origin === 'null' ? '*' : origin) : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const CHAT_ID = process.env.CHAT_ID;

    if (!BOT_TOKEN) {
      console.error('BOT_TOKEN not configured');
      return res.status(500).json({ success: false, error: 'Bot not configured' });
    }

    if (!CHAT_ID) {
      console.warn('CHAT_ID not configured');
      return res.status(500).json({ success: false, error: 'Chat not configured' });
    }

    // Parse multipart form data manually using formidable
    const formidable = (await import('formidable')).default;
    const form = formidable({
      maxFileSize: 20 * 1024 * 1024, // 20MB
      maxFiles: 8,
      keepExtensions: true,
      multiples: true, // Allow multiple files with same field name
    });

    // In formidable v3, parse returns array [fields, files]
    let fields, files;
    
    try {
      const result = await new Promise((resolve, reject) => {
        form.parse(req, (err, parsedFields, parsedFiles) => {
          if (err) {
            console.error('Formidable parse error:', err);
            reject(err);
          } else {
            console.log('Formidable parsed successfully');
            console.log('Fields:', JSON.stringify(parsedFields, null, 2));
            console.log('Files structure:', JSON.stringify(
              Object.keys(parsedFiles || {}).reduce((acc, key) => {
                const fileData = parsedFiles[key];
                if (Array.isArray(fileData)) {
                  acc[key] = fileData.map(f => ({
                    name: f.originalFilename,
                    size: f.size,
                    type: f.mimetype,
                    path: f.filepath
                  }));
                } else if (fileData) {
                  acc[key] = {
                    name: fileData.originalFilename,
                    size: fileData.size,
                    type: fileData.mimetype,
                    path: fileData.filepath
                  };
                }
                return acc;
              }, {}),
              null,
              2
            ));
            resolve({ fields: parsedFields, files: parsedFiles });
          }
        });
      });
      
      fields = result.fields;
      files = result.files;
    } catch (parseError) {
      console.error('Failed to parse form data:', parseError);
      return res.status(400).json({ success: false, error: 'Failed to parse form data', details: parseError.message });
    }

    // Extract data
    const message = Array.isArray(fields.message) ? fields.message[0] : fields.message;
    const metadataStr = Array.isArray(fields.metadata) ? fields.metadata[0] : fields.metadata;
    
    let metadata = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (e) {
        console.warn('Failed to parse metadata:', e);
      }
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // Format bug report message
    let telegramMessage = `Bug Report\n\n`;
    
    if (metadata.user) {
      telegramMessage += `User: ${metadata.user.first_name || 'Unknown'}`;
      if (metadata.user.last_name) telegramMessage += ` ${metadata.user.last_name}`;
      if (metadata.user.username) telegramMessage += ` (@${metadata.user.username})`;
      telegramMessage += `\n`;
    }
    
    telegramMessage += `Time: ${metadata.timestamp ? new Date(metadata.timestamp).toLocaleString() : new Date().toLocaleString()}\n`;
    telegramMessage += `URL: ${metadata.url || 'N/A'}\n`;
    telegramMessage += `Platform: ${metadata.platform || 'Unknown'}\n`;
    telegramMessage += `Viewport: ${metadata.viewport || 'Unknown'}\n`;
    telegramMessage += `Language: ${metadata.language || 'Unknown'}\n`;
    telegramMessage += `Online: ${metadata.onLine ? 'Yes' : 'No'}\n\n`;
    telegramMessage += `Report:\n${message.trim()}`;

    // Send files first if any
    // formidable v3+ returns files in format: { fieldName: File | File[] }
    // We're appending with form.append('files', file) on client, so check files.files
    let uploadedFiles = [];
    
    if (files.files) {
      uploadedFiles = Array.isArray(files.files) ? files.files : [files.files];
      console.log('Found files.files:', uploadedFiles.length);
    } else {
      console.log('files.files not found, checking all keys...');
      // Fallback: check all keys in files object
      Object.keys(files).forEach(key => {
        const fileOrFiles = files[key];
        if (Array.isArray(fileOrFiles)) {
          console.log(`  Found ${fileOrFiles.length} files under key "${key}"`);
          uploadedFiles.push(...fileOrFiles);
        } else if (fileOrFiles) {
          console.log(`  Found 1 file under key "${key}"`);
          uploadedFiles.push(fileOrFiles);
        }
      });
    }
    
    console.log('Total uploaded files to process:', uploadedFiles.length);
    
    if (uploadedFiles.length > 0) {
      const fs = await import('fs');

      for (const file of uploadedFiles) {
        try {
          // Ensure file has required properties
          if (!file || !file.filepath) {
            console.error('Invalid file object:', file);
            continue;
          }

          // Detect if image or document
          const isImage = file.mimetype && file.mimetype.startsWith('image/');
          const endpoint = isImage ? 'sendPhoto' : 'sendDocument';
          const fieldName = isImage ? 'photo' : 'document';
          
          // Get filename from originalFilename or newFilename
          const filename = file.originalFilename || file.newFilename || 'file';
          
          console.log(`Uploading file: ${filename} (${file.size} bytes) to ${endpoint}`);
          
          // Read file as Buffer
          const fileBuffer = fs.readFileSync(file.filepath);
          console.log(`Buffer created: ${fileBuffer.length} bytes`);
          
          // Create Blob from Buffer (for native FormData)
          const blob = new Blob([fileBuffer], { 
            type: file.mimetype || 'application/octet-stream' 
          });
          console.log(`Blob created: ${blob.size} bytes, type: ${blob.type}`);
          
          // Use native FormData (Node.js 18+)
          const formData = new FormData();
          formData.append('chat_id', CHAT_ID);
          formData.append(fieldName, blob, filename);
          
          console.log(`FormData ready with ${fieldName} field`);
          
          const uploadResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
            method: 'POST',
            body: formData,
            // DON'T set Content-Type header - let fetch/FormData handle it automatically
          });

          console.log(`Upload response status: ${uploadResponse.status}`);
          
          const responseText = await uploadResponse.text();
          console.log(`Upload response body length: ${responseText.length}`);
          
          if (responseText.length > 0) {
            console.log(`Upload response text: ${responseText}`);
          }
          
          let uploadResult;
          try {
            uploadResult = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Failed to parse Telegram response:', responseText);
            throw parseError;
          }
          
          if (!uploadResult.ok) {
            console.error('Telegram upload failed:', uploadResult);
          } else {
            console.log('File uploaded successfully to Telegram');
          }

          // Clean up temp file
          try {
            fs.unlinkSync(file.filepath);
          } catch (cleanupErr) {
            console.error('Failed to cleanup temp file:', cleanupErr);
          }
        } catch (uploadErr) {
          console.error('Failed to upload file:', uploadErr);
          // Continue with other files even if one fails
        }
      }
    }

    // Send main message
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: telegramMessage,
        parse_mode: 'HTML',
      }),
    });

    const result = await response.json();

    if (result.ok) {
      return res.status(200).json({ success: true, message: 'Bug report sent' });
    } else {
      console.error('Telegram API error:', result);
      return res.status(500).json({ success: false, error: result.description || 'Failed to send' });
    }

  } catch (error) {
    console.error('Bug report error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
