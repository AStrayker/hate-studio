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
const isHomepage = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('index.html');

let userRole = 'guest';

// Элементы формы
const authForm = document.getElementById('auth-form');
const resetForm = document.getElementById('reset-form');

// Элементы для добавления контента
const addFilmForm = document.getElementById('add-film-form');
const addSeriesForm = document.getElementById('add-series-form');
const seasonsContainer = document.getElementById('seasons-container');

// Элементы для отображения контента
const filmsList = document.getElementById('films-list');
const seriesList = document.getElementById('series-list');
const contentList = document.getElementById('content-list'); // Используется на странице закладок

// Модальные окна
const addMovieModal = document.getElementById('add-movie-modal');
const addSeriesModal = document.getElementById('add-series-modal');

// === Вспомогательные функции ===

/**
 * Отображает уведомление
 * @param {string} type - 'success' или 'error'
 * @param {string} message - Текст сообщения
 */
const showNotification = (type, message) => {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification fixed right-5 top-5 z-[9999] p-4 rounded-lg shadow-xl text-white transform transition-all duration-500 opacity-0 ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    notification.textContent = message;

    container.appendChild(notification);

    // Анимация появления
    setTimeout(() => {
        notification.classList.remove('opacity-0');
        notification.classList.add('opacity-100');
    }, 10);

    // Анимация скрытия
    setTimeout(() => {
        notification.classList.remove('opacity-100');
        notification.classList.add('opacity-0');
        // Удаление элемента после исчезновения
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 4000);
};

// === Аутентификация и Управление Пользователем ===

/**
 * Обрабатывает вход/регистрацию
 * @param {Event} e 
 */
const handleAuthFormSubmit = async (e) => {
    e.preventDefault();
    
    const email = authForm.email.value;
    const password = authForm.password.value;
    const isSignIn = authForm.dataset.mode === 'signin';
    const submitBtn = authForm.querySelector('button[type="submit"]');

    submitBtn.textContent = isSignIn ? 'Вход...' : 'Регистрация...';
    submitBtn.disabled = true;

    try {
        if (isSignIn) {
            // Вход
            await signInWithEmailAndPassword(auth, email, password);
            showNotification('success', 'Вход выполнен успешно! Перенаправление...');
            window.location.href = 'index.html';
        } else {
            // Регистрация
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Создание документа пользователя по умолчанию (роль: user)
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                role: 'user', 
                displayName: email.split('@')[0]
            });
            
            showNotification('success', 'Регистрация успешна! Выполняется вход...');
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Ошибка аутентификации:", error);
        
        // Показываем ошибку пользователю
        let errorMessage = 'Произошла ошибка при аутентификации.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Пользователь с таким email уже существует.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Пароль должен содержать минимум 6 символов.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Неверный формат email.';
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Неверный email или пароль.';
        }
        showNotification('error', errorMessage);

    } finally {
        submitBtn.textContent = isSignIn ? 'Войти' : 'Зарегистрироваться';
        submitBtn.disabled = false;
    }
};

/**
 * Обрабатывает выход пользователя
 */
const handleLogout = async () => {
    try {
        await signOut(auth);
        showNotification('success', 'Вы вышли из системы.');
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Ошибка при выходе:", error);
        showNotification('error', 'Ошибка при выходе из системы.');
    }
};

/**
 * Обрабатывает сброс пароля
 * @param {Event} e 
 */
const handlePasswordReset = async (e) => {
    e.preventDefault();
    const email = resetForm.email.value;

    try {
        await sendPasswordResetEmail(auth, email);
        showNotification('success', 'Письмо для сброса пароля отправлено на ваш email!');
    } catch (error) {
        console.error("Ошибка сброса пароля:", error);
        let errorMessage = 'Ошибка при сбросе пароля.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Пользователь с таким email не найден.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Неверный формат email.';
        }
        showNotification('error', errorMessage);
    }
};

// === Управление контентом (Фильмы, Сериалы) ===

/**
 * Загружает и отображает контент (фильмы или сериалы)
 * @param {string} type - 'film' или 'series'
 */
