import { auth, db, storage } from './firebase-config.js';
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
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
const notificationContainer = document.getElementById('notification-container');
const isResetPage = window.location.pathname.includes('reset-password.html');
const isLoginPage = window.location.pathname.includes('login.html');
const isFilmPage = window.location.pathname.includes('film-page.html');
const isBookmarksPage = window.location.pathname.includes('bookmarks.html');
const isProfilePage = window.location.pathname.includes('profile.html');
const isHomepage = window.location.pathname.includes('index.html') || window.location.pathname === '/';

// === Глобальные переменные состояния ===
let currentUser = null;
let userRole = 'guest';

// === Элементы для навигации, которые есть на всех страницах ===
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');


function showNotification(type, message) {
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
        'w-64',
        'mb-2'
    );

    if (type === 'success') {
        notification.classList.add('bg-green-600');
    } else if (type === 'error') {
        notification.classList.add('bg-red-600');
    }

    notification.textContent = message;

    notificationContainer.appendChild(notification);

    // Анимация появления
    setTimeout(() => {
        notification.classList.remove('opacity-0', 'translate-x-full');
        notification.classList.add('opacity-90', 'translate-x-0');
    }, 10);

    // Анимация исчезновения
    setTimeout(() => {
        notification.classList.remove('opacity-90', 'translate-x-0');
        notification.classList.add('opacity-0', 'translate-x-full');
        // Удаляем элемент после исчезновения
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}


// === Обновление UI-навигации при изменении статуса аутентификации ===
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    // Обновляем кнопки входа/выхода на всех страницах
    if (loginBtn) {
        loginBtn.style.display = user ? 'none' : 'block';
    }
    if (logoutBtn) {
        logoutBtn.style.display = user ? 'block' : 'none';
    }

    if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            userRole = userDocSnap.data().role;
        } else {
            userRole = 'user';
            await setDoc(userDocRef, { role: userRole, email: user.email });
        }
        
    } else {
        userRole = 'guest';
    }
    
    // Вызов функций, зависящих от страницы, после получения роли пользователя
    if (isHomepage) loadHomepageContent();
    else if (window.location.pathname.includes('films.html')) loadContent('film');
    else if (window.location.pathname.includes('series.html')) loadContent('series');
    else if (isBookmarksPage && currentUser) loadBookmarks(currentUser.uid);
    else if (isProfilePage && currentUser) loadProfile(currentUser);
    else if (isFilmPage) loadMoviePage();
});

// === Авторизация ===
if (isLoginPage) {
    const authForm = document.getElementById('auth-form');
    const errorMessageEl = document.getElementById('error-message');
    const toggleAuthModeEl = document.getElementById('toggle-auth-mode');
    let isRegisterMode = false;

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        if (errorMessageEl) errorMessageEl.classList.add('hidden');

        try {
    if (isRegisterMode) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), { role: 'user', email: email });
        showNotification('success', 'Регистрация прошла успешно!');
    } else {
        await signInWithEmailAndPassword(auth, email, password);
        showNotification('success', 'Вход выполнен!');
    }
    window.location.href = 'index.html';
} catch (error) {
    let errorMessage = 'Произошла ошибка. Пожалуйста, попробуйте снова.';

    switch (error.code) {
        case 'auth/email-already-in-use':
            errorMessage = 'Учётная запись с этой почтой уже существует! Попробуйте использовать другую. Или попробуйте сбросить пароль!';
            break;
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            errorMessage = 'Вы ввели неверный email или пароль.';
            break;
        case 'auth/weak-password':
            errorMessage = 'Пароль должен быть не менее 6 символов.';
            break;
    }

    // Здесь вы будете показывать кастомное уведомление
    showNotification('error', errorMessage);
}
        }
    });

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

