const API_KEY = '58b9f2a9'; 
const API_URL = 'https://www.omdbapi.com/';

const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const results = document.getElementById('results');
const loading = document.getElementById('loading');
const pagination = document.getElementById('pagination');
const bgPoster = document.getElementById('bg-poster');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

let currentPage = 1;
let lastQuery = '';

form.addEventListener('submit', function(e) {
    e.preventDefault();
    currentPage = 1;
    searchMovies(input.value.trim(), currentPage);
});

// Allow pressing Enter in the search input to trigger search
input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        form.requestSubmit();
    }
});

function showLoading(show) {
    loading.classList.toggle('show', show);
}

function searchMovies(query, page = 1) {
    if (!query) return;
    lastQuery = query;
    showLoading(true);
    results.innerHTML = '';
    pagination.innerHTML = '';
    bgPoster.style.opacity = 0;
    fetch(`${API_URL}?apikey=${API_KEY}&s=${encodeURIComponent(query)}&page=${page}`)
        .then(res => res.json())
        .then(async data => {
            showLoading(false);
            if (data.Response === 'True') {
                // Find highest-rated movie
                let highestRated = null;
                let highestRating = 0;
                let detailsList = await Promise.all(data.Search.map(m => fetch(`${API_URL}?apikey=${API_KEY}&i=${m.imdbID}`).then(r => r.json())));
                detailsList.forEach(d => {
                    let rating = parseFloat(d.imdbRating);
                    if (!isNaN(rating) && rating > highestRating) {
                        highestRating = rating;
                        highestRated = d;
                    }
                });
                if (highestRated && highestRated.Poster && highestRated.Poster !== 'N/A') {
                    bgPoster.src = highestRated.Poster;
                    bgPoster.style.opacity = 0.7;
                } else {
                    bgPoster.style.opacity = 0;
                }
                renderMovies(data.Search, highestRated);
                renderPagination(Math.ceil(data.totalResults / 10), page);
                if (highestRated) {
                    showDialogue(highestRated);
                }
            } else {
                results.innerHTML = `<div class="no-results">No movies found.</div>`;
                bgPoster.style.opacity = 0;
            }
        })
        .catch(() => {
            showLoading(false);
            results.innerHTML = `<div class="no-results">Error fetching data.</div>`;
            bgPoster.style.opacity = 0;
        });
}

function renderMovies(movies, highestRated) {
    results.innerHTML = movies.map((movie, i) => `
        <div class="movie-card" style="animation-delay:${i * 0.08}s" tabindex="0" data-id="${movie.imdbID}">
            <img class="movie-poster" src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/120x180?text=No+Image'}" alt="${movie.Title}">
            <div class="movie-title">${movie.Title}</div>
            <div class="movie-year">${movie.Year}</div>
        </div>
    `).join('');
    // Add click and keyboard event listeners for cards
    document.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => showDetailsModal(card.dataset.id));
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                showDetailsModal(card.dataset.id);
            }
        });
    });
}
// Famous dialogues for some movies (can be expanded)
const famousDialogues = {
    'The Godfather': "I'm gonna make him an offer he can't refuse.",
    'Forrest Gump': "Life is like a box of chocolates. You never know what you're gonna get.",
    'The Dark Knight': "Why so serious?",
    'Titanic': "I'm the king of the world!",
    'Star Wars': "May the Force be with you.",
    'Casablanca': "Here's looking at you, kid.",
    'Terminator 2: Judgment Day': "Hasta la vista, baby.",
    'Jerry Maguire': "Show me the money!",
    'Gone with the Wind': "Frankly, my dear, I don't give a damn.",
    'Jaws': "You're gonna need a bigger boat."
};

function showDialogue(movie) {
    // Try to find a famous dialogue by title
    let dialogue = famousDialogues[movie.Title];
    if (!dialogue && movie.Plot) {
        // If not found, use first line of plot as fallback
        dialogue = movie.Plot.split('. ')[0] + '.';
    }
    if (dialogue) {
        let dialogueDiv = document.createElement('div');
        dialogueDiv.className = 'dialogue';
        dialogueDiv.textContent = `"${dialogue}"`;
        // Remove previous dialogue
        let old = document.querySelector('.dialogue');
        if (old) old.remove();
        results.parentNode.insertBefore(dialogueDiv, results);
    }
}

function renderPagination(totalPages, current) {
    if (totalPages <= 1) return;
    let buttons = '';
    let start = Math.max(1, current - 2);
    let end = Math.min(totalPages, current + 2);
    for (let i = start; i <= end; i++) {
        buttons += `<button class="page-btn${i === current ? ' active' : ''}" onclick="gotoPage(${i})">${i}</button>`;
    }
    pagination.innerHTML = buttons;
}

window.gotoPage = function(page) {
    currentPage = page;
    searchMovies(lastQuery, page);
}

window.showDetails = function(imdbID) {
};

// Show details in modal popup
function showDetailsModal(imdbID) {
    showLoading(true);
    fetch(`${API_URL}?apikey=${API_KEY}&i=${imdbID}&plot=short`)
        .then(res => res.json())
        .then(data => {
            showLoading(false);
            if (data.Response === 'True') {
                modalBody.innerHTML = `
                    <div class="movie-card movie-details-card" style="box-shadow:none;">
                        <img class="movie-poster" src="${data.Poster !== 'N/A' ? data.Poster : 'https://via.placeholder.com/120x180?text=No+Image'}" alt="${data.Title}">
                        <div class="movie-title">${data.Title}</div>
                        <div class="movie-year">${data.Year}</div>
                        <div class="movie-details">
                            <strong>Plot:</strong> ${data.Plot}<br>
                            <strong>Actors:</strong> ${data.Actors}<br>
                            <strong>IMDB Rating:</strong> ${data.imdbRating}
                        </div>
                    </div>
                `;
                modal.style.display = 'flex';
                modal.setAttribute('aria-modal', 'true');
                modal.setAttribute('role', 'dialog');
                modalClose.focus();
            } else {
                modalBody.innerHTML = `<div class="no-results">Details not found.</div>`;
                modal.style.display = 'flex';
            }
        })
        .catch(() => {
            showLoading(false);
            modalBody.innerHTML = `<div class="no-results">Error fetching details.</div>`;
            modal.style.display = 'flex';
        });
}
// Close modal on click or Escape
modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
    modalBody.innerHTML = '';
});
window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
    }
});