const loadContent = async (type) => {
    const contentContainer = type === 'film' ? filmsList : seriesList;
    if (!contentContainer) return;

    try {
        const q = query(collection(db, 'content'), where('type', '==', type));
        const querySnapshot = await getDocs(q);
        
        let contentHtml = '';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            contentHtml += `
                <a href="film-page.html?id=${doc.id}" class="block bg-gray-800 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                    <div class="relative w-full aspect-[2/3] overflow-hidden">
                        <img src="${data.posterUrl}" alt="${data.title}" class="w-full h-full object-cover">
                    </div>
                    <div class="p-3">
                        <h3 class="text-base font-semibold truncate text-white">${data.title}</h3>
                        <p class="text-gray-400 text-xs mt-1">Тип: ${data.type === 'film' ? 'Фильм' : 'Сериал'}</p>
                        <p class="text-gray-400 text-xs">Рейтинг: ${data.rating || 'N/A'}</p>
                    </div>
                </a>
            `;
        });
        
        contentContainer.innerHTML = contentHtml || '<p class="text-gray-400 col-span-full text-center py-10">Контент данного типа пока отсутствует.</p>';
    } catch (error) {
        console.error(`Ошибка при загрузке ${type}:`, error);
        contentContainer.innerHTML = `<p class="text-red-400 col-span-full text-center py-10">Не удалось загрузить контент.</p>`;
    }
};

/**
 * Загружает и отображает данные конкретного фильма/сериала
 */
const loadFilmData = async () => {
    const filmId = new URLSearchParams(window.location.search).get('id');
    const filmContainer = document.getElementById('film-content');
    if (!filmId || !filmContainer) return;

    try {
        const docRef = doc(db, 'content', filmId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const isAdmin = userRole === 'admin';
            const isBookmarked = await checkBookmarkStatus(filmId);
            
            // Логика отображения кнопки закладок
            const bookmarkButtonHtml = auth.currentUser 
                ? `<button id="bookmark-btn" class="px-6 py-2 rounded-lg font-semibold transition-colors ${
                    isBookmarked ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
                }">
                    ${isBookmarked ? 'Удалить из закладок' : 'Добавить в закладки'}
                </button>` 
                : '<p class="text-gray-400 mt-2">Войдите, чтобы добавить в закладки.</p>';
            
            // Логика отображения админ-кнопок
            const adminButtonsHtml = isAdmin ? `
                <button id="edit-content-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mr-2">Редактировать</button>
                <button id="delete-content-btn" class="bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-colors">Удалить</button>
            ` : '';

            // Отображение контента
            filmContainer.innerHTML = `
                <div class="flex flex-col md:flex-row gap-8">
                    <div class="md:w-1/3 flex-shrink-0">
                        <img src="${data.posterUrl}" alt="${data.title}" class="w-full h-auto rounded-xl shadow-2xl object-cover aspect-[2/3]">
                    </div>
                    <div class="md:w-2/3">
                        <h1 class="text-4xl font-bold mb-4">${data.title}</h1>
                        <div class="flex items-center space-x-4 mb-6 text-xl">
                            <span class="text-yellow-400 font-bold">${data.rating || 'N/A'}</span>
                            <span class="text-gray-400">|</span>
                            <span class="text-gray-300">${data.type === 'film' ? 'Фильм' : 'Сериал'}</span>
                        </div>
                        
                        <p class="text-gray-300 mb-8 leading-relaxed">${data.description}</p>
                        
                        <div class="flex items-center space-x-4 mb-8">
                            ${bookmarkButtonHtml}
                            ${adminButtonsHtml}
                        </div>
                        
                        ${data.videoUrl ? `
                            <h2 class="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">Смотреть</h2>
                            <div class="video-player bg-gray-700 rounded-xl overflow-hidden shadow-inner">
                                <iframe src="${data.videoUrl}" class="w-full h-96" frameborder="0" allowfullscreen></iframe>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            // Добавление обработчика для кнопки закладок
            const bookmarkBtn = document.getElementById('bookmark-btn');
            if (bookmarkBtn) {
                bookmarkBtn.addEventListener('click', () => handleBookmarkToggle(filmId, isBookmarked, bookmarkBtn));
            }

            // Добавление обработчика для кнопки удаления (Админ)
            const deleteBtn = document.getElementById('delete-content-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => handleDeleteContent(filmId, data.title));
            }


        } else {
            filmContainer.innerHTML = `<p class="text-red-400 text-center py-20">Контент не найден.</p>`;
        }
    } catch (error) {
        console.error("Ошибка при загрузке данных фильма:", error);
        filmContainer.innerHTML = `<p class="text-red-400 text-center py-20">Не удалось загрузить данные.</p>`;
    }
};

/**
 * Переключает статус закладки (добавить/удалить)
 * @param {string} contentId 
 * @param {boolean} isCurrentlyBookmarked 
 * @param {HTMLElement} btn 
 */
