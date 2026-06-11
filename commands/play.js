import axios from 'axios';

export const name = 'play';
export const category = 'Music';
export const description = 'Search and download any music in any language';

export async function execute({ sock, msg, from, args }) {
  if (!args[0]) {
    return await sock.sendMessage(from, {
      text: `🎵 *SpeedyMD Music*\n\n❌ Please provide a song name!\n\nExamples:\n.play shape of you\n.play figo wa mtaa\n.play burna boy`
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

    // Step 1: Search for video
    try {
      const search = await axios.get(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 15000,
        }
      );
      const html = search.data;
      const match = html.match(/"videoId":"([^"]+)"/);
      const titleMatch = html.match(/"title":{"runs":\[{"text":"([^"]+)"/);
      if (match) {
        const vid = match[1];
        videoUrl = `https://www.youtube.com/watch?v=${vid}`;
        title = titleMatch ? titleMatch[1] : query;
        console.log('✅ Found video:', videoUrl);
      }
    } catch {
      console.log('YouTube search failed...');
    }

    if (!videoUrl) {
      videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    }

    // Step 2: Download using multiple APIs

    // API 1 - yt-download.org
    try {
      const dl1 = await axios.get(
        `https://yt-download.org/api/button/mp3/${videoUrl.split('v=')[1] || ''}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 20000,
        }
      );
      if (dl1.data?.url) {
        audioUrl = dl1.data.url;
        console.log('✅ API 1 success');
      }
    } catch {
      console.log('API 1 failed...');
    }

    // API 2 - loader.to
    if (!audioUrl) {
      try {
        const videoId = videoUrl.includes('v=')
          ? videoUrl.split('v=')[1]
          : videoUrl.split('youtu.be/')[1];

        const dl2 = await axios.get(
          `https://loader.to/ajax/download.php?format=mp3&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 20000,
          }
        );
        if (dl2.data?.success && dl2.data?.id) {
          // Poll for download
          const id = dl2.data.id;
          for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const progress = await axios.get(
              `https://loader.to/ajax/progress.php?id=${id}`,
              { timeout: 10000 }
            );
            if (progress.data?.download_url) {
              audioUrl = progress.data.download_url;
              console.log('✅ API 2 success');
              break;
            }
          }
        }
      } catch {
        console.log('API 2 failed...');
      }
    }

    // API 3 - MP3 download direct
    if (!audioUrl) {
      try {
        const videoId = videoUrl.includes('v=')
          ? videoUrl.split('v=')[1]?.split('&')[0]
          : null;

        if (videoId) {
          const dl3 = await axios.post(
            'https://co.wuk.sh/api/json',
            {
              url: `https://www.youtube.com/watch?v=${videoId}`,
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
          if (dl3.data?.url) {
            audioUrl = dl3.data.url;
            console.log('✅ API 3 success');
          }
        }
      } catch {
        console.log('API 3 failed...');
      }
    }

    // API 4 - y2mate
    if (!audioUrl) {
      try {
        const videoId = videoUrl.includes('v=')
          ? videoUrl.split('v=')[1]?.split('&')[0]
          : null;

        if (videoId) {
          const analyze = await axios.post(
            'https://www.y2mate.com/mates/analyzeV2/ajax',
            new URLSearchParams({
              k_query: `https://www.youtube.com/watch?v=${videoId}`,
              k_page: 'home',
              hl: 'en',
              q_auto: '0',
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0',
              },
              timeout: 20000,
            }
          );

          if (analyze.data?.vid) {
            const vid = analyze.data.vid;
            title = analyze.data.title || title;

            const convert = await axios.post(
              'https://www.y2mate.com/mates/convertV2/index',
              new URLSearchParams({
                vid,
                k: analyze.data?.links?.mp3?.mp3128?.k || '',
              }),
              {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'User-Agent': 'Mozilla/5.0',
                },
                timeout: 30000,
              }
            );

            if (convert.data?.dlink) {
              audioUrl = convert.data.dlink;
              console.log('✅ API 4 success');
            }
          }
        }
      } catch {
        console.log('API 4 failed...');
      }
    }

    // API 5 - mp3.dev
    if (!audioUrl) {
      try {
        const videoId = videoUrl.includes('v=')
          ? videoUrl.split('v=')[1]?.split('&')[0]
          : null;

        if (videoId) {
          const dl5 = await axios.get(
            `https://api.vevioz.com/api/button/mp3/${videoId}`,
            {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              timeout: 20000,
            }
          );
          if (dl5.data?.url || dl5.request?.res?.responseUrl) {
            audioUrl = dl5.data?.url || dl5.request?.res?.responseUrl;
            console.log('✅ API 5 success');
          }
        }
      } catch {
        console.log('API 5 failed...');
      }
    }

    if (!audioUrl) {
      return await sock.sendMessage(from, {
        text: `❌ *Could not download:* ${title}\n\n_All download servers are busy right now._\n\nPlease try:\n• Again in 1 minute\n• Different song name\n• Add artist name\n\nExample: *.play Ed Sheeran Perfect*`
      });
    }

    await sock.sendMessage(from, {
      text: `✅ *Found!*\n\n🎵 *${title}*\n👤 *${artist}*\n\n_Sending full audio..._ ⚡`
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

    await sock.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      pttAudio: false,
      fileName: `${title}.mp3`,
    });

  } catch (err) {
    console.error('❌ Play error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ *Download failed!*\n\n_Error: ${err.message}_\n\nPlease try again!`
    });
  }
}