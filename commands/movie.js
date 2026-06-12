import axios from 'axios';

export const name = 'movie';
export const category = 'Entertainment';
export const description = 'Search for any movie and get watch links';

export async function execute({ sock, msg, from, args }) {
  if (!args[0]) {
    return await sock.sendMessage(from, {
      text: `🎬 *SpeedyMD Movies*\n\n❌ Please provide a movie name!\n\nExamples:\n.movie avengers\n.movie black panther\n.movie spider man\n.movie lion king`
    });
  }

  const query = args.join(' ');

  await sock.sendMessage(from, {
    text: `🎬 *Searching:* ${query}\n⏳ _Please wait..._ ⚡`
  });

  try {
    let movieInfo = null;

    // Get movie info from OMDB
    try {
      const res = await axios.get(
        `https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=trilogy&plot=full`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000,
        }
      );
      if (res.data?.Title) {
        movieInfo = res.data;
        console.log('✅ Movie found:', movieInfo.Title);
      }
    } catch {
      console.log('OMDB failed...');
    }

    // If not found try search
    if (!movieInfo) {
      try {
        const res = await axios.get(
          `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&apikey=trilogy&type=movie`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000,
          }
        );
        if (res.data?.Search?.[0]) {
          const first = res.data.Search[0];
          const details = await axios.get(
            `https://www.omdbapi.com/?i=${first.imdbID}&apikey=trilogy&plot=full`,
            { timeout: 15000 }
          );
          if (details.data?.Title) {
            movieInfo = details.data;
          }
        }
      } catch {
        console.log('OMDB search failed...');
      }
    }

    if (!movieInfo) {
      return await sock.sendMessage(from, {
        text: `❌ *Movie not found:* ${query}\n\nTry:\n• Full movie name\n• English title\n• Different spelling\n\nExample: *.movie The Lion King*`
      });
    }

    const title = movieInfo.Title;
    const encodedTitle = encodeURIComponent(title);
    const encodedQuery = encodeURIComponent(query);

    // Build watch links
    const watchLinks =
      `🎬 *${title}* (${movieInfo.Year})\n\n` +
      `🎭 *Genre:* ${movieInfo.Genre || 'N/A'}\n` +
      `🎥 *Director:* ${movieInfo.Director || 'N/A'}\n` +
      `👥 *Cast:* ${movieInfo.Actors || 'N/A'}\n` +
      `⭐ *IMDB:* ${movieInfo.imdbRating || 'N/A'}/10\n` +
      `⏱️ *Duration:* ${movieInfo.Runtime || 'N/A'}\n` +
      `🌍 *Language:* ${movieInfo.Language || 'N/A'}\n\n` +
      `📖 *Plot:*\n${movieInfo.Plot || 'N/A'}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `🔗 *Watch Online:*\n\n` +
      `▶️ *123Movies:*\nhttps://www.123movies.mx/search/${encodedQuery}\n\n` +
      `▶️ *FMovies:*\nhttps://fmoviesz.to/search/${encodedQuery}\n\n` +
      `▶️ *SolarMovie:*\nhttps://solarmovie.pe/search/?q=${encodedQuery}\n\n` +
      `▶️ *Yesmovies:*\nhttps://yesmovies.mn/search/?q=${encodedQuery}\n\n` +
      `▶️ *YouTube:*\nhttps://www.youtube.com/results?search_query=${encodedTitle}+full+movie\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `_Powered by SpeedyMD_ ⚡\n` +
      `_SwiftBot Tec_ 🚀`;

    // Send poster with links
    if (movieInfo.Poster && movieInfo.Poster !== 'N/A') {
      try {
        const posterRes = await axios.get(movieInfo.Poster, {
          responseType: 'arraybuffer',
          timeout: 15000,
        });
        await sock.sendMessage(from, {
          image: Buffer.from(posterRes.data),
          caption: watchLinks,
        });
      } catch {
        await sock.sendMessage(from, { text: watchLinks });
      }
    } else {
      await sock.sendMessage(from, { text: watchLinks });
    }

  } catch (err) {
    console.error('❌ Movie error:', err.message);
    await sock.sendMessage(from, {
      text: `❌ *Search failed!*\n\nPlease try again with a different movie name.`
    });
  }
}