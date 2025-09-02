import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variables
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let allMovies = [];
let allSeries = [];
let userBookmarks = [];

// Utility function to show modal alerts
window.showAlertModal = (message) => {
    const modalHtml = `<div id="alert-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50"><div class="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-sm text-center"><p class="text-white mb-4">${message}</p><button onclick="document.getElementById('alert-modal').remove()" class="bg-red-600 text-white px-4 py-2 rounded-md">OK</button></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// Function to render a single content card
function renderContentCard(content, isBookmark = false) {
    const card = document.createElement('div');
    card.className = "bg-gray-800 rounded-lg shadow-lg overflow-hidden flex-shrink-0 cursor-pointer";
    card.innerHTML = `
        <img src="${content.poster}" alt="${content.title}" class="w-full h-80 object-cover" onerror="this.src='https://placehold.co/600x400/1f2937/d1d5db?text=No+Image';">
        <div class="p-4 text-white">
            <h3 class="text-xl font-bold">${content.title}</h3>
            <p class="text-gray-400 mt-2">${content.year}</p>
            <div class="mt-4 flex items-center space-x-2">
                <button class="add-bookmark-btn bg-yellow-500 text-black p-2 rounded-md hover:bg-yellow-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                    </svg>
                </button>
                <button class="remove-bookmark-btn bg-red-600 text-white p-2 rounded-md hover:bg-red-700 transition-colors ${!isBookmark ? 'hidden' : ''}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-1 1v2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-3V3a1 1 0 10-2 0v2H9V3a1 1 0 00-1-1zM7 7h6v9H7V7z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        window.location.href = `details.html?id=${content.id}`;
    });

    const addBookmarkBtn = card.querySelector('.add-bookmark-btn');
    addBookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click event
        handleAddBookmark(content);
    });

    const removeBookmarkBtn = card.querySelector('.remove-bookmark-btn');
    if (isBookmark) {
        removeBookmarkBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click event
            handleRemoveBookmark(content.id);
        });
    }

    return card;
}

// Global functions for pages to call
window.renderHomepage = async () => {
    await fetchContent();
    const container = document.getElementById('content-list');
    renderContent(container, allMovies.slice(0, 4));
};

window.renderAllFilms = async () => {
    await fetchContent();
    const container = document.getElementById('content-list');
    renderContent(container, allMovies);
};

window.renderAllSeries = async () => {
    await fetchContent();
    const container = document.getElementById('content-list');
    renderContent(container, allSeries);
};

