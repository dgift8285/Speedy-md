import ytdl from 'ytdl-core';
import YouTubeSR from 'youtube-sr';
import { PassThrough } from 'stream';

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
    // Search YouTube directly
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

    console.log(`🎵 Found: ${title} - ${videoUrl}`);

    await sock.sendMessage(from, {
      text: `✅ *Found!*\n\n🎵 *${title}*\n👤 *${artist}*\n⏱️ *${duration}*\n\n_Downloading..._ ⚡`
    });

    // Download directly from YouTube
    const audioStream = ytdl(videoUrl, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
    });

    // Convert stream to buffer
    const chunks = [];
    await new Promise((resolve, reject) => {
      audioStream.on('data', chunk => chunks.push(chunk));
      audioStream.on('end', resolve);
      audioStream.on('error', reject);
    });

    const audioBuffer = Buffer.concat(chunks);

    console.log(`✅ Downloaded ${audioBuffer.length} bytes`);

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