const handleBookmarkToggle = async (contentId, isCurrentlyBookmarked, btn) => {
    if (!auth.currentUser) {
        showNotification('error', 'Для закладок необходимо войти в систему.');
        return;
    }

    const userId = auth.currentUser.uid;
    const bookmarkRef = doc(db, 'bookmarks', userId);
    
    try {
        if (isCurrentlyBookmarked) {
            // Удаление из закладок
            await updateDoc(bookmarkRef, {
                contentIds: arrayRemove(contentId)
            });
            btn.textContent = 'Добавить в закладки';
            btn.classList.replace('bg-red-600', 'bg-red-500');
            btn.classList.replace('hover:bg-red-700', 'hover:bg-red-600');
            showNotification('success', 'Удалено из закладок.');
        } else {
            // Добавление в закладки
            const docSnap = await getDoc(bookmarkRef);
            if (!docSnap.exists()) {
                await setDoc(bookmarkRef, { userId: userId, contentIds: [contentId] });
            } else {
                await updateDoc(bookmarkRef, {
                    contentIds: arrayUnion(contentId)
                });
            }
            btn.textContent = 'Удалить из закладок';
            btn.classList.replace('bg-red-500', 'bg-red-600');
            btn.classList.replace('hover:bg-red-600', 'hover:bg-red-700');
            showNotification('success', 'Добавлено в закладки!');
        }
        
        // Перезагрузка страницы для обновления состояния кнопки (или просто обновить переменную состояния)
        // В данном случае, мы обновили текст и классы, что достаточно.

    } catch (error) {
        console.error("Ошибка при работе с закладками:", error);
        showNotification('error', 'Произошла ошибка при работе с закладками.');
    }
};

/**
 * Проверяет, находится ли контент в закладках у текущего пользователя
 * @param {string} contentId 
 * @returns {Promise<boolean>}
 */
const checkBookmarkStatus = async (contentId) => {
    if (!auth.currentUser) return false;

    const userId = auth.currentUser.uid;
    const bookmarkRef = doc(db, 'bookmarks', userId);
    
    try {
        const docSnap = await getDoc(bookmarkRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.contentIds && data.contentIds.includes(contentId);
        }
        return false;
    } catch (error) {
        console.error("Ошибка при проверке закладки:", error);
        return false;
    }
};

/**
 * Загружает и отображает контент, добавленный в закладки
 */
const loadBookmarks = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId || !contentList) return;

    contentList.innerHTML = '<p class="text-center text-gray-400 col-span-full">Загрузка закладок...</p>';

    try {
        // 1. Получаем документ с ID закладок
        const bookmarkRef = doc(db, 'bookmarks', userId);
        const bookmarkDoc = await getDoc(bookmarkRef);
        
        if (!bookmarkDoc.exists()) {
            contentList.innerHTML = '<p class="text-center text-gray-400 col-span-full py-10">У вас пока нет закладок.</p>';
            return;
        }

        // 2. Извлекаем ID контента
        const data = bookmarkDoc.data();
        const contentIds = data.contentIds || [];
        
        if (contentIds.length === 0) {
             contentList.innerHTML = '<p class="text-center text-gray-400 col-span-full py-10">У вас пока нет закладок.</p>';
            return;
        }

        // 3. Загружаем данные по каждому ID
        const contentPromises = contentIds.map(id => getDoc(doc(db, 'content', id)));
        const contentSnaps = await Promise.all(contentPromises);
        
        const contentHtml = contentSnaps
            .filter(snap => snap.exists())
            .map(docSnap => {
                const data = docSnap.data();
                return `
                    <a href="film-page.html?id=${docSnap.id}" class="block bg-gray-800 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                        <div class="relative w-full aspect-[2/3] overflow-hidden">
                            <img src="${data.posterUrl}" alt="${data.title}" class="w-full h-full object-cover">
                        </div>
                        <div class="p-3">
                            <h3 class="text-base font-semibold truncate text-white">${data.title}</h3>
                            <p class="text-gray-400 text-xs mt-1">Тип: ${data.type === 'film' ? 'Фильм' : 'Сериал'}</p>
                            <p class="text-gray-400 text-xs">Рейтинг: ${data.rating || 'N/A'}</p>
                        </div>
                    </a>
                `;
            });
        
        contentList.innerHTML = contentHtml.join('') || '<p class="text-center text-gray-400 col-span-full py-10">У вас пока нет закладок.</p>';

    } catch (error) {
        console.error("Ошибка при загрузке закладок:", error);
        contentList.innerHTML = `<p class="text-red-400 col-span-full text-center py-10">Не удалось загрузить ваши закладки.</p>`;
    }
};

