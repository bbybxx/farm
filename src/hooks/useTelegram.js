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

  const sendBugReport = async (message, userInfo = null) => {
    try {
      // Отправляем напрямую через Telegram Bot API
      const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      const CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;
      
      // Отладочная информация
      console.log('Environment check:', {
        BOT_TOKEN: BOT_TOKEN ? 'SET' : 'NOT SET',
        CHAT_ID: CHAT_ID ? 'SET' : 'NOT SET',
        env: import.meta.env
      });
      
      if (!BOT_TOKEN || !CHAT_ID) {
        console.error('Bot token or chat ID not configured');
        if (isInTelegram) {
          showAlert('Bug report feature is not available');
        } else {
          alert('Bug report feature is not available');
        }
        return;
      }
      
      const bugReportData = {
        message: message,
        user: userInfo || user,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };
      
      // Форматируем сообщение для Telegram
      let telegramMessage = `🐛 Bug Report\n\n`;
      
      if (bugReportData.user) {
        telegramMessage += `👤 User: ${bugReportData.user.first_name || 'Unknown'}`;
        if (bugReportData.user.last_name) telegramMessage += ` ${bugReportData.user.last_name}`;
        if (bugReportData.user.username) telegramMessage += ` (@${bugReportData.user.username})`;
        telegramMessage += `\n`;
      }
      
      telegramMessage += `⏰ Time: ${new Date(bugReportData.timestamp).toLocaleString()}\n`;
      telegramMessage += `🔗 URL: ${bugReportData.url}\n\n`;
      telegramMessage += `📝 Report:\n${bugReportData.message}`;
      
      // Отправляем через Telegram Bot API
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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
      
      console.log('Telegram API response:', response.status, response.statusText);
      
      if (response.ok) {
        console.log('Bug report sent successfully');
        return { success: true, method: 'direct-api' };
      } else {
        const errorData = await response.json();
        console.error('Telegram API error:', errorData);
        throw new Error(`Telegram API error: ${errorData.description}`);
      }
      
    } catch (error) {
      console.error('Failed to send bug report:', error);
      
      // Fallback: попробуем через Telegram Web App если доступно
      if (tg?.sendData) {
        try {
          const fallbackData = {
            type: 'bug_report',
            message: message,
            user: userInfo || user,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
          };
          
          tg.sendData(JSON.stringify(fallbackData));
          return { success: true, method: 'telegram-webapp' };
        } catch (webAppError) {
          console.error('Telegram Web App fallback failed:', webAppError);
        }
      }
      
      // Окончательный fallback - логируем в консоль
      console.log('Bug report (fallback):', { message, user: userInfo || user });
      return { success: true, method: 'console-log', fallback: true };
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
