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
const notificationContainer = document.getElementById('notification-container');
const isResetPage = window.location.pathname.includes('reset-password.html');
const isLoginPage = window.location.pathname.includes('login.html');
const isFilmPage = window.location.pathname.includes('film-page.html');
const isBookmarksPage = window.location.pathname.includes('bookmarks.html');
const isProfilePage = window.location.pathname.includes('profile.html');
const isUsersPage = window.location.pathname.includes('users.html');
const isHomepage = window.location.pathname.includes('index.html') || window.location.pathname === '/';
const isFilmsPage = window.location.pathname.includes('films.html');
const isSeriesPage = window.location.pathname.includes('series.html');

// === Глобальные переменные состояния ===
let currentUser = null;
let userRole = 'guest';

// === Элементы для навигации, которые есть на всех страницах ===
let loginBtn;
let logoutBtn;
let mobileMenuButton;
let mainNav;
let profileLink;
let usersLink;
let closeMobileMenuBtn;
let mobileMenuBackdrop;
let bookmarksLink;
let loginBtnMobile;
let logoutBtnMobile;
let mobileMenu;
let bookmarksLinkMobile;
let profileLinkMobile;

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
        notification.classList.add('opacity-90', 'translate-x-0');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('opacity-90', 'translate-x-0');
        notification.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}


// === Инициализация элементов после загрузки DOM ===
document.addEventListener('DOMContentLoaded', () => {
    loginBtn = document.getElementById('login-btn');
    logoutBtn = document.getElementById('logout-btn');
    profileLink = document.getElementById('profile-link');
    bookmarksLink = document.getElementById('bookmarks-link');
    
    // Mobile menu elements
    mobileMenuButton = document.getElementById('mobile-menu-button');
    mobileMenu = document.getElementById('mobile-menu');
    closeMobileMenuBtn = document.getElementById('close-mobile-menu-btn');
    mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop');
    loginBtnMobile = document.getElementById('login-btn-mobile');
    logoutBtnMobile = document.getElementById('logout-btn-mobile');
    bookmarksLinkMobile = document.getElementById('bookmarks-link-mobile');
    profileLinkMobile = document.getElementById('profile-link-mobile');

    // Настройка мобильного меню
    if (mobileMenuButton && mobileMenu && closeMobileMenuBtn && mobileMenuBackdrop) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.remove('translate-x-full');
            mobileMenuBackdrop.classList.remove('hidden');
        });

        closeMobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('translate-x-full');
            mobileMenuBackdrop.classList.add('hidden');
        });

        mobileMenuBackdrop.addEventListener('click', () => {
            mobileMenu.classList.add('translate-x-full');
            mobileMenuBackdrop.classList.add('hidden');
        });
    }

    // Обработчик кнопки "Выход" для десктопной и мобильной версии
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                showNotification('success', 'Выход выполнен!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Ошибка выхода:', error);
                showNotification('error', 'Произошла ошибка при выходе. Попробуйте снова.');
            }
        });
    }

    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                showNotification('success', 'Выход выполнен!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Ошибка выхода:', error);
                showNotification('error', 'Произошла ошибка при выходе. Попробуйте снова.');
            }
        });
    }

    // Инициализация модальных окон и форм
    if (closeFilmModalBtn) closeFilmModalBtn.addEventListener('click', closeModal('film'));
    if (closeSeriesModalBtn) closeSeriesModalBtn.addEventListener('click', closeModal('series'));
    if (addSeasonBtn) addSeasonBtn.addEventListener('click', addSeason);
    if (filmForm) filmForm.addEventListener('submit', handleFilmSubmit);
    if (seriesForm) seriesForm.addEventListener('submit', handleSeriesSubmit);

    // Initial content load on homepage
    if (isHomepage) {
        loadContent('all');
    }
});


