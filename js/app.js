import { auth, db, storage } from './firebase-config.js';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
let loginBtn, logoutBtn, mobileMenuButton, mainNav, profileDropdownContainer, usersLink, closeMobileMenuBtn, mobileMenuBackdrop, bookmarksLink;

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
    'w-32',
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
      showNotification('error', 'Произошла ошибка при выходе. Попробуйте снова.');
    }
  };
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  const logoutBtnDesktop = document.getElementById('logout-btn-desktop');
  if (logoutBtnDesktop) logoutBtnDesktop.addEventListener('click', handleLogout);

  if (closeFilmModalBtn) closeFilmModalBtn.addEventListener('click', closeModal('film'));
  if (closeSeriesModalBtn) closeSeriesModalBtn.addEventListener('click', closeModal('series'));
  if (addSeasonBtn) addSeasonBtn.addEventListener('click', addSeason);
  if (filmForm) filmForm.addEventListener('submit', handleFilmSubmit);
  if (seriesForm) seriesForm.addEventListener('submit', handleSeriesSubmit);
});

// === Авторизация ===
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
            role: 'user',
            email: email,
            displayName: null,
            dob: null,
            bio: null,
            avatarUrl: null,
            films: []
          });
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

// === Функции для страницы профиля ===
const loadProfilePageContent = async () => {
  if (!currentUser) {
    showNotification('error', 'Для просмотра профиля необходимо войти в систему.');
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
      if (modalAvatarImg && avatarModal) {
        modalAvatarImg.src = profileAvatarImg.src;
        avatarModal.classList.remove('hidden');
      }
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

const loadProfile = async (user) => {
  const docSnap = await getDoc(doc(db, 'users', user.uid));
  if (docSnap.exists()) {
    const userData = docSnap.data();
    
    document.getElementById('user-role').textContent = userData.role || 'user';
    document.getElementById('display-name').textContent = userData.displayName || 'Не указано';
    document.getElementById('user-email').textContent = userData.email || user.email;
    document.getElementById('user-dob').textContent = userData.dob || 'Не указана';
    document.getElementById('user-bio').textContent = userData.bio || 'Не указано';
    
    const avatarUrl = userData.avatarUrl || '/images/avatar.png';
    if (document.getElementById('profile-avatar')) {
      document.getElementById('profile-avatar').src = avatarUrl;
    }
    if (document.getElementById('edit-avatar-preview')) {
      document.getElementById('edit-avatar-preview').src = avatarUrl;
    }
    
    if (document.getElementById('edit-name')) {
      document.getElementById('edit-name').value = userData.displayName || '';
    }
    if (document.getElementById('edit-dob')) {
      document.getElementById('edit-dob').value = userData.dob || '';
    }
    if (document.getElementById('edit-bio')) {
      document.getElementById('edit-bio').value = userData.bio || '';
    }
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

  contentList.innerHTML = '<div class="text-center py-10 text-gray-400">Загрузка контента...</div>';

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

  const q = type === 'all' ? collection(db, 'content') : query(collection(db, 'content'), where('type', '==', type));
  try {
    const querySnapshot = await getDocs(q);
    console.log('Получено документов:', querySnapshot.size); // Для отладки
    const contentHtml = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let imdbRating = 'N/A';
      if (data.mbLink && data.mbLink.includes('imdb.com')) {
        imdbRating = '7.5'; // Замените на реальную логику или удалите
      }
      const isHidden = data.hidden || false;
      const isVisible = !isHidden || userRole === 'admin';
      const cardOpacity = isHidden ? 'opacity-50' : 'opacity-100';

      if (isVisible) {
        const cardHtml = createFilmCard(doc.id, data, imdbRating, cardOpacity);
        contentHtml.push(cardHtml);
      }
    });
    contentList.innerHTML = contentHtml.join('');
    contentList.classList.add('grid', 'grid-cols-1', 'md:grid-cols-3', 'lg:grid-cols-5', 'gap-6');
    initializeCardEvents(contentList);
  } catch (error) {
    console.error('Ошибка при загрузке контента:', error);
    contentList.innerHTML = '<div class="text-center py-10 text-red-400">Не удалось загрузить контент.</div>';
  }
};

const loadHomepageContent = () => {
  loadContent('all').catch(error => {
    console.error('Ошибка загрузки контента на главной странице:', error);
    const contentList = document.getElementById('content-list');
    if (contentList) {
      contentList.innerHTML = '<div class="text-center py-10 text-red-400">Ошибка загрузки контента.</div>';
    }
  });
};

// В конец app.js, после существующих функций
const handleContentSubmit = async (e) => {
    e.preventDefault();

    const contentType = document.getElementById('content-type').value;
    const title = document.getElementById('movie-title').value;
    const posterInput = document.getElementById('movie-poster');
    const posterUrl = document.getElementById('movie-poster-url').value;
    const yearInput = document.getElementById('movie-year-input').value || document.getElementById('movie-year-select').value;
    const genres = Array.from(document.querySelectorAll('input[name="genres"]:checked')).map(cb => cb.value).join(', ');
    const director = document.getElementById('movie-director').value;
    const actors = document.getElementById('movie-actors').value;
    const description = document.getElementById('movie-description').value;
    const imdbLink = document.getElementById('movie-imdb').value;

    let contentData = {
        title,
        type: contentType,
        year: yearInput,
        genres,
        director,
        actors,
        description,
        mbLink: imdbLink,
        rating: 0,
        hidden: false
    };

    let posterUrlFinal = posterUrl;
    if (posterInput.files[0]) {
        const posterRef = ref(storage, `posters/${Date.now()}_${posterInput.files[0].name}`);
        await uploadBytes(posterRef, posterInput.files[0]);
        posterUrlFinal = await getDownloadURL(posterRef);
    }
    contentData.posterUrl = posterUrlFinal;

    if (contentType === 'film') {
        const videoUrl = document.getElementById('movie-video-url').value;
        contentData.videoUrl = videoUrl;
    } else if (contentType === 'series') {
        const seasons = [];
        document.querySelectorAll('#seasons-container .season-group').forEach((seasonEl, seasonIndex) => {
            const episodes = [];
            seasonEl.querySelectorAll('.episode-url').forEach((episodeInput, episodeIndex) => {
                episodes.push({
                    episodeNumber: episodeIndex + 1,
                    videoUrl: episodeInput.value
                });
            });
            seasons.push({
                seasonNumber: seasonIndex + 1,
                episodes
            });
        });
        contentData.seasons = seasons;
    }

    try {
        await addDoc(collection(db, 'content'), contentData);
        showNotification('success', `${contentType === 'film' ? 'Фильм' : 'Сериал'} успешно добавлен!`);
        document.getElementById('add-movie-modal').classList.add('hidden');
        document.getElementById('movie-form').reset();
        document.getElementById('poster-preview').classList.add('hidden');
        document.getElementById('seasons-container').innerHTML = '';
        document.getElementById('video-section').classList.remove('hidden');
        document.getElementById('seasons-section').classList.add('hidden');
        loadContent(contentType === 'all' ? 'all' : contentType);
    } catch (error) {
        console.error(`Ошибка при добавлении ${contentType}:`, error);
        showNotification('error', `Произошла ошибка при добавлении ${contentType}.`);
    }
};

document.getElementById('movie-form').addEventListener('submit', handleContentSubmit);

const isBookmarked = async (contentId) => {
  if (!currentUser) return false;
  const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
  if (userDoc.exists()) {
    const userData = userDoc.data();
    return userData.films && userData.films.includes(contentId);
  }
  return false;
};

const toggleBookmark = async (contentId) => {
  if (!currentUser) {
    showNotification('error', 'Для добавления в закладки необходимо авторизоваться!');
    return;
  }
  
  try {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDocSnap = await getDoc(userDocRef);
    const isCurrentlyBookmarked = userDocSnap.exists() && userDocSnap.data().films && userDocSnap.data().films.includes(contentId);

    if (isCurrentlyBookmarked) {
      await updateDoc(userDocRef, {
        films: arrayRemove(contentId)
      });
      showNotification('success', 'Удалено из закладок!');
    } else {
      await updateDoc(userDocRef, {
        films: arrayUnion(contentId)
      }, { merge: true });
      showNotification('success', 'Добавлено в закладки!');
    }
    return !isCurrentlyBookmarked;
  } catch (error) {
    console.error('Ошибка при переключении закладки:', error);
    showNotification('error', 'Ошибка при работе с закладками. Проверьте консоль и правила безопасности.');
  }
};

const initBookmarkButton = async (contentId) => {
  const bookmarkButton = document.getElementById('bookmark-btn');
  if (!bookmarkButton || !currentUser) return;

  const updateButtonUI = async () => {
    const isBookmarked = await isBookmarked(contentId);
    bookmarkButton.classList.remove('bg-gray-700', 'bg-green-600', 'bg-red-600', 'hover:bg-gray-600', 'hover:bg-green-700', 'hover:bg-red-700');
    bookmarkButton.classList.add(`bg-${isBookmarked ? 'red-600' : 'green-600'}`, `hover:bg-${isBookmarked ? 'red-700' : 'green-700'}`);
    bookmarkButton.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">${isBookmarked ? '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>' : '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'}`;
  };

  await updateButtonUI();
  
  bookmarkButton.onclick = async (e) => { 
    e.preventDefault(); 
    e.stopPropagation();
    const isAdded = await toggleBookmark(contentId);
    if (isAdded !== undefined) { 
      await updateButtonUI();
    }
  };
};

const loadBookmarks = async (userId) => {
  const contentList = document.getElementById('content-list');
  if (!contentList) {
    console.error('Элемент content-list не найден');
    return;
  }

  contentList.innerHTML = '<p class="text-xl text-gray-400">Загрузка закладок...</p>';

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists() || !userDoc.data().films || userDoc.data().films.length === 0) {
      contentList.innerHTML = '<p class="text-xl text-gray-400">У вас пока нет закладок.</p>';
      return;
    }

    const contentIds = userDoc.data().films;
    const contentMap = new Map();
    for (const id of contentIds) {
      const docSnap = await getDoc(doc(db, 'content', id));
      if (docSnap.exists()) {
        contentMap.set(id, { id: docSnap.id, ...docSnap.data() });
      }
    }

    const contentHtml = Array.from(contentMap.values()).map(data => createFilmCard(data.id, data, 'N/A', 'opacity-100'));
    contentList.innerHTML = contentHtml.join('');
    contentList.classList.add('grid', 'grid-cols-1', 'md:grid-cols-3', 'lg:grid-cols-5', 'gap-6');
    initializeCardEvents(contentList);
  } catch (error) {
    console.error("Ошибка при загрузке закладок:", error);
    contentList.innerHTML = '<p class="text-xl text-red-500">Не удалось загрузить закладки.</p>';
  }
};

