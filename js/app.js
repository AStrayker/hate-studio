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

// === Глобальные переменные ===
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

let currentUser = null;
let userRole = 'guest';

// === Элементы для навигации ===
let loginBtn, logoutBtn, mobileMenuButton, mainNav, profileDropdownContainer, usersLink, closeMobileMenuBtn, mobileMenuBackdrop, bookmarksLink;

// === Элементы для профиля, пользователей, админки (оставляем как есть) ===
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

const usersList = document.getElementById('users-list');
const accessDenied = document.getElementById('access-denied');

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
        'notification', 'p-4', 'rounded-lg', 'shadow-xl', 'text-white', 'opacity-0', 'transform',
        'transition-all', 'duration-500', 'translate-x-full', 'w-32', 'mb-2', 'fixed', 'bottom-4',
        'right-4', 'z-50'
    );

    if (type === 'success') notification.classList.add('bg-green-600');
    else if (type === 'error') notification.classList.add('bg-red-600');

    notification.textContent = message;
    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.classList.remove('opacity-0', 'translate-x-full');
        notification.classList.add('opacity-90', 'translate-x-0');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('opacity-90', 'translate-x-0');
        notification.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// === Инициализация элементов ===
document.addEventListener('DOMContentLoaded', () => {
    loginBtn = document.getElementById('login-btn-desktop') || document.getElementById('login-btn');
    logoutBtn = document.getElementById('logout-btn-desktop') || document.getElementById('logout-btn');
    mobileMenuButton = document.getElementById('mobile-menu-button');
    mainNav = document.getElementById('main-nav');
    profileDropdownContainer = document.getElementById('profile-dropdown-container');
    usersLink = document.getElementById('desktop-users-link') || document.getElementById('mobile-users-link');
    bookmarksLink = document.getElementById('desktop-bookmarks-link') || document.getElementById('mobile-bookmarks-link');
    closeMobileMenuBtn = document.getElementById('close-mobile-menu-btn');
    mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop');

    if (mobileMenuButton && mainNav && closeMobileMenuBtn && mobileMenuBackdrop) {
        mobileMenuButton.addEventListener('click', () => {
            mainNav.classList.add('mobile-nav-visible');
            mobileMenuBackdrop.classList.remove('hidden');
        });
        closeMobileMenuBtn.addEventListener('click', () => {
            mainNav.classList.remove('mobile-nav-visible');
            mobileMenuBackdrop.classList.add('hidden');
        });
        mobileMenuBackdrop.addEventListener('click', () => {
            mainNav.classList.remove('mobile-nav-visible');
            mobileMenuBackdrop.classList.add('hidden');
        });
    }

    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            showNotification('success', 'Выход выполнен!');
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Ошибка выхода:', error);
            showNotification('error', 'Произошла ошибка при выходе.');
        }
    };
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (document.getElementById('logout-btn-desktop')) document.getElementById('logout-btn-desktop').addEventListener('click', handleLogout);

    if (closeFilmModalBtn) closeFilmModalBtn.addEventListener('click', closeModal('film'));
    if (closeSeriesModalBtn) closeSeriesModalBtn.addEventListener('click', closeModal('series'));
    if (addSeasonBtn) addSeasonBtn.addEventListener('click', addSeason);
    if (filmForm) filmForm.addEventListener('submit', handleFilmSubmit);
    if (seriesForm) seriesForm.addEventListener('submit', handleSeriesSubmit);

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;

        const allLoginBtns = document.querySelectorAll('#login-btn, #login-btn-desktop');
        const allLogoutBtns = document.querySelectorAll('#logout-btn, #logout-btn-desktop');
        const allProfileLinks = document.querySelectorAll('#profile-link');
        const allBookmarksLinks = document.querySelectorAll('#desktop-bookmarks-link');
        const allUsersLinks = document.querySelectorAll('#desktop-users-link');

        if (user) {
            allLoginBtns.forEach(btn => btn.classList.add('hidden'));
            allLogoutBtns.forEach(btn => btn.classList.remove('hidden'));
            allProfileLinks.forEach(link => {
                link.classList.remove('hidden');
                link.href = 'profile.html';
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = 'profile.html';
                });
            });

            if (profileDropdownContainer) {
                profileDropdownContainer.addEventListener('mouseenter', () => {
                    const profileDropdown = document.getElementById('profile-dropdown');
                    if (profileDropdown) {
                        profileDropdown.classList.remove('opacity-0', 'scale-y-0');
                        profileDropdown.classList.add('opacity-100', 'scale-y-100');
                    }
                });
                profileDropdownContainer.addEventListener('mouseleave', () => {
                    const profileDropdown = document.getElementById('profile-dropdown');
                    if (profileDropdown) {
                        profileDropdown.classList.remove('opacity-100', 'scale-y-100');
                        profileDropdown.classList.add('opacity-0', 'scale-y-0');
                    }
                });
                allUsersLinks.forEach(link => link.classList.toggle('hidden', userRole !== 'admin'));
            }
        } else {
            allLoginBtns.forEach(btn => btn.classList.remove('hidden'));
            allLogoutBtns.forEach(btn => btn.classList.add('hidden'));
            allProfileLinks.forEach(link => {
                link.classList.remove('hidden');
                link.href = 'login.html';
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = 'login.html';
                });
            });
            if (profileDropdownContainer) {
                const profileDropdown = document.getElementById('profile-dropdown');
                if (profileDropdown) profileDropdown.classList.add('hidden');
            }
        }

        if (user) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                userRole = userDocSnap.data().role || 'user';
            } else {
                userRole = 'user';
                await setDoc(userDocRef, { role: userRole, email: user.email });
            }
        } else {
            userRole = 'guest';
        }

        if (isHomepage) loadContent('all');
        else if (isFilmsPage) loadContent('film');
        else if (isSeriesPage) loadContent('series');
        else if (isBookmarksPage && currentUser) loadBookmarks(currentUser.uid);
        else if (isProfilePage) loadProfilePageContent();
        else if (isUsersPage) loadUserManagementPage();
        else if (isFilmPage) {
            const urlParams = new URLSearchParams(window.location.search);
            const contentId = urlParams.get('id');
            if (contentId) initFilmPage(contentId);
        } else if (isEditFilmPage) {
            const urlParams = new URLSearchParams(window.location.search);
            const filmId = urlParams.get('id');
            if (filmId) loadFilmForEditing(filmId);
        }
    });
});

