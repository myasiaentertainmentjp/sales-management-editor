const STORAGE_KEY = "sales-editor-card-v6";

const initialState = {
  label: "2026/03",
  displayLabel: "2026年03月",
  hideFree: true,
  items: [
    { id: crypto.randomUUID(), color: "#f71376", name: "プラン加入", count: 23, amount: 110840 },
    { id: crypto.randomUUID(), color: "#ed53b2", name: "プラン加入__バンドル", count: 4, amount: 57715 },
    { id: crypto.randomUUID(), color: "#5f5a80", name: "単品販売", count: 3, amount: 17340 },
    { id: crypto.randomUUID(), color: "#ffd219", name: "チップ", count: 0, amount: 0 },
    { id: crypto.randomUUID(), color: "#ff8f22", name: "スーパーコメント", count: 0, amount: 0 },
    { id: crypto.randomUUID(), color: "#dedede", name: "バックナンバー(単月)", count: 0, amount: 0 },
  ],
};

const state = loadState();

const periodLabel = document.querySelector("#periodLabel");
const totalAmount = document.querySelector("#totalAmount");
const donutChart = document.querySelector("#donutChart");
const legendList = document.querySelector("#legendList");
const editorGrid = document.querySelector("#editorGrid");
const hideFree = document.querySelector("#hideFree");
const saveButton = document.querySelector("#saveButton");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(initialState);

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.items)) return structuredClone(initialState);
    return parsed;
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function yen(value) {
  return `¥${Number(value).toLocaleString("ja-JP")}`;
}

function numberValue(value) {
  const normalized = String(value ?? "").replace(/[^\d]/g, "");
  return Number.parseInt(normalized || "0", 10);
}

function visibleItems() {
  return state.items;
}

function render() {
  hideFree.checked = state.hideFree;
  renderTabs();
  renderPreview();
  renderEditor();
  saveState();
}

function renderTabs() {
  document.querySelectorAll(".period-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.label === state.label);
  });
}

function renderPreview() {
  periodLabel.textContent = state.displayLabel || state.label;

  const items = visibleItems();
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  totalAmount.textContent = yen(total);

  renderDonut(items, total);
  renderLegend(items);
}

function renderDonut(items, total) {
  const paidItems = items.filter((item) => item.amount > 0);
  if (!paidItems.length || total <= 0) {
    donutChart.style.background = "conic-gradient(#d7d7d7 0deg 360deg)";
    return;
  }

  let start = 0;
  const segments = paidItems.map((item) => {
    const end = start + (item.amount / total) * 360;
    const segment = `${item.color} ${start.toFixed(3)}deg ${end.toFixed(3)}deg`;
    start = end;
    return segment;
  });
  donutChart.style.background = `conic-gradient(${segments.join(", ")})`;
}

function renderLegend(items) {
  legendList.innerHTML = items
    .map(
      (item) => `
        <div class="legend-row">
          <span class="dot" style="background:${item.color}"></span>
          <span class="legend-name">${escapeHtml(item.name)}</span>
          <span class="legend-count">${item.count}件</span>
          <span class="legend-amount">${yen(item.amount)}</span>
        </div>
      `,
    )
    .join("");
}

function renderEditor() {
  editorGrid.innerHTML = state.items
    .map(
      (item, index) => `
        <article class="category-card" data-id="${item.id}">
          <h2>カテゴリ ${index + 1}</h2>
          <label class="editor-row color-row">
            <span>色</span>
            <input class="color-input" type="color" data-field="color" value="${item.color}" aria-label="カテゴリ ${index + 1} の色" />
          </label>
          <label class="editor-row">
            <span>項目名</span>
            <input type="text" data-field="name" value="${escapeAttribute(item.name)}" />
          </label>
          <label class="editor-row">
            <span>件数</span>
            <input type="text" inputmode="numeric" pattern="[0-9]*" data-field="count" value="${item.count}" />
          </label>
          <label class="editor-row">
            <span>金額 (円)</span>
            <input type="text" inputmode="numeric" pattern="[0-9]*" data-field="amount" value="${item.amount}" />
          </label>
        </article>
      `,
    )
    .join("");
}

