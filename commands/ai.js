import axios from 'axios';

export const name = 'ai';
export const category = 'AI';
export const description = 'Chat with AI assistant';

export async function execute({ sock, msg, from, args }) {
  try {
    if (!args[0]) {
      return await sock.sendMessage(from, {
        text:
          `🤖 *SpeedyMD AI*\n\n` +
          `❌ Please ask me something!\n\n` +
          `Examples:\n` +
          `▸ *.ai what is love*\n` +
          `▸ *.ai write a poem*\n` +
          `▸ *.ai explain quantum physics*`,
      }, { quoted: msg });
    }

    const query = args.join(' ');

    await sock.sendMessage(from, {
      text: `🤖 *Thinking...*\n\n_${query}_`,
    }, { quoted: msg });

    let response = null;

    // API 1
    try {
      const res1 = await axios.get(
        `https://api.siputzx.my.id/api/ai/gpt3?prompt=${encodeURIComponent(query)}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 30000,
        }
      );
      if (res1.data?.data) {
        response = res1.data.data;
        console.log('✅ AI API 1 success');
      }
    } catch {
      console.log('AI API 1 failed...');
    }

    // API 2
    if (!response) {
      try {
        const res2 = await axios.get(
          `https://api.agatz.xyz/api/openai?message=${encodeURIComponent(query)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (res2.data?.data) {
          response = res2.data.data;
          console.log('✅ AI API 2 success');
        }
      } catch {
        console.log('AI API 2 failed...');
      }
    }

    // API 3
    if (!response) {
      try {
        const res3 = await axios.get(
          `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(query)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (res3.data?.response) {
          response = res3.data.response;
          console.log('✅ AI API 3 success');
        }
      } catch {
        console.log('AI API 3 failed...');
      }
    }

    // API 4
    if (!response) {
      try {
        const res4 = await axios.get(
          `https://api.nexoracle.com/ai/gpt-web?apikey=free_key&q=${encodeURIComponent(query)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (res4.data?.result) {
          response = res4.data.result;
          console.log('✅ AI API 4 success');
        }
      } catch {
        console.log('AI API 4 failed...');
      }
    }

    // API 5
    if (!response) {
      try {
        const res5 = await axios.get(
          `https://api.popcat.xyz/chatbot?msg=${encodeURIComponent(query)}&owner=SpeedyMD&botname=SpeedyMD`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (res5.data?.response) {
          response = res5.data.response;
          console.log('✅ AI API 5 success');
        }
      } catch {
        console.log('AI API 5 failed...');
      }
    }

    if (!response) {
      return await sock.sendMessage(from, {
        text:
          `❌ *AI is busy right now!*\n\n` +
          `Please try again in a moment.`,
      }, { quoted: msg });
    }

    await sock.sendMessage(from, {
      text:
        `🤖 *SpeedyMD AI*\n\n` +
        `❓ *You:* ${query}\n\n` +
        `💡 *AI:*\n${response}\n\n` +
        `_Powered by SpeedyMD_ ⚡`,
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ AI error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ *AI failed!*\n\n_${err.message}_`,
    }, { quoted: msg });
  }
}