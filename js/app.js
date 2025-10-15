import { auth, db, storage } from './firebase-config.js';
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import {
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js";

// === Глобальные переменные для определения страницы ===
const isResetPage = window.location.pathname.includes('reset-password.html');
const isLoginPage = window.location.pathname.includes('login.html');
const isFilmPage = window.location.pathname.includes('film-page.html');
const isBookmarksPage = window.location.pathname.includes('bookmarks.html');
const isProfilePage = window.location.pathname.includes('profile.html');
const isUsersPage = window.location.pathname.includes('users.html');
const isHomepage = window.location.pathname.includes('index.html') || window.location.pathname === '/';
const isFilmsPage = window.location.pathname.includes('films.html');
const isSeriesPage = window.location.pathname.includes('series.html');
const isEditFilmPage = window.location.pathname.includes('edit-film.html');

// === Глобальные переменные состояния ===
let currentUser = null;
let userRole = 'guest';

// === Элементы для навигации, которые есть на всех страницах ===
let loginBtn;
let logoutBtn;
let mobileMenuButton;
let mainNav;
let profileDropdownContainer;
let usersLink;
let closeMobileMenuBtn;
let mobileMenuBackdrop;
let bookmarksLink;

// === Элементы для страницы профиля ===
const profileDisplay = document.getElementById('profile-display');
const profileEditForm = document.getElementById('profile-edit-form');
const editProfileBtn = document.getElementById('edit-profile-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const saveProfileBtn = document.getElementById('save-profile-btn');
const avatarUploadInput = document.getElementById('avatar-upload');
const profileAvatarImg = document.getElementById('profile-avatar');
const avatarModal = document.getElementById('avatar-modal');
const modalAvatarImg = document.getElementById('modal-avatar-img');

let currentAvatarFile = null;

// === Элементы для страницы пользователей ===
const usersList = document.getElementById('users-list');
const accessDenied = document.getElementById('access-denied');

// === Элементы для админки (добавление контента) ===
const addFilmModal = document.getElementById('add-film-modal');
const closeFilmModalBtn = document.getElementById('close-film-modal-btn');
const filmForm = document.getElementById('film-form');
const addSeriesModal = document.getElementById('add-series-modal');
const closeSeriesModalBtn = document.getElementById('close-series-modal-btn');
const seriesForm = document.getElementById('series-form');
const seasonsContainer = document.getElementById('seasons-container');
const addSeasonBtn = document.getElementById('add-season-btn');

let currentContentId = null;

// === Уведомления ===
function showNotification(type, message) {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;

    const notification = document.createElement('div');
    notification.classList.add(
        'notification',
        'p-4',
        'rounded-lg',
        'shadow-xl',
        'text-white',
        'opacity-0',
        'transform',
        'transition-all',
        'duration-500',
        'translate-x-full',
        'w-80',
        'mb-2',
        'fixed',
        'bottom-4',
        'right-4',
        'z-50'
    );

    if (type === 'success') {
        notification.classList.add('bg-green-600');
    } else if (type === 'error') {
        notification.classList.add('bg-red-600');
    }

    notification.textContent = message;

    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.classList.remove('opacity-0', 'translate-x-full');
        notification.classList.add('opacity-100', 'translate-x-0');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('opacity-100', 'translate-x-0');
        notification.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// === Функции для работы с закладками (используются на всех страницах, включая film-page) ===
const isBookmarked = async (contentId) => {
    if (!currentUser) return false;
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData && userData.films && userData.films.includes(contentId);
    }
    return false;
};

const toggleBookmark = async (contentId) => {
    if (!currentUser) {
        showNotification('error', 'Для добавления в закладки необходимо авторизоваться!');
        return false;
    }
    
    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        let films = userDocSnap.exists() ? userDocSnap.data().films || [] : [];
        const isCurrentlyBookmarked = films.includes(contentId);

        if (isCurrentlyBookmarked) {
            films = films.filter(item => item !== contentId);
            await updateDoc(userDocRef, { films });
            showNotification('success', 'Удалено из закладок!');
        } else {
            films.push(contentId);
            await updateDoc(userDocRef, { films }, { merge: true });
            showNotification('success', 'Добавлено в закладки!');
        }
        return !isCurrentlyBookmarked;
    } catch (error) {
        console.error('Ошибка при переключении закладки:', error);
        showNotification('error', 'Ошибка при работе с закладками. Проверьте консоль и правила безопасности.');
        return false;
    }
};

// === Функция для страницы фильма (film-page.html) ===
const loadFilmPage = async () => {
    if (!isFilmPage) return;

    const filmContainer = document.getElementById('film-details');
    if (!filmContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const filmId = urlParams.get('id');
    if (!filmId) {
        filmContainer.innerHTML = '<p class="text-red-500">ID фильма не найден.</p>';
        return;
    }

    try {
        const docSnap = await getDoc(doc(db, 'content', filmId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            await displayFilmData(data, filmId);
        } else {
            filmContainer.innerHTML = '<p class="text-red-500">Фильм не найден.</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки фильма:', error);
        filmContainer.innerHTML = '<p class="text-red-500">Ошибка загрузки данных фильма.</p>';
    }
};

async function displayFilmData(data, filmId) {
    const container = document.getElementById('film-details');
    const translationText = data.translation === 'dub' ? 'дубляж' : 'закадровый многоголосый';
    const duration = data.duration || '1ч 56м';
    const country = data.country || 'США';
    const rating = data.rating || 6.6;
    const genresList = data.genres ? data.genres.join(', ') : 'Боевик, Триллер, Комедия';
    const director = data.director || 'Уилл Паркер';
    const actors = data.actors || 'Джон Сина, Райан Рейнольдс, Приянка Чопра Джонс, Джек Блэк, Айдана Гловер, Карен Гиллан, Стивен Юн, Декстер Флетчер, Сара Хyland, Принс Харрис, Келан Линдси';

    // Проверка, есть ли фильм в закладках
    const isBookmarked = await isBookmarked(filmId);

    // Кнопка закладок с значком
    let bookmarkButton = '';
    if (!currentUser) {
        bookmarkButton = '<button id="bookmark-btn" class="bg-gray-600 text-white px-4 py-2 rounded-md cursor-not-allowed flex items-center justify-center"><svg class="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5c-1.74 0-3.41.81-4.5 2.09C4.91 3.81 3.24 3 1.5 3 1.17 3 1 3.17 1 3.5S1.17 4 1.5 4c2.48 0 4.37 2.24 4.37 4.83 0 1.5-1.02 2.83-2.5 3.89v.37c2.5 1.03 4.5 3.08 4.5 5.21h2c0-2.13 2-4.18 4.5-5.21v-.37c-1.48-1.06-2.5-2.39-2.5-3.89 0-2.59 1.89-4.83 4.37-4.83 0.33 0 .5-.
