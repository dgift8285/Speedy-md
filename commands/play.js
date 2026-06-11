import axios from 'axios';

export const name = 'play';
export const category = 'Music';
export const description = 'Search and download any music in any language';

export async function execute({ sock, msg, from, args }) {
  if (!args[0]) {
    return await sock.sendMessage(from, {
      text: `🎵 *SpeedyMD Music Player*\n\n❌ Please provide a song name!\n\nExamples:\n.play shape of you\n.play figo wa mtaa\n.play burna boy last last\n.play diamond platnumz`
    });
  }

  const query = args.join(' ');

  await sock.sendMessage(from, {
    text: `🎵 *Searching:* ${query}\n⏳ _Please wait..._ ⚡`
  });

  try {
    let audioUrl = null;
    let title = query;
    let artist = 'Unknown';
    let duration = '';
    let videoUrl = null;

    // Search API 1 - most reliable
    try {
      const s1 = await axios.get(
        `https://api.popcat.xyz/youtube/search?q=${encodeURIComponent(query)}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000,
        }
      );
      if (s1.data?.[0]) {
        const first = s1.data[0];
        videoUrl = first.url;
        title = first.title || query;
        artist = first.channel || 'Unknown';
        duration = first.duration || '';
        console.log('✅ Search API 1 success:', title);
      }
    } catch {
      console.log('Search API 1 failed...');
    }

    // Search API 2
    if (!videoUrl) {
      try {
        const s2 = await axios.get(
          `https://api.siputzx.my.id/api/s/youtube?q=${encodeURIComponent(query)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
          }
        );
        if (s2.data?.data?.[0]) {
          const first = s2.data.data[0];
          videoUrl = `https://www.youtube.com/watch?v=${first.id}`;
          title = first.title || query;
          artist = first.channel || 'Unknown';
          duration = first.duration || '';
          console.log('✅ Search API 2 success:', title);
        }
      } catch {
        console.log('Search API 2 failed...');
      }
    }

    // Search API 3
    if (!videoUrl) {
      try {
        const s3 = await axios.get(
          `https://api.agatz.xyz/api/ytsearch?message=${encodeURIComponent(query)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
          }
        );
        if (s3.data?.data?.[0]) {
          const first = s3.data.data[0];
          videoUrl = `https://www.youtube.com/watch?v=${first.id}`;
          title = first.title || query;
          artist = first.channel || 'Unknown';
          duration = first.duration || '';
          console.log('✅ Search API 3 success:', title);
        }
      } catch {
        console.log('Search API 3 failed...');
      }
    }

    // Fallback URL
    if (!videoUrl) {
      videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      console.log('Using fallback URL...');
    }

    // Download API 1 - most reliable
    try {
      const dl1 = await axios.get(
        `https://api.popcat.xyz/ytdl?url=${encodeURIComponent(videoUrl)}&format=mp3`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 30000,
        }
      );
      if (dl1.data?.url) {
        audioUrl = dl1.data.url;
        title = dl1.data.title || title;
        duration = dl1.data.duration || duration;
        console.log('✅ Download API 1 success');
      }
    } catch {
      console.log('Download API 1 failed...');
    }

    // Download API 2
    if (!audioUrl) {
      try {
        const dl2 = await axios.get(
          `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(videoUrl)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (dl2.data?.data?.dl_url) {
          audioUrl = dl2.data.data.dl_url;
          title = dl2.data.data.title || title;
          duration = dl2.data.data.duration || duration;
          console.log('✅ Download API 2 success');
        }
      } catch {
        console.log('Download API 2 failed...');
      }
    }

    // Download API 3
    if (!audioUrl) {
      try {
        const dl3 = await axios.get(
          `https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(videoUrl)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (dl3.data?.data?.url) {
          audioUrl = dl3.data.data.url;
          title = dl3.data.data.title || title;
          duration = dl3.data.data.duration || duration;
          console.log('✅ Download API 3 success');
        }
      } catch {
        console.log('Download API 3 failed...');
      }
    }

    // Download API 4
    if (!audioUrl) {
      try {
        const dl4 = await axios.get(
          `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (dl4.data?.url) {
          audioUrl = dl4.data.url;
          title = dl4.data.title || title;
          duration = dl4.data.duration || duration;
          console.log('✅ Download API 4 success');
        }
      } catch {
        console.log('Download API 4 failed...');
      }
    }

    // Download API 5 - cobalt
    if (!audioUrl) {
      try {
        const dl5 = await axios.post(
          'https://co.wuk.sh/api/json',
          {
            url: videoUrl,
            aFormat: 'mp3',
            isAudioOnly: true,
          },
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0',
            },
            timeout: 30000,
          }
        );
        if (dl5.data?.url) {
          audioUrl = dl5.data.url;
          console.log('✅ Download API 5 success');
        }
      } catch {
        console.log('Download API 5 failed...');
      }
    }

    // Download API 6 - zylalabs
    if (!audioUrl) {
      try {
        const dl6 = await axios.get(
          `https://zylalabs.com/api/320/youtube+mp3+downloader+api/259/get+mp3?yt_url=${encodeURIComponent(videoUrl)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (dl6.data?.url) {
          audioUrl = dl6.data.url;
          console.log('✅ Download API 6 success');
        }
      } catch {
        console.log('Download API 6 failed...');
      }
    }

    if (!audioUrl) {
      return await sock.sendMessage(from, {
        text: `❌ *Could not download:* ${title}\n\n_Try:_\n• Different song name\n• Add artist name\n• Try again later\n\nExample: *.play Ed Sheeran Perfect*`
      });
    }

    // Send info message
    await sock.sendMessage(from, {
      text: `✅ *Found!*\n\n🎵 *${title}*\n👤 *${artist}*\n⏱️ *${duration}*\n\n_Sending audio..._ ⚡`
    });

    // Download full audio
    const audioResponse = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 300000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.youtube.com/',
      },
      maxContentLength: 200 * 1024 * 1024,
    });

    const audioBuffer = Buffer.from(audioResponse.data);

    // Send audio
    await sock.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      pttAudio: false,
      fileName: `${title}.mp3`,
    });

  } catch (err) {
    console.error('❌ Play error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ *Download failed!*\n\n_Error: ${err.message}_\n\nPlease try again with a different song name.`
    });
  }
}