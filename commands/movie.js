import axios from 'axios';
import { exec } from 'child_process';
import fs from 'fs';

function runCommand(cmd, timeout = 180000) {
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

export const name = 'movie';
export const category = 'Entertainment';
export const description = 'Search and download movies';

export async function execute({ sock, msg, from, args }) {
  if (!args[0]) {
    return await sock.sendMessage(from, {
      text: `🎬 *SpeedyMD Movies*\n\n❌ Please provide a movie name!\n\nExamples:\n.movie avengers\n.movie black panther\n.movie lion king\n.movie spider man`
    });
  }

  const query = args.join(' ');

  await sock.sendMessage(from, {
    text: `🎬 *Searching:* ${query}\n⏳ _Please wait..._ ⚡`
  });

  const timestamp = Date.now();
  const tempFile = `/tmp/movie_${timestamp}`;

  try {
    let movieInfo = null;
    let videoFile = null;
    let title = query;

    // Get movie info from OMDB
    try {
      const infoRes = await axios.get(
        `https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=trilogy&plot=short`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000,
        }
      );
      if (infoRes.data?.Title) {
        movieInfo = infoRes.data;
        title = movieInfo.Title;
        console.log('✅ Movie info found:', title);
      }
    } catch {
      console.log('OMDB failed...');
    }

    // Send movie info first
    if (movieInfo) {
      let infoText = `🎬 *${movieInfo.Title}*\n\n`;
      if (movieInfo.Year !== 'N/A') infoText += `📅 *Year:* ${movieInfo.Year}\n`;
      if (movieInfo.Genre !== 'N/A') infoText += `🎭 *Genre:* ${movieInfo.Genre}\n`;
      if (movieInfo.Director !== 'N/A') infoText += `🎥 *Director:* ${movieInfo.Director}\n`;
      if (movieInfo.Actors !== 'N/A') infoText += `👥 *Cast:* ${movieInfo.Actors}\n`;
      if (movieInfo.imdbRating !== 'N/A') infoText += `⭐ *IMDB:* ${movieInfo.imdbRating}/10\n`;
      if (movieInfo.Runtime !== 'N/A') infoText += `⏱️ *Duration:* ${movieInfo.Runtime}\n`;
      if (movieInfo.Plot !== 'N/A') infoText += `\n📖 *Plot:*\n${movieInfo.Plot}\n`;
      infoText += `\n_Downloading video now..._ ⚡`;

      // Send poster with info
      if (movieInfo.Poster && movieInfo.Poster !== 'N/A') {
        try {
          const posterRes = await axios.get(movieInfo.Poster, {
            responseType: 'arraybuffer',
            timeout: 15000,
          });
          await sock.sendMessage(from, {
            image: Buffer.from(posterRes.data),
            caption: infoText,
          });
        } catch {
          await sock.sendMessage(from, { text: infoText });
        }
      } else {
        await sock.sendMessage(from, { text: infoText });
      }
    }

    // Install yt-dlp
    const binPath = await installYtDlp();
    if (!binPath) {
      return await sock.sendMessage(from, {
        text: `❌ Download tool failed. Try again!`
      });
    }

    // Method 1: Download from YouTube
    try {
      console.log('🎬 Trying YouTube download...');
      await runCommand(
        `${binPath} -f "best[filesize<50M]/best[height<=480]" \
        --extractor-args "youtube:player_client=android,ios" \
        --no-playlist \
        -o "${tempFile}_yt.%(ext)s" \
        "ytsearch1:${query} full movie english"`,
        180000
      );

      // Find downloaded file
      const files = fs.readdirSync('/tmp').filter(f =>
        f.startsWith(`movie_${timestamp}_yt`)
      );
      if (files.length > 0) {
        videoFile = `/tmp/${files[0]}`;
        console.log('✅ YouTube download success!');
      }
    } catch {
      console.log('YouTube download failed...');
    }

    // Method 2: Download from Dailymotion
    if (!videoFile) {
      try {
        console.log('🎬 Trying Dailymotion download...');
        await runCommand(
          `${binPath} -f "best[filesize<50M]/best[height<=480]" \
          --no-playlist \
          -o "${tempFile}_dm.%(ext)s" \
          "https://www.dailymotion.com/search/${encodeURIComponent(query + ' full movie')}/videos"`,
          180000
        );

        const files = fs.readdirSync('/tmp').filter(f =>
          f.startsWith(`movie_${timestamp}_dm`)
        );
        if (files.length > 0) {
          videoFile = `/tmp/${files[0]}`;
          console.log('✅ Dailymotion download success!');
        }
      } catch {
        console.log('Dailymotion download failed...');
      }
    }

    // Method 3: Search archive.org
    if (!videoFile) {
      try {
        console.log('🎬 Trying Archive.org...');
        const archiveRes = await axios.get(
          `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier&fl[]=title&rows=1&output=json&mediatype=movies`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
          }
        );

        if (archiveRes.data?.response?.docs?.[0]) {
          const item = archiveRes.data.response.docs[0];
          const archiveUrl = `https://archive.org/download/${item.identifier}`;

          await runCommand(
            `${binPath} -f "best[filesize<50M]/best[height<=480]" \
            --no-playlist \
            -o "${tempFile}_ar.%(ext)s" \
            "${archiveUrl}"`,
            180000
          );

          const files = fs.readdirSync('/tmp').filter(f =>
            f.startsWith(`movie_${timestamp}_ar`)
          );
          if (files.length > 0) {
            videoFile = `/tmp/${files[0]}`;
            console.log('✅ Archive.org download success!');
          }
        }
      } catch {
        console.log('Archive.org download failed...');
      }
    }

    if (!videoFile || !fs.existsSync(videoFile)) {
      return await sock.sendMessage(from, {
        text: `❌ *Could not download video!*\n\n_The movie might not be freely available online._\n\nTry:\n• Different movie name\n• Older/classic movies work better\n• Try again later`
      });
    }

    const videoBuffer = fs.readFileSync(videoFile);
    const sizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(1);
    console.log(`✅ Sending ${sizeMB}MB video`);

    await sock.sendMessage(from, {
      video: videoBuffer,
      mimetype: 'video/mp4',
      caption: `🎬 *${title}*\n\n_Downloaded by SpeedyMD_ ⚡\n_Powered by SwiftBot Tec_ 🚀`,
    });

    // Cleanup
    try { fs.unlinkSync(videoFile); } catch {}

  } catch (err) {
    console.error('❌ Movie error:', err.message);

    // Cleanup
    try {
      const files = fs.readdirSync('/tmp').filter(f =>
        f.startsWith(`movie_${timestamp}`)
      );
      files.forEach(f => {
        try { fs.unlinkSync(`/tmp/${f}`); } catch {}
      });
    } catch {}

    await sock.sendMessage(from, {
      text: `❌ *Download failed!*\n\nPlease try:\n• Different movie name\n• Classic/older movies\n• Try again later`
    });
  }
}