/**
 * Обрабатывает отправку формы фильма (Админ)
 * @param {Event} e 
 */
const handleFilmSubmit = async (e) => {
    e.preventDefault();
    
    const filmData = {
        title: document.getElementById('film-title').value,
        type: 'film',
        description: document.getElementById('film-description').value,
        posterUrl: document.getElementById('film-poster-url').value,
        videoUrl: document.getElementById('film-video-url').value,
        imdbUrl: document.getElementById('film-imdb').value,
        rating: 0
    };

    try {
        await addDoc(collection(db, 'content'), filmData);
        showNotification('success', 'Фильм успешно добавлен!');
        if (addMovieModal) addMovieModal.classList.add('hidden');
        addFilmForm.reset();
        loadContent('film');
    } catch (error) {
        console.error("Ошибка при добавлении фильма:", error);
        showNotification('error', 'Произошла ошибка при добавлении фильма.');
    }
};

// ... (Остальные функции для сериалов, профиля, админ-панели и т.д. должны быть здесь)
// ... (В вашем исходном коде они присутствуют, но для краткости не дублируются)


// === ГЛАВНЫЙ СЛУШАТЕЛЬ АВТОРИЗАЦИИ ===

onAuthStateChanged(auth, async (user) => {
    
    // 1. Установка роли пользователя
    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
            userRole = userDocSnap.data().role || 'user';
        } else {
            userRole = 'user';
            // Если документ пользователя отсутствует, создаем его
            await setDoc(userDocRef, { role: userRole, email: user.email || 'Не указан' });
        }
    } else {
        userRole = 'guest';
    }

    // 2. Логика для конкретных страниц (с учетом авторизации)

    if (isHomepage) {
        loadContent('film');
        loadContent('series');
    }

    if (isBookmarksPage) {
        if (user) {
            loadBookmarks();
        } else {
            // Перенаправление неавторизованных
            window.location.href = 'login.html'; 
        }
    }
    
    // Блок для film-page.html. Теперь вызывается ТОЛЬКО после проверки userRole.
    if (isFilmPage) {
        const filmId = new URLSearchParams(window.location.search).get('id');
        if (filmId) {
            loadFilmData(); // Теперь loadFilmData имеет актуальный userRole и статус авторизации
        }
    }

    if (isProfilePage) {
        // ... (логика загрузки профиля)
    }
    
    // ... (логика для isUsersPage)


    // === 3. ФИКС: ЛОГИКА ОБНОВЛЕНИЯ НАВИГАЦИИ (Работает на всех страницах) ===
    
    const authLink = document.getElementById('auth-link');
    const profileLink = document.getElementById('profile-link');
    const logoutLink = document.getElementById('logout-link');
    const adminPanelLink = document.getElementById('admin-panel-link');
    const isAuthPage = isLoginPage || isResetPage; // Страницы, где навигации быть не должно

    // Проверяем, что мы не на странице входа/сброса, и что на странице есть элемент 'auth-link' 
    if (!isAuthPage && authLink) { 
        if (user) {
            // Пользователь авторизован: Скрыть Войти, Показать Профиль/Выйти
            authLink.classList.add('hidden');
            if (profileLink) profileLink.classList.remove('hidden');
            if (logoutLink) logoutLink.classList.remove('hidden');

            // Админ-панель
            if (adminPanelLink) {
                if (userRole === 'admin') {
                    adminPanelLink.classList.remove('hidden');
                } else {
                    adminPanelLink.classList.add('hidden');
                }
            }
        } else {
            // Пользователь не авторизован: Показать Войти, Скрыть Профиль/Выйти
            authLink.classList.remove('hidden');
            if (profileLink) profileLink.classList.add('hidden');
            if (logoutLink) logoutLink.classList.add('hidden');
            if (adminPanelLink) adminPanelLink.classList.add('hidden');
        }
    }
});


// === ДОБАВЛЕНИЕ ОБРАБОТЧИКОВ СОБЫТИЙ ===

document.addEventListener('DOMContentLoaded', () => {
    
    // Аутентификация
    if (authForm) {
        authForm.addEventListener('submit', handleAuthFormSubmit);
    }
    if (resetForm) {
        resetForm.addEventListener('submit', handlePasswordReset);
    }
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }

    // Админ-панель: Добавление контента
    if (addFilmForm) {
        addFilmForm.addEventListener('submit', handleFilmSubmit);
    }
    if (addSeriesForm) {
        // addSeriesForm.addEventListener('submit', handleSeriesSubmit); // Предполагая, что у вас есть эта функция
    }
    
    // ... (Обработчики модальных окон)
});