// === Обновление UI-навигации при изменении статуса аутентификации ===
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    // Toggle login/logout buttons
    if (loginBtn && logoutBtn && loginBtnMobile && logoutBtnMobile) {
        if (user) {
            loginBtn.classList.add('hidden');
            logoutBtn.classList.remove('hidden');
            loginBtnMobile.classList.add('hidden');
            logoutBtnMobile.classList.remove('hidden');
        } else {
            loginBtn.classList.remove('hidden');
            logoutBtn.classList.add('hidden');
            loginBtnMobile.classList.remove('hidden');
            logoutBtnMobile.classList.add('hidden');
        }
    }

    // Toggle profile and bookmarks links
    if (profileLink && bookmarksLink && profileLinkMobile && bookmarksLinkMobile) {
        if (user) {
            profileLink.classList.remove('hidden');
            bookmarksLink.classList.remove('hidden');
            profileLinkMobile.classList.remove('hidden');
            bookmarksLinkMobile.classList.remove('hidden');
        } else {
            profileLink.classList.add('hidden');
            bookmarksLink.classList.add('hidden');
            profileLinkMobile.classList.add('hidden');
            bookmarksLinkMobile.classList.add('hidden');
        }
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
        
        if (userRole === 'admin') {
            // Additional admin links can be shown here if needed
        }

    } else {
        userRole = 'guest';
    }
    
    // Вызов функций, зависящих от страницы, после получения роли пользователя
    if (isHomepage) loadHomepageContent();
    else if (isFilmsPage) loadContent('film');
    else if (isSeriesPage) loadContent('series');
    else if (isBookmarksPage && currentUser) loadBookmarks(currentUser.uid);
    else if (isProfilePage) loadProfilePageContent();
    else if (isUsersPage) loadUserManagementPage();
});

// === Авторизация ===
if (isLoginPage) {
    const authForm = document.getElementById('auth-form');
    const toggleAuthModeEl = document.getElementById('toggle-auth-mode');
    let isRegisterMode = false;

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

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
            showNotification('error', errorMessage);
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


// === Функции для страницы профиля ===
const loadProfilePageContent = async () => {
    if (!currentUser) {
        showNotification('error', 'Для просмотра профиля необходимо войти в систему.');
        window.location.href = 'login.html';
        return;
    }
    loadProfile(currentUser);

    // Открытие формы редактирования
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            if (profileDisplay && profileEditForm) {
                profileDisplay.classList.add('hidden');
                profileEditForm.classList.remove('hidden');
            }
        });
    }

    // Отмена редактирования
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            if (profileDisplay && profileEditForm) {
                profileEditForm.classList.add('hidden');
                profileDisplay.classList.remove('hidden');
            }
        });
    }

    // Предпросмотр выбранного аватара
    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', (e) => {
            currentAvatarFile = e.target.files[0];
            if (currentAvatarFile) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('edit-avatar-preview').src = event.target.result;
                };
                reader.readAsDataURL(currentAvatarFile);
            }
        });
    }

    // Открытие аватара на полный экран
    if (profileAvatarImg) {
        profileAvatarImg.addEventListener('click', () => {
            if (modalAvatarImg && avatarModal) {
                modalAvatarImg.src = profileAvatarImg.src;
                avatarModal.classList.remove('hidden');
            }
        });
    }

    // Закрытие аватара на полный экран
    if (avatarModal) {
        avatarModal.addEventListener('click', () => {
            avatarModal.classList.add('hidden');
        });
    }

    // Обработка сохранения профиля
    if (profileEditForm) {
        profileEditForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newName = document.getElementById('edit-name').value;
            const newDob = document.getElementById('edit-dob').value;
            const newBio = document.getElementById('edit-bio').value;
            
            let avatarUrl = currentUser.photoURL || null;

            if (currentAvatarFile) {
                try {
                    const avatarRef = ref(storage, `avatars/${currentUser.uid}`);
                    await uploadBytes(avatarRef, currentAvatarFile);
                    avatarUrl = await getDownloadURL(avatarRef);
                } catch (error) {
                    showNotification('error', 'Ошибка загрузки аватара.');
                    console.error('Ошибка загрузки аватара:', error);
                    return;
                }
            }

            try {
                // Обновляем данные в Firebase Auth (displayName и photoURL)
                await updateProfile(currentUser, {
                    displayName: newName || null,
                    photoURL: avatarUrl
                });

                // Обновляем данные в Firestore
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    displayName: newName,
                    dob: newDob,
                    bio: newBio,
                    avatarUrl: avatarUrl
                });
                
                showNotification('success', 'Профиль успешно обновлен!');
                
                // Обновляем данные на странице
                await loadProfile(currentUser);
                
                profileEditForm.classList.add('hidden');
                profileDisplay.classList.remove('hidden');
            } catch (error) {
                showNotification('error', 'Ошибка сохранения профиля.');
                console.error('Ошибка обновления профиля:', error);
            }
        });
    }
};

