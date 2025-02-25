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
    } catch (e) {}
  }

  const currentPage = parseInt(urlParams.get("pageFrom"), 10) || 1;
  const offset = (currentPage - 1) * 50;
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

    btn.disabled = true;
    btn.textContent += " (Загрузка библиотеки...)";

    loadXLSX().then(() => {
      btn.disabled = false;
      btn.textContent = "Скачать агрегированный CTR отчет для всех объявлений";
    }).catch(() => {
      btn.textContent = "Ошибка загрузки библиотеки XLSX";
    });

    btn.addEventListener("click", () => {
      btn.disabled = true;
      loadXLSX().then(() => {
        generateAggregatedReport(dateFrom, dateTo).finally(() => {
          btn.disabled = false;
        });
      }).catch(() => {
        alert("Ошибка при загрузке библиотеки XLSX");
        btn.disabled = false;
      });
    });
    containerDiv.appendChild(btn);

    wrapper.parentNode.insertBefore(containerDiv, listContainer);
  }

  let xlsxPromise = null;
  function loadXLSX() {
    if (window.XLSX) {
      return Promise.resolve(window.XLSX);
    }
    if (!xlsxPromise) {
      xlsxPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = 'xlsx-lib';
        script.src = chrome.runtime.getURL('lib/xlsx.full.min.js');
        script.type = 'text/javascript';
        script.async = true;
        script.onload = () => {
          setTimeout(() => {
            if (window.XLSX) {
              resolve(window.XLSX);
            } else {
              reject(new Error("XLSX не найден после загрузки"));
            }
          }, 1000);
        };
        script.onerror = (err) => {
          reject(err);
        };
        document.head.appendChild(script);
      });
    }
    return xlsxPromise;
  }

  function generateExcelFile(data, fileName) {
    return loadXLSX().then(() => {
      if (!window.XLSX) {
        throw new Error("XLSX is not defined");
      }
      try {
        const worksheet = window.XLSX.utils.aoa_to_sheet(data);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, "Отчет");
        window.XLSX.writeFile(workbook, fileName);
      } catch (error) {
        throw error;
      }
    }).catch(() => {
      alert("Ошибка при загрузке библиотеки XLSX");
    });
  }

  async function generateAggregatedReport(dateFrom, dateTo) {
    try {
      const requestBody = {
        layout: "pro_filters",
        limit: 50,
        offset: offset,
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
        reportData.push([adIds[index], `${dateFrom} - ${dateTo}`, avgCTR, totalViews, totalImpressions]);
      });

      if (!reportData.length) {
        alert("Объявления не найдены");
        return;
      }

      const xlsxData = [
        ["Объявление (ID)", "Период", "Средний CTR за период", "Средние просмотры", "Средние показы"],
        ...reportData
      ];
      await generateExcelFile(xlsxData, 'aggregated_ctr_report.xlsx');
    } catch (e) {}
  }

  function observeAndAddButton() {
    const targetNode = document.body;
    const config = { childList: true, subtree: true };
    const observer = new MutationObserver((mutationsList, obs) => {
      const wrapper = document.querySelector('.styles-wrapper-LZlSA.styles-narrow-HsBO5');
      const listContainer = document.querySelector('.style-list-container-SP3qU');
      if (wrapper && listContainer) {
        addAggregatedReportButton();
        obs.disconnect();
      }
    });
    observer.observe(targetNode, config);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addAggregatedReportButton);
  } else {
    observeAndAddButton();
  }
})();