// === Управление контентом (CRUD) ===
const loadContent = async (type = 'all') => {
    const contentList = document.getElementById('content-list');
    if (!contentList) return;

    contentList.innerHTML = '';
    const q = type === 'all' ? collection(db, 'content') : query(collection(db, 'content'), where('type', '==', type));
    const querySnapshot = await getDocs(q);

    const moviesHtml = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const cardHtml = `
            <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden transform transition-transform duration-300 hover:scale-105">
                <a href="film-page.html?id=${doc.id}">
                    <img src="${data.posterUrl}" alt="${data.title}" class="w-full h-80 object-cover">
                </a>
                <div class="p-4">
                    <h3 class="text-xl font-bold text-orange-500 mb-2">${data.title}</h3>
                    <p class="text-gray-400 text-sm mb-2">Рейтинг: ${data.rating}</p>
                    <p class="text-gray-300 text-sm">${data.description.substring(0, 100)}...</p>
                    ${userRole === 'admin' ? `
                    <div class="mt-4 flex space-x-2">
                        <button class="edit-btn bg-yellow-600 text-white px-3 py-1 rounded-md text-sm hover:bg-yellow-700" data-id="${doc.id}">Редактировать</button>
                        <button class="delete-btn bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700" data-id="${doc.id}">Удалить</button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        moviesHtml.push(cardHtml);
    });
    contentList.innerHTML = moviesHtml.join('');

    // Настройка кнопок редактирования и удаления
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const currentMovieId = e.target.dataset.id;
            const docSnap = await getDoc(doc(db, 'content', currentMovieId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                const addMovieModal = document.getElementById('add-movie-modal');
                if (addMovieModal) {
                    document.getElementById('modal-title').textContent = 'Редактировать фильм';
                    document.getElementById('movie-title').value = data.title;
                    document.getElementById('movie-type').value = data.type;
                    document.getElementById('movie-imdb').value = data.imdbUrl;
                    document.getElementById('movie-description').value = data.description;
                    document.getElementById('movie-poster-url').value = data.posterUrl;
                    addMovieModal.classList.remove('hidden');
                }
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm('Вы уверены, что хотите удалить этот фильм?')) {
                const id = e.target.dataset.id;
                await deleteDoc(doc(db, 'content', id));
                alert('Фильм удален!');
                loadContent(type);
            }
        });
    });
};

const loadHomepageContent = () => {
    const addMovieBtn = document.getElementById('add-movie-btn');
    const addMovieModal = document.getElementById('add-movie-modal');
    const movieForm = document.getElementById('movie-form');
    const closeModalBtn = document.getElementById('close-modal-btn');
    let currentMovieId = null;
    
    // Показ модального окна
    if (addMovieBtn) {
        addMovieBtn.addEventListener('click', () => {
            if (addMovieModal) {
                 addMovieModal.classList.remove('hidden');
            }
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (addMovieModal) {
                addMovieModal.classList.add('hidden');
                if (movieForm) movieForm.reset();
                currentMovieId = null;
                const modalTitle = document.getElementById('modal-title');
                if (modalTitle) modalTitle.textContent = 'Добавить новый фильм';
            }
        });
    }

    // Сохранение/обновление фильма
    if (movieForm) {
        movieForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('movie-title')?.value;
            const type = document.getElementById('movie-type')?.value;
            const imdbUrl = document.getElementById('movie-imdb')?.value;
            const description = document.getElementById('movie-description')?.value;
            const posterFile = document.getElementById('movie-poster')?.files[0];
            const posterUrl = document.getElementById('movie-poster-url')?.value;
            
            let finalPosterUrl = posterUrl;
            if (posterFile) {
                const storageRef = ref(storage, `posters/${Date.now()}_${posterFile.name}`);
                const snapshot = await uploadBytes(storageRef, posterFile);
                finalPosterUrl = await getDownloadURL(snapshot.ref);
            }

            const rating = 'N/A';

            const movieData = {
                title,
                type,
                posterUrl: finalPosterUrl,
                imdbUrl,
                description,
                rating,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            if (currentMovieId) {
                await updateDoc(doc(db, 'content', currentMovieId), movieData);
                alert('Фильм обновлен!');
            } else {
                await addDoc(collection(db, 'content'), movieData);
                alert('Фильм добавлен!');
            }

            if (addMovieModal) addMovieModal.classList.add('hidden');
            if (movieForm) movieForm.reset();
            currentMovieId = null;
            loadContent('all');
        });
    }
    
    // Показываем кнопку "Добавить фильм" только админам
    if (userRole === 'admin' && addMovieBtn) {
        addMovieBtn.classList.remove('hidden');
    }
    
    loadContent('all');
};

