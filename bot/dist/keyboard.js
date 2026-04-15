/**
 * Inline-клавиатуры с цветными кнопками (Telegram Bot API: style — primary, success, danger).
 * Эмодзи в тексте кнопок (Unicode).
 */
function formatCurrencyHuman(currency) {
    const c = (currency || "").trim().toLowerCase();
    if (c === "rub" || c === "ruble" || c === "руб" || c === "₽")
        return "рублей";
    return currency;
}
function btn(text, data, style, iconCustomEmojiId) {
    const b = { text, callback_data: data };
    if (style)
        b.style = style;
    if (iconCustomEmojiId)
        b.icon_custom_emoji_id = iconCustomEmojiId;
    return b;
}
function resolveStyle(configured, fallback) {
    if (configured === null)
        return fallback;
    return configured;
}
const MENU_IDS = {
    tariffs: "menu:tariffs",
    proxy: "menu:proxy",
    my_proxy: "menu:my_proxy",
    singbox: "menu:singbox",
    my_singbox: "menu:my_singbox",
    profile: "menu:profile",
    devices: "menu:devices",
    topup: "menu:topup",
    referral: "menu:referral",
    trial: "menu:trial",
    vpn: "menu:vpn",
    support: "menu:support",
    promocode: "menu:promocode",
    extra_options: "menu:extra_options",
};
const DEFAULT_BUTTONS = [
    { id: "tariffs", visible: true, label: "📦 Тарифы", order: 0, style: "success" },
    { id: "proxy", visible: true, label: "🌐 Прокси", order: 0.5, style: "primary" },
    { id: "my_proxy", visible: true, label: "📋 Мои прокси", order: 0.6, style: "primary" },
    { id: "singbox", visible: true, label: "🔑 Доступы", order: 0.55, style: "primary" },
    { id: "my_singbox", visible: true, label: "📋 Мои доступы", order: 0.65, style: "primary" },
    { id: "profile", visible: true, label: "👤 Профиль", order: 1, style: "" },
    { id: "devices", visible: true, label: "📱 Устройства", order: 1.5, style: "primary" },
    { id: "topup", visible: true, label: "💳 Пополнить баланс", order: 2, style: "success" },
    { id: "referral", visible: true, label: "🔗 Реферальная программа", order: 3, style: "primary" },
    { id: "trial", visible: true, label: "🎁 Попробовать бесплатно", order: 4, style: "success" },
    { id: "vpn", visible: true, label: "🌐 Подключиться к VPN", order: 5, style: "danger", onePerRow: true },
    { id: "cabinet", visible: true, label: "🌐 Web Кабинет", order: 6, style: "primary" },
    { id: "tickets", visible: true, label: "🎫 Тикеты", order: 6.5, style: "primary" },
    { id: "support", visible: true, label: "🆘 Поддержка", order: 7, style: "primary" },
    { id: "promocode", visible: true, label: "🎟️ Промокод", order: 8, style: "primary" },
    { id: "extra_options", visible: true, label: "➕ Доп. опции", order: 9, style: "primary" },
];
function toStyle(s) {
    if (s === "primary" || s === "success" || s === "danger")
        return s;
    if (s === "")
        return undefined;
    return null;
}
/** Главное меню: кнопки из конфига. Эмодзи в label (Unicode) и/или icon_custom_emoji_id (премиум). Поддержка показывается только если задана хотя бы одна ссылка. Тикеты — Web App при включённой тикет-системе. buttonsPerRow: 1 или 2. */
export function mainMenu(opts) {
    const configButtons = opts.botButtons ?? [];
    const fromConfig = configButtons.length > 0;
    let list = fromConfig ? [...configButtons] : [...DEFAULT_BUTTONS];
    if (fromConfig && !list.some((b) => b.id === "devices")) {
        list.push({ id: "devices", visible: true, label: "📱 Устройства", order: 1.5, style: "primary" });
    }
    list = list
        .filter((b) => b.visible)
        .filter((b) => {
        if (b.id === "trial")
            return opts.showTrial;
        if (b.id === "vpn")
            return opts.showVpn;
        if (b.id === "proxy" || b.id === "my_proxy")
            return opts.showProxy === true;
        if (b.id === "singbox" || b.id === "my_singbox")
            return opts.showSingbox === true;
        if (b.id === "cabinet")
            return !!opts.appUrl?.trim();
        if (b.id === "tickets")
            return opts.showTickets === true && !!opts.appUrl?.trim();
        if (b.id === "support")
            return !!opts.hasSupportLinks;
        if (b.id === "extra_options")
            return opts.showExtraOptions === true;
        return true;
    })
        .sort((a, b) => a.order - b.order);
    const base = opts.appUrl?.replace(/\/$/, "") ?? "";
    const perRow = opts.buttonsPerRow === 2 ? 2 : 1;
    const items = [];
    for (const b of list) {
        const iconId = b.iconCustomEmojiId;
        const onePerRow = b.onePerRow === true;
        if (b.id === "cabinet") {
            if (base) {
                const w = { text: b.label, web_app: { url: `${base}/cabinet` } };
                if (iconId)
                    w.icon_custom_emoji_id = iconId;
                items.push({ node: w, onePerRow });
            }
        }
        else if (b.id === "vpn" && (opts.remnaSubscriptionUrl || base)) {
            if (opts.remnaSubscriptionUrl) {
                const u = { text: b.label, url: opts.remnaSubscriptionUrl };
                if (iconId)
                    u.icon_custom_emoji_id = iconId;
                items.push({ node: u, onePerRow });
            }
            else {
                const w = { text: b.label, web_app: { url: `${base}/cabinet/subscribe` } };
                if (iconId)
                    w.icon_custom_emoji_id = iconId;
                items.push({ node: w, onePerRow });
            }
        }
        else if (b.id === "tickets" && base) {
            const w = { text: b.label, web_app: { url: `${base}/cabinet/dashboard?support=1` } };
            if (iconId)
                w.icon_custom_emoji_id = iconId;
            items.push({ node: w, onePerRow });
        }
        else if (MENU_IDS[b.id]) {
            items.push({ node: btn(b.label, MENU_IDS[b.id], toStyle(b.style), iconId), onePerRow });
        }
    }
    const rows = [];
    let currentRow = [];
    for (const { node, onePerRow } of items) {
        if (onePerRow) {
            if (currentRow.length > 0) {
                rows.push(currentRow);
                currentRow = [];
            }
            rows.push([node]);
        }
        else {
            currentRow.push(node);
            if (currentRow.length >= perRow) {
                rows.push(currentRow);
                currentRow = [];
            }
        }
    }
    if (currentRow.length > 0)
        rows.push(currentRow);
    return { inline_keyboard: rows };
}
/** Одна кнопка покупки «промотарифа» на главном экране (новый клиент без ссылки подключения). Без цвета (style не задаётся). */
export function promoWelcomeSingleTariffKeyboard(opts) {
    const payRow = { text: opts.buttonText.slice(0, 64), callback_data: `pay_tariff:${opts.tariffId}` };
    if (opts.buttonIconCustomEmojiId)
        payRow.icon_custom_emoji_id = opts.buttonIconCustomEmojiId;
    const mainMenuText = (opts.mainMenuButtonText ?? "").trim();
    const keyboard = [[payRow]];
    if (mainMenuText) {
        // Для промо-экрана новичка ведём в классическое меню, а не в этот же экран.
        const menuRow = { text: mainMenuText.slice(0, 64), callback_data: "menu:main_classic" };
        if (opts.mainMenuButtonIconCustomEmojiId)
            menuRow.icon_custom_emoji_id = opts.mainMenuButtonIconCustomEmojiId;
        keyboard.push([menuRow]);
    }
    return { inline_keyboard: keyboard };
}
const DEFAULT_BACK_LABEL = "◀️ В меню";
/** Меню «Поддержка»: 4 кнопки-ссылки (только с заданным URL) + «В меню». */
export function supportSubMenu(links, backLabel, backStyle, emojiIds) {
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = resolveStyle(toStyle(backStyle), "danger");
    const rows = [];
    const items = [
        ["👤 Тех поддержка", links.support],
        ["📜 Соглашения", links.agreement],
        ["📄 Оферта", links.offer],
        ["📋 Инструкции", links.instructions],
    ];
    for (const [label, url] of items) {
        const u = (url ?? "").trim();
        if (u)
            rows.push([{ text: label, url: u }]);
    }
    rows.push([btn(back, "menu:main", backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
export function backToMenu(backLabel, backStyle, emojiIds) {
    const text = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    return { inline_keyboard: [[btn(text, "menu:main", resolveStyle(toStyle(backStyle), "danger"), emojiIds?.back)]] };
}
/** Кнопка «Оплатить» (открывает paymentUrl) + «В меню» */
export function payUrlMarkup(paymentUrl, backLabel, backStyle, emojiIds) {
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = undefined;
    const payIcon = emojiIds?.pay?.trim();
    const payBtn = { text: "Оплатить", url: paymentUrl };
    if (payIcon)
        payBtn.icon_custom_emoji_id = payIcon;
    return {
        inline_keyboard: [
            [payBtn],
            [btn(back, "menu:main", backSty, emojiIds?.back)],
        ],
    };
}
export function openSubscribePageMarkup(appUrl, backLabel, backStyle, emojiIds, remnaSubscriptionUrl) {
    const base = appUrl.replace(/\/$/, "");
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    if (remnaSubscriptionUrl) {
        const connectBtn = { text: "📲 Открыть страницу подключения", url: remnaSubscriptionUrl };
        if (emojiIds?.connect)
            connectBtn.icon_custom_emoji_id = emojiIds.connect;
        return {
            inline_keyboard: [
                [connectBtn],
                [btn(back, "menu:main", resolveStyle(toStyle(backStyle), "danger"), emojiIds?.back)],
            ],
        };
    }
    const connectBtn = { text: "📲 Открыть страницу подключения", web_app: { url: `${base}/cabinet/subscribe` } };
    if (emojiIds?.connect)
        connectBtn.icon_custom_emoji_id = emojiIds.connect;
    return {
        inline_keyboard: [
            [connectBtn],
            [btn(back, "menu:main", resolveStyle(toStyle(backStyle), "danger"), emojiIds?.back)],
        ],
    };
}
export function topUpPresets(currency, backLabel, innerStyles, emojiIds) {
    const sym = currency.toUpperCase() === "RUB" ? "₽" : currency.toUpperCase() === "USD" ? "$" : "₴";
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const topup = resolveStyle(toStyle(innerStyles?.topup), "primary");
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    const cardId = emojiIds?.card;
    return {
        inline_keyboard: [
            [
                btn(`${sym} 100`, "topup:100", topup, cardId),
                btn(`${sym} 300`, "topup:300", topup, cardId),
                btn(`${sym} 500`, "topup:500", topup, cardId),
            ],
            [
                btn(`${sym} 1000`, "topup:1000", topup, cardId),
                btn(`${sym} 2000`, "topup:2000", topup, cardId),
            ],
            [btn(back, "menu:main", backSty, emojiIds?.back)],
        ],
    };
}
/** Кнопки категорий тарифов (первый экран при нескольких категориях). Только эмодзи категории (ordinary/premium), без общего эмодзи «Тарифы». */
export function tariffCategoryButtons(categories, backLabel, innerStyles, emojiIds, _prefixEmoji) {
    const tariffPay = resolveStyle(toStyle(innerStyles?.tariffPay), "success");
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    const tariffId = emojiIds?.tariff;
    const rows = categories.map((cat) => {
        const label = ((cat.emoji && cat.emoji.trim()) ? `${cat.emoji} ` : "") + (cat.name || "").trim();
        return [btn(label.slice(0, 64), `cat_tariffs:${cat.id}`, tariffPay, cat.tgEmojiId ?? tariffId)];
    });
    rows.push([btn(back, "menu:main", backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
/** Кнопки тарифов одной категории. Только эмодзи категории (ordinary/premium), без общего эмодзи «Тарифы». */
export function tariffsOfCategoryButtons(category, backLabel, innerStyles, backData = "menu:tariffs", emojiIds, _prefixEmoji) {
    const rows = [];
    const tariffPay = resolveStyle(toStyle(innerStyles?.tariffPay), "success");
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    const prefix = (category.emoji && category.emoji.trim()) ? `${category.emoji} ` : "";
    const tariffId = category.tgEmojiId ?? emojiIds?.tariff;
    for (const t of category.tariffs) {
        const label = `${prefix}${t.name} — ${t.price} ${formatCurrencyHuman(t.currency)}`.slice(0, 64);
        rows.push([btn(label, `pay_tariff:${t.id}`, tariffPay, tariffId)]);
    }
    rows.push([btn(back, backData, backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
/** Все тарифы списком (одна категория — без экрана выбора категории) */
export function tariffPayButtons(categories, backLabel, innerStyles, emojiIds, prefixEmoji) {
    if (categories.length === 0) {
        const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
        const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
        return { inline_keyboard: [[btn(back, "menu:main", backSty, emojiIds?.back)]] };
    }
    if (categories.length === 1) {
        return tariffsOfCategoryButtons(categories[0], backLabel, innerStyles, "menu:main", emojiIds, prefixEmoji);
    }
    return tariffCategoryButtons(categories, backLabel, innerStyles, emojiIds, prefixEmoji);
}
/** Кнопки выбора способа оплаты (СПБ, Карты и т.д. из админки) для тарифа + баланс + ЮMoney */
export function tariffPaymentMethodButtons(tariffId, methods, backLabel, backStyle, emojiIds, balanceLabel, yoomoneyEnabled, yookassaEnabled, cryptopayEnabled, tariffCurrency, 
/** Куда ведёт «Назад» с экрана оплаты: главное меню или список тарифов */
paymentMethodsBackData = "menu:tariffs") {
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = undefined;
    const cardId = emojiIds?.card;
    const rows = [];
    // Кнопка оплаты балансом (первая)
    if (balanceLabel) {
        rows.push([btn(balanceLabel, `pay_tariff_balance:${tariffId}`, undefined, cardId)]);
    }
    // ЮMoney — только для рублёвых тарифов
    if (yoomoneyEnabled && (!tariffCurrency || tariffCurrency.toUpperCase() === "RUB")) {
        rows.push([btn("💳 ЮMoney — оплата картой", `pay_tariff_yoomoney:${tariffId}`, undefined, cardId)]);
    }
    // ЮKassa — только RUB
    if (yookassaEnabled && (!tariffCurrency || tariffCurrency.toUpperCase() === "RUB")) {
        rows.push([btn("💳 ЮKassa — карта / СБП", `pay_tariff_yookassa:${tariffId}`, undefined, cardId)]);
    }
    if (cryptopayEnabled) {
        rows.push([btn("💳 Crypto Bot — криптовалюта", `pay_tariff_cryptopay:${tariffId}`, undefined, cardId)]);
    }
    for (const m of methods) {
        rows.push([btn(m.label, `pay_tariff:${tariffId}:${m.id}`, undefined, m.tgEmojiId ?? cardId)]);
    }
    rows.push([btn(back, paymentMethodsBackData, backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
/** Кнопки категорий прокси (аналогично тарифам) */
export function proxyCategoryButtons(categories, backLabel, innerStyles, emojiIds) {
    const tariffPay = resolveStyle(toStyle(innerStyles?.tariffPay), "success");
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    const tariffId = emojiIds?.tariff;
    const rows = categories.map((cat) => {
        const label = cat.name.slice(0, 64);
        return [btn(label, `cat_proxy:${cat.id}`, tariffPay, tariffId)];
    });
    rows.push([btn(back, "menu:main", backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
/** Кнопки тарифов прокси одной категории */
export function proxyTariffsOfCategoryButtons(category, backLabel, innerStyles, backData = "menu:proxy", emojiIds) {
    const rows = [];
    const tariffPay = resolveStyle(toStyle(innerStyles?.tariffPay), "success");
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    const tariffId = emojiIds?.tariff;
    for (const t of category.tariffs) {
        rows.push([btn(`${t.name} — ${t.price} ${t.currency}`.slice(0, 64), `pay_proxy:${t.id}`, tariffPay, tariffId)]);
    }
    rows.push([btn(back, backData, backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
/** Кнопки прокси-тарифов (категории или список тарифов) */
export function proxyTariffPayButtons(categories, backLabel, innerStyles, emojiIds) {
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    if (categories.length === 0)
        return { inline_keyboard: [[btn(back, "menu:main", backSty, emojiIds?.back)]] };
    if (categories.length === 1 && categories[0].tariffs.length <= 5) {
        return proxyTariffsOfCategoryButtons(categories[0], backLabel, innerStyles, "menu:main", emojiIds);
    }
    return proxyCategoryButtons(categories, backLabel, innerStyles, emojiIds);
}
/** Кнопки способа оплаты для прокси-тарифа */
export function proxyPaymentMethodButtons(proxyTariffId, methods, backLabel, backStyle, emojiIds, balanceLabel, yoomoneyEnabled, yookassaEnabled, cryptopayEnabled, currency) {
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = undefined;
    const cardId = emojiIds?.card;
    const rows = [];
    if (balanceLabel)
        rows.push([btn(balanceLabel, `pay_proxy_balance:${proxyTariffId}`, undefined, cardId)]);
    if (yoomoneyEnabled && (!currency || currency.toUpperCase() === "RUB")) {
        rows.push([btn("💳 ЮMoney — карта", `pay_proxy_yoomoney:${proxyTariffId}`, undefined, cardId)]);
    }
    if (yookassaEnabled && (!currency || currency.toUpperCase() === "RUB")) {
        rows.push([btn("💳 ЮKassa — карта / СБП", `pay_proxy_yookassa:${proxyTariffId}`, undefined, cardId)]);
    }
    if (cryptopayEnabled)
        rows.push([btn("💳 Crypto Bot — криптовалюта", `pay_proxy_cryptopay:${proxyTariffId}`, undefined, cardId)]);
    for (const m of methods) {
        rows.push([btn(m.label, `pay_proxy:${proxyTariffId}:${m.id}`, undefined, m.tgEmojiId ?? cardId)]);
    }
    rows.push([btn(back, "menu:proxy", backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
/** Кнопки категорий Sing-box (доступы) */
export function singboxCategoryButtons(categories, backLabel, innerStyles, emojiIds) {
    const tariffPay = resolveStyle(toStyle(innerStyles?.tariffPay), "success");
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    const tariffId = emojiIds?.tariff;
    const rows = categories.map((cat) => {
        const label = cat.name.slice(0, 64);
        return [btn(label, `cat_singbox:${cat.id}`, tariffPay, tariffId)];
    });
    rows.push([btn(back, "menu:main", backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
/** Кнопки тарифов Sing-box одной категории */
export function singboxTariffsOfCategoryButtons(category, backLabel, innerStyles, backData = "menu:singbox", emojiIds) {
    const rows = [];
    const tariffPay = resolveStyle(toStyle(innerStyles?.tariffPay), "success");
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    const tariffId = emojiIds?.tariff;
    for (const t of category.tariffs) {
        rows.push([btn(`${t.name} — ${t.price} ${t.currency}`.slice(0, 64), `pay_singbox:${t.id}`, tariffPay, tariffId)]);
    }
    rows.push([btn(back, backData, backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
/** Кнопки тарифов Sing-box (категории или список) */
export function singboxTariffPayButtons(categories, backLabel, innerStyles, emojiIds) {
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    if (categories.length === 0)
        return { inline_keyboard: [[btn(back, "menu:main", backSty, emojiIds?.back)]] };
    if (categories.length === 1 && categories[0].tariffs.length <= 5) {
        return singboxTariffsOfCategoryButtons(categories[0], backLabel, innerStyles, "menu:main", emojiIds);
    }
    return singboxCategoryButtons(categories, backLabel, innerStyles, emojiIds);
}
/** Кнопки способа оплаты для тарифа Sing-box */
export function singboxPaymentMethodButtons(singboxTariffId, methods, backLabel, backStyle, emojiIds, balanceLabel, yoomoneyEnabled, yookassaEnabled, cryptopayEnabled, currency) {
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = undefined;
    const cardId = emojiIds?.card;
    const rows = [];
    if (balanceLabel)
        rows.push([btn(balanceLabel, `pay_singbox_balance:${singboxTariffId}`, undefined, cardId)]);
    if (yoomoneyEnabled && (!currency || currency.toUpperCase() === "RUB")) {
        rows.push([btn("💳 ЮMoney — карта", `pay_singbox_yoomoney:${singboxTariffId}`, undefined, cardId)]);
    }
    if (yookassaEnabled && (!currency || currency.toUpperCase() === "RUB")) {
        rows.push([btn("💳 ЮKassa — карта / СБП", `pay_singbox_yookassa:${singboxTariffId}`, undefined, cardId)]);
    }
    if (cryptopayEnabled)
        rows.push([btn("💳 Crypto Bot — криптовалюта", `pay_singbox_cryptopay:${singboxTariffId}`, undefined, cardId)]);
    for (const m of methods) {
        rows.push([btn(m.label, `pay_singbox:${singboxTariffId}:${m.id}`, undefined, m.tgEmojiId ?? cardId)]);
    }
    rows.push([btn(back, "menu:singbox", backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
/** Стиль кнопки пополнения: СБП/крипта — нейтральная (как «белая» в TG), остальные Platega — primary */
function topupPlategaMethodStyle(label) {
    if (/сбп|спб|крипт|crypto/i.test(label))
        return undefined;
    return "primary";
}
/** Кнопки выбора способа оплаты для пополнения на сумму + ЮMoney */
export function topupPaymentMethodButtons(amount, methods, backLabel, backStyle, emojiIds, yoomoneyEnabled, yookassaEnabled, cryptopayEnabled) {
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = resolveStyle(toStyle(backStyle), "danger");
    const cardId = emojiIds?.card;
    const rows = [];
    if (yoomoneyEnabled) {
        rows.push([btn("💳 ЮMoney — оплата картой", `topup_yoomoney:${amount}`, "primary", cardId)]);
    }
    if (yookassaEnabled) {
        rows.push([btn("💳 ЮKassa — карта / СБП", `topup_yookassa:${amount}`, undefined, cardId)]);
    }
    if (cryptopayEnabled) {
        rows.push([btn("💳 Crypto Bot — криптовалюта", `topup_cryptopay:${amount}`, undefined, cardId)]);
    }
    for (const m of methods) {
        rows.push([btn(m.label, `topup:${amount}:${m.id}`, topupPlategaMethodStyle(m.label), m.tgEmojiId ?? cardId)]);
    }
    rows.push([btn(back, "menu:topup", backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
/** Кнопки списка доп. опций (трафик, устройства, серверы). */
export function extraOptionsButtons(options, backLabel, innerStyles, emojiIds) {
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const optionSty = resolveStyle(toStyle(innerStyles?.extraOptionsItem), "success");
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    const cardId = emojiIds?.card;
    const rows = options.map((o) => {
        const extra = o.kind === "servers" && (o.trafficGb ?? 0) > 0 ? ` + ${o.trafficGb} ГБ` : "";
        const label = `${o.name || o.kind}${extra} — ${o.price} ${formatCurrencyHuman(o.currency)}`.slice(0, 64);
        const optionEmojiId = o.kind === "devices" ? o.tgEmojiId ?? cardId : cardId;
        return [btn(label, `pay_option:${o.kind}:${o.id}`, optionSty, optionEmojiId)];
    });
    rows.push([btn(back, "menu:main", backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
/** Кнопки выбора способа оплаты опции: баланс, ЮMoney, ЮKassa, Platega. */
export function optionPaymentMethodButtons(option, balance, backLabel, innerStyles, emojiIds, plategaMethods = [], yoomoneyEnabled, yookassaEnabled, cryptopayEnabled) {
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const backSty = undefined;
    const cardId = emojiIds?.card;
    const rows = [];
    if (balance >= option.price) {
        rows.push([btn(`Оплатить балансом (${option.price} ₽)`, `pay_option_balance:${option.kind}:${option.id}`, undefined, cardId)]);
    }
    if (yoomoneyEnabled) {
        rows.push([btn("💳 ЮMoney — карта", `pay_option_yoomoney:${option.kind}:${option.id}`, undefined, cardId)]);
    }
    if (yookassaEnabled !== false) {
        rows.push([btn("💳 ЮKassa — карта / СБП", `pay_option_yookassa:${option.kind}:${option.id}`, undefined, cardId)]);
    }
    if (cryptopayEnabled) {
        rows.push([btn("💳 Crypto Bot — криптовалюта", `pay_option_cryptopay:${option.kind}:${option.id}`, undefined, cardId)]);
    }
    for (const m of plategaMethods) {
        rows.push([btn(m.label, `pay_option_platega:${option.kind}:${option.id}:${m.id}`, undefined, m.tgEmojiId ?? cardId)]);
    }
    if (rows.length === 0) {
        rows.push([btn("💳 Оплата (ЮKassa)", `pay_option_yookassa:${option.kind}:${option.id}`, undefined, cardId)]);
    }
    rows.push([btn(back, "menu:extra_options", backSty, emojiIds?.back)]);
    return { inline_keyboard: rows };
}
export function profileButtons(backLabel, innerStyles, emojiIds, autoRenewEnabled) {
    const back = (backLabel && backLabel.trim()) || DEFAULT_BACK_LABEL;
    const profile = resolveStyle(toStyle(innerStyles?.profile), "primary");
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    const profileId = emojiIds?.profile;
    const autoRenewText = autoRenewEnabled ? "🔄 Автопродление: ВКЛ" : "🔄 Автопродление: ОТКЛ";
    const autoRenewData = autoRenewEnabled ? "profile:autorenew:off" : "profile:autorenew:on";
    return {
        inline_keyboard: [
            [btn(autoRenewText, autoRenewData, profile, profileId)],
            [btn("🌐 Язык", "profile:lang", profile, profileId), btn("💱 Валюта", "profile:currency", profile, profileId)],
            [btn(back, "menu:main", backSty, emojiIds?.back)],
        ],
    };
}
export function langButtons(langs, innerStyles, emojiIds) {
    const langStyle = resolveStyle(toStyle(innerStyles?.lang), "primary");
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    const row = langs.slice(0, 3).map((l) => btn(l.toUpperCase(), `set_lang:${l}`, langStyle));
    return { inline_keyboard: [row, [btn("◀️ Назад", "menu:profile", backSty, emojiIds?.back)]] };
}
export function currencyButtons(currencies, innerStyles, emojiIds) {
    const currencyStyle = resolveStyle(toStyle(innerStyles?.currency), "primary");
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    const row = currencies.slice(0, 3).map((c) => btn(c.toUpperCase(), `set_currency:${c}`, currencyStyle));
    return { inline_keyboard: [row, [btn("◀️ Назад", "menu:profile", backSty, emojiIds?.back)]] };
}
export function trialConfirmButton(innerStyles, emojiIds) {
    const trialConfirm = resolveStyle(toStyle(innerStyles?.trialConfirm), "success");
    const backSty = resolveStyle(toStyle(innerStyles?.back), "danger");
    return {
        inline_keyboard: [
            [btn("🎁 Активировать триал", "trial:confirm", trialConfirm, emojiIds?.trial), btn("Отмена", "menu:main", backSty, emojiIds?.back)],
        ],
    };
}
