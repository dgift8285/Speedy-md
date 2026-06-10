import axios from 'axios';

export const name = 'play';
export const category = 'Music';
export const description = 'Search and download any music in any language';

export async function execute({ sock, msg, from, args }) {
  if (!args[0]) {
    return await sock.sendMessage(from, {
      text: `❌ Tafadhali toa jina la wimbo!\n\nMifano:\n.play shape of you\n.play figo wa mtaa\n.play محمد عبده\n.play bollywood songs\n.play lingala music`
    });
  }

  const query = args.join(' ');

  await sock.sendMessage(from, {
    text: `🎵 *Inatafuta:* ${query}\n\n_Subiri kidogo_ ⚡`
  });

  try {
    let audioUrl = null;
    let title = query;
    let artist = 'Unknown';
    let duration = '';
    let videoId = null;
    let videoUrl = null;

    // Step 1: Search APIs - supports any language
    // Search API 1
    try {
      const s1 = await axios.get(
        `https://api.siputzx.my.id/api/s/youtube?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          timeout: 15000,
        }
      );
      if (s1.data?.data?.[0]) {
        const first = s1.data.data[0];
        videoId = first.id;
        title = first.title || query;
        artist = first.channel || 'Unknown';
        duration = first.duration || '';
        videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log('✅ Found via Search API 1:', title);
      }
    } catch {
      console.log('Search API 1 failed...');
    }

    // Search API 2
    if (!videoId) {
      try {
        const s2 = await axios.get(
          `https://api.agatz.xyz/api/ytsearch?message=${encodeURIComponent(query)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
          }
        );
        if (s2.data?.data?.[0]) {
          const first = s2.data.data[0];
          videoId = first.id;
          title = first.title || query;
          artist = first.channel || 'Unknown';
          duration = first.duration || '';
          videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          console.log('✅ Found via Search API 2:', title);
        }
      } catch {
        console.log('Search API 2 failed...');
      }
    }

    // Search API 3
    if (!videoId) {
      try {
        const s3 = await axios.get(
          `https://api.ryzendesu.vip/api/search/youtube?query=${encodeURIComponent(query)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
          }
        );
        if (s3.data?.data?.[0]) {
          const first = s3.data.data[0];
          videoId = first.id;
          title = first.title || query;
          artist = first.channel || 'Unknown';
          duration = first.duration || '';
          videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          console.log('✅ Found via Search API 3:', title);
        }
      } catch {
        console.log('Search API 3 failed...');
      }
    }

    // Fallback URL if no videoId found
    if (!videoUrl) {
      videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      console.log('Using fallback search URL');
    }

    console.log('🎵 Downloading from:', videoUrl);

    // Step 2: Download audio
    // Download API 1 - cobalt
    try {
      const dl1 = await axios.post(
        'https://co.wuk.sh/api/json',
        {
          url: videoUrl,
          aFormat: 'mp3',
          isAudioOnly: true,
          disableMetadata: false,
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
      if (dl1.data?.url) {
        audioUrl = dl1.data.url;
        console.log('✅ Got audio from Download API 1');
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
          console.log('✅ Got audio from Download API 2');
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
          console.log('✅ Got audio from Download API 3');
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
          console.log('✅ Got audio from Download API 4');
        }
      } catch {
        console.log('Download API 4 failed...');
      }
    }

    // Download API 5
    if (!audioUrl) {
      try {
        const dl5 = await axios.get(
          `https://api.nexoracle.com/downloader/yt-mp3?apikey=free_key&url=${encodeURIComponent(videoUrl)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000,
          }
        );
        if (dl5.data?.result?.dl_url) {
          audioUrl = dl5.data.result.dl_url;
          title = dl5.data.result.title || title;
          duration = dl5.data.result.duration || duration;
          console.log('✅ Got audio from Download API 5');
        }
      } catch {
        console.log('Download API 5 failed...');
      }
    }

    if (!audioUrl) {
      return await sock.sendMessage(from, {
        text: `❌ Haikuweza kupakua *${title}*!\n\n_Jaribu:_\n• Jina tofauti la wimbo\n• Ongeza jina la msanii\n• Jaribu tena baadaye\n\nMfano: *.play Diamond Platnumz Jeje*`
      });
    }

    await sock.sendMessage(from, {
      text: `✅ *Imepatikana!*\n\n🎵 *${title}*\n👤 *Msanii:* ${artist}\n⏱️ *Muda:* ${duration}\n\n_Inatuma sauti kamili..._ ⚡`
    });

    // Download full audio buffer
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

    await sock.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      pttAudio: false,
      fileName: `${title}.mp3`,
    });

  } catch (err) {
    console.error('❌ Music error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ Imeshindwa kupakua!\n\n_Kosa: ${err.message}_\n\nTafadhali jaribu tena na jina tofauti la wimbo.`
    });
  }
}