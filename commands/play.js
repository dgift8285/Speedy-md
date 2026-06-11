import YouTubeSR from 'youtube-sr';
import { execSync, exec } from 'child_process';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Install yt-dlp binary
async function installYtDlp() {
  const binPath = '/tmp/yt-dlp';
  try {
    if (!fs.existsSync(binPath)) {
      console.log('📥 Downloading yt-dlp...');
      execSync(
        `curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ${binPath} && chmod +x ${binPath}`,
        { timeout: 60000 }
      );
      console.log('✅ yt-dlp ready!');
    }
    return binPath;
  } catch (err) {
    console.error('❌ yt-dlp install failed:', err.message);
    return null;
  }
}

// Run yt-dlp command
function runYtDlp(binPath, args) {
  return new Promise((resolve, reject) => {
    exec(`${binPath} ${args}`, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

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

  const tempFile = `/tmp/audio_${Date.now()}`;

  try {
    // Search YouTube
    const results = await YouTubeSR.YouTube.search(query, {
      limit: 1,
      type: 'video',
    });

    if (!results || results.length === 0) {
      return await sock.sendMessage(from, {
        text: `❌ Could not find *${query}*!\n\nTry a different song name.`
      });
    }

    const video = results[0];
    const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
    const title = video.title || query;
    const artist = video.channel?.name || 'Unknown';
    const duration = video.durationFormatted || '';

    console.log(`🎵 Found: ${title}`);

    await sock.sendMessage(from, {
      text: `✅ *Found!*\n\n🎵 *${title}*\n👤 *${artist}*\n⏱️ *${duration}*\n\n_Downloading..._ ⚡`
    });

    // Install yt-dlp
    const binPath = await installYtDlp();
    if (!binPath) {
      return await sock.sendMessage(from, {
        text: `❌ Download tool failed to install. Try again!`
      });
    }

    // Download audio
    await runYtDlp(
      binPath,
      `-x --audio-format mp3 --audio-quality 0 -o "${tempFile}.%(ext)s" --no-playlist "${videoUrl}"`
    );

    // Find downloaded file
    let audioFile = `${tempFile}.mp3`;
    if (!fs.existsSync(audioFile)) {
      const files = fs.readdirSync('/tmp').filter(f =>
        f.startsWith(`audio_`) && f.endsWith('.mp3')
      );
      if (files.length > 0) {
        audioFile = `/tmp/${files[files.length - 1]}`;
      } else {
        throw new Error('Audio file not found after download');
      }
    }

    const audioBuffer = fs.readFileSync(audioFile);
    console.log(`✅ Downloaded ${audioBuffer.length} bytes`);

    // Send audio
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
      const files = fs.readdirSync('/tmp').filter(f =>
        f.startsWith('audio_')
      );
      files.forEach(f => {
        try { fs.unlinkSync(`/tmp/${f}`); } catch {}
      });
    } catch {}

    await sock.sendMessage(from, {
      text: `❌ *Download failed!*\n\n_${err.message}_\n\nPlease try again!`
    });
  }
}