const loadProfile = async (user) => {
    const docSnap = await getDoc(doc(db, 'users', user.uid));
    if (docSnap.exists()) {
        const userData = docSnap.data();
        
        // Отображение данных
        document.getElementById('user-role').textContent = userData.role || 'user';
        document.getElementById('display-name').textContent = userData.displayName || 'Не указано';
        document.getElementById('user-email').textContent = userData.email || user.email;
        document.getElementById('user-dob').textContent = userData.dob || 'Не указана';
        document.getElementById('user-bio').textContent = userData.bio || 'Не указано';
        
        // Отображение аватара
        const avatarUrl = userData.avatarUrl || '/images/avatar.png';
        document.getElementById('profile-avatar').src = avatarUrl;
        document.getElementById('edit-avatar-preview').src = avatarUrl;
        
        // Заполнение формы редактирования
        document.getElementById('edit-name').value = userData.displayName || '';
        document.getElementById('edit-dob').value = userData.dob || '';
        document.getElementById('edit-bio').value = userData.bio || '';
    }
};


// === Функции для страницы управления пользователями ===
const loadUserManagementPage = async () => {
    if (userRole !== 'admin') {
        if (usersList) usersList.innerHTML = '';
        if (accessDenied) accessDenied.classList.remove('hidden');
        return;
    }

    if (accessDenied) accessDenied.classList.add('hidden');
    const usersCollection = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollection);
    
    let usersHtml = '';
    querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const userId = doc.id;
        const displayName = userData.displayName || userData.email;
        const role = userData.role || 'user';

        usersHtml += `
            <div class="bg-gray-700 p-4 rounded-lg flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <div>
                    <p class="text-lg font-bold">${displayName}</p>
                    <p class="text-sm text-gray-400">${userData.email}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <p class="text-gray-400">Роль:</p>
                    <select class="user-role-select bg-gray-600 text-white p-2 rounded-md" data-uid="${userId}">
                        <option value="user" ${role === 'user' ? 'selected' : ''}>Пользователь</option>
                        <option value="admin" ${role === 'admin' ? 'selected' : ''}>Админ</option>
                    </select>
                </div>
            </div>
        `;
    });
    if (usersList) {
        usersList.innerHTML = usersHtml;

        document.querySelectorAll('.user-role-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const uid = e.target.dataset.uid;
                const newRole = e.target.value;
                try {
                    await updateDoc(doc(db, 'users', uid), {
                        role: newRole
                    });
                    showNotification('success', `Роль пользователя обновлена на ${newRole}.`);
                } catch (error) {
                    console.error('Ошибка обновления роли:', error);
                    showNotification('error', 'Не удалось обновить роль пользователя.');
                }
            });
        });
    }
};

