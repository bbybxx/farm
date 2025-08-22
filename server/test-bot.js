import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

async function getBotUpdates() {
  try {
    if (!BOT_TOKEN) {
      console.error('BOT_TOKEN not found in .env file');
      return;
    }

    console.log('🤖 Getting bot updates...');
    console.log('📱 Bot Token:', BOT_TOKEN.substring(0, 10) + '...');
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
    const result = await response.json();
    
    if (!result.ok) {
      console.error('❌ Error:', result.description);
      return;
    }
    
    console.log('\n✅ Bot is working!');
    console.log('\n📊 Recent updates:');
    
    if (result.result.length === 0) {
      console.log('No recent messages found.');
      console.log('\n💡 To get Chat ID:');
      console.log('1. Start a chat with your bot');
      console.log('2. Send any message to the bot');
      console.log('3. Run this script again');
    } else {
      result.result.forEach((update, index) => {
        const message = update.message;
        if (message) {
          console.log(`\n📨 Update ${index + 1}:`);
          console.log(`   Chat ID: ${message.chat.id}`);
          console.log(`   Chat Type: ${message.chat.type}`);
          console.log(`   From: ${message.from.first_name} ${message.from.last_name || ''}`);
          console.log(`   Username: @${message.from.username || 'N/A'}`);
          console.log(`   Message: "${message.text || 'N/A'}"`);
          console.log(`   Date: ${new Date(message.date * 1000).toLocaleString()}`);
        }
      });
      
      // Show latest chat ID prominently
      const latestMessage = result.result[result.result.length - 1]?.message;
      if (latestMessage) {
        console.log('\n🎯 Use this Chat ID in your .env file:');
        console.log(`CHAT_ID=${latestMessage.chat.id}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error getting bot updates:', error.message);
  }
}

// Get bot info first
async function getBotInfo() {
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const result = await response.json();
    
    if (result.ok) {
      const bot = result.result;
      console.log('\n🤖 Bot Information:');
      console.log(`   Name: ${bot.first_name}`);
      console.log(`   Username: @${bot.username}`);
      console.log(`   ID: ${bot.id}`);
      console.log(`   Can Join Groups: ${bot.can_join_groups}`);
      console.log(`   Can Read All Group Messages: ${bot.can_read_all_group_messages}`);
    }
  } catch (error) {
    console.error('Error getting bot info:', error.message);
  }
}

console.log('🚀 Telegram Bot Tester');
console.log('='.repeat(50));

getBotInfo().then(() => getBotUpdates());
