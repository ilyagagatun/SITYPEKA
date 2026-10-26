// Инициализация Telegram WebApp
const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg) {
    tg.ready();
    tg.expand();
    try {
        tg.setHeaderColor('#FFF6BD');
        tg.setBackgroundColor('#FFF6BD');
    } catch (e) {}
}

function haptic(type = 'light') {
    if (tg && tg.HapticFeedback) {
        if (type === 'success' || type === 'warning' || type === 'error') {
            tg.HapticFeedback.notificationOccurred(type);
        } else {
            tg.HapticFeedback.impactOccurred(type);
        }
    }
}

const CONFIG = {
    DEMO_MODE: true,        // true — без суточных лимитов (для показа). Для боевого запуска поставь false
    BOOKING_ENDPOINT: '',   // URL твоего API, который принимает брони
    SHARE_URL: 'https://t.me/your_channel',
    SHARE_TEXT: 'Заходи в «Ситуацию» 🦆🍸',
    SPIN_DURATION_MS: 4250  // должно совпадать с transition колеса в CSS (4.2s)
};

const KEYS = {
    vault: 'situacia_vault_v1', spins: 'situacia_spins_v1', pending: 'situacia_pending_prize_v1',
    streak: 'situacia_streak_v1', checkin: 'situacia_checkin_v1', repost: 'situacia_repost_v1',
    bookingBonus: 'situacia_booking_bonus_v1', age: 'situacia_age_ok_v1'
};

// Безопасная работа с localStorage (не падает на битых данных / в приватном режиме)
const store = {
    get(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} },
    remove(key) { try { localStorage.removeItem(key); } catch (e) {} }
};

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2700);
}

function triggerDuckQuack() {
    haptic('medium');
    showToast('🦆 Кря! Ситуация под контролем!');
}

