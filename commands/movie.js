import axios from 'axios';

export const name = 'movie';
export const category = 'Entertainment';
export const description = 'Search and get movie information and download links';

export async function execute({ sock, msg, from, args }) {
  if (!args[0]) {
    return await sock.sendMessage(from, {
      text: `🎬 *SpeedyMD Movies*\n\n❌ Please provide a movie name!\n\nExamples:\n.movie avengers\n.movie black panther\n.movie spider man`
    });
  }

  const query = args.join(' ');

  await sock.sendMessage(from, {
    text: `🎬 *Searching:* ${query}\n⏳ _Please wait..._ ⚡`
  });

  try {
    let movieInfo = null;
    let downloadUrl = null;

    // Search movie info from OMDB
    try {
      const searchRes = await axios.get(
        `https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=trilogy&plot=short`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000,
        }
      );
      if (searchRes.data?.Title) {
        movieInfo = searchRes.data;
        console.log('✅ Movie found:', movieInfo.Title);
      }
    } catch {
      console.log('OMDB search failed...');
    }

    // Search on Dailymotion
    try {
      const dmRes = await axios.get(
        `https://api.dailymotion.com/videos?search=${encodeURIComponent(query + ' full movie')}&limit=1&fields=id,title,duration,url,thumbnail_url`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000,
        }
      );
      if (dmRes.data?.list?.[0]) {
        const video = dmRes.data.list[0];
        downloadUrl = video.url;
        console.log('✅ Dailymotion found:', video.title);

        if (!movieInfo) {
          movieInfo = {
            Title: video.title,
            Year: 'Unknown',
            Genre: 'Unknown',
            Plot: 'No description available',
            imdbRating: 'N/A',
          };
        }
      }
    } catch {
      console.log('Dailymotion search failed...');
    }

    if (!movieInfo && !downloadUrl) {
      return await sock.sendMessage(from, {
        text: `❌ *Movie not found:* ${query}\n\nTry:\n• Full movie name\n• English title\n• Different spelling\n\nExample: *.movie The Lion King*`
      });
    }

    // Build movie info message
    let movieText = `🎬 *${movieInfo?.Title || query}*\n\n`;

    if (movieInfo?.Year && movieInfo.Year !== 'Unknown') {
      movieText += `📅 *Year:* ${movieInfo.Year}\n`;
    }
    if (movieInfo?.Genre && movieInfo.Genre !== 'Unknown') {
      movieText += `🎭 *Genre:* ${movieInfo.Genre}\n`;
    }
    if (movieInfo?.Director && movieInfo.Director !== 'N/A') {
      movieText += `🎥 *Director:* ${movieInfo.Director}\n`;
    }
    if (movieInfo?.Actors && movieInfo.Actors !== 'N/A') {
      movieText += `👥 *Cast:* ${movieInfo.Actors}\n`;
    }
    if (movieInfo?.imdbRating && movieInfo.imdbRating !== 'N/A') {
      movieText += `⭐ *IMDB Rating:* ${movieInfo.imdbRating}/10\n`;
    }
    if (movieInfo?.Runtime && movieInfo.Runtime !== 'N/A') {
      movieText += `⏱️ *Duration:* ${movieInfo.Runtime}\n`;
    }
    if (movieInfo?.Plot && movieInfo.Plot !== 'N/A') {
      movieText += `\n📖 *Plot:*\n${movieInfo.Plot}\n`;
    }

    if (downloadUrl) {
      movieText += `\n🔗 *Watch/Download:*\n${downloadUrl}\n`;
    }

    movieText += `\n_Powered by SpeedyMD_ ⚡`;

    // Send poster if available
    if (movieInfo?.Poster && movieInfo.Poster !== 'N/A') {
      try {
        const posterRes = await axios.get(movieInfo.Poster, {
          responseType: 'arraybuffer',
          timeout: 15000,
        });
        await sock.sendMessage(from, {
          image: Buffer.from(posterRes.data),
          caption: movieText,
        });
      } catch {
        await sock.sendMessage(from, { text: movieText });
      }
    } else {
      await sock.sendMessage(from, { text: movieText });
    }

  } catch (err) {
    console.error('❌ Movie error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ *Search failed!*\n\n_Error: ${err.message}_\n\nPlease try again!`
    });
  }
}