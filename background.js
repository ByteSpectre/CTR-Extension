chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    if (tab.url.match(/avito\.ru\/profile\/pro\/items\?expandedItemId=\d+/)) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: checkAndRunScript
      });
    } else if (tab.url.startsWith("https://www.avito.ru/profile/pro/items?filters")) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['aggregatedReport.js']
      });
    } else if (tab.url?.startsWith("chrome://")) {
      return;
    } else {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: removeExecutedFlag
      });
    }
  }
});

async function checkAndRunScript() {
  const existingCTRContainer = document.getElementById('ctr-container');
  if (existingCTRContainer) {
    existingCTRContainer.remove();
  }
  const existingDownloadButton = document.getElementById('download-button');
  if (existingDownloadButton) {
    existingDownloadButton.remove();
  }
  const existingStatsSummary = document.getElementById('stats-summary');
  if (existingStatsSummary) {
    existingStatsSummary.remove();
  }
  const executedFlag = document.querySelector('#ctr-script-executed');
  if (executedFlag) {
    executedFlag.remove();
  }

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const el = document.querySelector(selector);
        if (el) {
          clearInterval(interval);
          resolve(el);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        reject(new Error("Элемент не найден: " + selector));
      }, timeout);
    });
  }

  async function changePeriodTitle(dateFromURL, dateToURL) {
    try {
      const periodTitleElement = await waitForElement(
        'h4.styles-module-root-rguWo.styles-module-root-MV9Xr.styles-module-size_l-vQlO5.styles-module-size_l_dense-VJGgg.styles-module-size_l-tX1Xo.styles-module-size_dense-Kph8F.stylesMarningNormal-module-root-y2qRV.stylesMarningNormal-module-header-l-mks_p'
      );
      const fromDate = new Date(dateFromURL);
      const toDate = new Date(dateToURL);
      const monthNames = [
        'января','февраля','марта','апреля','мая','июня',
        'июля','августа','сентября','октября','ноября','декабря'
      ];
      const diffDays = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
      const newTitle = `${diffDays} дней: ` +
        `${fromDate.getDate()} ${monthNames[fromDate.getMonth()]} — ` +
        `${toDate.getDate()} ${monthNames[toDate.getMonth()]}`;
      periodTitleElement.textContent = newTitle;
    } catch (error) {
      console.error("Ошибка при изменении заголовка периода:", error);
    }
  }

  try {
    const titleContainer = await waitForElement('.styles-title-AvKGs');
    const funnelContainer = await waitForElement('.styles-funnel-8kT87');

    const currentUrl = window.location.href;
    const decodedUrl = decodeURIComponent(currentUrl);
    const itemIdMatch = decodedUrl.match(/expandedItemId=(\d+)/);
    const itemId = itemIdMatch ? Number(itemIdMatch[1]) : null;
    const dateFromMatch = decodedUrl.match(/"from":"(\d{4}-\d{2}-\d{2})"/);
    const dateToMatch = decodedUrl.match(/"to":"(\d{4}-\d{2}-\d{2})"/);
    const dateFromURL = dateFromMatch ? dateFromMatch[1] : null;
    const dateToURL = dateToMatch ? dateToMatch[1] : null;
    
    if (!itemId || !dateFromURL || !dateToURL) {
      alert('Не удалось извлечь ID объявления или даты из URL');
      return;
    }

    await changePeriodTitle(dateFromURL, dateToURL);

    const responseFull = await fetch('https://www.avito.ru/web/2/sellers/pro/statistics/item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': document.cookie
      },
      body: JSON.stringify({
        itemId: itemId,
        dateFrom: dateFromURL,
        dateTo: dateToURL
      })
    });
    
    if (!responseFull.ok) {
      throw new Error(`Ошибка HTTP (полный период): ${responseFull.status}`);
    }
    const dataFull = await responseFull.json();
    const statsFull = dataFull.data;
    if (!statsFull || !statsFull.length) return;

    const funnelStepsData = dataFull.funnelSteps;
    const impressionsValue = funnelStepsData.find(step => step.id === "impressions")?.value;
    const viewsValue = funnelStepsData.find(step => step.id === "views")?.value;
    const contactsValue = funnelStepsData.find(step => step.id === "contacts")?.value;

    const impressionsDiv = funnelContainer.querySelector('[data-marker="impressions"]');
    const viewsDiv = funnelContainer.querySelector('[data-marker="views"]');
    if (impressionsDiv) {
      const impressionsH5 = impressionsDiv.querySelector('h5');
      if (impressionsH5) {
        impressionsH5.textContent = impressionsValue;
      }
    }
    if (viewsDiv) {
      const viewsH5 = viewsDiv.querySelector('h5');
      if (viewsH5) {
        viewsH5.textContent = viewsValue;
      }
    }
    const contactsDiv = funnelContainer.querySelector('[data-marker="contacts"]');
    if (contactsDiv) {
      const contactsH5 = contactsDiv.querySelector('h5');
      if (contactsH5) {
        contactsH5.textContent = contactsValue;
      }
    }

    const funnelCountersData = dataFull.funnelCounters;
    const favoritesValue = funnelCountersData.find(counter => counter.id === "favorites")?.value;
    const spendingValue = funnelCountersData.find(counter => counter.id === "spending")?.value;
    const extraContainer = await waitForElement('.styles-extra-OJSDi');
    if (extraContainer) {
      const favoritesDiv = extraContainer.querySelector('[data-marker="favorites"]');
      if (favoritesDiv) {
        const favoritesH5 = favoritesDiv.querySelector('h5');
        if (favoritesH5) {
          favoritesH5.textContent = favoritesValue;
        }
      }
      const spendingDiv = extraContainer.querySelector('[data-marker="spending"]');
      if (spendingDiv) {
        const spendingH5 = spendingDiv.querySelector('h5');
        if (spendingH5) {
          spendingH5.innerHTML = `<span>${spendingValue}&nbsp;<span class="styles-font_rub-NvEsL">₽</span></span>`;
        }
      }
    }

    const convImpressionsCalculated = impressionsValue > 0 ? (viewsValue / impressionsValue * 100).toFixed(2) : "0.00";
    const convViewsCalculated = viewsValue > 0 ? (contactsValue / viewsValue * 100).toFixed(2) : "0.00";

    const conversionContainers = Array.from(funnelContainer.querySelectorAll('.styles-counter-TyOZh'))
      .filter(el => el.querySelector('.styles-conversion-j_0of'));

    if (conversionContainers.length >= 2) {
      const convImpressionsSpan = conversionContainers[0].querySelector('.styles-conversion-j_0of span.styles-module-size_s-Sf21c');
      const convViewsSpan = conversionContainers[1].querySelector('.styles-conversion-j_0of span.styles-module-size_s-Sf21c');
      if (convImpressionsSpan) {
        convImpressionsSpan.textContent = convImpressionsCalculated + '%';
      }
      if (convViewsSpan) {
        convViewsSpan.textContent = convViewsCalculated + '%';
      }
    } else {
      console.warn("Не найдены оба контейнера для конверсии");
    }

    function calculateCTR(statsArray) {
      return statsArray.map(dayStat => {
        const impressions = parseFloat(dayStat.impressions) || 0;
        const views = parseFloat(dayStat.views) || 0;
        const ctr = impressions > 0 ? (views / impressions) * 100 : 0;
        const date = new Date(dayStat.date);
        const monthNames = [
          'января','февраля','марта','апреля','мая','июня',
          'июля','августа','сентября','октября','ноября','декабря'
        ];
        return {
          date: `${date.getDate()} ${monthNames[date.getMonth()]}`,
          impressions,
          views,
          ctr: ctr.toFixed(1)
        };
      });
    }
    const fullPeriodCTRResults = calculateCTR(statsFull);

    const today = new Date();
    const date30DaysAgo = new Date(today);
    date30DaysAgo.setDate(today.getDate() - 29);
    const todayStr = today.toISOString().slice(0, 10);
    const date30Str = date30DaysAgo.toISOString().slice(0, 10);
    const response30 = await fetch('https://www.avito.ru/web/2/sellers/pro/statistics/item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': document.cookie
      },
      body: JSON.stringify({
        itemId: itemId,
        dateFrom: date30Str,
        dateTo: todayStr
      })
    });
    if (!response30.ok) {
      throw new Error(`Ошибка HTTP (30 дней): ${response30.status}`);
    }
    const data30 = await response30.json();
    const stats30 = data30.data;
    if (!stats30 || !stats30.length) return;
    const last30DaysCTRResults = calculateCTR(stats30);

    const chartElements = document.querySelectorAll('.styles-chart-R_KjW');
    if (!chartElements.length) return;
    const firstChart = chartElements[0];
    const ctrContainer = document.createElement('div');
    ctrContainer.id = 'ctr-container';
    ctrContainer.style.cssText = 'display: flex; width: 94%; padding-left: 40px; margin-top: 5px; padding-right: 15px; white-space: nowrap; font-size: 10px;';
    ctrContainer.textContent = "Тут будет CTR для первой таблицы";
    firstChart.parentNode.insertBefore(ctrContainer, firstChart.nextSibling);
    setTimeout(() => {
      ctrContainer.innerHTML = "";
      last30DaysCTRResults.forEach(result => {
        const dayBlock = document.createElement('span');
        dayBlock.style.cssText = 'font-weight: 600; flex: 1; text-align: center; width: 24px; color: #000000;';
        dayBlock.textContent = result.ctr;
        ctrContainer.appendChild(dayBlock);
      });
    }, 300);

    const downloadButton = document.createElement('button');
    downloadButton.id = 'download-button';
    downloadButton.textContent = 'Скачать CTR отчет';
    downloadButton.style.cssText = 'padding: 5px 10px; font-size: 12px; background-color: #99CCFF; color: dark; border: none; border-radius: 4px; cursor: pointer; margin-right: 53%;';
    const h5Element = titleContainer.querySelector('h5');
    const legendContainer = titleContainer.querySelector('.styles-legend-KpvHE');
    if (h5Element && legendContainer) {
      titleContainer.insertBefore(downloadButton, legendContainer);
    }
    downloadButton.addEventListener('click', () => {
      if (typeof XLSX === 'undefined') {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('lib/xlsx.full.min.js');
        script.type = 'text/javascript';
        script.async = true;
        script.onload = () => { generateReport(); };
        document.head.appendChild(script);
      } else {
        generateReport();
      }
    });
    
    function generateReport() {
      const xlsxData = [
        ['День', 'Показы', 'Просмотры', '%CTR'],
        ...fullPeriodCTRResults.map(item => [item.date, item.impressions, item.views, item.ctr])
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(xlsxData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'CTR Отчет');
      const fileName = `ctr_report_${itemId}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    }
  } catch (error) {
    console.error("Ошибка выполнения скрипта:", error);
  }
}

function removeExecutedFlag() {
  const executedFlag = document.querySelector('#ctr-script-executed');
  if (executedFlag) executedFlag.remove();
}