// ==================== НАВИГАЦИЯ ====================
function switchTab(tabId) {
    haptic('light');
    document.querySelectorAll('.tab-screen').forEach(s => s.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.toggle('active', n.getAttribute('data-tab') === tabId);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== БАЗА ДАННЫХ ИИ-БАРМЕНА (Слайд 1 + Реальное меню) ====================
const aiSituations = [
    {
        id: 'breakup',
        label: '💔 расстался',
        cocktail: { name: "Ситуация «Я остаюсь»", desc: "Вишня, корица, цедра апельсина, Bourbon Holy Gun (160 мл)", price: "720 ₽" },
        shot: { name: "Вишня Лаванда", desc: "Авторский шот (50 мл)", price: "250 ₽" },
        food: { name: "Крем-брюле (Тёплое и сладкое)", desc: "Нежный десерт для восстановления душевного баланса", price: "350 ₽" },
        bonusOffer: "Сет «Я остаюсь»: скидка 20% на комбо у бара"
    },
    {
        id: 'friday_wild',
        label: '🔥 пятница без тормозов',
        cocktail: { name: "Ситуация «3.14ЗДЕЦ»", desc: "Яблоко, лайм-мята, игристое вино (220 мл)", price: "720 ₽" },
        shot: { name: "Гранд Шот «Соник»", desc: "Яблоко, цитрус, джин Broom (80 мл)", price: "400 ₽" },
        food: { name: "Тако с говядиной (3 шт.)", desc: "Лепешка, говядина, фасоль, томатная сальса, лайм", price: "450 ₽" },
        bonusOffer: "Второй шот «Соник» в подарок при заказе комбо"
    },
    {
        id: 'promotion',
        label: '🚀 отмечаю повышение',
        cocktail: { name: "Ситуация «Папа вернулся»", desc: "Персик, ваниль, ром Бланко (170 мл)", price: "720 ₽" },
        shot: { name: "Тирамису", desc: "Десертный авторский шот (50 мл)", price: "250 ₽" },
        food: { name: "Щупальца осьминога", desc: "С соусом из печёных перцев и ростками дайкона", price: "1400 ₽" },
        bonusOffer: "Бокал игристого в честь повышения за счёт заведения"
    },
    {
        id: 'calm',
        label: '🧘 хочу успокоиться',
        cocktail: { name: "Ситуация «Винтаж»", desc: "Сливки, имбирный пряник, ром Rumbarum Spiced (170 мл)", price: "720 ₽" },
        shot: { name: "Крыжовник Зелёный чай", desc: "Мягкий травяной шот (50 мл)", price: "250 ₽" },
        food: { name: "Рамен со свининой", desc: "Горячий куриный бульон, лапша, маринованное яйцо (330 г)", price: "500 ₽" },
        bonusOffer: "Секретный успокаивающий шот от шеф-бармена"
    },
    {
        id: 'payday',
        label: '💸 пришла зарплата',
        cocktail: { name: "Пунш Кон-Тики XXXL", desc: "3 вида рома, сок ананас, ваниль, гренадин, фрукты (2000 мл)", price: "4500 ₽" },
        shot: { name: "Сет шотов Б-52 (6 шт.)", desc: "Кофейный, сливочный и апельсиновый ликеры", price: "3000 ₽" },
        food: { name: "Сырная тарелка & Тар-тар из тунца", desc: "Пармезан, бри, монтеблю, гуакамоле, тунец", price: "1400 ₽" },
        bonusOffer: "VIP-комплимент от кухни к большому заказу"
    },
    {
        id: 'waited_friday',
        label: '🕺 я ждал эту пятницу',
        cocktail: { name: "Ситуация «Shake It»", desc: "Маракуйя, ваниль, джин Broom Pink (170 мл)", price: "720 ₽" },
        shot: { name: "Маракуйя", desc: "Тропический шот (50 мл)", price: "250 ₽" },
        food: { name: "Бургер в азиатском стиле", desc: "Котлета из говядины, картофельная булочка, азиатский соус", price: "680 ₽" },
        bonusOffer: "Скидка 15% на сет из 6 авторских шотов"
    },
    {
        id: 'adventure',
        label: '🌪 хочу приключений',
        cocktail: { name: "Ситуация «Обманчива»", desc: "Белые какао-бобы, апельсиновый ликер, джин Broom (90 мл)", price: "720 ₽" },
        shot: { name: "Щавель Базилик", desc: "Неожиданный гастро-шот (50 мл)", price: "250 ₽" },
        food: { name: "Пэн Ис Паста (NEW)", desc: "Куриное филе, шампиньоны, сливки, приправа из сморчков", price: "450 ₽" },
        bonusOffer: "Купон на мистический шот-сюрприз у стойки"
    }
];

let selectedMoodId = 'breakup';

function renderMoodBartender() {
    const chipsContainer = document.getElementById('moodChipsContainer');
    chipsContainer.innerHTML = aiSituations.map(m => `
        <div class="mood-chip ${m.id === selectedMoodId ? 'active' : ''}" onclick="selectMood('${m.id}')">
            ${m.label}
        </div>
    `).join('');

    const current = aiSituations.find(m => m.id === selectedMoodId);
    const recContainer = document.getElementById('aiRecommendationCard');
    recContainer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-family:'Unbounded'; font-size:14px; font-weight:900;">Рецепт твоей ситуации:</span>
            <span style="background:#fff; border:1.5px solid #000; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:800;">${current.label}</span>
        </div>

        <div class="ai-rec-row">
            <div>
                <span class="ai-rec-tag">🍸 Коктейль</span>
                <div style="font-family:'Unbounded'; font-size:13px; font-weight:800;">${current.cocktail.name}</div>
                <div style="font-size:11px; color:var(--gray);">${current.cocktail.desc}</div>
            </div>
            <div class="price-tag">${current.cocktail.price}</div>
        </div>

        <div class="ai-rec-row">
            <div>
                <span class="ai-rec-tag" style="background:var(--orange-accent); color:#fff;">🥃 Шот</span>
                <div style="font-family:'Unbounded'; font-size:13px; font-weight:800;">${current.shot.name}</div>
                <div style="font-size:11px; color:var(--gray);">${current.shot.desc}</div>
            </div>
            <div class="price-tag">${current.shot.price}</div>
        </div>

        <div class="ai-rec-row">
            <div>
                <span class="ai-rec-tag" style="background:var(--green-accent);">🍽 Блюдо</span>
                <div style="font-family:'Unbounded'; font-size:13px; font-weight:800;">${current.food.name}</div>
                <div style="font-size:11px; color:var(--gray);">${current.food.desc}</div>
            </div>
            <div class="price-tag">${current.food.price}</div>
        </div>

        <button class="brutal-btn" style="margin-top:6px;" onclick="saveAiComboToVault('${current.id}')">
            🎁 Забрать комбо-бонус в корзину (на 4 дня)
        </button>
    `;
}

function selectMood(id) {
    haptic('medium');
    selectedMoodId = id;
    renderMoodBartender();
}

function saveAiComboToVault(id) {
    const current = aiSituations.find(m => m.id === id);
    addBonusToVault({
        title: current.bonusOffer,
        source: `ИИ-Бармен (${current.label})`,
        icon: '🤖',
        days: 4
    });
}

// ==================== ПОЛНОЕ МЕНЮ БАРА И КУХНИ (Из PDF файлов) ====================
const fullMenuData = [
    // АВТОРСКИЕ КОКТЕЙЛИ
    { mode: 'bar', cat: 'Авторские коктейли', name: "Ситуация «Папа вернулся»", desc: "Персик, ваниль, ром Бланко • 170 мл", price: 720, badge: 'ХИТ' },
    { mode: 'bar', cat: 'Авторские коктейли', name: "Ситуация «3.14ЗДЕЦ»", desc: "Яблоко, лайм-мята, игристое вино • 220 мл", price: 720, badge: 'ХИТ' },
    { mode: 'bar', cat: 'Авторские коктейли', name: "Ситуация «Винтаж»", desc: "Сливки, имбирный пряник, ром Rumbarum Spiced • 170 мл", price: 720 },
    { mode: 'bar', cat: 'Авторские коктейли', name: "Ситуация «French Kiss»", desc: "Грейпфрут, кокосовая вода, водка • 150 мл", price: 720 },
    { mode: 'bar', cat: 'Авторские коктейли', name: "Ситуация «Я остаюсь»", desc: "Вишня, корица, цедра апельсина, Bourbon Holy Gun • 160 мл", price: 720, badge: 'ИИ' },
    { mode: 'bar', cat: 'Авторские коктейли', name: "Ситуация «Обманчива»", desc: "Белые какао-бобы, апельсиновый ликер, джин Broom • 90 мл", price: 720 },
    { mode: 'bar', cat: 'Авторские коктейли', name: "Ситуация «Shake It»", desc: "Маракуйя, ваниль, джин Broom Pink • 170 мл", price: 720 },
    { mode: 'bar', cat: 'Авторские коктейли', name: "Ситуация «S.O.S.»", desc: "Ром, апельсиновый ликёр, Блю Кюрасао, ананас, лимон • 190 мл", price: 720, badge: 'NEW' },

    // АВТОРСКИЕ ШОТЫ
    { mode: 'bar', cat: 'Шоты и Сеты', name: "Гранд Шот «Соник»", desc: "Яблоко, цитрус, джин Broom • 80 мл", price: 400, badge: 'ХИТ' },
    { mode: 'bar', cat: 'Шоты и Сеты', name: "Вишня Лаванда", desc: "Авторский шот • 50 мл", price: 250 },
    { mode: 'bar', cat: 'Шоты и Сеты', name: "Миндаль в карамели", desc: "Авторский шот • 50 мл", price: 250 },
    { mode: 'bar', cat: 'Шоты и Сеты', name: "Малина + Мята", desc: "Авторский шот • 50 мл", price: 250 },
    { mode: 'bar', cat: 'Шоты и Сеты', name: "Маракуйя", desc: "Авторский шот • 50 мл", price: 250 },
    { mode: 'bar', cat: 'Шоты и Сеты', name: "Крыжовник Зелёный чай", desc: "Авторский шот • 50 мл", price: 250 },
    { mode: 'bar', cat: 'Шоты и Сеты', name: "Клюква + Дахунпао", desc: "Авторский шот • 50 мл", price: 250 },
    { mode: 'bar', cat: 'Шоты и Сеты', name: "Щавель Базилик", desc: "Авторский шот • 50 мл", price: 250 },
    { mode: 'bar', cat: 'Шоты и Сеты', name: "Тирамису", desc: "Авторский шот • 50 мл", price: 250 },
    { mode: 'bar', cat: 'Шоты и Сеты', name: "Сет авторских шотов (6 шт.)", desc: "6 шотов одного вкуса на выбор • 6x50 мл", price: 1200, badge: 'СЕТ' },

    // ОГНЕННЫЙ ПУНШ ПАТРУЛЬ
    { mode: 'bar', cat: 'Пунш Патруль XXXL', name: "Сет шотов Б-52 (6 шт.)", desc: "Кофейный, сливочный и апельсиновый ликеры • 6x50 мл", price: 3000 },
    { mode: 'bar', cat: 'Пунш Патруль XXXL', name: "«Соник» XXXL (9 шт.)", desc: "Яблоко, цитрус, джин Broom • 9x80 мл", price: 3500 },
    { mode: 'bar', cat: 'Пунш Патруль XXXL', name: "Пунш Кон-Тики XXXL", desc: "3 вида рома, сок ананас, ваниль, гренадин, фрукты • 2000 мл", price: 4500, badge: 'XXXL' },
    { mode: 'bar', cat: 'Пунш Патруль XXXL', name: "Пунш Гусарский XXXL", desc: "Игристое вино, апельсиновый ликер, груша, ягоды • 2000 мл", price: 4500, badge: 'XXXL' },

    // КЛАССИКА
    { mode: 'bar', cat: 'Классика & Вино', name: "Лонг Айленд", desc: "Водка, ром, текила, джин, ликер, кола, лимон • 350 мл", price: 950 },
    { mode: 'bar', cat: 'Классика & Вино', name: "Апероль Спритц", desc: "Апероль, игристое, содовая • 200 мл", price: 700 },
    { mode: 'bar', cat: 'Классика & Вино', name: "Негрони / Виски Сауэр / Маргарита", desc: "Классические коктейли на выбор", price: 650 },
    { mode: 'bar', cat: 'Классика & Вино', name: "Просекко (Италия)", desc: "Игристое вино • 150 мл", price: 790 },
    { mode: 'bar', cat: 'Классика & Вино', name: "Совиньон Блан (Новая Зеландия)", desc: "Белое вино • 150 мл", price: 750 },

    // КУХНЯ: ПАСТЫ И ЕШЬ РУКАМИ
    { mode: 'kitchen', cat: 'Пасты', name: "Пэн Ис Паста", desc: "Куриное филе, шампиньоны, паста, сливки, приправа из сморчков • 265 г", price: 450, badge: 'NEW' },
    { mode: 'kitchen', cat: 'Пасты', name: "Лазанья классическая", desc: "Говядина болоньезе, бешамель, пармезан, моцарелла, копченая сметана • 290 г", price: 530 },
    { mode: 'kitchen', cat: 'Пасты', name: "Сливочная паста с морепродуктами", desc: "Спагетти, креветки, кальмар, мидии, пармезан • 240 г", price: 600 },
    { mode: 'kitchen', cat: 'Пасты', name: "Ригатонни с перечным песто и креветками", desc: "Перечный песто, креветки, ростки дайкона, зеленое масло • 280 г", price: 610 },

    { mode: 'kitchen', cat: 'Ешь руками', name: "Тако с говядиной (3 шт.)", desc: "Лепешка, говядина, фасоль, томатная сальса, лайм • 150 г", price: 450, badge: 'ХИТ' },
    { mode: 'kitchen', cat: 'Ешь руками', name: "Шаурма Том-Ям", desc: "Курица том-ям, черри, кинза, маринованные овощи, блэк лаваш • 260 г", price: 520, badge: 'ХИТ' },
    { mode: 'kitchen', cat: 'Ешь руками', name: "Кесадилья с курицей", desc: "Тортилья, куриная грудка в сливочном соусе, гуакамоле, копченая сметана • 340 г", price: 550 },
    { mode: 'kitchen', cat: 'Ешь руками', name: "Бургер в азиатском стиле", desc: "Котлета из говядины, картофельная булочка, азиатский соус • 220 г", price: 680 },

    // КУХНЯ: ЗАКУСКИ, СУПЫ, ГОРЯЧЕЕ
    { mode: 'kitchen', cat: 'Закуски & Поке', name: "Поке с креветками", desc: "Рис, креветки, авокадо, древесные грибы, дайкон, черри, нори • 240 г", price: 600 },
    { mode: 'kitchen', cat: 'Закуски & Поке', name: "Брускетта с креветкой и авокадо", desc: "Чиабатта, креветки, соус маракуйя-чили • 175 г", price: 610 },
    { mode: 'kitchen', cat: 'Закуски & Поке', name: "Тар-тар из тунца", desc: "Тунец, гуакамоле, лайм, гренки из багета, нори • 155 г", price: 650 },
    { mode: 'kitchen', cat: 'Закуски & Поке', name: "Креветки в темпуре", desc: "С соусом Том-Ям • 180 г", price: 690 },
    { mode: 'kitchen', cat: 'Закуски & Поке', name: "Запеченный камамбер", desc: "Камамбер, томаты черри, чеснок, багет • 150 г", price: 550 },
    { mode: 'kitchen', cat: 'Закуски & Поке', name: "Батат-фри с соусом спайси", desc: "Хрустящий батат • 180 г", price: 400 },

    { mode: 'kitchen', cat: 'Супы & Горячее', name: "Том-Ям с морепродуктами", desc: "Креветки, кальмары, шампиньоны, черри, рис • 390 г", price: 650, badge: 'ХИТ' },
    { mode: 'kitchen', cat: 'Супы & Горячее', name: "Рамен со свининой", desc: "Куриный бульон, яйцо, запеченная свинина, рисовая лапша • 330 г", price: 500 },
    { mode: 'kitchen', cat: 'Супы & Горячее', name: "Удон со свининой и овощами", desc: "Лапша удон, свинина, стручковая фасоль, кунжут • 240 г", price: 500 },
    { mode: 'kitchen', cat: 'Супы & Горячее', name: "Щупальца осьминога", desc: "С соусом из печёных перцев и ростками дайкона • 150 г", price: 1400 },
    { mode: 'kitchen', cat: 'Десерты', name: "Крем-брюле", desc: "Классический нежный десерт", price: 350 }
];

let currentMenuMode = 'bar';
let currentCategory = 'Все';

function switchMenuMode(mode) {
    haptic('light');
    currentMenuMode = mode;
    document.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('seg-' + mode).classList.add('active');

    if (mode === 'book') {
        document.getElementById('menuListSection').style.display = 'none';
        document.getElementById('bookingSection').style.display = 'block';
    } else {
        document.getElementById('menuListSection').style.display = 'block';
        document.getElementById('bookingSection').style.display = 'none';
    document.getElementById('menuSearchInput').value = '';
        currentCategory = 'Все';
        renderCategoryPills();
        renderMenuItems();
    }
}

function renderCategoryPills() {
    const itemsInMode = fullMenuData.filter(i => i.mode === currentMenuMode);
    const cats = ['Все', ...new Set(itemsInMode.map(i => i.cat))];
    const container = document.getElementById('categoryPills');
    container.innerHTML = cats.map(c => `
        <div class="cat-pill ${c === currentCategory ? 'active' : ''}" data-cat="${escapeHtml(c)}" onclick="selectCategory(this.dataset.cat)">
            ${c}
        </div>
    `).join('');
}

function selectCategory(cat) {
    haptic('light');
    currentCategory = cat;
    renderCategoryPills();
    renderMenuItems();
}

function renderMenuItems() {
    const query = document.getElementById('menuSearchInput').value.toLowerCase().trim();
    const filtered = fullMenuData.filter(item => {
        const matchMode = item.mode === currentMenuMode;
        const matchCat = currentCategory === 'Все' || item.cat === currentCategory;
        const matchQuery = !query || item.name.toLowerCase().includes(query) || item.desc.toLowerCase().includes(query);
        return matchMode && matchCat && matchQuery;
    });

    const container = document.getElementById('menuItemsContainer');
    if (filtered.length === 0) {
        container.innerHTML = `<div class="brutal-card" style="text-align:center;">Ничего не найдено 🦆</div>`;
        return;
    }

    container.innerHTML = filtered.map(item => `
        <div class="menu-item-card">
            <div>
                <div style="font-family:'Unbounded'; font-size:13px; font-weight:800;">
                    ${item.name}
                    ${item.badge ? `<span class="${item.badge === 'NEW' ? 'badge-new' : 'badge-hit'}">${item.badge}</span>` : ''}
                </div>
                <div style="font-size:11px; color:var(--gray); margin-top:3px; font-weight:600;">${item.desc}</div>
            </div>
            <div class="price-tag">${item.price} ₽</div>
        </div>
    `).join('');
}

function openMenuHighlight(itemName) {
    switchTab('menu');
    const target = fullMenuData.find(i => i.name.includes(itemName));
    if (target) {
        switchMenuMode(target.mode);
        document.getElementById('menuSearchInput').value = itemName;
        renderMenuItems();
    }
}

// ==================== КОЛЕСО СИТУАЦИЙ (Слайд 10) ====================
const wheelPrizes = [
    { title: "Шот за 1 ₽", color: "#FF85C0", icon: "🥃", days: 3 },
    { title: "Скидка 15% на счёт", color: "#FFF6BD", icon: "🏷", days: 5 },
    { title: "Второй коктейль -40%", color: "#FFD6E8", icon: "🍹", days: 4 },
    { title: "Подарок к заказу", color: "#73D13D", icon: "🎁", days: 6 },
    { title: "Секретный коктейль", color: "#B37FEB", icon: "🔮", days: 7 },
    { title: "Второй коктейль -50%", color: "#FF9C6E", icon: "🍸", days: 3 }
];

let wheelRotation = 0;
let isSpinning = false;
let spinsLeft = store.get(KEYS.spins, 2);

// Перенос подписи на строки (вместо обрезки slice)
function wrapLabel(title, maxChars = 12) {
    const lines = [];
    let line = '';
    title.split(' ').forEach(word => {
        const next = line ? line + ' ' + word : word;
        if (next.length > maxChars && line) { lines.push(line); line = word; } else { line = next; }
    });
    if (line) lines.push(line);
    return lines;
}

function drawWheel() {
    const canvas = document.getElementById('wheelCanvas');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = centerX - 10;
    const sliceAngle = (2 * Math.PI) / wheelPrizes.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    wheelPrizes.forEach((prize, index) => {
        const startAngle = index * sliceAngle - Math.PI / 2;
        const endAngle = startAngle + sliceAngle;

        // Сектор
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = prize.color;
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#141414';
        ctx.stroke();

        // Текст внутри сектора
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#141414';
        ctx.font = '26px sans-serif';
        ctx.fillText(prize.icon, radius - 16, 9);
        ctx.font = '800 14px Unbounded, sans-serif';
        const lines = wrapLabel(prize.title);
        lines.forEach((line, i) => ctx.fillText(line, radius - 62, 5 + (i - (lines.length - 1) / 2) * 16));
        ctx.restore();
    });
}

function setSpinButtonState(busy) {
    document.getElementById('spinBtn').disabled = busy;
}

function awardPrize(won) {
    haptic('success');
    addBonusToVault({ title: won.title, source: 'Колесо ситуаций', icon: won.icon, days: won.days });
    openModal(won.icon, 'ВЫИГРЫШ!', `Ты выбил: «${won.title}»`, `⏳ Срок жизни бонуса: ${won.days} дн. Добавлено в твою корзину!`);
    launchConfetti();
}

function spinWheel() {
    if (isSpinning) return;
    if (spinsLeft <= 0) {
        haptic('error');
        showToast('Нужен чек в баре для новых вращений!');
        return;
    }

    isSpinning = true;
    setSpinButtonState(true);
    spinsLeft--;
    const prizeIndex = Math.floor(Math.random() * wheelPrizes.length);
    // Списание и приз фиксируем сразу: если закрыть апп посреди анимации, приз выдастся при следующем входе
    store.set(KEYS.spins, spinsLeft);
    store.set(KEYS.pending, { index: prizeIndex });
    document.getElementById('spinsCounter').textContent = spinsLeft;
    haptic('medium');

    const sliceDeg = 360 / wheelPrizes.length;
    const targetAngle = 360 - (prizeIndex * sliceDeg + sliceDeg / 2);
    wheelRotation += 360 * 6 + ((targetAngle - (wheelRotation % 360) + 360) % 360);
    document.getElementById('wheelCanvas').style.transform = `rotate(${wheelRotation}deg)`;

    setTimeout(() => {
        isSpinning = false;
        setSpinButtonState(false);
        store.remove(KEYS.pending);
        awardPrize(wheelPrizes[prizeIndex]);
    }, CONFIG.SPIN_DURATION_MS);
}

function resolvePendingPrize() {
    const pending = store.get(KEYS.pending, null);
    store.remove(KEYS.pending);
    if (pending && wheelPrizes[pending.index]) awardPrize(wheelPrizes[pending.index]);
}

// ==================== КОРЗИНА БОНУСОВ С ТАЙМЕРОМ СГОРАНИЯ (3-7 ДНЕЙ) ====================
const savedVault = store.get(KEYS.vault, null);
let bonusVault = Array.isArray(savedVault) ? savedVault : [
    {
        id: 'welcome-1',
        title: 'Шот «Вишня Лаванда» за 1 ₽',
        source: 'Подарок за первый вход',
        icon: '🍒',
        createdAt: Date.now() - (12 * 3600 * 1000),
        expiresAt: Date.now() + (3 * 24 * 3600 * 1000), // сгорит через 3 дня
        code: 'SIT-771'
    }
];

function saveVault() {
    store.set(KEYS.vault, bonusVault);
    updateVaultBadges();
}

function addBonusToVault({ title, source, icon, days }) {
    const lifespanDays = days || (Math.floor(Math.random() * 5) + 3); // 3-7 дней
    const now = Date.now();
    const newBonus = {
        id: 'b-' + now + '-' + Math.floor(Math.random() * 999),
        title,
        source,
        icon: icon || '🎁',
        createdAt: now,
        expiresAt: now + lifespanDays * 24 * 60 * 60 * 1000,
        code: 'BAR-' + Math.floor(100 + Math.random() * 900)
    };
    bonusVault.unshift(newBonus);
    saveVault();
    renderVault();
    showToast(`🎁 «${title}» в корзине (сгорит через ${lifespanDays} дн.)`);
}

function formatRemainingTime(ms) {
    if (ms <= 0) return 'СГОРЕЛ 🔥';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${days}д ${String(hours).padStart(2, '0')}ч ${String(mins).padStart(2, '0')}м ${String(secs).padStart(2, '0')}с`;
}

function renderVault() {
    const container = document.getElementById('vaultItemsContainer');
    const now = Date.now();

    // Фильтруем актуальные бонусы
    bonusVault = bonusVault.filter(b => b.expiresAt > now);
    updateVaultBadges();

    if (bonusVault.length === 0) {
        container.innerHTML = `
            <div class="brutal-card" style="text-align:center; padding: 28px 16px;">
                <div style="font-size:42px; margin-bottom:8px;">🦆💨</div>
                <div style="font-family:'Unbounded'; font-size:15px; font-weight:800;">В корзине пока пусто</div>
                <p style="font-size:12px; color:var(--gray); margin: 6px 0 14px;">Покрути Колесо ситуаций или спроси совет у ИИ-Бармена!</p>
                <button class="brutal-btn" onclick="switchTab('wheel')">🎰 Крутить колесо</button>
            </div>
        `;
        return;
    }

    container.innerHTML = bonusVault.map(item => {
        const totalLife = item.expiresAt - item.createdAt;
        const left = item.expiresAt - now;
        const percent = Math.max(5, Math.min(100, Math.round((left / totalLife) * 100)));
        const isUrgent = left < (48 * 3600 * 1000);

        return `
            <div class="bonus-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                    <div style="display:flex; gap:10px; align-items:center;">
                        <div style="font-size:30px; background:var(--bg-yellow); border:2px solid #000; width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                            ${escapeHtml(item.icon)}
                        </div>
                        <div>
                            <div style="font-family:'Unbounded'; font-size:13px; font-weight:800;">${escapeHtml(item.title)}</div>
                            <div style="font-size:11px; color:var(--gray); font-weight:600;">Источник: ${escapeHtml(item.source)}</div>
                        </div>
                    </div>
                    <div class="price-tag" style="font-size:11px;">${escapeHtml(item.code)}</div>
                </div>

                <div class="bonus-timer-badge ${isUrgent ? 'urgent' : ''}" data-expires="${item.expiresAt}">
                    ⏳ Сгорит через: <span class="live-bonus-clock">${formatRemainingTime(left)}</span>
                </div>

                <div class="burn-progress-bg">
                    <div class="burn-progress-fill" style="width: ${percent}%;"></div>
                </div>

                <button class="brutal-btn green" style="padding:9px; font-size:11px;" onclick="redeemBonusWithWaiter('${escapeHtml(item.id)}')">
                    🍸 Показать и погасить у бармена
                </button>
            </div>
        `;
    }).join('');
}

function updateVaultBadges() {
    const count = bonusVault.length;
    document.getElementById('navVaultBadge').textContent = count;
    document.getElementById('headerVaultCount').textContent = count;
}

function redeemBonusWithWaiter(bonusId) {
    const target = bonusVault.find(b => b.id === bonusId);
    if (!target) return;
    haptic('warning');

    openModal(
        '🍸',
        'Покажи экран бармену',
        `Код бонуса: ${target.code} — «${target.title}»`,
        'Нажми кнопку ниже ТОЛЬКО в присутствии официанта или бармена!',
        () => {
            bonusVault = bonusVault.filter(b => b.id !== bonusId);
            saveVault();
            renderVault();
            closeModal();
            showToast('✅ Бонус успешно активирован!');
        },
        'Подтвердить погашение'
    );
}

// Живое обновление всех секундных таймеров в корзине
setInterval(() => {
    const now = Date.now();
    document.querySelectorAll('.bonus-timer-badge').forEach(badge => {
        const exp = Number(badge.getAttribute('data-expires'));
        const clockSpan = badge.querySelector('.live-bonus-clock');
        if (clockSpan) {
            clockSpan.textContent = formatRemainingTime(exp - now);
        }
    });
}, 1000);

// ==================== СТРИК ПОСЕЩЕНИЙ И ЖИВЫЕ СЧЕТЧИКИ ====================
let currentStreak = store.get(KEYS.streak, 2);

function renderStreak() {
    document.getElementById('streakBadge').textContent = `${currentStreak} / 10 🔥`;
    const container = document.getElementById('streakFlamesContainer');
    let html = '';
    for (let i = 1; i <= 10; i++) {
        const isLit = i <= currentStreak;
        html += `
            <div class="flame-step ${isLit ? 'lit' : ''}">
                <span class="flame-icon">${isLit ? '🔥' : '⚪'}</span>
                <span>${i}</span>
            </div>
        `;
    }
    container.innerHTML = html;

    document.getElementById('tier-3').classList.toggle('unlocked', currentStreak >= 3);
    document.getElementById('tier-5').classList.toggle('unlocked', currentStreak >= 5);
    document.getElementById('tier-10').classList.toggle('unlocked', currentStreak >= 10);
}

function simulateCheckIn() {
    const today = new Date().toDateString();
    if (!CONFIG.DEMO_MODE && store.get(KEYS.checkin, '') === today) {
        haptic('error');
        showToast('Сегодня огонёк уже зажжён 🔥');
        return;
    }
    haptic('success');
    store.set(KEYS.checkin, today);
    if (currentStreak < 10) currentStreak++;
    store.set(KEYS.streak, currentStreak);
    renderStreak();

    if (currentStreak === 3) {
        addBonusToVault({ title: 'Сет из 3 шотов за стрик (3 визита)', source: 'Стрик гостя 🔥', icon: '🥃', days: 7 });
    } else if (currentStreak === 5) {
        addBonusToVault({ title: 'Секретный коктейль (5 визитов)', source: 'Стрик гостя 🔥', icon: '🔮', days: 7 });
    } else if (currentStreak === 10) {
        addBonusToVault({ title: 'Постоянная скидка + Коктейль (10 визитов)', source: 'Стрик Легенды 🔥', icon: '👑', days: 7 });
    } else {
        showToast(`🔥 Огонёк зажжён! Твой стрик: ${currentStreak} из 10`);
    }
}

function claimRepostBonus() {
    if (!CONFIG.DEMO_MODE && Date.now() - store.get(KEYS.repost, 0) < 24 * 3600 * 1000) {
        haptic('error');
        showToast('Бонус за репост — раз в сутки');
        return;
    }
    haptic('success');
    const url = 'https://t.me/share/url?url=' + encodeURIComponent(CONFIG.SHARE_URL) + '&text=' + encodeURIComponent(CONFIG.SHARE_TEXT);
    if (tg && tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank', 'noopener');
    store.set(KEYS.repost, Date.now());
    addBonusToVault({ title: 'Коктейль за репост ТГ-канала', source: 'Акция: Репост', icon: '📢', days: 5 });
}

async function submitBooking() {
    const tgUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
    const payload = {
        name: document.getElementById('bookName').value.trim() || (tgUser && tgUser.first_name) || 'Гость',
        date: document.getElementById('bookDate').value || 'Сегодня',
        time: document.getElementById('bookTime').value,
        guests: document.getElementById('bookGuests').value,
        comment: document.getElementById('bookComment').value.trim(),
        initData: tg ? tg.initData : ''
    };

    let sent = false;
    if (CONFIG.BOOKING_ENDPOINT) {
        try {
            const res = await fetch(CONFIG.BOOKING_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            sent = res.ok;
        } catch (e) { sent = false; }
        if (!sent) {
            haptic('error');
            showToast('Не удалось отправить бронь, попробуй ещё раз');
            return;
        }
    }

    haptic('success');
    if (CONFIG.DEMO_MODE || !store.get(KEYS.bookingBonus, false)) {
        store.set(KEYS.bookingBonus, true);
        addBonusToVault({
            title: 'Велком-шот за бронь стола через Mini App',
            source: `Бронь на ${payload.date} в ${payload.time}`,
            icon: '📅',
            days: 6
        });
    }

    openModal('🦆✅', 'Стол забронирован!', `${payload.name}, ждём тебя (${payload.guests}) ${payload.date} в ${payload.time}.`,
        sent ? 'Администратор получил заявку!' : 'Демо-режим: заявка пока никуда не отправляется (не задан BOOKING_ENDPOINT).');
}

// Таймер обратного отсчета на Живом экране
let liveSeconds = 34 * 60;
setInterval(() => {
    if (liveSeconds > 0) liveSeconds--;
    const m = Math.floor(liveSeconds / 60);
    const s = liveSeconds % 60;
    const el = document.getElementById('liveCountdown');
    if (el) el.textContent = `${m} минуты ${String(s).padStart(2, '0')} сек`;
}, 1000);

const occupancyStates = [
    'Загруженность: средняя 🍹',
    'Загруженность: плотный движ 🔥',
    'Загруженность: есть места у бара 🍸'
];
let occIdx = 0;
function cycleOccupancy() {
    haptic('light');
    occIdx = (occIdx + 1) % occupancyStates.length;
    document.getElementById('occupancyText').textContent = occupancyStates[occIdx];
}

// ==================== МОДАЛЬНОЕ ОКНО ====================
function openModal(emoji, title, desc, extra, customCallback = null, btnLabel = 'Супер, в корзину!') {
    document.getElementById('modalEmoji').textContent = emoji;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalDesc').textContent = desc;
    document.getElementById('modalExtraBox').textContent = extra;

    const btn = document.getElementById('modalActionBtn');
    btn.textContent = btnLabel;
    btn.onclick = customCallback ? customCallback : closeModal;

    document.getElementById('prizeModal').classList.add('show');
}

function closeModal() {
    haptic('light');
    document.getElementById('prizeModal').classList.remove('show');
}

// ==================== ПРОВЕРКА ВОЗРАСТА ====================
function initAgeGate() {
    if (!store.get(KEYS.age, false)) document.getElementById('ageGate').classList.add('show');
}

function confirmAge() {
    store.set(KEYS.age, true);
    haptic('success');
    document.getElementById('ageGate').classList.remove('show');
}

function denyAge() {
    if (tg && tg.close) tg.close(); else showToast('Приложение только для гостей 18+');
}

// Инициализация при старте
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('bookDate').valueAsDate = new Date();
    document.getElementById('spinsCounter').textContent = spinsLeft;
    renderStreak();
    renderMoodBartender();
    drawWheel();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawWheel); // перерисовать после загрузки шрифта
    renderCategoryPills();
    renderMenuItems();
    saveVault();
    renderVault();
    initAgeGate();
    resolvePendingPrize();
});