window.renderContentDetail = async (contentId) => {
    await fetchContent();
    const content = allMovies.find(m => m.id === contentId) || allSeries.find(s => s.id === contentId);
    if (!content) {
        document.getElementById('content-detail').innerHTML = '<p class="text-center text-white">Контент не найден.</p>';
        return;
    }
    
    document.getElementById('content-detail').innerHTML = `
        <div class="flex flex-col md:flex-row items-start md:space-x-8">
            <img src="${content.poster}" alt="${content.title}" class="w-full md:w-1/3 rounded-lg shadow-lg mb-4 md:mb-0" onerror="this.src='https://placehold.co/600x400/1f2937/d1d5db?text=No+Image';">
            <div class="flex-grow">
                <h2 class="text-4xl font-bold text-orange-500 mb-2">${content.title}</h2>
                <p class="text-gray-400 mb-4">${content.year}</p>
                <p class="text-white mb-4">${content.description || 'Описание отсутствует.'}</p>
                <div class="space-y-2 text-gray-300">
                    <p><strong>Режиссер:</strong> ${content.director || 'Неизвестно'}</p>
                    <p><strong>Актеры:</strong> ${content.actors || 'Неизвестно'}</p>
                    <p><strong>Жанр:</strong> ${content.genre || 'Неизвестно'}</p>
                </div>
                <div id="rating-section" class="mt-6">
                    <h3 class="text-xl font-bold text-white mb-2">Оцените этот контент</h3>
                    <div class="flex items-center space-x-2 text-yellow-400 text-3xl mb-4">
                        <span id="average-rating">...</span>
                        <span class="text-xl text-gray-400">/ 5</span>
                    </div>
                    <div id="user-rating-stars" class="flex space-x-1 cursor-pointer">
                        <span data-rating="1" class="hover:text-yellow-400 transition-colors">★</span>
                        <span data-rating="2" class="hover:text-yellow-400 transition-colors">★</span>
                        <span data-rating="3" class="hover:text-yellow-400 transition-colors">★</span>
                        <span data-rating="4" class="hover:text-yellow-400 transition-colors">★</span>
                        <span data-rating="5" class="hover:text-yellow-400 transition-colors">★</span>
                    </div>
                </div>
                <div class="mt-6 flex space-x-4">
                    <button class="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors">Смотреть</button>
                    <button id="add-bookmark-btn" class="bg-yellow-500 text-black px-6 py-3 rounded-md hover:bg-yellow-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                        </svg>
                        Закладка
                    </button>
                </div>
            </div>
        </div>
        <div id="comments-section" class="mt-12">
            <h3 class="text-2xl font-bold text-white mb-4">Комментарии</h3>
            <div id="comments-list" class="space-y-4"></div>
            <div class="mt-6">
                <textarea id="comment-input" class="w-full p-4 rounded-lg bg-gray-700 text-white placeholder-gray-400" rows="4" placeholder="Напишите свой комментарий..."></textarea>
                <button id="add-comment-btn" class="mt-4 bg-orange-500 text-white px-6 py-3 rounded-md hover:bg-orange-600 transition-colors">Отправить комментарий</button>
            </div>
        </div>
    `;

    document.getElementById('add-bookmark-btn').addEventListener('click', () => handleAddBookmark(content));

    const ratingStars = document.getElementById('user-rating-stars');
    ratingStars.addEventListener('click', (e) => {
        if (e.target.tagName === 'SPAN' && e.target.hasAttribute('data-rating')) {
            const rating = parseInt(e.target.getAttribute('data-rating'));
            addRating(content.type, content.id, rating);
        }
    });

    const ratingsRef = collection(db, `/artifacts/${appId}/public/data/${content.type}s/${content.id}/ratings`);
    onSnapshot(ratingsRef, (snapshot) => {
        let totalRating = 0;
        let ratingCount = 0;
        snapshot.forEach(doc => {
            totalRating += doc.data().rating;
            ratingCount++;
        });
        const averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : '...';
        document.getElementById('average-rating').textContent = averageRating;
    });

    const commentsRef = collection(db, `/artifacts/${appId}/public/data/${content.type}s/${content.id}/comments`);
    onSnapshot(commentsRef, (snapshot) => {
        const commentsList = document.getElementById('comments-list');
        commentsList.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const comment = doc.data();
            const commentDiv = document.createElement('div');
            commentDiv.className = 'bg-gray-700 p-4 rounded-lg';
            commentDiv.innerHTML = `
                <p class="text-gray-300 font-bold">${comment.user}:</p>
                <p class="text-white mt-2">${comment.text}</p>
            `;
            commentsList.appendChild(commentDiv);
        });
    });

    document.getElementById('add-comment-btn').addEventListener('click', async () => {
        const commentInput = document.getElementById('comment-input');
        if (!currentUser) {
            showAlertModal("Для отправки комментария необходимо войти в аккаунт.");
            return;
        }
        if (commentInput.value.trim() !== '') {
            await addDoc(commentsRef, {
                user: currentUser?.displayName || 'Аноним',
                text: commentInput.value,
                createdAt: new Date().toISOString()
            });
            commentInput.value = '';
        }
    });
};

window.renderBookmarks = async () => {
    if (!currentUser) {
        const container = document.getElementById('content-list');
        container.innerHTML = `<p class="text-white text-center">Пожалуйста, войдите в аккаунт, чтобы просмотреть закладки.</p>`;
        return;
    }
    const bookmarksRef = collection(db, `/artifacts/${appId}/users/${currentUser.uid}/bookmarks`);
    onSnapshot(bookmarksRef, (snapshot) => {
        userBookmarks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const container = document.getElementById('content-list');
        renderContent(container, userBookmarks, true);
    });
};