function createFilmCard(contentId, data, imdbRating, cardOpacity) {
  return `
    <div class="relative bg-gray-800 rounded-lg shadow-lg overflow-hidden transform transition-transform duration-300 hover:scale-105 ${cardOpacity} h-auto min-h-[400px] max-w-xs mx-auto">
      <a href="film-page.html?id=${contentId}" class="block h-full">
        <div class="relative w-full aspect-[2/3] overflow-hidden">
          <img src="${data.posterUrl || 'placeholder-poster.jpg'}" alt="${data.title}" class="w-full h-full object-cover">
        </div>
        <div class="p-2 text-center bg-gray-700">
          <h3 class="text-lg font-bold text-orange-500 truncate">${data.title}</h3>
        </div>
        <div class="p-4 flex flex-col justify-between h-32">
          <div class="text-gray-400 text-xs space-y-1">
            <p>Тип: ${data.type === 'film' ? 'Фильм' : 'Сериал'}</p>
            <p>Жанр: ${data.genres || 'Не указан'}</p>
          </div>
          <p class="text-yellow-400 text-xs">IMDb: ${imdbRating}</p>
          ${userRole === 'admin' ? `
            <div class="mt-2 flex space-x-1">
              <button class="edit-btn bg-yellow-600 text-white px-2 py-1 rounded-md text-xs hover:bg-yellow-700" data-id="${contentId}" data-type="${data.type}">Редактировать</button>
              <button class="delete-btn bg-red-600 text-white px-2 py-1 rounded-md text-xs hover:bg-red-700" data-id="${contentId}">Удалить</button>
              <button class="hide-btn bg-gray-600 text-white px-2 py-1 rounded-md text-xs hover:bg-gray-700" data-id="${contentId}" data-hidden="${data.hidden || false}">Спрятать</button>
            </div>
          ` : ''}
          <button class="bookmark-btn absolute top-2 right-2 w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors" data-id="${contentId}">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>
      </a>
    </div>
  `;
}

