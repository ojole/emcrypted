const fs = require('fs');
const path = require('path');

// Correct file path to the actual location of movies.json
const moviesFilePath = path.join(__dirname, '../../public/data/movies.json');
const moviesG2GFilePath = path.join(__dirname, '../../public/data/moviesG2G.json');
const moviesMIAFilePath = path.join(__dirname, '../../public/data/moviesMIA.json');

// HallMonitor function to check and create moviesG2G and moviesMIA
function HallMonitor() {
  const moviesData = JSON.parse(fs.readFileSync(moviesFilePath, 'utf-8'));

  const moviesG2G = [];
  const moviesMIA = [];

  moviesData.forEach((movie) => {
    const isValid = movie.title && movie.description && movie.output && movie.hints && movie.breakdown;
    if (isValid) {
      moviesG2G.push(movie);
    } else {
      const missingFields = [];
      if (!movie.title) missingFields.push('title');
      if (!movie.description) missingFields.push('description');
      if (!movie.output) missingFields.push('output');
      if (!movie.hints) missingFields.push('hints');
      if (!movie.breakdown) missingFields.push('breakdown');
      moviesMIA.push({
        title: movie.title || 'Unknown',
        missing: missingFields.join(', '),
      });
    }
  });

  // Write valid movies to moviesG2G.json
  fs.writeFileSync(moviesG2GFilePath, JSON.stringify(moviesG2G, null, 2));

  // Write invalid/missing movies to moviesMIA.json
  fs.writeFileSync(moviesMIAFilePath, JSON.stringify(moviesMIA, null, 2));

  console.log('HallMonitor completed successfully.');
}

HallMonitor();


