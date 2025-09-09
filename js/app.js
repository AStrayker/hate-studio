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

// === Глобальные переменные состояния ===
let currentUser = null;
let userRole = 'guest';

// === Элементы для навигации ===
let loginBtn, logoutBtn, profileLink, adminLink, mobileMenuButton, mainNav;

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


// === Загрузка общих блоков ===
async function loadCommonBlocks() {
    const headerContainer = document.getElementById('header-container');
    const footerContainer = document.getElementById('footer-container');

    if (headerContainer) {
        const headerResponse = await fetch('header.html');
        headerContainer.innerHTML = await headerResponse.text();

        // Инициализация элементов навигации после загрузки
        loginBtn = document.getElementById('login-btn');
        logoutBtn = document.getElementById('logout-btn');
        profileLink = document.getElementById('profile-link');
        adminLink = document.getElementById('admin-link');
        mobileMenuButton = document.getElementById('mobile-menu-button');
        mainNav = document.getElementById('main-nav');

        // Управление мобильным меню
        if (mobileMenuButton && mainNav) {
            mobileMenuButton.addEventListener('click', () => {
                mainNav.classList.toggle('hidden');
            });
        }
    }

    if (footerContainer) {
        const footerResponse = await fetch('footer.html');
        footerContainer.innerHTML = await footerResponse.text();
    }
}


// === Обновление UI-навигации и контента ===
onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    // Сначала скрываем все кнопки навигации
    if (loginBtn && logoutBtn && profileLink && adminLink) {
        loginBtn.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        profileLink.classList.add('hidden');
        adminLink.classList.add('hidden');
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
        
        // Показываем кнопки для авторизованного пользователя
        if (logoutBtn && profileLink) {
            logoutBtn.classList.remove('hidden');
            profileLink.classList.remove('hidden');
        }

        if (userRole === 'admin') {
             if (adminLink) {
                adminLink.classList.remove('hidden');
            }
        }
    } else {
        userRole = 'guest';
        if (loginBtn) {
            loginBtn.classList.remove('hidden');
        }
    }
    
    // Вызов функций, зависящих от страницы
    if (isHomepage) loadHomepageContent();
    else if (window.location.pathname.includes('films.html')) loadContent('film');
    else if (window.location.pathname.includes('series.html')) loadContent('series');
    else if (isBookmarksPage && currentUser) loadBookmarks(currentUser.uid);
    else if (isProfilePage) loadProfilePage();
    else if (isFilmPage) loadMoviePage();
    else if (isUsersPage) loadUsersPage();
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
                    errorMessage = 'Учётная запись с этой почтой уже существует!';
                    break;
                case 'auth/wrong-password':
                case 'auth/user-not-found':
                    errorMessage = 'Вы ввели неверный email или пароль.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Пароль должен быть не менее 6 символов.';
                    break;
                default:
                    errorMessage = 'Произошла ошибка. Пожалуйста, попробуйте снова.';
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

// === Кнопка выхода ===
document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'logout-btn') {
        e.preventDefault();
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error('Ошибка выхода:', error);
            showNotification('error', 'Произошла ошибка при выходе. Попробуйте снова.');
        }
    }
});


// === Функции для страницы профиля ===
const loadProfile = async (user) => {
    const docSnap = await getDoc(doc(db, 'users', user.uid));
    if (docSnap.exists()) {
        const userData = docSnap.data();
        
        document.getElementById('user-role').textContent = userData.role || 'user';
        document.getElementById('display-name').textContent = userData.displayName || 'Не указано';
        document.getElementById('user-email').textContent = userData.email || user.email;
        document.getElementById('user-dob').textContent = userData.dob || 'Не указана';
        document.getElementById('user-bio').textContent = userData.bio || 'Не указано';
        
        // Отображение аватара
        const avatarUrl = userData.avatarUrl || 'images/avatar.png';
        document.getElementById('profile-avatar').src = avatarUrl;
        document.getElementById('edit-avatar-preview').src = avatarUrl;
        
        document.getElementById('edit-name').value = userData.displayName || '';
        document.getElementById('edit-dob').value = userData.dob || '';
        document.getElementById('edit-bio').value = userData.bio || '';
    }
};

