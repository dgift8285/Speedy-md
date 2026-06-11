import YouTubeSR from 'youtube-sr';
import { exec } from 'child_process';
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

function runCommand(cmd, timeout = 120000) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout }, (err, stdout, stderr) => {
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

  const timestamp = Date.now();
  const tempFile = `/tmp/audio_${timestamp}`;

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
        text: `❌ Download tool failed. Try again!`
      });
    }

    // Download with multiple fallback methods
    let audioFile = null;

    // Method 1: Use android client to bypass bot check
    try {
      await runCommand(
        `${binPath} -x --audio-format mp3 --audio-quality 0 \
        --extractor-args "youtube:player_client=android" \
        --no-playlist \
        -o "${tempFile}.%(ext)s" \
        "${videoUrl}"`,
        120000
      );
      if (fs.existsSync(`${tempFile}.mp3`)) {
        audioFile = `${tempFile}.mp3`;
        console.log('✅ Method 1 success (android client)');
      }
    } catch {
      console.log('Method 1 failed, trying Method 2...');
    }

    // Method 2: Use ios client
    if (!audioFile) {
      try {
        await runCommand(
          `${binPath} -x --audio-format mp3 --audio-quality 0 \
          --extractor-args "youtube:player_client=ios" \
          --no-playlist \
          -o "${tempFile}2.%(ext)s" \
          "${videoUrl}"`,
          120000
        );
        if (fs.existsSync(`${tempFile}2.mp3`)) {
          audioFile = `${tempFile}2.mp3`;
          console.log('✅ Method 2 success (ios client)');
        }
      } catch {
        console.log('Method 2 failed, trying Method 3...');
      }
    }

    // Method 3: Use tv_embedded client
    if (!audioFile) {
      try {
        await runCommand(
          `${binPath} -x --audio-format mp3 --audio-quality 0 \
          --extractor-args "youtube:player_client=tv_embedded" \
          --no-playlist \
          -o "${tempFile}3.%(ext)s" \
          "${videoUrl}"`,
          120000
        );
        if (fs.existsSync(`${tempFile}3.mp3`)) {
          audioFile = `${tempFile}3.mp3`;
          console.log('✅ Method 3 success (tv_embedded client)');
        }
      } catch {
        console.log('Method 3 failed, trying Method 4...');
      }
    }

    // Method 4: Use mweb client
    if (!audioFile) {
      try {
        await runCommand(
          `${binPath} -x --audio-format mp3 --audio-quality 0 \
          --extractor-args "youtube:player_client=mweb" \
          --no-playlist \
          -o "${tempFile}4.%(ext)s" \
          "${videoUrl}"`,
          120000
        );
        if (fs.existsSync(`${tempFile}4.mp3`)) {
          audioFile = `${tempFile}4.mp3`;
          console.log('✅ Method 4 success (mweb client)');
        }
      } catch {
        console.log('Method 4 failed...');
      }
    }

    if (!audioFile) {
      throw new Error('All download methods failed');
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

    // Cleanup temp files
    try {
      [1, 2, 3, 4].forEach(i => {
        const f = i === 1
          ? `${tempFile}.mp3`
          : `/tmp/audio_${timestamp}${i}.mp3`;
        if (fs.existsSync(f)) fs.unlinkSync(f);
      });
    } catch {}

    await sock.sendMessage(from, {
      text: `❌ *Download failed!*\n\nYouTube is blocking downloads right now.\n\nPlease try again in a few minutes!`
    });
  }
}