import axios from 'axios';
import { exec } from 'child_process';
import fs from 'fs';

function runCommand(cmd, timeout = 120000) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

async function installYtDlp() {
  const binPath = '/tmp/yt-dlp';
  try {
    if (!fs.existsSync(binPath)) {
      console.log('📥 Downloading yt-dlp...');
      await runCommand(
        `curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ${binPath} && chmod +x ${binPath}`
      );
      console.log('✅ yt-dlp ready!');
    }
    return binPath;
  } catch (err) {
    console.error('❌ yt-dlp install failed:', err.message);
    return null;
  }
}

export const name = 'play';
export const category = 'Music';
export const description = 'Search and download any music in any language';

export async function execute({ sock, msg, from, args }) {
  if (!args[0]) {
    return await sock.sendMessage(from, {
      text: `🎵 *SpeedyMD Music*\n\n❌ Please provide a song name!\n\nExamples:\n.play shape of you\n.play figo wa mtaa\n.play burna boy\n.play diamond platnumz`
    });
  }

  const query = args.join(' ');

  await sock.sendMessage(from, {
    text: `🎵 *Searching:* ${query}\n⏳ _Please wait..._ ⚡`
  });

  const timestamp = Date.now();
  const tempFile = `/tmp/audio_${timestamp}`;

  try {
    let audioFile = null;
    let title = query;
    let artist = 'Unknown';
    let duration = '';

    // Method 1: SoundCloud search and download
    try {
      console.log('🎵 Trying SoundCloud...');

      // Search SoundCloud
      const searchRes = await axios.get(
        `https://api.soundcloud.com/tracks?q=${encodeURIComponent(query)}&client_id=a3e059563d7fd3372b49b37f00a00bcf&limit=1&linked_partitioning=1`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000,
        }
      );

      if (searchRes.data?.collection?.[0]) {
        const track = searchRes.data.collection[0];
        title = track.title || query;
        artist = track.user?.username || 'Unknown';
        duration = track.duration
          ? `${Math.floor(track.duration / 60000)}:${String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}`
          : '';

        console.log(`✅ SoundCloud found: ${title}`);

        // Get stream URL
        const streamUrl = `${track.stream_url}?client_id=a3e059563d7fd3372b49b37f00a00bcf`;

        await sock.sendMessage(from, {
          text: `✅ *Found on SoundCloud!*\n\n🎵 *${title}*\n👤 *${artist}*\n⏱️ *${duration}*\n\n_Downloading..._ ⚡`
        });

        // Download audio
        const audioRes = await axios.get(streamUrl, {
          responseType: 'arraybuffer',
          timeout: 120000,
          headers: { 'User-Agent': 'Mozilla/5.0' },
          maxContentLength: 200 * 1024 * 1024,
        });

        audioFile = `${tempFile}.mp3`;
        fs.writeFileSync(audioFile, Buffer.from(audioRes.data));
        console.log('✅ SoundCloud download success!');
      }
    } catch (err) {
      console.log('SoundCloud failed:', err.message);
    }

    // Method 2: SoundCloud with different client_id
    if (!audioFile) {
      try {
        console.log('🎵 Trying SoundCloud API 2...');

        const searchRes = await axios.get(
          `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=iZIs9mchVcX5lhVRyQGGAYlNPVldzAoX&limit=1`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
          }
        );

        if (searchRes.data?.collection?.[0]) {
          const track = searchRes.data.collection[0];
          title = track.title || query;
          artist = track.user?.username || 'Unknown';
          duration = track.duration
            ? `${Math.floor(track.duration / 60000)}:${String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}`
            : '';

          const transcodings = track.media?.transcodings;
          if (transcodings?.length > 0) {
            const progressive = transcodings.find(t =>
              t.format?.protocol === 'progressive'
            ) || transcodings[0];

            const streamRes = await axios.get(
              `${progressive.url}?client_id=iZIs9mchVcX5lhVRyQGGAYlNPVldzAoX`,
              {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 15000,
              }
            );

            if (streamRes.data?.url) {
              await sock.sendMessage(from, {
                text: `✅ *Found on SoundCloud!*\n\n🎵 *${title}*\n👤 *${artist}*\n⏱️ *${duration}*\n\n_Downloading..._ ⚡`
              });

              const audioRes = await axios.get(streamRes.data.url, {
                responseType: 'arraybuffer',
                timeout: 120000,
                headers: { 'User-Agent': 'Mozilla/5.0' },
                maxContentLength: 200 * 1024 * 1024,
              });

              audioFile = `${tempFile}.mp3`;
              fs.writeFileSync(audioFile, Buffer.from(audioRes.data));
              console.log('✅ SoundCloud API 2 success!');
            }
          }
        }
      } catch (err) {
        console.log('SoundCloud API 2 failed:', err.message);
      }
    }

    // Method 3: yt-dlp with SoundCloud
    if (!audioFile) {
      try {
        console.log('🎵 Trying yt-dlp SoundCloud...');
        const binPath = await installYtDlp();
        if (binPath) {
          const scUrl = `https://soundcloud.com/search?q=${encodeURIComponent(query)}`;
          await runCommand(
            `${binPath} -x --audio-format mp3 --audio-quality 0 \
            --default-search "scsearch" \
            --no-playlist \
            -o "${tempFile}_sc.%(ext)s" \
            "scsearch1:${query}"`,
            120000
          );
          if (fs.existsSync(`${tempFile}_sc.mp3`)) {
            audioFile = `${tempFile}_sc.mp3`;
            console.log('✅ yt-dlp SoundCloud success!');
          }
        }
      } catch (err) {
        console.log('yt-dlp SoundCloud failed:', err.message);
      }
    }

    // Method 4: yt-dlp YouTube android client
    if (!audioFile) {
      try {
        console.log('🎵 Trying yt-dlp YouTube...');
        const binPath = await installYtDlp();
        if (binPath) {
          await runCommand(
            `${binPath} -x --audio-format mp3 --audio-quality 0 \
            --extractor-args "youtube:player_client=android,ios" \
            --default-search "ytsearch" \
            --no-playlist \
            -o "${tempFile}_yt.%(ext)s" \
            "ytsearch1:${query}"`,
            120000
          );
          if (fs.existsSync(`${tempFile}_yt.mp3`)) {
            audioFile = `${tempFile}_yt.mp3`;
            console.log('✅ yt-dlp YouTube success!');
          }
        }
      } catch (err) {
        console.log('yt-dlp YouTube failed:', err.message);
      }
    }

    if (!audioFile || !fs.existsSync(audioFile)) {
      return await sock.sendMessage(from, {
        text: `❌ *Could not download:* ${query}\n\nPlease try:\n• Different song name\n• Add artist name\n• Try again in 1 minute\n\nExample: *.play Ed Sheeran Perfect*`
      });
    }

    const audioBuffer = fs.readFileSync(audioFile);
    console.log(`✅ Sending ${audioBuffer.length} bytes`);

    await sock.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      pttAudio: false,
      fileName: `${title}.mp3`,
    });

    // Cleanup
    try { fs.unlinkSync(audioFile); } catch {}

  } catch (err) {
    console.error('❌ Play error:', err.message);
    try {
      ['', '_sc', '_yt'].forEach(suffix => {
        const f = `/tmp/audio_${timestamp}${suffix}.mp3`;
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
    } catch {}

    await sock.sendMessage(from, {
      text: `❌ *Download failed!*\n\nPlease try again with a different song name.`
    });
  }
}