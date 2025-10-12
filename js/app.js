<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HATE Studio - Сериалы</title>
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🎬%3C/text%3E%3C/svg%3E" />
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body class="bg-gray-900 text-white min-h-screen flex flex-col">
    <!-- Header (оставляем без изменений) -->
    <header class="bg-gray-800 shadow-md sticky top-0 z-50">
        <!-- Ваш существующий код header -->
    </header>

    <main class="flex-grow container mx-auto px-4 py-8">
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-3xl md:text-5xl font-bold text-orange-500">Все сериалы</h2>
            <button id="add-content-btn" class="hidden bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                Добавить сериал
            </button>
        </div>

        <div id="content-list" class="space-y-4 md:space-y-0 md:grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            <!-- Карточки будут рендериться здесь через JavaScript -->
        </div>
    </main>

    <footer class="bg-gray-800 py-4 text-center text-gray-400">
        <p class="text-sm">&copy; 2025 HATE Studio. Все права защищены.</p>
    </footer>

    <script type="module" src="js/app.js"></script>
</body>
</html>
