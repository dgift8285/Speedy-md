import axios from 'axios';

export const name = 'play';
export const category = 'Music';
export const description = 'Search and download any music/audio';

export async function execute({ sock, msg, from, args }) {
  if (!args[0]) {
    return await sock.sendMessage(from, {
      text: `❌ Please provide a song name!\n\nExamples:\n.play shape of you\n.play despacito\n.play figo wa mtaa`
    });
  }

  const query = args.join(' ');

  await sock.sendMessage(from, {
    text: `🎵 *Searching for:* ${query}\n\n_Please wait_ ⚡`
  });

  try {
    let audioUrl = null;
    let title = query;
    let artist = 'Unknown';
    let duration = '';
    let videoId = null;

    // Step 1: Search YouTube for the song
    try {
      const searchRes = await axios.get(
        `https://api.siputzx.my.id/api/s/youtube?q=${encodeURIComponent(query)}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000,
        }
      );
      if (searchRes.data?.data?.[0]) {
        const first = searchRes.data.data[0];
        videoId = first.id || null;
        title = first.title || query;
        artist = first.channel || 'Unknown';
        duration = first.duration || '';
      }
    } catch {
      console.log('Search API 1 failed, trying API 2...');
    }

    // Step 1b: Try search API 2
    if (!videoId) {
      try {
        const searchRes2 = await axios.get(
          `https://api.agatz.xyz/api/ytsearch?message=${encodeURIComponent(query)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
          }
        );
        if (searchRes2.data?.data?.[0]) {
          const first = searchRes2.data.data[0];
          videoId = first.id || null;
          title = first.title || query;
          artist = first.channel || 'Unknown';
          duration = first.duration || '';
        }
      } catch {
        console.log('Search API 2 failed...');
      }
    }

    const videoUrl = videoId
      ? `https://www.youtube.com/watch?v=${videoId}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    // Step 2: Download audio from video
    // Try download API 1
    try {
      const dlRes1 = await axios.get(
        `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(videoUrl)}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 30000,
        }
      );
      if (dlRes1.data?.data?.dl_url) {
        audioUrl = dlRes1.data.data.dl_url;
        title = dlRes1.data.data.title || title;
        artist = dlRes1.data.data.author || artist;
        duration = dlRes1.data.data.duration || duration;
      }
    } catch {
      console.log('Download API 1 failed, trying API 2...');
    }

    // Try download API 2
    if (!audioUrl) {
      try {
        const dlRes2 = await axios.get(
          `https://api.agatz.xyz/api/ytmp3?url=${encodeURIComponent(videoUrl)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (dlRes2.data?.data?.url) {
          audioUrl = dlRes2.data.data.url;
          title = dlRes2.data.data.title || title;
          duration = dlRes2.data.data.duration || duration;
        }
      } catch {
        console.log('Download API 2 failed, trying API 3...');
      }
    }

    // Try download API 3
    if (!audioUrl) {
      try {
        const dlRes3 = await axios.get(
          `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (dlRes3.data?.url) {
          audioUrl = dlRes3.data.url;
          title = dlRes3.data.title || title;
          duration = dlRes3.data.duration || duration;
        }
      } catch {
        console.log('Download API 3 failed, trying API 4...');
      }
    }

    // Try download API 4
    if (!audioUrl) {
      try {
        const dlRes4 = await axios.get(
          `https://api.ryzendesu.vip/api/downloader/ytmp3?url=https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (dlRes4.data?.url) {
          audioUrl = dlRes4.data.url;
          title = dlRes4.data.title || title;
          duration = dlRes4.data.duration || duration;
        }
      } catch {
        console.log('Download API 4 failed...');
      }
    }

    if (!audioUrl) {
      return await sock.sendMessage(from, {
        text: `❌ Could not find *${query}*!\n\n_Try:_\n• Different song name\n• Add artist name\n• Use English title\n\nExample: *.play Ed Sheeran Shape of You*`
      });
    }

    // Send searching message
    await sock.sendMessage(from, {
      text: `✅ *Found!*\n\n🎵 *${title}*\n👤 *Artist:* ${artist}\n⏱️ *Duration:* ${duration}\n\n_Sending audio now..._ ⚡`
    });

    // Download full audio buffer
    const audioResponse = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 300000, // 5 minutes for long songs
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.youtube.com/',
      },
      maxContentLength: 200 * 1024 * 1024, // 200MB for long songs
    });

    const audioBuffer = Buffer.from(audioResponse.data);

    // Send full audio
    await sock.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      pttAudio: false,
      fileName: `${title}.mp3`,
    });

  } catch (err) {
    console.error('❌ Music error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Download failed!\n\n_Error: ${err.message}_\n\nPlease try again with a different song name.`
    });
  }
}