function initializeCardEvents(contentList) {
  contentList.querySelectorAll('.bookmark-btn').forEach(btn => {
    const contentId = btn.dataset.id;
    if (currentUser) {
      isBookmarked(contentId).then(isBookmarked => {
        btn.classList.remove('bg-gray-700', 'bg-green-600', 'bg-red-600', 'hover:bg-gray-600', 'hover:bg-green-700', 'hover:bg-red-700');
        btn.classList.add(`bg-${isBookmarked ? 'red-600' : 'green-600'}`, `hover:bg-${isBookmarked ? 'red-700' : 'green-700'}`);
        btn.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">${isBookmarked ? '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>' : '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'}`;
      });

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isAdded = await toggleBookmark(contentId);
        if (isAdded !== undefined) {
          btn.classList.remove('bg-green-600', 'bg-red-600', 'hover:bg-green-700', 'hover:bg-red-700');
          btn.classList.add(`bg-${isAdded ? 'red-600' : 'green-600'}`, `hover:bg-${isAdded ? 'red-700' : 'green-700'}`);
          btn.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">${isAdded ? '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>' : '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'}`;
        }
      });
    } else {
      btn.classList.add('bg-gray-400', 'hover:bg-gray-500');
      btn.innerHTML = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showNotification('error', 'Для добавления в закладки необходимо авторизоваться!');
      });
    }
  });

  contentList.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentContentId = e.target.dataset.id;
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
          addSeriesModal.classList.remove('hidden');
        }
      }
    });
  });

  contentList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm('Вы уверены, что хотите удалить этот контент?')) {
        const id = e.target.dataset.id;
        await deleteDoc(doc(db, 'content', id));
        showNotification('success', 'Контент удален!');
        loadContent('all'); // Используем 'all' вместо data.type для главной страницы
      }
    });
  });

  contentList.querySelectorAll('.hide-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = e.target.dataset.id;
      const isHidden = e.target.dataset.hidden === 'true';
      await updateDoc(doc(db, 'content', id), {
        hidden: !isHidden
      });
      showNotification('success', `Контент ${!isHidden ? 'спрятан' : 'отображен'}!`);
      loadContent('all'); // Используем 'all' вместо data.type для главной страницы
    });
  });
}

