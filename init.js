import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const movies = [
    {
        title: "Матрица",
        year: 1999,
        poster: "https://placehold.co/600x900/1f2937/d1d5db?text=Matrix",
        description: "Компьютерный хакер узнает шокирующую правду о реальности.",
        director: "Лана Вачовски, Лилли Вачовски",
        actors: "Киану Ривз, Лоуренс Фишберн, Керри-Энн Мосс",
        genre: "Научная фантастика, Боевик",
        type: "movie"
    },
    {
        title: "Начало",
        year: 2010,
        poster: "https://placehold.co/600x900/1f2937/d1d5db?text=Inception",
        description: "Профессиональный вор крадет ценные секреты из глубин подсознания.",
        director: "Кристофер Нолан",
        actors: "Леонардо Ди Каприо, Джозеф Гордон-Левитт, Эллиот Пейдж",
        genre: "Научная фантастика, Триллер",
        type: "movie"
    },
    {
        title: "Интерстеллар",
        year: 2014,
        poster: "https://placehold.co/600x900/1f2937/d1d5db?text=Interstellar",
        description: "Команда исследователей отправляется в путешествие за пределы нашей галактики.",
        director: "Кристофер Нолан",
        actors: "Мэттью МакКонахи, Энн Хэтэуэй, Джессика Честейн",
        genre: "Научная фантастика, Приключения",
        type: "movie"
    },
    {
        title: "Побег из Шоушенка",
        year: 1994,
        poster: "https://placehold.co/600x900/1f2937/d1d5db?text=Shawshank+Redemption",
        description: "Два заключенных дружат на протяжении многих лет, находя утешение и искупление.",
        director: "Фрэнк Дарабонт",
        actors: "Тим Роббинс, Морган Фримен, Боб Гантон",
        genre: "Драма",
        type: "movie"
    }
];

const series = [
    {
        title: "Игра престолов",
        year: 2011,
        poster: "https://placehold.co/600x900/1f2937/d1d5db?text=Game+of+Thrones",
        description: "Девять благородных семей борются за контроль над мифическими землями Вестероса.",
        director: "Различные",
        actors: "Питер Динклэйдж, Лена Хиди, Эмилия Кларк",
        genre: "Фэнтези, Драма",
        type: "series"
    },
    {
        title: "Очень странные дела",
        year: 2016,
        poster: "https://placehold.co/600x900/1f2937/d1d5db?text=Stranger+Things",
        description: "Исчезновение молодого парня раскрывает секреты города, а также скрытые сверхъестественные силы.",
        director: "Братья Даффер",
        actors: "Милли Бобби Браун, Финн Вулфхард, Гейтен Матараццо",
        genre: "Фантастика, Ужасы",
        type: "series"
    },
    {
        title: "Черное зеркало",
        year: 2011,
        poster: "https://placehold.co/600x900/1f2937/d1d5db?text=Black+Mirror",
        description: "Антология, показывающая темную сторону нашего будущего с высокими технологиями.",
        director: "Различные",
        actors: "Различные",
        genre: "Научная фантастика, Триллер",
        type: "series"
    },
    {
        title: "Мандалорец",
        year: 2019,
        poster: "https://placehold.co/600x900/1f2937/d1d5db?text=Mandalorian",
        description: "Наемник-одиночка в отдаленных уголках галактики.",
        director: "Различные",
        actors: "Педро Паскаль",
        genre: "Научная фантастика, Приключения",
        type: "series"
    }
];

// Функция для загрузки данных в Firestore
async function uploadData() {
    const statusDiv = document.getElementById('status-message');
    statusDiv.textContent = 'Загрузка данных...';

    try {
        // Загружаем фильмы
        for (const movie of movies) {
            const docRef = doc(db, `/artifacts/${appId}/public/data/movies`, movie.title.replace(/\s/g, ''));
            await setDoc(docRef, movie);
        }

        // Загружаем сериалы
        for (const seriesItem of series) {
            const docRef = doc(db, `/artifacts/${appId}/public/data/series`, seriesItem.title.replace(/\s/g, ''));
            await setDoc(docRef, seriesItem);
        }

        statusDiv.textContent = 'Данные успешно загружены! Теперь вы можете вернуться на главную страницу.';
        statusDiv.classList.remove('text-yellow-400');
        statusDiv.classList.add('text-green-500');
    } catch (e) {
        console.error("Error adding document: ", e);
        statusDiv.textContent = `Ошибка при загрузке данных: ${e.message}`;
        statusDiv.classList.remove('text-yellow-400');
        statusDiv.classList.add('text-red-500');
    }
}

document.getElementById('init-data-btn').addEventListener('click', uploadData);
