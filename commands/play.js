import YouTubeSR from 'youtube-sr';
import YTDlpWrap from 'yt-dlp-wrap';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Install yt-dlp binary on first run
async function getYtDlp() {
  try {
    const binPath = join(__dirname, '../yt-dlp');
    if (!fs.existsSync(binPath)) {
      console.log('📥 Installing yt-dlp...');
      await YTDlpWrap.downloadFromGithub(binPath);
      execSync(`chmod +x ${binPath}`);
      console.log('✅ yt-dlp installed!');
    }
    return new YTDlpWrap(binPath);
  } catch (err) {
    console.error('❌ yt-dlp install error:', err.message);
    return null;
  }
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

  const tempFile = join(__dirname, `../temp_${Date.now()}.mp3`);

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

    // Get yt-dlp
    const ytDlp = await getYtDlp();
    if (!ytDlp) {
      return await sock.sendMessage(from, {
        text: `❌ Download tool not available. Please try again!`
      });
    }

    // Download audio
    await ytDlp.execPromise([
      videoUrl,
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '-o', tempFile,
      '--no-playlist',
      '--quiet',
    ]);

    // Check if file exists
    if (!fs.existsSync(tempFile)) {
      // Try with different output name
      const altFile = tempFile.replace('.mp3', '.webm.mp3');
      if (fs.existsSync(altFile)) {
        fs.renameSync(altFile, tempFile);
      } else {
        throw new Error('Downloaded file not found');
      }
    }

    const audioBuffer = fs.readFileSync(tempFile);
    console.log(`✅ Downloaded ${audioBuffer.length} bytes`);

    await sock.sendMessage(from, {
      audio: audioBuffer,
      mimetype: 'audio/mpeg',
      pttAudio: false,
      fileName: `${title}.mp3`,
    });

    // Clean up temp file
    fs.unlinkSync(tempFile);

  } catch (err) {
    console.error('❌ Play error:', err.message);

    // Clean up temp file if exists
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    await sock.sendMessage(from, {
      text: `❌ *Download failed!*\n\n_Error: ${err.message}_\n\nPlease try again!`
    });
  }
}