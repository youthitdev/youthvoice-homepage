// 스크롤 시 요소 등장 애니메이션
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));


// CSV 시트를 사용하는 목록(사업보고 등)에서 공유하는 유틸
// 따옴표로 감싼 필드(쉼표·줄바꿈 포함)를 처리하는 CSV 파서
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvToItems(text) {
  const rows = parseCSV(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((r) => {
    const item = {};
    headers.forEach((h, i) => (item[h] = (r[i] || "").trim()));
    return item;
  });
}

// ===== 사업보고 목록 (report.html) =====
// 구글 시트 공개 CSV → 실패 시 reports.json 폴백
// 시트 1행 헤더: year, category, title, url (category 예: 경영공시, 성과보고)
const REPORT_SHEET_CSV_URL = "";

function renderReports(items) {
  const list = document.getElementById("reportList");
  const filters = document.getElementById("reportFilters");
  const empty = document.getElementById("reportEmpty");

  const sorted = items
    .filter((item) => item.title && item.url)
    .map((item, i) => ({ item, i, key: parseInt((item.year || "").replace(/\D/g, ""), 10) || 0 }))
    .sort((a, b) => b.key - a.key || a.i - b.i)
    .map(({ item }) => item);

  if (sorted.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  function draw(category) {
    list.innerHTML = "";
    sorted
      .filter((item) => !category || item.category === category)
      .forEach((item) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = item.url;
        a.target = "_blank";
        a.rel = "noopener";

        const year = document.createElement("span");
        year.className = "year";
        year.textContent = item.year || "";

        const cat = document.createElement("span");
        cat.className = "cat";
        cat.textContent = item.category || "자료";

        const title = document.createElement("strong");
        title.textContent = item.title;

        const dl = document.createElement("span");
        dl.className = "dl";
        dl.textContent = "다운로드 ↓";

        a.append(year, cat, title, dl);
        li.appendChild(a);
        list.appendChild(li);
      });
  }

  // 카테고리가 2개 이상일 때만 필터 버튼 표시
  const categories = [...new Set(sorted.map((item) => item.category).filter(Boolean))];
  filters.innerHTML = "";
  if (categories.length > 1) {
    ["전체", ...categories].forEach((label, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      if (idx === 0) btn.classList.add("is-active");
      btn.addEventListener("click", () => {
        filters.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        draw(idx === 0 ? null : label);
      });
      filters.appendChild(btn);
    });
  }

  draw(null);
}

async function loadReports() {
  if (REPORT_SHEET_CSV_URL) {
    try {
      const res = await fetch(REPORT_SHEET_CSV_URL);
      if (!res.ok) throw new Error(`시트 응답 오류: ${res.status}`);
      const items = csvToItems(await res.text());
      if (items.length > 0) {
        renderReports(items);
        return;
      }
      throw new Error("시트에서 읽은 자료가 없음");
    } catch (err) {
      console.warn("구글 시트를 불러오지 못해 reports.json으로 대체합니다:", err);
    }
  }
  try {
    const res = await fetch("reports.json");
    renderReports(await res.json());
  } catch (err) {
    console.error("사업보고 목록을 불러오지 못했어요:", err);
    document.getElementById("reportEmpty").hidden = false;
  }
}

if (document.getElementById("reportList")) loadReports();

// ===== Youth Creator 기금 페이지 — 어느 청소년의 첫 문장 (타이핑 효과) =====
const ycQuoteEl = document.getElementById("ycQuote");
if (ycQuoteEl) {
  const ycQuotes = [
    "오늘 처음으로, 아무에게도 못 했던 내 이야기를 글로 썼다.",
    "쓰고 나서야 알았다. 내가 이걸 말하고 싶었다는 걸.",
    "완성하진 못했지만, 오늘 처음으로 시작했다.",
    '내 글을 읽어준 친구가 "나도 그랬어"라고 했다.',
    "나한테도 쓸 이야기가 있다는 걸 처음 믿었다.",
  ];
  let ycQuoteIndex = 0;
  let ycCharIndex = 0;
  let ycDeleting = false;
  function tickYcQuote() {
    const word = ycQuotes[ycQuoteIndex];
    if (!ycDeleting) {
      ycCharIndex++;
      ycQuoteEl.textContent = word.slice(0, ycCharIndex);
      if (ycCharIndex === word.length) {
        ycDeleting = true;
        setTimeout(tickYcQuote, 2400);
        return;
      }
    } else {
      ycCharIndex--;
      ycQuoteEl.textContent = word.slice(0, ycCharIndex);
      if (ycCharIndex === 0) {
        ycDeleting = false;
        ycQuoteIndex = (ycQuoteIndex + 1) % ycQuotes.length;
        setTimeout(tickYcQuote, 500);
        return;
      }
    }
    setTimeout(tickYcQuote, ycDeleting ? 30 : 70);
  }
  setTimeout(tickYcQuote, 600);
}

// 모바일 메뉴 토글
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");
menuBtn.addEventListener("click", () => nav.classList.toggle("is-open"));
nav.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => nav.classList.remove("is-open"))
);
