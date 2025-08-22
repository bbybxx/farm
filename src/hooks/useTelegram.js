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
      let BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      let CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;
      
      // Fallback для случая, когда переменные окружения не настроены на Vercel
      if (!BOT_TOKEN || !CHAT_ID) {
        console.warn('Environment variables not found, using fallback values');
        BOT_TOKEN = '8035311656:AAFB8nrpINRSaREmNRtevET2iOjREohVgGs';
        CHAT_ID = '592052544';
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
        telegramPlatform: tg?.platform || 'N/A'
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
      
      // В продакшене всегда используем наш API endpoint
      const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
      
      let response;
      
      if (isProduction) {
        // В продакшене используем наш прокси
        response = await fetch('/api/bug-report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'bug_report',
            message: message,
            user: bugReportData.user,
            timestamp: bugReportData.timestamp,
            url: bugReportData.url,
            userAgent: bugReportData.userAgent,
            viewport: bugReportData.viewport,
            screen: bugReportData.screen,
            language: bugReportData.language,
            platform: bugReportData.platform,
            onLine: bugReportData.onLine,
            cookieEnabled: bugReportData.cookieEnabled,
            timezone: bugReportData.timezone,
            isInTelegram: bugReportData.isInTelegram,
            telegramVersion: bugReportData.telegramVersion,
            telegramPlatform: bugReportData.telegramPlatform
          })
        });
      } else {
        // Локально отправляем напрямую
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
      
      if (response.ok) {
        return { success: true, method: isProduction ? 'api-endpoint' : 'direct-api' };
      } else {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.description || errorData.error}`);
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