window.renderProfile = () => {
    const profileDetails = document.getElementById('profile-details');
    if (currentUser) {
        profileDetails.innerHTML = `
            <div class="flex items-center space-x-4">
                <img src="${currentUser.photoURL || 'https://via.placeholder.com/100'}" alt="Profile" class="w-20 h-20 rounded-full" />
                <div>
                    <p class="text-gray-400">UID: <span class="text-white break-all">${currentUser.uid}</span></p>
                    <p class="text-gray-400">Статус: <span class="text-red-500">Пользователь</span></p>
                </div>
            </div>
            <p class="text-gray-400">Email: <span class="text-white">${currentUser.email || 'Не указан'}</span></p>
        `;
    } else {
        profileDetails.innerHTML = `<p class="text-white">Пожалуйста, войдите, чтобы просмотреть свой профиль.</p>`;
    }
};

window.handleLogin = () => {
    const googleSignInBtn = document.getElementById('google-signin-btn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
                window.location.href = 'profile.html';
            } catch (error) {
                console.error("Google Sign-In Error:", error);
            }
        });
    }
};

window.handleSearch = (type, query) => {
    const container = document.getElementById('content-list');
    const contentList = type === 'all-movies' ? allMovies : allSeries;
    const filteredContent = contentList.filter(content => content.title.toLowerCase().includes(query.toLowerCase()));
    renderContent(container, filteredContent);
};

async function fetchContent() {
    if (allMovies.length === 0 || allSeries.length === 0) {
        try {
            const moviesRef = collection(db, `/artifacts/${appId}/public/data/movies`);
            const seriesRef = collection(db, `/artifacts/${appId}/public/data/series`);
            
            const [moviesSnap, seriesSnap] = await Promise.all([getDocs(moviesRef), getDocs(seriesRef)]);
            
            allMovies = moviesSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'movie' }));
            allSeries = seriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'series' }));
        } catch (e) {
            console.error("Initialization error:", e);
        }
    }
}

function renderContent(container, contentToRender, isBookmark = false) {
    container.innerHTML = '';
    if (contentToRender.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center">Ничего не найдено.</p>`;
    } else {
        contentToRender.forEach(content => {
            container.appendChild(renderContentCard(content, isBookmark));
        });
    }
}

async function handleAddBookmark(content) {
    if (!currentUser) {
        showAlertModal("Для добавления в закладки необходимо войти в аккаунт.");
        return;
    }
    try {
        const bookmarkRef = doc(db, `/artifacts/${appId}/users/${currentUser.uid}/bookmarks`, content.id);
        await setDoc(bookmarkRef, { ...content });
        showAlertModal("Контент добавлен в закладки.");
    } catch (e) {
        console.error("Error adding bookmark: ", e);
    }
}

async function handleRemoveBookmark(contentId) {
    if (!currentUser) return;
    try {
        const bookmarkRef = doc(db, `/artifacts/${appId}/users/${currentUser.uid}/bookmarks`, contentId);
        await deleteDoc(bookmarkRef);
    } catch (e) {
        console.error("Error removing bookmark: ", e);
    }
}

async function addRating(contentType, contentId, rating) {
    if (!currentUser) {
        showAlertModal("Для оценки контента необходимо войти в аккаунт.");
        return;
    }
    try {
        const ratingRef = doc(db, `/artifacts/${appId}/public/data/${contentType}s/${contentId}/ratings`, currentUser.uid);
        await setDoc(ratingRef, { rating: rating, user: currentUser.uid });
        showAlertModal("Ваша оценка учтена.");
    } catch (e) {
        console.error("Error adding rating: ", e);
    }
}

// Initial authentication and global event listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof __initial_auth_token !== 'undefined') {
            await signInWithCustomToken(auth, __initial_auth_token);
        } else {
            await signInAnonymously(auth);
        }
        await fetchContent();
    } catch (e) {
        console.error("Initialization error:", e);
    }

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        if (user) {
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
        } else {
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
        }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            window.location.href = 'index.html';
        });
    }

    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const navMenu = document.getElementById('main-nav');
    if (mobileMenuButton && navMenu) {
        mobileMenuButton.addEventListener('click', () => {
            navMenu.classList.toggle('hidden');
        });
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (!navMenu.classList.contains('hidden')) {
                    navMenu.classList.add('hidden');
                }
            });
        });
    }
});
