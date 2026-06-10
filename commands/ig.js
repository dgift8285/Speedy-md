import axios from 'axios';

export const name = 'ig';
export const category = 'Downloader';
export const description = 'Download Instagram videos and photos';

export async function execute({ sock, msg, from, args }) {
  if (!args[0]) {
    return await sock.sendMessage(from, {
      text: `❌ Please provide an Instagram URL!\n\nExamples:\n.ig https://www.instagram.com/p/xxxxx\n.ig https://www.instagram.com/reel/xxxxx`
    });
  }

  const url = args[0];

  if (!url.includes('instagram.com')) {
    return await sock.sendMessage(from, {
      text: '❌ Invalid Instagram URL! Please send a valid Instagram link.'
    });
  }

  await sock.sendMessage(from, {
    text: '⏳ *Downloading Instagram content...*\n\n_Please wait_ ⚡'
  });

  try {
    let mediaUrl = null;
    let mediaType = 'video';
    let title = 'Instagram Video';

    // Try API 1
    try {
      const res1 = await axios.post(
        'https://api.snapinsta.app/v1/info',
        new URLSearchParams({ url }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0',
          },
          timeout: 20000,
        }
      );
      if (res1.data?.data?.items?.[0]?.video_versions?.[0]?.url) {
        mediaUrl = res1.data.data.items[0].video_versions[0].url;
        mediaType = 'video';
      } else if (res1.data?.data?.items?.[0]?.image_versions2?.candidates?.[0]?.url) {
        mediaUrl = res1.data.data.items[0].image_versions2.candidates[0].url;
        mediaType = 'image';
      }
    } catch {
      console.log('IG API 1 failed, trying API 2...');
    }

    // Try API 2
    if (!mediaUrl) {
      try {
        const res2 = await axios.get(
          `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(url)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
            timeout: 20000,
          }
        );
        if (res2.data?.data?.[0]?.url) {
          mediaUrl = res2.data.data[0].url;
          mediaType = res2.data.data[0].type || 'video';
        }
      } catch {
        console.log('IG API 2 failed, trying API 3...');
      }
    }

    // Try API 3
    if (!mediaUrl) {
      try {
        const res3 = await axios.get(
          `https://api.agatz.xyz/api/instagram?url=${encodeURIComponent(url)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
            timeout: 20000,
          }
        );
        if (res3.data?.data?.url) {
          mediaUrl = res3.data.data.url;
          mediaType = res3.data.data.type || 'video';
        }
      } catch {
        console.log('IG API 3 failed, trying API 4...');
      }
    }

    // Try API 4
    if (!mediaUrl) {
      try {
        const res4 = await axios.get(
          `https://api.ryzendesu.vip/api/downloader/igdl?url=${encodeURIComponent(url)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
            },
            timeout: 20000,
          }
        );
        if (res4.data?.data?.[0]?.url) {
          mediaUrl = res4.data.data[0].url;
          mediaType = 'video';
        }
      } catch {
        console.log('IG API 4 failed...');
      }
    }

    if (!mediaUrl) {
      return await sock.sendMessage(from, {
        text: '❌ Could not download!\n\n_Possible reasons:_\n• Account is private\n• Post is deleted\n• Link is invalid\n\nPlease try another link!'
      });
    }

    // Download media buffer
    const mediaResponse = await axios.get(mediaUrl, {
      responseType: 'arraybuffer',
      timeout: 120000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.instagram.com/',
      },
      maxContentLength: 100 * 1024 * 1024,
    });

    const mediaBuffer = Buffer.from(mediaResponse.data);

    // Send as video or image
    if (mediaType === 'video') {
      await sock.sendMessage(from, {
        video: mediaBuffer,
        mimetype: 'video/mp4',
        caption: `✅ *Instagram Video*\n\n_Downloaded by SpeedyMD_ ⚡`
      });
    } else {
      await sock.sendMessage(from, {
        image: mediaBuffer,
        caption: `✅ *Instagram Photo*\n\n_Downloaded by SpeedyMD_ ⚡`
      });
    }

  } catch (err) {
    console.error('❌ Instagram error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Download failed!\n\n_Error: ${err.message}_\n\nPlease try again with a different link.`
    });
  }
}