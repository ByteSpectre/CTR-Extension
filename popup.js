document.addEventListener("DOMContentLoaded", async function () {
  // Получаем элементы вкладок и секций
  const tabQueries = document.getElementById("tabQueries");
  const tabCategories = document.getElementById("tabCategories");
  const tabPdf = document.getElementById("tabPdf");
  
  const queriesSection = document.getElementById("queriesSection");
  const categoriesSection = document.getElementById("categoriesSection");
  const pdfSection = document.getElementById("pdfSection");
  
  // Функция для установки активной вкладки
  function setActiveTab(activeTab) {
    [tabQueries, tabCategories, tabPdf].forEach(tab => {
      tab.classList.toggle("active", tab === activeTab);
    });
  }
  
  // Обработчики кликов по вкладкам
  tabQueries.addEventListener("click", () => {
    setActiveTab(tabQueries);
    queriesSection.style.display = "block";
    categoriesSection.style.display = "none";
    pdfSection.style.display = "none";
  });
  
  tabCategories.addEventListener("click", () => {
    setActiveTab(tabCategories);
    categoriesSection.style.display = "block";
    queriesSection.style.display = "none";
    pdfSection.style.display = "none";
  });
  
  tabPdf.addEventListener("click", () => {
    setActiveTab(tabPdf);
    pdfSection.style.display = "block";
    queriesSection.style.display = "none";
    categoriesSection.style.display = "none";
  });
  
  // Изначально активна вкладка "Запросы"
  setActiveTab(tabQueries);
  queriesSection.style.display = "block";
  categoriesSection.style.display = "none";
  pdfSection.style.display = "none";
  
  // Обработка формы аналитики по запросам
  document.getElementById("startQueriesButton").addEventListener("click", () => {
    const queriesText = document.getElementById("queries").value.trim();
    const regionsText = document.getElementById("regions").value.trim();
    const period = document.getElementById("periodQueries").value;
  
    if (!queriesText || !regionsText) {
      alert("Пожалуйста, заполните поля для запросов и регионов.");
      return;
    }
  
    const queries = queriesText.split("\n").map(q => q.trim()).filter(Boolean);
    const regions = regionsText.split("\n").map(r => r.trim()).filter(Boolean);
  
    updateQueriesProgress(0);
    updateQueriesParsedCount(0);
  
    chrome.runtime.sendMessage({
      action: "startParsing",
      data: { queries, regions, period }
    }, (response) => {
      console.log("Ответ (запросы) от background:", response);
    });
  });
  
  // Обработка формы аналитики по категориям
  document.getElementById("startCategoriesButton").addEventListener("click", () => {
    const categoriesText = document.getElementById("categories").value.trim();
    const citiesText = document.getElementById("cities").value.trim();
    const locationType = document.getElementById("locationType").value;
    const period = document.getElementById("periodCategories").value;
    const priceFromValue = document.getElementById("priceFrom").value.trim();
    const priceToValue = document.getElementById("priceTo").value.trim();
    const sellerTypeValue = document.querySelector('input[name="sellerType"]:checked').value;
  
    if (!categoriesText || !citiesText) {
      alert("Пожалуйста, заполните поля категорий и городов.");
      return;
    }
  
    const categories = categoriesText.split("\n").map(c => c.trim()).filter(Boolean);
    const cities = citiesText.split("\n").map(c => c.trim()).filter(Boolean);
    const priceFrom = priceFromValue ? parseFloat(priceFromValue) : null;
    const priceTo = priceToValue ? parseFloat(priceToValue) : null;
    const sellerType = (sellerTypeValue === "all") ? null : parseInt(sellerTypeValue);
  
    updateCategoriesProgress(0);
    updateCategoriesParsedCount(0);
  
    chrome.runtime.sendMessage({
      action: "startMarketParsing",
      data: { categories, cities, locationType, period, priceFrom, priceTo, sellerType }
    }, (response) => {
      console.log("Ответ (категории) от background:", response);
    });
  });
  
  // Обработка прогресса
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "parsingProgress") {
      if (message.mode === "queries") {
        updateQueriesProgress(message.progress);
        updateQueriesParsedCount(message.parsedCount);
      } else if (message.mode === "categories") {
        updateCategoriesProgress(message.progress);
        updateCategoriesParsedCount(message.parsedCount);
      } else {
        updateQueriesProgress(message.progress);
        updateQueriesParsedCount(message.parsedCount);
        updateCategoriesProgress(message.progress);
        updateCategoriesParsedCount(message.parsedCount);
      }
    }
    if (message.action === "showAlert") {
      alert(message.message);
    }
  });
  
  function updateQueriesProgress(progress) {
    const progressBar = document.getElementById("progressBarQueries");
    const progressText = document.getElementById("progressTextQueries");
    progressBar.value = progress;
    progressText.textContent = progress + "%";
  }
  
  function updateQueriesParsedCount(count) {
    const parsedCountDiv = document.getElementById("parsedCountQueries");
    parsedCountDiv.textContent = "Спарсено отчетов: " + count;
  }
  
  function updateCategoriesProgress(progress) {
    const progressBar = document.getElementById("progressBarCategories");
    const progressText = document.getElementById("progressTextCategories");
    progressBar.value = progress;
    progressText.textContent = progress + "%";
  }
  
  function updateCategoriesParsedCount(count) {
    const parsedCountDiv = document.getElementById("parsedCountCategories");
    parsedCountDiv.textContent = "Спарсено отчетов: " + count;
  }
  
  // PDF Генерация: при клике на кнопку "Скачать PDF" запускается content.js, который собирает данные
  document.getElementById("generatePdf").addEventListener("click", async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["content.js"]
      });
      chrome.tabs.sendMessage(tabs[0].id, { action: "startScroll" });
    } catch (error) {
      console.error("Ошибка при выполнении скрипта:", error);
    }
  });
  
  // Получаем данные из content.js для PDF и генерируем документ
  chrome.runtime.onMessage.addListener(async (message) => {
    if (message.action === "sendData") {
      console.log("Полученные данные:", message.items);
      await generatePDF(message.items);
    }
  });
  
  async function generatePDF(items) {
    if (!window.jspdf) {
      console.error("Ошибка: jsPDF не загружен!");
      return;
    }
  
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
  
    // Добавляем шрифты Arial (убедитесь, что arial_base64 и arial_bold_base64 определены)
    doc.addFileToVFS("Arial.ttf", arial_base64);
    doc.addFileToVFS("Arial-Bold.ttf", arial_bold_base64);
    doc.addFont("Arial-Bold.ttf", "Arial", "bold");
    doc.addFont("Arial.ttf", "Arial", "normal");
    doc.setFont("Arial", "bold");
    doc.setFontSize(14);
  
    doc.text("Изображения по запросу:", 10, 10);
  
    let x = 40, y = 20;
    const itemWidth = 25;
    const itemHeight = 25;
    const rowCount = 5;
    const colSpacing = 25;
    const rowSpacing = 26;
    const maxItems = Math.min(items.length, 50);
  
    for (let i = 0; i < maxItems; i++) {
      let item = items[i];
      try {
        if (item.image) {
          doc.addImage(item.image, "JPEG", x, y, itemWidth, itemHeight);
        }
        x += colSpacing;
        if ((i + 1) % rowCount === 0) {
          x = 40;
          y += rowSpacing;
        }
      } catch (error) {
        console.error("Ошибка добавления изображения в PDF:", error);
      }
    }
  
    y = 10;
    for (let i = 0; i < maxItems; i += 4) {
      doc.addPage();
      y = 10;
      for (let j = 0; j < 4 && (i + j) < maxItems; j++) {
        let item = items[i + j];
        try {
          doc.setFont("Arial", "bold");
          doc.setFontSize(12);
          doc.text(`Объявление ${i + j + 1}: ${item.title}`, 10, y + 5);
          doc.setFont("Arial", "normal");
          doc.setFontSize(11);
          doc.text(`Цена: ${item.price}`, 10, y + 10);
          doc.text(`Компания: ${item.company}`, 10, y + 15);
          doc.text(`Рейтинг: ${item.rating}`, 10, y + 20);
          doc.text(`Отзывы: ${item.reviews}`, 10, y + 25);
          if (item.text) {
            let shortText = doc.splitTextToSize(`Краткое описание: ${item.text.slice(0, 100)}`, 180);
            let fullText = doc.splitTextToSize(`Полное описание: ${item.text.slice(0, 200)}`, 180);
            doc.text(shortText, 10, y + 35);
            doc.text(fullText, 10, y + 50);
          }
          y += 70;
        } catch (error) {
          console.error("Ошибка добавления текста в PDF:", error);
        }
      }
    }
  
    doc.save("result.pdf");
  }
});
