// content.js

async function autoScroll() {
  return new Promise((resolve) => {
    const scrollElement = document.scrollingElement || document.body;
    let lastScrollTop = scrollElement.scrollTop;
    const distance = 400; // пикселей за шаг
    const delay = 100;    // задержка в мс
    let iterations = 0;
    const maxIterations = 50; // ограничение количества итераций

    const timer = setInterval(() => {
      scrollElement.scrollBy(0, distance);
      iterations++;
      console.log("Прокрутка... текущий scrollTop:", scrollElement.scrollTop);

      // Если достигнут конец страницы или превышен лимит итераций
      if (scrollElement.scrollTop + window.innerHeight >= scrollElement.scrollHeight || iterations >= maxIterations) {
        console.log("Достигнут конец страницы или лимит итераций");
        clearInterval(timer);
        resolve();
      } else if (scrollElement.scrollTop === lastScrollTop) {
        console.log("ScrollTop не изменился");
        clearInterval(timer);
        resolve();
      } else {
        lastScrollTop = scrollElement.scrollTop;
      }
    }, delay);
  });
}

async function extractData() {
  let items = [];
  const elements = document.querySelectorAll(".iva-item-content-OWwoq");

  for (const div of elements) {
    if (div.closest(".items-itemsCarouselWidget-wrEhr")) continue;
    let data = {};

    const img = div.querySelector("img");
    data.image = img ? img.src : "";
    const titleBlock = div.querySelector("div.iva-item-body-GQomw a");
    data.title = titleBlock ? titleBlock.innerText.trim() : "Без заголовка";
    const priceTag = div.querySelector("span");
    data.price = priceTag ? priceTag.innerText.trim() : "Цена не указана";
    const companyTag = div.querySelector("div.style-root-Dh2i5 p");
    data.company = companyTag ? companyTag.innerText.trim() : "Частное лицо";
    const companyInfoTag = div.querySelector("div.style-root-Dh2i5");
    if (companyInfoTag) {
      let text = companyInfoTag.innerText.replace(data.company, "").trim();
      data.rating = text.slice(0, 3) || "Нет рейтинга";
      data.reviews = text.slice(3).replace("\n\n", "") || "Нет отзывов";
    } else {
      data.rating = "Нет рейтинга";
      data.reviews = "Нет отзывов";
    }
    const textDivList = div.querySelectorAll("div.iva-item-bottomBlock-FhNhY p");
    data.text = textDivList.length > 0 ? textDivList[0].innerText.trim() : "Описание отсутствует";

    items.push(data);
  }

  console.log("Собранные данные:", items);
  chrome.runtime.sendMessage({ action: "sendData", items: items });
}

async function scrollAndExtract() {
  await autoScroll();
  await extractData();
  console.log("Возвращаем страницу наверх");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startScroll") {
    console.log("Получено сообщение 'startScroll'. Запускаем прокрутку и сбор данных...");
    scrollAndExtract();
  }
});