// === Страница фильма ===
const loadMoviePage = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get('id');

    if (!movieId) {
        const movieDetailsEl = document.getElementById('movie-details');
        if (movieDetailsEl) {
            movieDetailsEl.innerHTML = '<p class="text-red-500 text-center text-xl">Фильм не найден.</p>';
        }
        return;
    }

    const movieDocRef = doc(db, 'content', movieId);
    const movieDocSnap = await getDoc(movieDocRef);
    const movieDetailsEl = document.getElementById('movie-details');
    if (!movieDocSnap.exists() || !movieDetailsEl) {
        if (movieDetailsEl) {
            movieDetailsEl.innerHTML = '<p class="text-red-500 text-center text-xl">Фильм не найден.</p>';
        }
        return;
    }

    const data = movieDocSnap.data();
    document.title = data.title + ' - HATE Studio';
    document.getElementById('movie-title').textContent = data.title;
    document.getElementById('movie-poster').src = data.posterUrl;
    document.getElementById('movie-description').textContent = data.description;
    document.getElementById('movie-rating').textContent = data.rating;

    // Логика для кнопки закладок
    const bookmarkBtn = document.getElementById('bookmark-btn');
    if (bookmarkBtn && currentUser) {
        const userBookmarksDocRef = doc(db, 'users', currentUser.uid);
        const userBookmarksDocSnap = await getDoc(userBookmarksDocRef);
        const bookmarks = userBookmarksDocSnap.exists() ? (userBookmarksDocSnap.data().bookmarks || []) : [];
        
        if (bookmarks.includes(movieId)) {
            bookmarkBtn.textContent = 'Удалить из закладок';
            bookmarkBtn.classList.add('bg-gray-600', 'hover:bg-gray-700');
            bookmarkBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        }

        bookmarkBtn.addEventListener('click', async () => {
            if (!currentUser) {
                alert('Для добавления в закладки нужно войти в систему.');
                return;
            }
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            const userBookmarks = userDocSnap.data().bookmarks || [];

            if (userBookmarks.includes(movieId)) {
                await updateDoc(userDocRef, { bookmarks: arrayRemove(movieId) });
                bookmarkBtn.textContent = 'В закладки';
                bookmarkBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                bookmarkBtn.classList.remove('bg-gray-600', 'hover:bg-gray-700');
            } else {
                await updateDoc(userDocRef, { bookmarks: arrayUnion(movieId) });
                bookmarkBtn.textContent = 'Удалить из закладок';
                bookmarkBtn.classList.add('bg-gray-600', 'hover:bg-gray-700');
                bookmarkBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            }
        });
    }

    // Логика комментариев
    const commentForm = document.getElementById('comment-form');
    const loginToComment = document.getElementById('login-to-comment');
    if (currentUser) {
        if (commentForm) commentForm.classList.remove('hidden');
        if (loginToComment) loginToComment.classList.add('hidden');
    } else {
        if (commentForm) commentForm.classList.add('hidden');
        if (loginToComment) loginToComment.classList.remove('hidden');
    }

    if (commentForm) {
        commentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = document.getElementById('comment-text').value;
            const rating = document.getElementById('rating-select').value;
            if (!text || !currentUser) return;
            
            const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
            const username = userDocSnap.exists() ? userDocSnap.data().email : 'Аноним';

            await addDoc(collection(db, 'content', movieId, 'comments'), {
                text,
                rating: parseInt(rating),
                userId: currentUser.uid,
                username,
                timestamp: new Date()
            });
            commentForm.reset();
            loadComments(movieId);
        });
    }
    loadComments(movieId);
};