// === Авторизация (оставляем как есть) ===
if (isLoginPage) {
    const authForm = document.getElementById('auth-form');
    const toggleAuthModeEl = document.getElementById('toggle-auth-mode');
    let isRegisterMode = false;

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                if (isRegisterMode) {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    await setDoc(doc(db, 'users', userCredential.user.uid), {
                        role: 'user', email, displayName: null, dob: null, bio: null, avatarUrl: null
                    });
                    showNotification('success', 'Регистрация прошла успешно!');
                } else {
                    await signInWithEmailAndPassword(auth, email, password);
                    showNotification('success', 'Вход выполнен!');
                }
                window.location.href = 'index.html';
            } catch (error) {
                let errorMessage = 'Произошла ошибка.';
                switch (error.code) {
                    case 'auth/email-already-in-use': errorMessage = 'Учётная запись существует. Сбросьте пароль!'; break;
                    case 'auth/wrong-password': case 'auth/user-not-found': errorMessage = 'Неверный email или пароль.'; break;
                    case 'auth/weak-password': errorMessage = 'Пароль должен быть не менее 6 символов.'; break;
                }
                showNotification('error', errorMessage);
            }
        });
    }

    if (toggleAuthModeEl) {
        toggleAuthModeEl.addEventListener('click', (e) => {
            e.preventDefault();
            isRegisterMode = !isRegisterMode;
            document.getElementById('form-title').textContent = isRegisterMode ? 'Регистрация' : 'Войти';
            document.getElementById('auth-btn').textContent = isRegisterMode ? 'Зарегистрироваться' : 'Войти';
            toggleAuthModeEl.innerHTML = isRegisterMode ? 'Уже есть аккаунт? <a href="#" class="text-blue-400 hover:underline">Войти</a>' : 'Нет аккаунта? <a href="#" class="text-blue-400 hover:underline">Зарегистрироваться</a>';
        });
    }
}

// === Функции для профиля (оставляем как есть) ===
const loadProfilePageContent = async () => { /* ... */ };
const loadProfile = async (user) => { /* ... */ };

// === Функции для управления пользователями (оставляем как есть) ===
const loadUserManagementPage = async () => { /* ... */ };

// === Управление контентом ===
const loadContent = async (type = 'all') => {
    const contentList = document.getElementById('film-list');
    if (!contentList) return;

    contentList.innerHTML = '<p class="text-xl text-gray-400">Загрузка...</p>';
    const q = type === 'all' ? collection(db, 'content') : query(collection(db, 'content'), where('type', '==', type));
    const querySnapshot = await getDocs(q);

    const contentHtml = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const isHidden = data.hidden || false;
        const isVisible = !isHidden || userRole === 'admin';
        if (isVisible) {
            const isBookmarked = currentUser ? (await getBookmarkDoc(doc.id)) !== null : false;
            contentHtml.push(createFilmCard(doc.id, data, isBookmarked));
        }
    });
    contentList.innerHTML = contentHtml.join('');
};

