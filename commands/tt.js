import axios from 'axios';

export const name = 'tt';
export const category = 'Downloader';
export const description = 'Download TikTok videos without watermark';

export async function execute({ sock, msg, from, args }) {
  if (!args[0]) {
    return await sock.sendMessage(from, {
      text: `❌ Please provide a TikTok URL!\n\nExample:\n.tt https://vm.tiktok.com/xxxxx`
    });
  }

  const url = args[0];

  if (!url.includes('tiktok.com')) {
    return await sock.sendMessage(from, {
      text: '❌ Invalid TikTok URL! Please send a valid TikTok link.'
    });
  }

  await sock.sendMessage(from, { 
    text: '⏳ *Downloading TikTok video...*\n\n_Please wait_ ⚡' 
  });

  try {
    // Try API 1
    let videoUrl = null;
    let title = 'TikTok Video';
    let author = 'Unknown';

    try {
      const res1 = await axios.get(
        `https://api.tiklydown.eu.org/api/download/v2?url=${encodeURIComponent(url)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json',
          },
          timeout: 15000,
        }
      );
      if (res1.data?.video?.noWatermark) {
        videoUrl = res1.data.video.noWatermark;
        title = res1.data.title || 'TikTok Video';
        author = res1.data.author?.nickname || 'Unknown';
      }
    } catch {
      console.log('API 1 failed, trying API 2...');
    }

    // Try API 2 if API 1 failed
    if (!videoUrl) {
      try {
        const res2 = await axios.get(
          `https://tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
            timeout: 15000,
          }
        );
        if (res2.data?.data?.play) {
          videoUrl = res2.data.data.hdplay || res2.data.data.play;
          title = res2.data.data.title || 'TikTok Video';
          author = res2.data.data.author?.nickname || 'Unknown';
        }
      } catch {
        console.log('API 2 failed, trying API 3...');
      }
    }

    // Try API 3 if API 2 failed
    if (!videoUrl) {
      try {
        const res3 = await axios.post(
          'https://www.tikwm.com/api/',
          new URLSearchParams({ url, hd: '1' }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0',
            },
            timeout: 15000,
          }
        );
        if (res3.data?.data?.play) {
          videoUrl = res3.data.data.hdplay || res3.data.data.play;
          title = res3.data.data.title || 'TikTok Video';
          author = res3.data.data.author?.nickname || 'Unknown';
        }
      } catch {
        console.log('API 3 failed...');
      }
    }

    if (!videoUrl) {
      return await sock.sendMessage(from, {
        text: '❌ Could not download video!\n\n_Possible reasons:_\n• Video is deleted\n• Video is private\n• Link is invalid\n\nPlease try another link!'
      });
    }

    // Download video buffer
    const videoResponse = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.tiktok.com/',
      },
      maxContentLength: 100 * 1024 * 1024, // 100MB max
    });

    const videoBuffer = Buffer.from(videoResponse.data);

    await sock.sendMessage(from, {
      video: videoBuffer,
      mimetype: 'video/mp4',
      caption: `✅ *TikTok Video*\n\n📝 *Title:* ${title}\n👤 *Author:* @${author}\n\n_Downloaded by SpeedyMD_ ⚡`
    });

  } catch (err) {
    console.error('❌ TikTok error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Download failed!\n\n_Error: ${err.message}_\n\nPlease try again with a different link.`
    });
  }
}