const loadComments = async (movieId) => {
    const commentsContainer = document.getElementById('comments-container');
    if (!commentsContainer) return;
    
    commentsContainer.innerHTML = '';
    const commentsQuery = query(collection(db, 'content', movieId, 'comments'));
    const querySnapshot = await getDocs(commentsQuery);
    const commentsHtml = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const commentHtml = `
            <div class="bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-300 font-bold">${data.username}</p>
                <p class="text-gray-400 text-sm mb-2">${data.timestamp.toDate().toLocaleString()}</p>
                <p class="text-white">${data.text}</p>
                <p class="text-yellow-400 mt-2">Оценка: ${data.rating} / 5</p>
            </div>
        `;
        commentsHtml.push(commentHtml);
    });
    commentsContainer.innerHTML = commentsHtml.join('');
};

// === Страница закладок ===
const loadBookmarks = async (userId) => {
    const userDocRef = doc(db, 'users', userId);
    const userDocSnap = await getDoc(userDocRef);
    const bookmarks = userDocSnap.exists() ? (userDocSnap.data().bookmarks || []) : [];
    const bookmarksList = document.getElementById('content-list');
    if (!bookmarksList) return;
    
    bookmarksList.innerHTML = '';

    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = '<p class="text-center text-gray-400 text-xl">У вас пока нет закладок.</p>';
        return;
    }

    bookmarks.forEach(async (movieId) => {
        const movieDocSnap = await getDoc(doc(db, 'content', movieId));
        if (movieDocSnap.exists()) {
            const data = movieDocSnap.data();
            const cardHtml = `
                <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden transform transition-transform duration-300 hover:scale-105">
                    <a href="film-page.html?id=${movieDocSnap.id}">
                        <img src="${data.posterUrl}" alt="${data.title}" class="w-full h-80 object-cover">
                    </a>
                    <div class="p-4">
                        <h3 class="text-xl font-bold text-orange-500 mb-2">${data.title}</h3>
                        <button class="remove-bookmark-btn bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700" data-id="${movieDocSnap.id}">Удалить</button>
                    </div>
                </div>
            `;
            bookmarksList.innerHTML += cardHtml;
        }
    });

    // Настройка кнопок удаления из закладок
    bookmarksList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-bookmark-btn')) {
            const movieId = e.target.dataset.id;
            await updateDoc(doc(db, 'users', userId), { bookmarks: arrayRemove(movieId) });
            const card = e.target.closest('.bg-gray-800');
            if (card) card.remove();
            alert('Фильм удален из закладок!');
        }
    });
};

if (isResetPage) {
    const resetForm = document.getElementById('reset-form');
    const resetEmailInput = document.getElementById('reset-email');
    const resetErrorMessage = document.getElementById('reset-error-message');
    
    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = resetEmailInput.value;
        resetErrorMessage.classList.add('hidden');

        try {
            await sendPasswordResetEmail(auth, email);
            showNotification('success', 'Письмо для сброса пароля отправлено! Проверьте вашу почту.');
        } catch (error) {
            let errorMessage = 'Произошла ошибка при отправке письма. Попробуйте снова.';
            if (error.code === 'auth/invalid-email') {
                errorMessage = 'Неверный адрес электронной почты.';
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = 'Пользователь с таким email не найден.';
            }
            showNotification('error', errorMessage);
        }
    });
}

// === Страница профиля ===
const loadProfile = async (user) => {
    const profileInfo = document.getElementById('profile-info');
    if (!profileInfo) return;

    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    const userData = userDocSnap.exists() ? userDocSnap.data() : { role: 'guest' };

    profileInfo.innerHTML = `
        <div class="bg-gray-800 p-8 rounded-lg shadow-lg">
            <h3 class="text-2xl font-bold text-orange-500 mb-4">Информация о профиле</h3>
            <p class="text-gray-300"><strong>Email:</strong> ${user.email}</p>
            <p class="text-gray-300"><strong>Роль:</strong> ${userData.role}</p>
        </div>
    `;
};
