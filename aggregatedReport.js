(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const filtersParam = urlParams.get("filters");
  
  let dateFrom, dateTo;
  if (filtersParam) {
    try {
      const filtersObj = JSON.parse(decodeURIComponent(filtersParam));
      if (filtersObj.statistics) {
        dateFrom = filtersObj.statistics.from;
        dateTo = filtersObj.statistics.to;
      }
    } catch (e) {
      console.error("Ошибка парсинга filters", e);
    }
  }

  const sortField = urlParams.get("sortField") || "views";
  const sortDirection = urlParams.get("sortDirection") || "desc";

  if (!dateFrom || !dateTo) {
    return;
  }

  function addAggregatedReportButton() {
    const existingContainer = document.getElementById('aggregated-report-container');
    if (existingContainer) {
      existingContainer.remove();
    }

    const wrapper = document.querySelector('.styles-wrapper-LZlSA.styles-narrow-HsBO5');
    const listContainer = document.querySelector('.style-list-container-SP3qU');
    if (!wrapper || !listContainer) {
      return;
    }

    const containerDiv = document.createElement('div');
    containerDiv.id = 'aggregated-report-container';
    containerDiv.style.cssText = "margin: 10px 0; text-align: center;";

    const btn = document.createElement('button');
    btn.textContent = "Скачать агрегированный CTR отчет для всех объявлений";
    btn.style.cssText = 'padding: 5px 10px; font-size: 12px; background-color: #99CCFF; color: dark; border: none; border-radius: 4px; cursor: pointer;';
    btn.addEventListener("click", () => {
      generateAggregatedReport(dateFrom, dateTo);
    });
    containerDiv.appendChild(btn);

    wrapper.parentNode.insertBefore(containerDiv, listContainer);
  }

  async function generateAggregatedReport(dateFrom, dateTo) {
    try {
      const requestBody = {
        layout: "pro_filters",
        limit: 50,
        offset: 0,
        filters: {
          tabs: "active",
          statistics: {
            fields: [
              "views",
              "contacts",
              "favorites",
              "viewsToContactsConversion",
              "calls"
            ],
            from: dateFrom,
            to: dateTo
          }
        },
        orderBy: sortField,
        order: sortDirection,
        source: "osp"
      };

      const searchResponse = await fetch('https://www.avito.ru/web/1/serp/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': document.cookie
        },
        body: JSON.stringify(requestBody)
      });
      if (!searchResponse.ok) {
        throw new Error(`Ошибка поиска: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      const results = searchData.result && searchData.result.results ? searchData.result.results : null;
      if (!results || !results.length) {
        alert("Объявления не найдены");
        return;
      }

      const adIds = results.map(item => {
        const idField = item.fields.find(f => f.name === "id");
        return idField ? idField.value : null;
      }).filter(id => id !== null);

      if (!adIds.length) {
        alert("Объявления не найдены");
        return;
      }
      
      const statsPromises = adIds.map(adId => 
        fetch("https://www.avito.ru/web/2/sellers/pro/statistics/item", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cookie": document.cookie
          },
          body: JSON.stringify({
            itemId: adId,
            dateFrom: dateFrom,
            dateTo: dateTo
          })
        })
        .then(res => res.ok ? res.json() : null)
        .catch(() => null)
      );

      const statsResults = await Promise.all(statsPromises);
      const reportData = [];
      statsResults.forEach((statsData, index) => {
        if (!statsData || !statsData.data || !statsData.data.length) return;
        let totalImpressions = 0, totalViews = 0;
        statsData.data.forEach(day => {
          totalImpressions += parseFloat(day.impressions) || 0;
          totalViews += parseFloat(day.views) || 0;
        });
        const avgCTR = totalImpressions > 0 ? ((totalViews / totalImpressions) * 100).toFixed(1) : "0.0";
        reportData.push([adIds[index], `${dateFrom} - ${dateTo}`, avgCTR]);
      });

      if (!reportData.length) {
        alert("Объявления не найдены");
        return;
      }

      const xlsxData = [
        ["Объявление (ID)", "Период", "Средний CTR за период"],
        ...reportData
      ];
      generateExcelFile(xlsxData, 'aggregated_ctr_report.xlsx');
    } catch (e) {
      console.error("Ошибка при генерации агрегированного отчета", e);
    }
  }

  let xlsxPromise = null;
function loadXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (!xlsxPromise) {
    xlsxPromise = new Promise((resolve, reject) => {
      if (!document.getElementById('xlsx-lib')) {
        const script = document.createElement('script');
        script.id = 'xlsx-lib';
        script.src = chrome.runtime.getURL('lib/xlsx.full.min.js');
        script.type = 'text/javascript';
        script.async = true;
        script.onload = () => resolve(window.XLSX);
        script.onerror = () => reject(new Error('Failed to load XLSX library'));
        document.head.appendChild(script);
      }
    });
  }
  return xlsxPromise;
}

function generateExcelFile(data, fileName) {
  loadXLSX().then(() => {
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Отчет");
    XLSX.writeFile(workbook, fileName);
  }).catch(err => {
    console.error("Ошибка при загрузке XLSX:", err);
  });
}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addAggregatedReportButton);
  } else {
    addAggregatedReportButton();
  }
})();