// === Обработчик состояния пользователя ===
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

      allUsersLinks.forEach(link => {
        link.classList.toggle('hidden', userRole !== 'admin');
      });
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
      if (profileDropdown) {
        profileDropdown.classList.add('hidden');
      }
    }
  }

  if (user) {
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      userRole = userDocSnap.data().role;
    } else {
      userRole = 'user';
      await setDoc(userDocRef, { role: userRole, email: user.email, films: [] });
    }
  } else {
    userRole = 'guest';
  }

  if (isHomepage) loadHomepageContent();
  else if (isFilmsPage) loadContent('film');
  else if (isSeriesPage) loadContent('series');
  else if (isBookmarksPage && currentUser) loadBookmarks(currentUser.uid);
  else if (isProfilePage) loadProfilePageContent();
  else if (isUsersPage) loadUserManagementPage();
  else if (isFilmPage) {
    const urlParams = new URLSearchParams(window.location.search);
    const contentId = urlParams.get('id');
    if (contentId) {
      initBookmarkButton(contentId);
    }
  } else if (isEditFilmPage) {
    const urlParams = new URLSearchParams(window.location.search);
    const filmId = urlParams.get('id');
    if (filmId) {
      loadFilmForEditing(filmId);
    }
  }
});

// === Функции для обработки модальных окон и добавления сезонов ===
function closeModal(type) {
  return () => {
    const modal = type === 'film' ? addFilmModal : addSeriesModal;
    if (modal) modal.classList.add('hidden');
  };
}

function addSeason() {
  const seasonNumber = seasonsContainer.querySelectorAll('.season-group').length + 1;
  const seasonHtml = `
    <div class="season-group mb-4 p-4 bg-gray-700 rounded-lg">
      <h4 class="text-lg font-bold mb-2">Сезон ${seasonNumber}</h4>
      <div class="episode-container space-y-2">
        <div class="flex items-center space-x-2">
          <input type="text" class="episode-url bg-gray-600 text-white p-2 rounded-md w-full" placeholder="URL эпизода 1">
          <button type="button" class="remove-episode-btn bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700">Удалить</button>
        </div>
      </div>
      <button type="button" class="add-episode-btn bg-green-600 text-white px-2 py-1 rounded-md mt-2 hover:bg-green-700">Добавить эпизод</button>
    </div>
  `;
  seasonsContainer.insertAdjacentHTML('beforeend', seasonHtml);

  const seasonGroup = seasonsContainer.lastElementChild;
  seasonGroup.querySelector('.add-episode-btn').addEventListener('click', () => {
    const episodeNumber = seasonGroup.querySelectorAll('.episode-url').length + 1;
    const episodeHtml = `
      <div class="flex items-center space-x-2 mt-2">
        <input type="text" class="episode-url bg-gray-600 text-white p-2 rounded-md w-full" placeholder="URL эпизода ${episodeNumber}">
        <button type="button" class="remove-episode-btn bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700">Удалить</button>
      </div>
    `;
    seasonGroup.querySelector('.episode-container').insertAdjacentHTML('beforeend', episodeHtml);
    seasonGroup.querySelectorAll('.remove-episode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.parentElement.remove();
      });
    });
  });

  seasonGroup.querySelectorAll('.remove-episode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.parentElement.remove();
    });
  });
}

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ КОНСОЛИ ===
let userRole = 'guest'; // Будет обновляться

// Обновляем роль при смене пользователя
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        userRole = snap.exists() ? snap.data().role || 'user' : 'user';
    } else {
        userRole = 'guest';
    }
    // Обновляем UI (твой код из app.js)
    updateAuthUI(user);
});

// Экспортируем для консоли
window.getCurrentUser = () => auth.currentUser;
window.getUserRole = () => userRole;
window.revokeAdmin = async () => {
    const user = auth.currentUser;
    if (!user) return console.error("Не авторизован");
    await updateDoc(doc(db, 'users', user.uid), { role: 'user' });
    console.log("Админка снята. Роль: user");
    location.reload();
};
