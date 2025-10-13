import { useEffect, useState } from 'react';

const tg = window.Telegram?.WebApp;

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState(null);
  const [themeParams, setThemeParams] = useState(null);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      
      // Set theme
      if (tg.themeParams) {
        setThemeParams(tg.themeParams);
      }

      // Set user info
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user);
      }

      // Enable closing confirmation
      tg.enableClosingConfirmation();

      // Set main button
      tg.MainButton.setText('Share Results');
      tg.MainButton.color = '#79c0ff';
      tg.MainButton.textColor = '#000000';

      setIsReady(true);
    } else {
      // Fallback for non-Telegram environment
      setIsReady(true);
    }
  }, []);

  const showMainButton = () => {
    if (tg?.MainButton) {
      tg.MainButton.show();
    }
  };

  const hideMainButton = () => {
    if (tg?.MainButton) {
      tg.MainButton.hide();
    }
  };

  const setMainButtonCallback = (callback) => {
    if (tg?.MainButton) {
      tg.MainButton.onClick(callback);
    }
  };

  const showAlert = (message) => {
    if (tg?.showAlert) {
      tg.showAlert(message);
    } else {
      alert(message);
    }
  };

  const showConfirm = (message, callback) => {
    if (tg?.showConfirm) {
      tg.showConfirm(message, callback);
    } else {
      if (confirm(message)) callback(true);
      else callback(false);
    }
  };

  const hapticFeedback = (type = 'impact') => {
    if (tg?.HapticFeedback) {
      switch (type) {
        case 'light':
          tg.HapticFeedback.impactOccurred('light');
          break;
        case 'medium':
          tg.HapticFeedback.impactOccurred('medium');
          break;
        case 'heavy':
          tg.HapticFeedback.impactOccurred('heavy');
          break;
        case 'success':
          tg.HapticFeedback.notificationOccurred('success');
          break;
        case 'error':
          tg.HapticFeedback.notificationOccurred('error');
          break;
        case 'warning':
          tg.HapticFeedback.notificationOccurred('warning');
          break;
        default:
          tg.HapticFeedback.impactOccurred('medium');
      }
    }
  };

  const shareToStory = (mediaUrl, text) => {
    if (tg?.shareToStory) {
      tg.shareToStory(mediaUrl, {
        text: text,
        widget_link: {
          url: window.location.href,
          name: 'Craft Calculator'
        }
      });
    }
  };

  // message: string, userInfo: optional, files: optional array of File objects
  const sendBugReport = async (message, userInfo = null, files = []) => {
    try {
      // Отправляем напрямую через Telegram Bot API
      let BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      let CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;
      
      // Do NOT keep secrets in source.
      // If env vars are not configured, disable direct Telegram API usage.
      if (!BOT_TOKEN || !CHAT_ID) {
        console.warn('VITE_TELEGRAM_BOT_TOKEN or VITE_TELEGRAM_CHAT_ID not set. Direct Telegram API will be disabled; server endpoint will handle reports in production.');
        BOT_TOKEN = null;
        CHAT_ID = null;
      }
      
      // Собираем расширенную информацию о пользователе и системе
      const bugReportData = {
        message: message,
        user: userInfo || user,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        // Дополнительная информация для диагностики
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        screen: `${screen.width}x${screen.height}`,
        language: navigator.language,
        platform: navigator.platform,
        onLine: navigator.onLine,
        // Информация о браузере
        cookieEnabled: navigator.cookieEnabled,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // Telegram Web App информация
        isInTelegram: !!tg,
        telegramVersion: tg?.version || 'N/A',
        telegramPlatform: tg?.platform || 'N/A',
        attachments: Array.isArray(files) ? files.map((f) => ({ name: f.name, size: f.size, type: f.type })) : []
      };
      
      // Форматируем сообщение для Telegram
      let telegramMessage = `Bug Report\n\n`;
      
      if (bugReportData.user) {
        telegramMessage += `👤 User: ${bugReportData.user.first_name || 'Unknown'}`;
        if (bugReportData.user.last_name) telegramMessage += ` ${bugReportData.user.last_name}`;
        if (bugReportData.user.username) telegramMessage += ` (@${bugReportData.user.username})`;
        telegramMessage += `\n`;
      }
      
      telegramMessage += `Time: ${new Date(bugReportData.timestamp).toLocaleString()}\n`;
      telegramMessage += `URL: ${bugReportData.url}\n\n`;
      telegramMessage += `Report:\n${bugReportData.message}`;
      
  // В продакшене всегда используем наш API endpoint
  const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';

  // PWA always runs in browser context - no need for special API base handling
  const runningOnFileProtocol = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
  const apiBase = ''; // Use relative URLs for API endpoints in PWA
      
      let response;
      
      if (isProduction) {
        // В продакшене используем наш прокси endpoint which should accept multipart/form-data
        const form = new FormData();
        form.append('type', 'bug_report');
        form.append('message', message);
        form.append('metadata', JSON.stringify(bugReportData));

        if (Array.isArray(files)) {
          files.slice(0, 8).forEach((f, idx) => {
            // append files under 'files' field
            form.append('files', f, f.name);
          });
        }

  const endpoint = apiBase ? apiBase + '/api/bug-report' : '/api/bug-report';
  
  // Always log bug report submission details for debugging
  console.log('🐛 Bug Report Submission:', {
    isProduction,
    endpoint,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    hasFiles: files?.length || 0
  });
  
  response = await fetch(endpoint, {
          method: 'POST',
          body: form
        });
      } else {
        // Локально отправляем напрямую через Telegram Bot API.
        // We'll upload attachments first (images -> sendPhoto, others -> sendDocument), then send text message.
        // Limit files to max 8 and max 20 MB each for safety.
        const MAX_FILES = 8;
        const MAX_SIZE = 20 * 1024 * 1024;

        const safeFiles = Array.isArray(files) ? files.slice(0, MAX_FILES).filter(f => f.size <= MAX_SIZE) : [];

        if (!BOT_TOKEN || !CHAT_ID) {
          console.warn('Telegram bot credentials missing in environment; skipping direct Telegram API send in dev mode. Falling back to WebApp or console log.');
          // Simulate a failed response to trigger the fallback behavior below
          response = { ok: false, json: async () => ({ description: 'Missing credentials' }) };
        } else {
          // Helper to upload a single file via sendDocument/sendPhoto
          const uploadSingle = async (file) => {
            const fd = new FormData();
            fd.append('chat_id', CHAT_ID);
            // choose appropriate method
            if (file.type && file.type.startsWith('image/')) {
              fd.append('photo', file, file.name);
              return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, { method: 'POST', body: fd });
            } else {
              fd.append('document', file, file.name);
              return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: 'POST', body: fd });
            }
          };

          // Upload each file sequentially to avoid hitting rate limits or memory spikes
          for (const f of safeFiles) {
            try {
              // Note: in browser environment fetch will stream file content in multipart/form-data
              await uploadSingle(f);
            } catch (upErr) {
              console.warn('Failed to upload attachment:', f.name, upErr);
            }
          }

          // Finally, send the text message
          response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: CHAT_ID,
              text: telegramMessage,
              parse_mode: 'HTML'
            })
          });
        }
      }
      
      if (response.ok) {
        console.log('✅ Bug report sent successfully via', isProduction ? 'api-endpoint' : 'direct-api');
        return { success: true, method: isProduction ? 'api-endpoint' : 'direct-api' };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Bug report failed:', response.status, errorData);
        throw new Error(`API error: ${errorData.description || errorData.error || response.statusText}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to send bug report:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Fallback: попробуем через Telegram Web App если доступно
      if (tg?.sendData) {
        try {
          console.log('🔄 Trying Telegram Web App fallback...');
          const fallbackData = {
            type: 'bug_report',
            message: message,
            user: userInfo || user,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
          };
          
          tg.sendData(JSON.stringify(fallbackData));
          console.log('✅ Sent via Telegram Web App');
          return { success: true, method: 'telegram-webapp' };
        } catch (webAppError) {
          console.error('❌ Telegram Web App fallback failed:', webAppError);
        }
      }
      
      // Окончательный fallback - логируем в консоль
      console.warn('⚠️ Bug report logged locally (all send methods failed)');
      console.log('Bug report (fallback):', { message, user: userInfo || user });
      return { success: true, method: 'console-log', fallback: true, error: error.message };
    }
  };

  return {
    tg,
    isReady,
    user,
    themeParams,
    showMainButton,
    hideMainButton,
    setMainButtonCallback,
    showAlert,
    showConfirm,
    hapticFeedback,
    shareToStory,
    sendBugReport,
    isInTelegram: !!tg
  };
}