// === Управление контентом (CRUD) ===
const loadContent = async (type = 'all') => {
    const contentList = document.getElementById('content-list');
    if (!contentList) return;

    // Добавляем кнопку для админа только на соответствующей странице
    const titleContainer = contentList.previousElementSibling;
    if (userRole === 'admin' && titleContainer && titleContainer.tagName === 'H2') {
        let addContentBtn = document.getElementById('add-content-btn');
        if (!addContentBtn) {
            addContentBtn = document.createElement('button');
            addContentBtn.id = 'add-content-btn';
            addContentBtn.className = 'bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition-colors mb-6';
            titleContainer.after(addContentBtn);
        }
        
        if (type === 'film') {
            addContentBtn.textContent = 'Добавить фильм';
            addContentBtn.onclick = () => {
                if (addFilmModal) addFilmModal.classList.remove('hidden');
            };
        } else if (type === 'series') {
            addContentBtn.textContent = 'Добавить сериал';
            addContentBtn.onclick = () => {
                if (addSeriesModal) addSeriesModal.classList.remove('hidden');
            };
        }
    }


    contentList.innerHTML = '';
    const q = type === 'all' ? collection(db, 'content') : query(collection(db, 'content'), where('type', '==', type));
    const querySnapshot = await getDocs(q);

    const contentHtml = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const cardHtml = `
            <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden transform transition-transform duration-300 hover:scale-105">
                <a href="film-page.html?id=${doc.id}">
                    <img src="${data.posterUrl}" alt="${data.title}" class="w-full h-80 object-cover">
                </a>
                <div class="p-4">
                    <h3 class="text-xl font-bold text-orange-500 mb-2">${data.title}</h3>
                    <p class="text-gray-400 text-sm mb-2">Тип: ${data.type === 'film' ? 'Фильм' : 'Сериал'}</p>
                    <p class="text-gray-400 text-sm mb-2">Рейтинг: ${data.rating}</p>
                    <p class="text-gray-300 text-sm">${data.description.substring(0, 100)}...</p>
                    ${userRole === 'admin' ? `
                    <div class="mt-4 flex space-x-2">
                        <button class="edit-btn bg-yellow-600 text-white px-3 py-1 rounded-md text-sm hover:bg-yellow-700" data-id="${doc.id}" data-type="${data.type}">Редактировать</button>
                        <button class="delete-btn bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700" data-id="${doc.id}">Удалить</button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        contentHtml.push(cardHtml);
    });
    contentList.innerHTML = contentHtml.join('');

    // Настройка кнопок редактирования и удаления
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const currentContentId = e.target.dataset.id;
            const contentType = e.target.dataset.type;
            const docSnap = await getDoc(doc(db, 'content', currentContentId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (contentType === 'film' && addFilmModal) {
                    document.getElementById('film-modal-title').textContent = 'Редактировать фильм';
                    document.getElementById('film-title').value = data.title;
                    document.getElementById('film-description').value = data.description;
                    document.getElementById('film-poster-url').value = data.posterUrl;
                    document.getElementById('film-video-url').value = data.videoUrl;
                    addFilmModal.classList.remove('hidden');
                } else if (contentType === 'series' && addSeriesModal) {
                    document.getElementById('series-modal-title').textContent = 'Редактировать сериал';
                    document.getElementById('series-title').value = data.title;
                    document.getElementById('series-description').value = data.description;
                    document.getElementById('series-poster-url').value = data.posterUrl;
                    // TODO: Заполнение формы для серий
                    addSeriesModal.classList.remove('hidden');
                }
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm('Вы уверены, что хотите удалить этот контент?')) {
                const id = e.target.dataset.id;
                await deleteDoc(doc(db, 'content', id));
                showNotification('success', 'Контент удален!');
                loadContent(type);
            }
        });
    });
};

const loadHomepageContent = () => {
    // На главной странице нет кнопок "Добавить фильм/сериал"
    // Загрузка всего контента
    loadContent('all');
};


