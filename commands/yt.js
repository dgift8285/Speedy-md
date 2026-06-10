import axios from 'axios';

export const name = 'yt';
export const category = 'Downloader';
export const description = 'Download YouTube videos without restrictions';

export async function execute({ sock, msg, from, args }) {
  if (!args[0]) {
    return await sock.sendMessage(from, {
      text: `❌ Please provide a YouTube URL!\n\nExamples:\n.yt https://youtu.be/xxxxx\n.yt https://www.youtube.com/watch?v=xxxxx`
    });
  }

  const url = args[0];

  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    return await sock.sendMessage(from, {
      text: '❌ Invalid YouTube URL! Please send a valid YouTube link.'
    });
  }

  await sock.sendMessage(from, {
    text: '⏳ *Downloading YouTube video...*\n\n_Please wait_ ⚡'
  });

  try {
    let videoUrl = null;
    let title = 'YouTube Video';
    let author = 'Unknown';

    // Try API 1 - cobalt (no age restrictions)
    try {
      const res1 = await axios.post(
        'https://co.wuk.sh/api/json',
        {
          url: url,
          vQuality: '720',
          filenamePattern: 'basic',
          disableMetadata: false,
        },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          timeout: 20000,
        }
      );
      if (res1.data?.url) {
        videoUrl = res1.data.url;
        title = res1.data.filename || 'YouTube Video';
      }
    } catch {
      console.log('YT API 1 failed, trying API 2...');
    }

    // Try API 2 - y2mate style
    if (!videoUrl) {
      try {
        const res2 = await axios.get(
          `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
            timeout: 20000,
          }
        );
        if (res2.data?.data?.dl_url) {
          videoUrl = res2.data.data.dl_url;
          title = res2.data.data.title || 'YouTube Video';
          author = res2.data.data.author || 'Unknown';
        }
      } catch {
        console.log('YT API 2 failed, trying API 3...');
      }
    }

    // Try API 3
    if (!videoUrl) {
      try {
        const res3 = await axios.get(
          `https://api.agatz.xyz/api/youtube?url=${encodeURIComponent(url)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
            timeout: 20000,
          }
        );
        if (res3.data?.data?.url) {
          videoUrl = res3.data.data.url;
          title = res3.data.data.title || 'YouTube Video';
          author = res3.data.data.author || 'Unknown';
        }
      } catch {
        console.log('YT API 3 failed, trying API 4...');
      }
    }

    // Try API 4
    if (!videoUrl) {
      try {
        const res4 = await axios.get(
          `https://api.ryzendesu.vip/api/downloader/ytdl?url=${encodeURIComponent(url)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
            timeout: 20000,
          }
        );
        if (res4.data?.url) {
          videoUrl = res4.data.url;
          title = res4.data.title || 'YouTube Video';
          author = res4.data.author || 'Unknown';
        }
      } catch {
        console.log('YT API 4 failed...');
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
      timeout: 120000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.youtube.com/',
      },
      maxContentLength: 100 * 1024 * 1024,
    });

    const videoBuffer = Buffer.from(videoResponse.data);

    await sock.sendMessage(from, {
      video: videoBuffer,
      mimetype: 'video/mp4',
      caption: `✅ *YouTube Video*\n\n📝 *Title:* ${title}\n👤 *Channel:* ${author}\n\n_Downloaded by SpeedyMD_ ⚡`
    });

  } catch (err) {
    console.error('❌ YouTube error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Download failed!\n\n_Error: ${err.message}_\n\nPlease try again with a different link.`
    });
  }
}