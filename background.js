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
    } else if (tab.url?.startsWith("chrome://")) return undefined; 
      else {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: removeExecutedFlag
      });
    }
  }
});

async function checkAndRunScript() {
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

  try {
    const oldCtrContainer = document.getElementById('ctr-container');
    if (oldCtrContainer) oldCtrContainer.remove();

    const oldPeriodCtrContainer = document.getElementById('period-ctr-container');
    if (oldPeriodCtrContainer) oldPeriodCtrContainer.remove();

    const oldDownloadButton = document.getElementById('download-button');
    if (oldDownloadButton) oldDownloadButton.remove();

    const chartContainer = await waitForElement('.styles-chart-R_KjW');
    const titleContainer = await waitForElement('.styles-title-AvKGs');

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

    const responseFull = await fetch('https://www.avito.ru/web/2/sellers/pro/statistics/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': document.cookie },
      body: JSON.stringify({
        itemId: itemId,
        dateFrom: dateFromURL,
        dateTo: dateToURL
      })
    });
    if (!responseFull.ok) throw new Error(`Ошибка HTTP (полный период): ${responseFull.status}`);
    const dataFull = await responseFull.json();
    const statsFull = dataFull.data;
    if (!statsFull || !statsFull.length) return;

    function calculateCTR(statsArray) {
      return statsArray.map(dayStat => {
        const impressions = parseFloat(dayStat.impressions) || 0;
        const views = parseFloat(dayStat.views) || 0;
        const ctr = impressions > 0 ? (views / impressions) * 100 : 0;
        const date = new Date(dayStat.date);
        return {
          date: `${date.getDate()} ${[
            'января','февраля','марта','апреля','мая','июня',
            'июля','августа','сентября','октября','ноября','декабря'
          ][date.getMonth()]}`,
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
      headers: { 'Content-Type': 'application/json', 'Cookie': document.cookie },
      body: JSON.stringify({
        itemId: itemId,
        dateFrom: date30Str,
        dateTo: todayStr
      })
    });
    if (!response30.ok) throw new Error(`Ошибка HTTP (30 дней): ${response30.status}`);
    const data30 = await response30.json();
    const stats30 = data30.data;
    if (!stats30 || !stats30.length) return;
    const last30DaysCTRResults = calculateCTR(stats30);

    const chartElements = document.querySelectorAll('.styles-chart-R_KjW');
    if (!chartElements.length) return;
    const firstChart = chartElements[0];

    const ctrContainer = document.createElement('div');
    ctrContainer.id = 'ctr-container';
    ctrContainer.style.cssText =
      'display: flex; width: 94%; padding-left: 40px; margin-top: 5px; padding-right: 15px; white-space: nowrap; font-size: 10px;';
    ctrContainer.textContent = "Данные загружаю";
    firstChart.parentNode.insertBefore(ctrContainer, firstChart.nextSibling);

    setTimeout(() => {
      ctrContainer.innerHTML = "";
      last30DaysCTRResults.forEach(result => {
        const dayBlock = document.createElement('span');
        dayBlock.style.cssText = 'font-weight: 600; flex: 1; text-align: center; width: 24px; color: #000000;';
        dayBlock.textContent = result.ctr;
        ctrContainer.appendChild(dayBlock);
      });
      
      const periodContainer = document.createElement('div');
      periodContainer.id = 'period-ctr-container';
      periodContainer.style.cssText = 'margin-top: 5px; font-size: 10px; color: #000;';
      
      const periodHeading = document.createElement('div');
      periodHeading.style.cssText = 'font-weight: 600; margin-bottom: 2px;';
      periodHeading.textContent = "CTR за выбранный период";
      periodContainer.appendChild(periodHeading);
      
      const periodDailyContainer = document.createElement('div');
      periodDailyContainer.style.cssText =
        'display: flex; width: 94%; padding-left: 40px; padding-right: 15px; white-space: nowrap;';
      
        fullPeriodCTRResults.forEach(result => {
        const dayBlock = document.createElement('span');
        dayBlock.style.cssText = 'flex: 1; text-align: center;';
        dayBlock.textContent = result.ctr;
        periodDailyContainer.appendChild(dayBlock);
      });
      periodContainer.appendChild(periodDailyContainer);
      ctrContainer.parentNode.insertBefore(periodContainer, ctrContainer.nextSibling);
    }, 300);

    const downloadButton = document.createElement('button');
    downloadButton.id = 'download-button';
    downloadButton.textContent = 'Скачать CTR отчет';
    downloadButton.style.cssText =
      'padding: 5px 10px; font-size: 12px; background-color: #99CCFF; color: dark; border: none; border-radius: 4px; cursor: pointer; margin-right: 53%;';
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
  } catch (error) {}
}

function removeExecutedFlag() {
  const executedFlag = document.querySelector('#ctr-script-executed');
  if (executedFlag) executedFlag.remove();
}
