(function addInlineStyles() {
  const css = `
  /* Кнопка "Аккаунты" */
  .accounts-button {
    border: 1px solid #000;
    background-color: #fff;
    color: #000;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.2s, color 0.2s, border-color 0.2s;
  }
  .accounts-button.active {
    background-color: #0266a8;
    color: #fff;
    border-color: #0266a8;
  }
  
  /* Блок статистики */
  .accounts-stats {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    align-items: center;
    font-size: 12px;
  }
  .stats-container {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .stat-item {
    color: #333;
  }
  .stat-label {
    margin-right: 4px;
    font-weight: 500;
  }
  .stat-value {
    font-weight: 600;
    color: #000;
  }
  
  /* Кнопка скачивания Excel */
  .download-btn {
    padding: 4px 8px;
    background-color: #007bff;
    color: #fff;
    font-size: 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .download-btn:disabled {
    background-color: #aaa;
    cursor: not-allowed;
  }
  .download-btn svg {
    fill: currentColor;
  }
  .download-btn:hover:enabled {
    background-color: #005dc1;
  }
  
  /* Таблица и её контейнер */
  .accounts-table-wrapper {
    max-height: 350px;
    overflow: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-top: 5px;
    transition: max-height 0.3s ease;
    font-size: 12px;
  }
  .accounts-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 800px;
  }
  .accounts-table thead tr {
    background-color: #f5f5f5;
    border-bottom: 1px solid #ccc;
  }
  .accounts-table th,
  .accounts-table td {
    border: 1px solid #ddd;
    padding: 4px 6px;
    text-align: center;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .accounts-table th {
    font-weight: 600;
    color: #000;
  }
  /* Форматирование ячейки "Аккаунт": текст слева, счётчик справа, перенос слов */
  .account-name {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 8px;
  }
  .account-name-text {
    white-space: normal;
    word-wrap: break-word;
    overflow-wrap: break-word;
    text-align: left;
  }
  .advert-count {
    margin-top: 3px;
    background-color: #e6f4ff;
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 10px;
    color: #007bff;
  }
  
  /* Фиксированные столбцы */
  .accounts-table th:first-child,
  .accounts-table td:first-child {
    position: sticky;
    left: 0;
    background: #fff;
    z-index: 3;
  }
  .accounts-table th:nth-child(2),
  .accounts-table td:nth-child(2) {
    position: sticky;
    left: 137px;
    background: #fff;
    z-index: 2;
    white-space: normal !important;
    text-align: left;
  }
  
  /* Кнопка "Показать всё" / "Свернуть" */
  .expand-button-container {
    text-align: center;
    margin-top: 10px;
    padding-bottom: 40px;
  }
  .expand-button {
    display: inline-block;
    padding: 4px 8px;
    background-color: #007bff;
    color: #fff;
    font-size: 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .expand-button:hover {
    background-color: #005dc1;
  }
  
  /* Чекбокс */
  .checkbox-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .account-checkbox {
    transform: scale(1.2);
    cursor: pointer;
  }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
})();

(function () {
  console.log("[AccountReport] Модуль отчёта аккаунтов запущен");

  let dataLoaded = false;
  let tableVisible = false;
  let container = null;       // Контейнер для блока статистики и таблицы
  let tableWrapper = null;    // Контейнер для таблицы
  let sellerMap = new Map();  // Агрегатор данных продавцов (ключ – sellerUrl)

  // Возвращает Promise, который резолвится через указанное время (ms)
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function onPageFullyLoaded(callback) {
    if (document.readyState === 'complete') {
      console.log("[AccountReport] Страница полностью загружена");
      setTimeout(callback, 5000);
    } else {
      window.addEventListener('load', () => {
        console.log("[AccountReport] Событие load: страница полностью загружена");
        setTimeout(callback, 5000);
      });
    }
  }

  if (!document.querySelector('[data-marker="page-title/count"]')) {
    console.log("[AccountReport] Элемент с data-marker='page-title/count' не найден. Функциональность отчёта не запускается.");
    return;
  } else {
    console.log("[AccountReport] Элемент с data-marker='page-title/count' найден. Запускаем функционал.");
  }

  onPageFullyLoaded(initAccountsTab);

  function initAccountsTab() {
    if (document.getElementById('accounts-button-container')) return;
    // Используем селекторы для вставки кнопки
    const topPanelBlock = document.querySelector('.index-topPanel-FOjk0');
    const stickyPanel = document.querySelector('.index-root-gtkvj');
    if (topPanelBlock && stickyPanel) {
      const containerBtn = document.createElement('div');
      containerBtn.id = 'accounts-button-container';
      containerBtn.style.display = 'flex';
      containerBtn.style.alignItems = 'center';
      containerBtn.style.paddingBottom = '25px';
      containerBtn.style.margin = '0 10px';
      topPanelBlock.parentNode.insertBefore(containerBtn, stickyPanel);
      const accountsTab = document.createElement('button');
      accountsTab.className = 'accounts-button';
      accountsTab.textContent = 'Аккаунты';
      containerBtn.appendChild(accountsTab);
      accountsTab.addEventListener('click', async () => {
        if (!dataLoaded) {
          console.log("[AccountReport] Первый клик: создаём таблицу и начинаем динамическое обновление");
          createTableStructure();
          disableDownloadBtn(true);
          await processAdsSequentially();
          dataLoaded = true;
          tableVisible = true;
          accountsTab.classList.add('active');
          disableDownloadBtn(false);
        } else {
          // При повторном клике скрываем таблицу и кнопку разворачивания (display: none)
          if (tableVisible) {
            tableWrapper.style.display = 'none';
          } else {
            tableWrapper.style.display = '';
          }
          toggleTableDisplay(accountsTab);
        }
      });
    } else {
      const containerBtn = document.body;
      const accountsTab = document.createElement('button');
      accountsTab.className = 'accounts-button';
      accountsTab.textContent = 'Аккаунты';
      containerBtn.appendChild(accountsTab);
      accountsTab.addEventListener('click', async () => {
        if (!dataLoaded) {
          createTableStructure();
          disableDownloadBtn(true);
          await processAdsSequentially();
          dataLoaded = true;
          tableVisible = true;
          accountsTab.classList.add('active');
          disableDownloadBtn(false);
        } else {
          if (tableVisible) {
            tableWrapper.style.display = 'none';
          } else {
            tableWrapper.style.display = '';
          }
          toggleTableDisplay(accountsTab);
        }
      });
    }
  }

  function toggleTableDisplay(button) {
    if (!tableWrapper) return;
    if (tableVisible) {
      tableWrapper.style.display = 'none';
      button.classList.remove('active');
      tableVisible = false;
    } else {
      tableWrapper.style.display = '';
      button.classList.add('active');
      tableVisible = true;
    }
  }

  function disableDownloadBtn(disable) {
    const btn = document.querySelector('#downloadExcel');
    if (btn) {
      btn.disabled = disable;
    }
  }

  // Запрос данных с объявления (просмотры и имя аккаунта)
  async function fetchAdData(adUrl) {
    console.log("[AccountReport] Запрос данных объявления по URL:", adUrl);
    const response = await fetch(adUrl, { credentials: 'include' });
    if (!response.ok) throw new Error(`Ошибка при загрузке объявления: ${response.status}`);
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const totalViewsElem = doc.querySelector('[data-marker="item-view/total-views"]');
    const todayViewsElem = doc.querySelector('[data-marker="item-view/today-views"]');
    let sellerName = 'Неизвестно';
    const sellerNameContainer = doc.querySelector('div[data-marker="seller-info/name"] a span')
                              || doc.querySelector('div[data-marker="seller-info/name"] a');
    if (sellerNameContainer) {
      sellerName = sellerNameContainer.textContent.trim();
    }
    return {
      totalViews: totalViewsElem ? parseInt(totalViewsElem.textContent.trim().replace(/\D/g, '')) : 0,
      todayViews: todayViewsElem ? parseInt(todayViewsElem.textContent.trim().replace(/\D/g, '')) : 0,
      sellerName
    };
  }

  // Запрос данных с страницы продавца
  async function fetchSellerData(sellerUrl) {
    console.log("[AccountReport] Запрос данных продавца по URL:", sellerUrl);
    const response = await fetch(sellerUrl, { credentials: 'include' });
    if (!response.ok) throw new Error(`Ошибка при загрузке продавца: ${response.status}`);
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    console.log("[AccountReport] Страница продавца загружена и распарсена");
    const answerTimeElem = doc.querySelector('[data-marker="answer-time"]');
    const answerTime = answerTimeElem ? answerTimeElem.textContent.trim() : '-';
    const counterElems = Array.from(
      doc.querySelectorAll('span.styles-module-counter-qyO5b.styles-module-counter_size-xxl-_hqhd')
    );
    const activeAds = counterElems[0] ? counterElems[0].textContent.trim() : '-';
    const completedAds = counterElems[1] ? counterElems[1].textContent.trim() : '-';
    let subscribers = '-', subscriptions = '-';
    const favSellerElem = doc.querySelector('[data-marker="favorite-seller-counters"]');
    if (favSellerElem) {
      const parts = favSellerElem.textContent.split(',');
      if (parts.length === 2) {
        subscribers = parts[0].replace(/\D/g, '').trim();
        subscriptions = parts[1].replace(/\D/g, '').trim();
      }
    }
    const registeredElem = doc.querySelector('[data-marker="registered"]');
    const registered = registeredElem ? registeredElem.textContent.trim() : '-';
    return {
      answerTime,
      activeAds,
      completedAds,
      subscribers,
      subscriptions,
      registered
    };
  }

// Добавьте этот код, например, в начале вашего IIFE:
function createStatsBlock(totalAds, uniqueSellers) {
  const statsDiv = document.createElement('div');
  statsDiv.className = 'accounts-stats';
  const statsContainer = document.createElement('div');
  statsContainer.className = 'stats-container';
  const statItems = [
    { label: 'Объявлений на странице:', value: totalAds },
    { label: 'Продавцов на странице:', value: uniqueSellers }
  ];
  statItems.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'stat-item';
    itemDiv.innerHTML = `
      <span class="stat-label">${item.label}</span>
      <span class="stat-value">${item.value}</span>
    `;
    statsContainer.appendChild(itemDiv);
  });
  const downloadBtn = document.createElement('button');
  downloadBtn.id = 'downloadExcel';
  downloadBtn.className = 'download-btn';
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"></path>
    </svg>
    Скачать Excel
  `;
  statsContainer.appendChild(downloadBtn);
  statsDiv.appendChild(statsContainer);
  return statsDiv;
}

function createExpandButton(tableWrapper) {
  const expandContainer = document.createElement('div');
  expandContainer.className = 'expand-button-container';
  const expandButton = document.createElement('div');
  expandButton.className = 'expand-button';
  expandButton.textContent = 'Показать всё';
  let expanded = false;
  expandButton.addEventListener('click', () => {
    if (!tableWrapper) return;
    if (!expanded) {
      tableWrapper.style.maxHeight = 'none';
      expandButton.textContent = 'Свернуть';
      expanded = true;
    } else {
      tableWrapper.style.maxHeight = '350px';
      expandButton.textContent = 'Показать всё';
      expanded = false;
    }
  });
  expandContainer.appendChild(expandButton);
  return expandContainer;
}
let currentSellerFilter = null;

function extractSellerUrl(ad) {
  let sellerUrl = null;
  const sellerInfoContainer = ad.querySelector('.iva-item-sellerInfo-KS9Ob');
  if (sellerInfoContainer && sellerInfoContainer.children.length > 0) {
    const sellerLinkEl = sellerInfoContainer.querySelector('[data-marker="seller-link/link"]') ||
      ad.querySelector('a.styles-module-root-m3BML.styles-module-root_noVisited-HHF0s.styles-module-root_preset_black-ydSp2');
    if (sellerLinkEl) {
      sellerUrl = sellerLinkEl.getAttribute('href');
      if (sellerUrl && sellerUrl.startsWith('/')) {
        sellerUrl = 'https://www.avito.ru' + sellerUrl;
      }
    }
  }
  return sellerUrl;
}

function toggleAdFilter(sellerUrl) {
  const carousel = document.querySelector('.items-itemsCarouselWidget-wrEhr');
  const rootElement = document.querySelector('.index-root-gtkvj');
  const allAds = document.querySelectorAll('[data-marker="item"]');

  if (currentSellerFilter === sellerUrl) {
    // Фильтр уже активен – снимаем фильтр
    currentSellerFilter = null;
    allAds.forEach(ad => {
      ad.style.display = '';
    });
    // Восстанавливаем исходное отображение для carousel и min-height для rootElement
    if (carousel) {
      carousel.style.display = '';
    }
    if (rootElement) {
      // Можно либо установить конкретное значение, либо удалить inline-стиль
      rootElement.style.minHeight = "";
    }
  } else {
    // Применяем фильтр для выбранного sellerUrl
    currentSellerFilter = sellerUrl;
    allAds.forEach(ad => {
      let adSellerUrl = extractSellerUrl(ad);
      ad.style.display = (adSellerUrl === sellerUrl) ? '' : 'none';
    });
    // Скрываем элемент с классом "items-itemsCarouselWidget-wrEhr"
    if (carousel) {
      carousel.style.display = 'none';
    }
    // Убираем min-height у элемента с классом "index-root-gtkvj"
    if (rootElement) {
      rootElement.style.minHeight = 'unset';
    }
  }
}


  // Создаем таблицу и агрегируем данные по продавцам (по sellerUrl)
  function createTableStructure() {
    // Очищаем предыдущие данные
    sellerMap.clear();

    // Создаем контейнер для статистики и таблицы
    container = document.createElement('div');
    container.id = 'accounts-container';
    container.style.marginBottom = '25px';
    const btnContainer = document.getElementById('accounts-button-container');
    if (btnContainer) {
      btnContainer.parentNode.insertBefore(container, btnContainer.nextSibling);
    } else {
      document.body.appendChild(container);
    }

    const statsBlock = createStatsBlock(0, 0);
    container.appendChild(statsBlock);

    tableWrapper = document.createElement('div');
    tableWrapper.className = 'accounts-table-wrapper';
    tableWrapper.style.maxHeight = '350px';
    tableWrapper.style.overflow = 'auto';
    container.appendChild(tableWrapper);

    // Фильтруем объявления: оставляем только те, где в контейнере .iva-item-sellerInfo-KS9Ob есть вложенные элементы
    const allAds = Array.from(document.querySelectorAll('[data-marker="item"]'));
    const filteredAds = allAds.filter(adEl => {
      const sellerInfoContainer = adEl.querySelector('.iva-item-sellerInfo-KS9Ob');
      return sellerInfoContainer && sellerInfoContainer.children.length > 0;
    });
    console.log("[AccountReport] Найдено объявлений (с профилем):", filteredAds.length);
    updateStatsBlock(filteredAds.length, filteredAds.length);

    // Агрегируем объявления по sellerUrl
    sellerMap = new Map();
    filteredAds.forEach((adEl, index) => {
      const position = index + 1;
      const promotionElem = adEl.querySelector('[data-marker="promotion-services"]');
      const promotion = promotionElem ? promotionElem.textContent.trim() : '-';
      const ratingElem = adEl.querySelector('[data-marker="seller-rating/score"]');
      const rating = ratingElem ? ratingElem.textContent.trim() : '-';
      const reviewsElem = adEl.querySelector('[data-marker="seller-rating/summary"]');
      const reviews = reviewsElem ? reviewsElem.textContent.trim() : '-';

      const adLinkEl = adEl.querySelector('a[data-marker="item-title"]');
      let adUrl = adLinkEl ? adLinkEl.getAttribute('href') : null;
      if (adUrl && adUrl.startsWith('/')) {
        adUrl = 'https://www.avito.ru' + adUrl;
      }

      // Проверяем наличие вложенных элементов в контейнере продавца
      const sellerInfoContainer = adEl.querySelector('.iva-item-sellerInfo-KS9Ob');
      let sellerUrl = null;
      if (sellerInfoContainer && sellerInfoContainer.children.length > 0) {
        const sellerLinkEl = sellerInfoContainer.querySelector('[data-marker="seller-link/link"]') ||
                               adEl.querySelector('a.styles-module-root-m3BML.styles-module-root_noVisited-HHF0s.styles-module-root_preset_black-ydSp2');
        sellerUrl = sellerLinkEl ? sellerLinkEl.getAttribute('href') : null;
        if (sellerUrl && sellerUrl.startsWith('/')) {
          sellerUrl = 'https://www.avito.ru' + sellerUrl;
        }
      }
      if (!sellerUrl) return; // Пропускаем объявления без ссылки на продавца

      if (sellerMap.has(sellerUrl)) {
        const entry = sellerMap.get(sellerUrl);
        entry.listingCount += 1;
        entry.positions.push(position);
        entry.adUrls.push(adUrl);
      } else {
        sellerMap.set(sellerUrl, {
          sellerUrl,
          listingCount: 1,
          positions: [position],
          adUrls: [adUrl],
          promotion,
          rating,
          reviews,
          todayViews: 0,
          totalViews: 0,
          answerTime: '-',
          activeAds: '-',
          completedAds: '-',
          subscribers: '-',
          subscriptions: '-',
          registered: '-',
          sellerName: 'Неизвестно'
        });
      }
    });

    // Создаем таблицу из агрегированных данных
    const table = document.createElement('table');
    table.className = 'accounts-table';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headersArr = [
      'Пометить на выдаче',
      'Аккаунт',
      'Позиции в выдаче',
      'Услуги продвижения',
      'Просмотры сегодня',
      'Просмотры всего',
      'Рейтинг',
      'Отзывы',
      'Время ответа',
      'Активных объявлений',
      'Завершенных объявлений',
      'Кол-во доставок',
      'Кол-во покупок',
      'Подписчики',
      'Подписки',
      'На авито с'
    ];
    headersArr.forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      // Для всех столбцов, кроме фиксированных, задаём data-column и курсор pointer
      if (
        text !== 'Пометить на выдаче' &&
        text !== 'Аккаунт' &&
        text !== 'Позиции в выдаче' &&
        text !== 'Услуги продвижения'
      ) {
        th.dataset.column = text.replace(/\s+/g, '');
        th.style.cursor = 'pointer';
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    let originalIndex = 0;
    sellerMap.forEach(entry => {
      const row = document.createElement('tr');
      row.dataset.originalIndex = originalIndex++;
      // Чекбокс (col0)
      const checkboxCell = `<td><div class="checkbox-wrapper"><input type="checkbox" class="account-checkbox" data-profile-link="${entry.sellerUrl}"></div></td>`;
      // Аккаунт (col1) – имя продавца и количество объявлений
      const accountCell = `<td><div class="account-name" data-href="${entry.sellerUrl}" style="cursor:pointer;">
                        <div class="account-name-text">${entry.sellerName}</div>
                        <span class="advert-count">${entry.listingCount}</span>
                      </div></td>`;
      // Остальные 14 ячеек (col2-col15)
      const rowHTML = `
        <td>${entry.positions.join(', ')}</td>                      <!-- Позиции в выдаче (col2) -->
        <td><div class="table-vas-container">${entry.promotion}</div></td> <!-- Услуги продвижения (col3) -->
        <td>-</td>                                                    <!-- Просмотры сегодня (col4) -->
        <td>-</td>                                                    <!-- Просмотры всего (col5) -->
        <td>${entry.rating}</td>                                        <!-- Рейтинг (col6) -->
        <td>${entry.reviews}</td>                                       <!-- Отзывы (col7) -->
        <td>-</td>                                                    <!-- Время ответа (col8) -->
        <td>-</td>                                                    <!-- Активных объявлений (col9) -->
        <td>-</td>                                                    <!-- Завершённых объявлений (col10) -->
        <td>-</td>                                                    <!-- Кол-во доставок (col11) -->
        <td>-</td>                                                    <!-- Кол-во покупок (col12) -->
        <td>-</td>                                                    <!-- Подписчики (col13) -->
        <td>-</td>                                                    <!-- Подписки (col14) -->
        <td>-</td>                                                    <!-- На авито с (col15) -->
      `;
      row.innerHTML = checkboxCell + accountCell + rowHTML;
      tbody.appendChild(row);
      entry.row = row;
      let accountNameElem = row.querySelector('.account-name');
      if (accountNameElem) {
        accountNameElem.addEventListener('click', () => {
          toggleAdFilter(entry.sellerUrl);
        });
      }
    });
    table.appendChild(tbody);
    tableWrapper.appendChild(table);

    // Вызов функции для прикрепления сортировки
    attachTableSorting(table);

    const newStatsBlock = createStatsBlock(filteredAds.length, filteredAds.length);
container.innerHTML = '';
container.appendChild(newStatsBlock);
container.appendChild(tableWrapper);
container.parentNode.insertBefore(createExpandButton(tableWrapper), container.nextSibling);
// Вызываем attachExcelDownload, чтобы к кнопке экспорта привязался обработчик
attachExcelDownload(newStatsBlock, tableWrapper);
  }

  function updateStatsBlock(totalAds, uniqueSellers) {
    const statsBlock = document.querySelector('.accounts-stats');
    if (!statsBlock) return;
    const statItems = statsBlock.querySelectorAll('.stat-item');
    if (statItems.length >= 2) {
      statItems[0].querySelector('.stat-value').textContent = totalAds;
      statItems[1].querySelector('.stat-value').textContent = uniqueSellers;
    }
  }

  async function processAdsSequentially() {
    for (const entry of sellerMap.values()) {
      let sumTodayViews = 0;
      let sumTotalViews = 0;
      for (const adUrl of entry.adUrls) {
        try {
          await delay(250 + Math.random() * 250);
          const adData = await fetchAdData(adUrl);
          if (entry.sellerName === 'Неизвестно' && adData.sellerName) {
            entry.sellerName = adData.sellerName;
          }
          sumTodayViews += adData.todayViews;
          sumTotalViews += adData.totalViews;
        } catch (err) {
          console.error("[AccountReport] Ошибка получения данных с объявления", adUrl, err);
        }
      }
      entry.todayViews = sumTodayViews;
      entry.totalViews = sumTotalViews;
      try {
        await delay(1000 + Math.random() * 1000);
        const sellerData = await fetchSellerData(entry.sellerUrl);
        entry.answerTime = sellerData.answerTime;
        entry.activeAds = sellerData.activeAds;
        entry.completedAds = sellerData.completedAds;
        entry.subscribers = sellerData.subscribers;
        entry.subscriptions = sellerData.subscriptions;
        entry.registered = sellerData.registered;
      } catch (err) {
        console.error("[AccountReport] Ошибка получения данных продавца", entry.sellerUrl, err);
      }
      const rowCells = entry.row.querySelectorAll('td');
      // Обновляем ячейку "Аккаунт" (col1)
      const accountCell = rowCells[1];
      const nameDiv = accountCell.querySelector('.account-name-text');
      if (nameDiv) {
        nameDiv.textContent = entry.sellerName;
      }
      accountCell.querySelector('.advert-count').textContent = entry.listingCount;
      // Обновляем ячейки "Просмотры сегодня" (col4) и "Просмотры всего" (col5)
      rowCells[4].textContent = entry.todayViews;
      rowCells[5].textContent = entry.totalViews;
      // Обновляем данные продавца (col8, col9, col10, col13, col14, col15)
      rowCells[8].textContent = entry.answerTime;
      rowCells[9].textContent = entry.activeAds;
      rowCells[10].textContent = entry.completedAds;
      rowCells[13].textContent = entry.subscribers;
      rowCells[14].textContent = entry.subscriptions;
      rowCells[15].textContent = entry.registered;
    }
  }

  // Функция для прикрепления сортировки только к нужным столбцам
  function attachTableSorting(table) {
    const headers = table.querySelectorAll('th[data-column]');
    // Разрешённые для сортировки столбцы
    const allowedColumns = [
      "Просмотрысегодня",
      "Просмотрывсего",
      "Рейтинг",
      "Отзывы",
      "Активныхобъявлений",
      "Завершенныхобъявлений",
      "Подписчики",
      "Подписки"
    ];
    headers.forEach(th => {
      if (!allowedColumns.includes(th.dataset.column)) return;
      th.addEventListener('click', () => {
        tripleToggleSort(table, th.dataset.column);
      });
    });
  }

  // Тройная сортировка: none -> asc -> desc -> none
  function tripleToggleSort(table, column) {
    // Получаем заголовок для выбранного столбца
    const currentHeader = table.querySelector(`th[data-column="${column}"]`);
    if (!currentHeader) return;
  
    // Сохраняем оригинальное содержимое заголовка, если ещё не сохранено
    if (!currentHeader.dataset.originalText) {
      currentHeader.dataset.originalText = currentHeader.innerHTML;
    }
  
    // Сбрасываем состояние сортировки для всех остальных заголовков
    const headers = table.querySelectorAll('th[data-column]');
    headers.forEach(th => {
      if (th !== currentHeader) {
        if (!th.dataset.originalText) {
          th.dataset.originalText = th.innerHTML;
        }
        th.innerHTML = th.dataset.originalText;
        table.setAttribute(`data-sort-state-${th.dataset.column}`, 'none');
      }
    });
  
    // Получаем текущее состояние сортировки для выбранного столбца
    const currentState = table.getAttribute(`data-sort-state-${column}`) || 'none';
    let newState;
    if (currentState === 'none') {
      newState = 'asc';
    } else if (currentState === 'asc') {
      newState = 'desc';
    } else {
      newState = 'none';
    }
    table.setAttribute(`data-sort-state-${column}`, newState);
  
    // Обновляем содержимое выбранного заголовка с отображением стрелочки на новой строке
    if (newState === 'asc') {
      currentHeader.innerHTML = currentHeader.dataset.originalText + "<br><span class='sort-arrow'>↑</span>";
      sortTableByColumn(table, column, newState);
    } else if (newState === 'desc') {
      currentHeader.innerHTML = currentHeader.dataset.originalText + "<br><span class='sort-arrow'>↓</span>";
      sortTableByColumn(table, column, newState);
    } else {
      currentHeader.innerHTML = currentHeader.dataset.originalText;
      restoreOriginalOrder(table);
    }
    console.log("[AccountReport] Сортировка по столбцу:", column, "состояние:", newState);
  }
  

  function restoreOriginalOrder(table) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const idxA = parseInt(a.dataset.originalIndex, 10);
      const idxB = parseInt(b.dataset.originalIndex, 10);
      return idxA - idxB;
    });
    rows.forEach(row => tbody.appendChild(row));
    console.log("[AccountReport] Восстановлен исходный порядок (none).");
  }

  // Функция сортировки с учетом числовых значений и особой обработки для "Отзывы"
  function sortTableByColumn(table, column, order) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headerCells = Array.from(table.querySelectorAll('thead th'));
    const colIndex = headerCells.findIndex(th => th.dataset.column === column);
    if (colIndex < 0) return;

    // Если столбец входит в список для числовой сортировки, обрабатываем как число
    const numericColumns = [
      "Просмотрысегодня",
      "Просмотрывсего",
      "Рейтинг",
      "Отзывы",
      "Активныхобъявлений",
      "Завершенныхобъявлений",
      "Подписчики",
      "Подписки"
    ];
    const isNumericColumn = numericColumns.includes(column);

    rows.sort((a, b) => {
      const cellA = a.children[colIndex];
      const cellB = b.children[colIndex];
      let aText = cellA.textContent.trim();
      let bText = cellB.textContent.trim();
      let aVal, bVal;
      if (isNumericColumn) {
        aVal = parseFloat(aText) || 0;
        bVal = parseFloat(bText) || 0;
      } else {
        aVal = aText.toLowerCase();
        bVal = bText.toLowerCase();
      }
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

    // Для столбца "Отзывы" обновляем текст с добавлением слова " отзыва"
    if (column === "Отзывы") {
      rows.forEach(row => {
        const cell = row.children[colIndex];
        let num = parseFloat(cell.textContent.trim()) || 0;
        cell.textContent = num + " отзыва";
      });
    }

    rows.forEach(row => tbody.appendChild(row));
    console.log("[AccountReport] Таблица отсортирована по столбцу:", column, "в порядке:", order);
  }

  function generateCSVFromTableData(table) {
    // Константа с заголовками нужных столбцов
    const headers = [
      "Аккаунт",
      "Позиции в выдаче",
      "Услуги продвижения",
      "Просмотры сегодня",
      "Просмотры всего",
      "Рейтинг",
      "Отзывы",
      "Время ответа",
      "Активных объявлений",
      "Завершенных объявлений",
      "Кол-во доставок",
      "Кол-во покупок",
      "Подписчики",
      "Подписки",
      "На авито с"
    ];
    
    // Формируем строку заголовка, оборачивая каждое название в кавычки и разделяя точкой с запятой
    const delimiter = ';';
    let csv = headers.map(h => `"${h}"`).join(delimiter) + '\n';
    
    // Получаем все строки таблицы из tbody
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      // В исходной таблице первая ячейка – чекбокс, пропускаем её
      const cells = Array.from(row.querySelectorAll('td')).slice(1);
  
      // Превращаем набор ячеек в строку CSV
      const rowData = cells.map((cell, index) => {
        // Извлекаем текст, нормализуем пробелы
        let text = cell.textContent.trim().replace(/\s+/g, ' ');
        // Для последнего столбца удаляем префикс "На Авито с"
        if (index === cells.length - 1) {
          text = text.replace(/^На\s+Авито\s+с\s*/i, '').trim();
        }
        // Экранируем двойные кавычки и оборачиваем текст в кавычки
        text = `"${text.replace(/"/g, '""')}"`;
        return text;
      }).join(delimiter);
  
      csv += rowData + '\n';
    });
    return csv;
  }
  
  function attachExcelDownload(statsBlock, tableWrapper) {
    const downloadBtn = statsBlock.querySelector('#downloadExcel');
    downloadBtn.addEventListener('click', () => {
      console.log("[AccountReport] Кнопка экспорта нажата");
      
      // Генерируем CSV с помощью нового подхода
      const csv = generateCSVFromTableData(tableWrapper.querySelector('table'));
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Формирование имени файла с текущей датой
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      a.download = `avito-accounts-${year}-${month}-${day}.csv`;
      
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("[AccountReport] Экспорт CSV завершён");
    });
  }

})();