function updateFromInput(input, rerenderEditor = true) {
  const card = input.closest(".category-card");
  const item = state.items.find((entry) => entry.id === card?.dataset.id);
  if (!item) return;

  const field = input.dataset.field;
  if (field === "count" || field === "amount") {
    item[field] = numberValue(input.value);
  } else {
    item[field] = input.value;
  }

  renderPreview();
  if (rerenderEditor) renderEditor();
  saveState();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

async function savePreviewImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 870;
  canvas.height = 982;
  const context = canvas.getContext("2d");
  drawSavedPreview(context);

  const link = document.createElement("a");
  link.download = `sales-management-${state.label.replaceAll("/", "-")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function drawSavedPreview(ctx) {
  ctx.clearRect(0, 0, 870, 982);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 870, 982);

  ctx.save();
  ctx.translate(0, -464);
  drawLine(ctx, 0, 464, 870, 464, "#d8d8d8", 1);
  drawLine(ctx, 0, 554, 870, 554, "#eeeeee", 1);
  drawTabs(ctx);
  drawToggle(ctx);
  drawSalesContent(ctx);
  ctx.restore();
}

function drawPreview(ctx) {
  ctx.clearRect(0, 0, 870, 1882);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 870, 1882);

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 464, 870, 982);
  drawLine(ctx, 0, 464, 870, 464, "#d8d8d8", 1);
  drawLine(ctx, 0, 554, 870, 554, "#eeeeee", 1);

  drawTabs(ctx);
  drawToggle(ctx);
  drawSalesContent(ctx);
}

function drawTabs(ctx) {
  const tabs = [
    { label: "今日", x: 105, width: 105, display: "今日" },
    { label: "昨日", x: 210, width: 105, display: "昨日" },
    { label: "一昨日", x: 315, width: 128, display: "一昨日" },
    { label: "2026/03", x: 443, width: 190, display: "2026/03" },
    { label: "2026/02", x: 633, width: 145, display: "2026/02" },
  ];

  drawChevron(ctx, 48, 519, 14, "#d2d2d2", "left");
  drawChevron(ctx, 833, 519, 14, "#303238", "right");

  tabs.forEach((tab) => {
    const isActive = tab.label === state.label;
    ctx.fillStyle = isActive ? "#ff351f" : "#050609";
    ctx.font = `${isActive ? 800 : 700} ${isActive ? 36 : 24}px -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tab.display, tab.x + tab.width / 2, 519);

    if (isActive) {
      roundRect(ctx, tab.x + tab.width / 2 - 15, 547, 30, 7, 4, "#ff351f");
    }
  });
}

function drawToggle(ctx) {
  ctx.fillStyle = "#202125";
  ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif';
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText("無料プランを非表示中", 722, 602);
  roundRect(ctx, 762, 586, 69, 33, 17, "#f7d2ad");
  circle(ctx, 826, 602, 23, "#ff351f");
}

function drawSalesContent(ctx) {
  const items = visibleItems();
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  ctx.fillStyle = "#42444b";
  ctx.font = '400 30px -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(state.displayLabel || state.label, 39, 697);

  drawDonutOnCanvas(ctx, items, total, 435, 931, 206, 34);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#919398";
  ctx.font = '400 32px -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif';
  ctx.fillText("合計", 435, 898);
  ctx.fillStyle = "#23252b";
  ctx.font = '800 48px -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif';
  ctx.fillText(yen(total), 435, 963);

  const startY = 1152;
  items.forEach((item, index) => {
    const y = startY + index * 48;
    circle(ctx, 55, y + 15, 15, item.color);
    ctx.fillStyle = "#292b31";
    ctx.font = '400 27px -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", sans-serif';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(item.name, 99, y + 15);
    ctx.textAlign = "right";
    ctx.fillText(`${item.count}件`, 608, y + 15);
    ctx.fillText(yen(item.amount), 840, y + 15);
  });
}

function drawDonutOnCanvas(ctx, items, total, cx, cy, radius, thickness) {
  const paidItems = items.filter((item) => item.amount > 0);
  if (!paidItems.length || total <= 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#d7d7d7";
    ctx.lineWidth = thickness;
    ctx.stroke();
    return;
  }

  let start = -Math.PI / 2;
  paidItems.forEach((item) => {
    const angle = (item.amount / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.strokeStyle = item.color;
    ctx.lineWidth = thickness;
    ctx.lineCap = "butt";
    ctx.stroke();
    start += angle;
  });
}

function drawChevron(ctx, x, y, size, color, direction) {
  ctx.save();
  ctx.translate(x, y);
  if (direction === "right") ctx.rotate(Math.PI);
  ctx.beginPath();
  ctx.moveTo(size / 2, -size);
  ctx.lineTo(-size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}

function drawLine(ctx, x1, y1, x2, y2, color, width) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function roundRect(ctx, x, y, width, height, radius, color) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

function circle(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

document.querySelectorAll(".period-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".period-tab.active")?.classList.remove("active");
    button.classList.add("active");
    state.label = button.dataset.label;
    state.displayLabel = button.dataset.display;
    render();
  });
});

hideFree.addEventListener("change", () => {
  state.hideFree = hideFree.checked;
  render();
});

editorGrid.addEventListener("change", (event) => {
  if (event.target.matches("input")) updateFromInput(event.target);
});

editorGrid.addEventListener("input", (event) => {
  if (event.target.matches("input")) updateFromInput(event.target, false);
});

editorGrid.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.matches("input")) {
    event.target.blur();
  }
});

document.querySelector("#addCategory").addEventListener("click", () => {
  state.items.push({
    id: crypto.randomUUID(),
    color: "#cbd3db",
    name: "新しい項目",
    count: 0,
    amount: 0,
  });
  render();
});

saveButton.addEventListener("click", async () => {
  saveButton.textContent = "保存中...";
  try {
    await savePreviewImage();
    saveButton.textContent = "スクリーンショットを保存";
  } catch {
    saveButton.textContent = "保存できませんでした";
    window.setTimeout(() => {
      saveButton.textContent = "スクリーンショットを保存";
    }, 1400);
  }
});

render();
