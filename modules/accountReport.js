/* modules/accountReport.js */

(function () {
  console.log("[AccountReport] Модуль отчёта аккаунтов запущен");

  // Функция проверки полной загрузки страницы
  function onPageFullyLoaded(callback) {
    if (document.readyState === 'complete') {
      console.log("[AccountReport] Страница полностью загружена");
      callback();
    } else {
      window.addEventListener('load', () => {
        console.log("[AccountReport] Событие load: страница полностью загружена");
        callback();
      });
    }
  }

  // Проверяем наличие элемента с data-marker="page-title/count"
  if (!document.querySelector('[data-marker="page-title/count"]')) {
    console.log("[AccountReport] Элемент с data-marker='page-title/count' не найден. Функциональность отчёта не запускается.");
    return;
  } else {
    console.log("[AccountReport] Элемент с data-marker='page-title/count' найден. Запускаем функционал.");
  }

  // Инициализируем функционал после полной загрузки страницы
  onPageFullyLoaded(initAccountsTab);

  function initAccountsTab() {
    if (document.getElementById('accounts-button-container')) {
      return;
    }
    // Находим элементы-родители по классам
    const topPanelBlock = document.querySelector('.index-topPanel-FOjk0');
    const stickyPanel = document.querySelector('.index-root-gtkvj');
  
    if (topPanelBlock && stickyPanel) {
      // Создаем контейнер для кнопки
      const container = document.createElement('div');
      container.id = 'accounts-button-container';
      // Минимальные стили контейнера
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.padding = '5px';
      container.style.margin = '0 10px';
  
      // Вставляем контейнер между topPanelBlock и stickyPanel
      topPanelBlock.parentNode.insertBefore(container, stickyPanel);
  
      // Создаем кнопку "Аккаунты"
      const accountsTab = document.createElement('div');
      accountsTab.className = 'tab';
      accountsTab.dataset.tabId = 'accounts';
      accountsTab.textContent = 'Аккаунты';
      accountsTab.style.cursor = 'pointer';
  
      // Добавляем кнопку в созданный контейнер
      container.appendChild(accountsTab);
  
      accountsTab.addEventListener('click', () => {
        console.log("[AccountReport] Вкладка 'Аккаунты' нажата");
        loadAccountsData();
      });
    } else {
      // Если не найдены целевые элементы, добавляем кнопку в body
      const container = document.body;
      const accountsTab = document.createElement('div');
      accountsTab.className = 'tab';
      accountsTab.dataset.tabId = 'accounts';
      accountsTab.textContent = 'Аккаунты';
      accountsTab.style.cursor = 'pointer';
      container.appendChild(accountsTab);
  
      accountsTab.addEventListener('click', () => {
        console.log("[AccountReport] Вкладка 'Аккаунты' нажата");
        loadAccountsData();
      });
    }
  }  
  

  async function loadAccountsData() {
    console.log("[AccountReport] loadAccountsData запущена");
  
    // Удаляем ранее созданный контейнер статистики, если он есть
    const existingContainer = document.getElementById('accounts-container');
    if (existingContainer) {
      console.log("[AccountReport] Удаляем ранее созданный контейнер статистики");
      existingContainer.remove();
    }
    
    // Создаем контейнер для статистики
    const container = document.createElement('div');
    container.id = 'accounts-container';
    container.style.margin = '10px 0';
    
    // Находим контейнер кнопки
    const buttonContainer = document.getElementById('accounts-button-container');
    if (buttonContainer) {
      // Вставляем контейнер статистики сразу после контейнера кнопки
      buttonContainer.parentNode.insertBefore(container, buttonContainer.nextSibling);
    } else {
      // Если контейнер кнопки не найден, добавляем в конец body
      document.body.appendChild(container);
    }
    
    console.log("[AccountReport] Создан контейнер для статистики");
    // Выводим сообщение о загрузке
    container.textContent = 'Загрузка статистики...';

// Собираем ссылки на продавцов по указанному селектору
const adLinks = Array.from(
  document.querySelectorAll('a.styles-module-root-m3BML.styles-module-root_noVisited-HHF0s.styles-module-root_preset_black-ydSp2')
).map(link => {
  let href = link.getAttribute('href');
  if (href && href.startsWith('/')) {
    href = 'https://www.avito.ru' + href;
  }
  return href;
});

console.log("[AccountReport] Найдено ссылок на продавцов:", adLinks.length);


    // Объект для агрегации данных по продавцам
    const accountsMap = new Map();

    // Обрабатываем каждое объявление последовательно для контроля частоты запросов
    for (const url of adLinks) {
      console.log("[AccountReport] Обрабатываем ссылку:", url);
      try {
        const sellerData = await fetchSellerData(url);
        console.log("[AccountReport] Получены данные продавца:", sellerData);
        // Используем id продавца или его имя в качестве ключа
        const key = sellerData.id || sellerData.name;
        if (accountsMap.has(key)) {
          const existing = accountsMap.get(key);
          existing.listingCount += 1;
        } else {
          sellerData.listingCount = 1;
          accountsMap.set(key, sellerData);
        }
      } catch (error) {
        console.error(`[AccountReport] Ошибка при получении данных для ${url}:`, error);
      }
    }

    console.log("[AccountReport] Агрегация завершена. Количество уникальных продавцов:", accountsMap.size);

    // Формируем блок общей статистики и таблицу аккаунтов
    const statsBlock = createStatsBlock(adLinks.length, accountsMap.size);
    const table = createAccountsTable(Array.from(accountsMap.values()));

    // Очищаем контейнер загрузки и вставляем собранные элементы
    container.innerHTML = '';
    container.appendChild(statsBlock);
    container.appendChild(table);

    // Инициализируем сортировку по столбцам и функционал экспорта в CSV
    attachTableSorting(table);
    attachExcelDownload(statsBlock, table);
    console.log("[AccountReport] Отчет по аккаунтам успешно сформирован");
  }

  // Функция для получения данных о продавце со страницы объявления
  async function fetchSellerData(url) {
    console.log("[AccountReport] Запрос данных продавца по URL:", url);
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error(`Ошибка: ${response.status}`);
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    console.log("[AccountReport] Страница продавца загружена и распарсена");

    // Извлечение статистики – селекторы могут потребовать корректировки под фактическую разметку
    const sellerNameElem = doc.querySelector('p.styles-module-root-s4tZ2.styles-module-size_s-PDQal').textContent.trim();
    const todayViewsElem = doc.querySelector('[data-marker="item-view/today-views"]');
    const totalViewsElem = doc.querySelector('[data-marker="item-view/total-views"]');
    const ratingElem = doc.querySelector('[data-marker="seller-rating/score"]');
    const reviewsElem = doc.querySelector('[data-marker="seller-rating/summary"]');
    const answerTimeElem = doc.querySelector('[data-marker="answer-time"]');
    const counters = document.querySelectorAll('span.styles-module-counter-qyO5b.styles-module-counter_size-xxl-_hqhd');
    const activeAdsElem = counters[0] ? counters[0].textContent.trim() : '-';
    const completedAdsElem = counters[1] ? counters[1].textContent.trim() : '-';
    const favText = document.querySelector('[data-marker="favorite-seller-counters"]').textContent;
    const [subscribersElem, subscriptionsElem] = favText.split(',').map(item => item.replace(/\D/g, '').trim());
    const registeredElem = doc.querySelector('[data-marker="registered"]');

    return {
      id: sellerNameElem ? sellerNameElem.textContent.trim() : url,
      name: sellerNameElem ? sellerNameElem.textContent.trim() : 'Неизвестно',
      todayViews: todayViewsElem ? todayViewsElem.textContent.trim() : '-',
      totalViews: totalViewsElem ? totalViewsElem.textContent.trim() : '-',
      rating: ratingElem ? ratingElem.textContent.trim() : '-',
      reviewCount: reviewsElem ? reviewsElem.textContent.trim() : '-',
      answerTime: answerTimeElem ? answerTimeElem.textContent.trim() : '-',
      activeAds: activeAdsElem ? activeAdsElem.textContent.trim() : '-',
      completedAds: completedAdsElem ? completedAdsElem.textContent.trim() : '-',
      avitoSells: sellsElem ? sellsElem.textContent.trim() : '-',
      avitoBuys: buysElem ? buysElem.textContent.trim() : '-',
      subscribers: subscribersElem ? subscribersElem.textContent.trim() : '-',
      subscriptions: subscriptionsElem ? subscriptionsElem.textContent.trim() : '-',
      registered: registeredElem ? registeredElem.textContent.trim() : '-'
    };
  }

  // Формирование блока общей статистики
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
      itemDiv.innerHTML = `<span class="stat-label">${item.label}</span><span class="stat-value">${item.value}</span>`;
      statsContainer.appendChild(itemDiv);
    });

    // Кнопка для экспорта в Excel (CSV)
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'downloadExcel';
    downloadBtn.className = 'download-btn';
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

  // Формирование таблицы с подробными данными по аккаунтам
  function createAccountsTable(accounts) {
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'accounts-table-wrapper';
    tableWrapper.dataset.rowCount = accounts.length;
    const table = document.createElement('table');
    table.className = 'accounts-table';

    // Заголовок таблицы
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const headers = [
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
    headers.forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      if (text !== 'Пометить на выдаче' && text !== 'Аккаунт' && text !== 'Позиции в выдаче' && text !== 'Услуги продвижения') {
        th.dataset.column = text.replace(/\s+/g, '');
        th.style.cursor = 'pointer';
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Тело таблицы
    const tbody = document.createElement('tbody');
    accounts.forEach(account => {
      const row = document.createElement('tr');

      // Столбец с чекбоксом
      const checkboxCell = document.createElement('td');
      const checkboxWrapper = document.createElement('div');
      checkboxWrapper.className = 'checkbox-wrapper';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'account-checkbox';
      checkbox.dataset.profileLink = account.id;
      checkboxWrapper.appendChild(checkbox);
      checkboxCell.appendChild(checkboxWrapper);
      row.appendChild(checkboxCell);

      // Аккаунт (имя и количество объявлений)
      const accountCell = document.createElement('td');
      accountCell.innerHTML = `<div class="account-name"><div>${account.name}</div><span class="advert-count">${account.listingCount}</span></div>`;
      row.appendChild(accountCell);

      // Позиции в выдаче – заглушка
      const positionsCell = document.createElement('td');
      positionsCell.textContent = '-';
      row.appendChild(positionsCell);

      // Услуги продвижения – заглушка
      const promotionCell = document.createElement('td');
      promotionCell.innerHTML = '<div class="table-vas-container">-</div>';
      row.appendChild(promotionCell);

      // Остальные столбцы с данными
      const dataColumns = [
        account.todayViews,
        account.totalViews,
        account.rating,
        account.reviewCount,
        account.answerTime,
        account.activeAds,
        account.completedAds,
        account.avitoSells,
        account.avitoBuys,
        account.subscribers,
        account.subscriptions,
        account.registered
      ];
      dataColumns.forEach(val => {
        const td = document.createElement('td');
        td.textContent = val;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    tableWrapper.appendChild(table);

    // Кнопка "Показать все" для сворачиваемой таблицы
    const expandContainer = document.createElement('div');
    expandContainer.className = 'expand-button-container';
    const expandButton = document.createElement('div');
    expandButton.className = 'expand-button';
    expandButton.textContent = 'Показать все';
    expandButton.addEventListener('click', () => {
      tableWrapper.style.maxHeight = 'none';
      expandButton.style.display = 'none';
      console.log("[AccountReport] Таблица развернута");
    });
    expandContainer.appendChild(expandButton);
    tableWrapper.appendChild(expandContainer);
    return tableWrapper;
  }

  // Функции сортировки таблицы
  function attachTableSorting(table) {
    const headers = table.querySelectorAll('th[data-column]');
    headers.forEach(th => {
      th.addEventListener('click', () => {
        const column = th.dataset.column;
        console.log("[AccountReport] Сортировка по столбцу:", column);
        sortTableByColumn(table, column);
      });
    });
  }

  function sortTableByColumn(table, column) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headerCells = Array.from(table.querySelectorAll('thead th'));
    const colIndex = headerCells.findIndex(th => th.dataset.column === column);
    if (colIndex < 0) return;
    const isNumeric = rows.every(row => {
      const text = row.children[colIndex].textContent.trim();
      return !isNaN(parseFloat(text));
    });
    let currentOrder = table.getAttribute('data-sort-order-' + column) || 'asc';
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    table.setAttribute('data-sort-order-' + column, newOrder);
    rows.sort((a, b) => {
      const aText = a.children[colIndex].textContent.trim();
      const bText = b.children[colIndex].textContent.trim();
      let aVal = isNumeric ? parseFloat(aText) : aText.toLowerCase();
      let bVal = isNumeric ? parseFloat(bText) : bText.toLowerCase();
      if (aVal < bVal) return newOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return newOrder === 'asc' ? 1 : -1;
      return 0;
    });
    rows.forEach(row => tbody.appendChild(row));
    console.log("[AccountReport] Таблица отсортирована по столбцу:", column, "в порядке:", newOrder);
  }

  // Экспорт таблицы в CSV (открывается в Excel)
  function attachExcelDownload(statsBlock, tableWrapper) {
    const downloadBtn = statsBlock.querySelector('#downloadExcel');
    downloadBtn.addEventListener('click', () => {
      console.log("[AccountReport] Кнопка экспорта в Excel нажата");
      const csv = tableToCSV(tableWrapper.querySelector('table'));
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'accounts_stats.csv';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("[AccountReport] Экспорт CSV завершён");
    });
  }

  function tableToCSV(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    return rows
      .map(row => {
        const cols = Array.from(row.querySelectorAll('th, td'));
        return cols
          .map(col => String(col.textContent.trim().replace(/"/g, '""')))
          .join(',');
      })
      .join('\n');
  }
})();