// === Обработчики для модальных окон админки ===
const closeModal = (type) => () => {
    if (type === 'film' && addFilmModal) {
        addFilmModal.classList.add('hidden');
        filmForm.reset();
        currentContentId = null;
    } else if (type === 'series' && addSeriesModal) {
        addSeriesModal.classList.add('hidden');
        seriesForm.reset();
        seasonsContainer.innerHTML = '';
        currentContentId = null;
    }
};

// === Динамическое добавление сезонов и серий ===
function addSeason() {
    const seasonNumber = seasonsContainer.querySelectorAll('.season-group').length + 1;
    const seasonHtml = `
        <div class="season-group bg-gray-700 p-4 rounded-md relative">
            <h4 class="font-bold text-lg mb-2">Сезон ${seasonNumber}</h4>
            <div class="episodes-container space-y-2 mb-2">
                </div>
            <button type="button" class="add-episode-btn bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600" data-season="${seasonNumber}">Добавить серию</button>
        </div>
    `;
    seasonsContainer.insertAdjacentHTML('beforeend', seasonHtml);
    
    // Добавляем слушатель для новой кнопки "Добавить серию"
    const newAddEpisodeBtn = seasonsContainer.querySelector(`.add-episode-btn[data-season="${seasonNumber}"]`);
    if (newAddEpisodeBtn) {
        newAddEpisodeBtn.addEventListener('click', () => addEpisode(newAddEpisodeBtn.previousElementSibling));
    }
}

function addEpisode(container) {
    const episodeNumber = container.querySelectorAll('.episode-group').length + 1;
    const episodeHtml = `
        <div class="episode-group flex items-center space-x-2">
            <label for="episode-${episodeNumber}-url" class="text-sm font-medium text-gray-400">Серия ${episodeNumber}:</label>
            <input type="url" id="episode-${episodeNumber}-url" class="episode-url flex-grow px-3 py-1 bg-gray-600 border border-gray-500 rounded-md" placeholder="URL видео" required>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', episodeHtml);
}

// === Обработка форм для добавления контента ===
const handleFilmSubmit = async (e) => {
    e.preventDefault();
    const filmData = {
        title: document.getElementById('film-title').value,
        type: 'film',
        description: document.getElementById('film-description').value,
        posterUrl: document.getElementById('film-poster-url').value,
        videoUrl: document.getElementById('film-video-url').value,
        rating: 0
    };

    try {
        await addDoc(collection(db, 'content'), filmData);
        showNotification('success', 'Фильм успешно добавлен!');
        if (addFilmModal) addFilmModal.classList.add('hidden');
        filmForm.reset();
        loadContent('film');
    } catch (error) {
        console.error("Ошибка при добавлении фильма:", error);
        showNotification('error', 'Произошла ошибка при добавлении фильма.');
    }
};

const handleSeriesSubmit = async (e) => {
    e.preventDefault();
    
    const seasons = [];
    seasonsContainer.querySelectorAll('.season-group').forEach(seasonEl => {
        const episodes = [];
        seasonEl.querySelectorAll('.episode-url').forEach((episodeEl, index) => {
            episodes.push({
                episodeNumber: index + 1,
                videoUrl: episodeEl.value
            });
        });
        seasons.push({
            seasonNumber: parseInt(seasonEl.querySelector('h4').textContent.replace('Сезон ', '')),
            episodes: episodes
        });
    });
    
    const seriesData = {
        title: document.getElementById('series-title').value,
        type: 'series',
        description: document.getElementById('series-description').value,
        posterUrl: document.getElementById('series-poster-url').value,
        seasons: seasons,
        rating: 0
    };

    try {
        await addDoc(collection(db, 'content'), seriesData);
        showNotification('success', 'Сериал успешно добавлен!');
        if (addSeriesModal) addSeriesModal.classList.add('hidden');
        seriesForm.reset();
        seasonsContainer.innerHTML = '';
        loadContent('series');
    } catch (error) {
        console.error("Ошибка при добавлении сериала:", error);
        showNotification('error', 'Произошла ошибка при добавлении сериала.');
    }
};