const createFilmCard = (id, data, isBookmarked) => {
    const year = data.releaseYear || new Date().getFullYear();
    const genres = data.genres ? data.genres.join(', ') : 'Не указаны';
    const bookmarkColor = !currentUser ? 'gray' : isBookmarked ? 'red' : 'green';
    const adminActions = userRole === 'admin' ? `
        <div class="admin-actions">
            <button class="edit-btn bg-yellow-600 text-white" data-id="${id}">Редактировать</button>
            <button class="hide-btn bg-gray-600 text-white" data-id="${id}" data-hidden="${data.hidden || false}">${(data.hidden || false) ? 'Показать' : 'Спрятать'}</button>
            <button class="delete-btn bg-red-600 text-white" data-id="${id}">Удалить</button>
        </div>
    ` : '';

    return `
        <div class="film-card" data-id="${id}">
            <a href="film-page.html?id=${id}">
                <img src="${data.posterUrl || 'placeholder-poster.jpg'}" alt="${data.title}">
                <div class="overlay">
                    <h3 class="text-xl font-bold">${data.title}</h3>
                    <p class="text-sm">${year}</p>
                    <p class="text-sm">${genres}</p>
                </div>
            </a>
            <button class="bookmark-icon ${bookmarkColor}" data-id="${id}">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/></svg>
            </button>
            ${adminActions}
        </div>
    `;
};

// === Закладки ===
const getBookmarkDoc = async (contentId) => {
    if (!currentUser) return null;
    const q = query(collection(db, 'bookmarks'), where('contentId', '==', contentId), where('userId', '==', currentUser.uid));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty ? null : querySnapshot.docs[0];
};

const toggleBookmark = async (contentId) => {
    if (!currentUser) {
        showNotification('error', 'Авторизуйтесь для работы с закладками!');
        return;
    }
    try {
        const existingBookmark = await getBookmarkDoc(contentId);
        if (existingBookmark) {
            await deleteDoc(doc(db, 'bookmarks', existingBookmark.id));
            showNotification('success', 'Удалено из закладок!');
        } else {
            await addDoc(collection(db, 'bookmarks'), { contentId, userId: currentUser.uid, createdAt: new Date().toISOString() });
            showNotification('success', 'Добавлено в закладки!');
        }
        loadContent(window.location.pathname.includes('films.html') ? 'film' : window.location.pathname.includes('series.html') ? 'series' : 'all');
    } catch (error) {
        console.error('Ошибка закладок:', error);
        showNotification('error', 'Ошибка при работе с закладками.');
    }
};

// === Обработчики карточек ===
document.addEventListener('click', (e) => {
    const card = e.target.closest('.film-card');
    if (card) {
        const overlay = card.querySelector('.overlay');
        if (e.target.tagName === 'IMG' && !card.classList.contains('overlay-active')) {
            card.classList.add('overlay-active');
        } else if (e.target.tagName === 'IMG' && card.classList.contains('overlay-active')) {
            window.location.href = `film-page.html?id=${card.dataset.id}`;
        } else if (e.target.closest('.bookmark-icon')) {
            toggleBookmark(card.dataset.id);
        } else if (e.target.classList.contains('edit-btn')) {
            currentContentId = e.target.dataset.id;
            // Логика редактирования
        } else if (e.target.classList.contains('hide-btn')) {
            const id = e.target.dataset.id;
            updateDoc(doc(db, 'content', id), { hidden: e.target.dataset.hidden !== 'true' });
            loadContent();
        } else if (e.target.classList.contains('delete-btn')) {
            if (confirm('Удалить фильм?')) {
                deleteDoc(doc(db, 'content', e.target.dataset.id));
                loadContent();
            }
        }
    }
});

// === Загрузка страниц ===
const loadHomepageContent = () => loadContent('all');
const loadBookmarks = async (userId) => {
    const contentList = document.getElementById('film-list');
    if (!contentList) return;
    contentList.innerHTML = '<p class="text-xl text-gray-400">Загрузка...</p>';
    const userDoc = await getDoc(doc(db, 'bookmarks', userId));
    if (!userDoc.exists() || !userDoc.data().films?.length) {
        contentList.innerHTML = '<p class="text-xl text-gray-400">Нет закладок.</p>';
        return;
    }
    const contentIds = userDoc.data().films;
    const contentMap = new Map();
    for (const id of contentIds) {
        const docSnap = await getDoc(doc(db, 'content', id));
        if (docSnap.exists()) contentMap.set(id, { id, ...docSnap.data() });
    }
    contentList.innerHTML = Array.from(contentMap.values()).map(data => createFilmCard(data.id, data, true)).join('');
};

// === Профиль, пользователи, админка (оставляем как есть) ===
const closeModal = (type) => () => { /* ... */ };
function addSeason() { /* ... */ }
function addEpisode(container) { /* ... */ }
const handleFilmSubmit = async (e) => { /* ... */ };
const handleSeriesSubmit = async (e) => { /* ... */ };
const loadProfilePageContent = async () => { /* ... */ };
const loadProfile = async (user) => { /* ... */ };
const loadUserManagementPage = async () => { /* ... */ };
const initFilmPage = async (contentId) => { /* ... */ };
const loadFilmForEditing = async (filmId) => { /* ... */ };
