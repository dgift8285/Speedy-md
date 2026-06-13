import axios from 'axios';

export const name = 'ai';
export const category = 'AI';
export const description = 'Chat with AI assistant';

export async function execute({ sock, msg, from, args }) {
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

  try {
    let response = null;

    // API 1 - GPT4Free
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
        const res3 = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            messages: [{ role: 'user', content: query }],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0',
            },
            timeout: 30000,
          }
        );
        if (res3.data?.content?.[0]?.text) {
          response = res3.data.content[0].text;
          console.log('✅ AI API 3 success');
        }
      } catch {
        console.log('AI API 3 failed...');
      }
    }

    // API 4 - Ryzen
    if (!response) {
      try {
        const res4 = await axios.get(
          `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(query)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (res4.data?.response || res4.data?.answer) {
          response = res4.data.response || res4.data.answer;
          console.log('✅ AI API 4 success');
        }
      } catch {
        console.log('AI API 4 failed...');
      }
    }

    if (!response) {
      return await sock.sendMessage(from, {
        text: `❌ *AI is busy right now!*\n\nPlease try again in a moment.`,
      }, { quoted: msg });
    }

    await sock.sendMessage(from, {
      text:
        `🤖 *SpeedyMD AI*\n\n` +
        `❓ *Question:* ${query}\n\n` +
        `💡 *Answer:*\n${response}\n\n` +
        `_Powered by SpeedyMD_ ⚡`,
    }, { quoted: msg });

  } catch (err) {
    console.error('❌ AI error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ *AI failed!*\n\n_${err.message}_`,
    }, { quoted: msg });
  }
}