const loadProfilePage = () => {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    loadProfile(currentUser);

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            if (profileDisplay && profileEditForm) {
                profileDisplay.classList.add('hidden');
                profileEditForm.classList.remove('hidden');
            }
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            if (profileDisplay && profileEditForm) {
                profileEditForm.classList.add('hidden');
                profileDisplay.classList.remove('hidden');
            }
        });
    }

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

    if (profileAvatarImg) {
        profileAvatarImg.addEventListener('click', () => {
            modalAvatarImg.src = profileAvatarImg.src;
            avatarModal.classList.remove('hidden');
        });
    }

    if (avatarModal) {
        avatarModal.addEventListener('click', () => {
            avatarModal.classList.add('hidden');
        });
    }

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
                await updateProfile(currentUser, {
                    displayName: newName || null,
                    photoURL: avatarUrl
                });

                await updateDoc(doc(db, 'users', currentUser.uid), {
                    displayName: newName,
                    dob: newDob,
                    bio: newBio,
                    avatarUrl: avatarUrl
                });
                
                showNotification('success', 'Профиль успешно обновлен!');
                
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


// === Функции для страницы управления пользователями ===
const loadUsersPage = async () => {
    if (!currentUser || userRole !== 'admin') {
        window.location.href = 'index.html';
        showNotification('error', 'У вас нет прав для доступа к этой странице.');
        return;
    }

    const usersListContainer = document.getElementById('users-list');
    if (!usersListContainer) return;

    usersListContainer.innerHTML = '<p class="text-center text-lg text-gray-400">Загрузка пользователей...</p>';

    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    let usersHtml = '';
    usersSnapshot.forEach(doc => {
        const user = doc.data();
        const userId = doc.id;
        if (userId === currentUser.uid) return; // Не показываем самого себя

        const avatar = user.avatarUrl || 'https://firebasestorage.googleapis.com/v0/b/project-1-a4f61.appspot.com/o/avatars%2Fuser.png?alt=media&token=e110037a-40a8-4c3e-8260-643503287661';
        const name = user.displayName || user.email;
        const currentRole = user.role || 'user';

        usersHtml += `
            <div class="flex items-center justify-between p-4 mb-4 bg-gray-700 rounded-lg">
                <div class="flex items-center space-x-4">
                    <img src="${avatar}" alt="${name}" class="w-12 h-12 rounded-full object-cover">
                    <div>
                        <p class="font-bold text-orange-500">${name}</p>
                        <p class="text-sm text-gray-300">${user.email}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <select class="user-role-select bg-gray-600 text-white p-2 rounded-md" data-uid="${userId}">
                        <option value="user" ${currentRole === 'user' ? 'selected' : ''}>Пользователь</option>
                        <option value="moderator" ${currentRole === 'moderator' ? 'selected' : ''}>Модератор</option>
                        <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Администратор</option>
                    </select>
                </div>
            </div>
        `;
    });
    usersListContainer.innerHTML = usersHtml;

    document.querySelectorAll('.user-role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
            const userId = e.target.dataset.uid;
            const newRole = e.target.value;
            try {
                await updateDoc(doc(db, 'users', userId), { role: newRole });
                showNotification('success', `Статус пользователя обновлен на ${newRole}.`);
            } catch (error) {
                showNotification('error', 'Не удалось обновить статус.');
                console.error('Ошибка обновления статуса:', error);
            }
        });
    });
};


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
                    ${userRole === 'admin' || userRole === 'moderator' ? `
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
};

document.addEventListener('DOMContentLoaded', () => {
    loadCommonBlocks();
});
