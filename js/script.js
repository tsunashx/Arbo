// 全域狀態宣告 (只宣告一次)
let treesData = [];
let knowledgeData = [];
let compareList = [];
let selectedFamily = 'All';
let selectedKeywords = []; // 儲存已選取的特徵關鍵字
let currentTree = null;
let uploadedNoteImg = '';
let notesList = [];
let quizData = [];

// 1. 初始化載入
window.addEventListener('DOMContentLoaded', async () => {
  // 1. 讀取樹木資料庫
  try {
    const treesRes = await fetch('data/trees.json').catch(() => fetch('trees.json'));
    treesData = await treesRes.json();
  } catch(e) {
    console.warn("未找到 trees.json 資料檔");
  }

  // 2. 讀取科普知識庫
  try {
    const knowRes = await fetch('data/knowledge.json').catch(() => fetch('knowledge.json'));
    knowledgeData = await knowRes.json();
  } catch(e) {
    console.warn("未找到 knowledge.json 資料檔");
  }

  // 3. 讀取專屬試題庫
  try {
    const quizRes = await fetch('data/quiz.json').catch(() => fetch('quiz.json'));
    quizData = await quizRes.json();
    console.log("quiz.json 載入成功，共有 ", quizData.length, " 題");
  } catch(e) {
    console.warn("未找到 quiz.json 試題庫檔");
  }

  // 4. 載入本機已儲存的樹木個人備註
  treesData.forEach(tree => {
    const localNote = localStorage.getItem(`tree_note_${tree.id}`);
    if (localNote !== null) {
      tree.userNotes = localNote;
    }
  });

  // 5. 載入本機已儲存的觀測手記
  const savedNotes = localStorage.getItem('field_notes_list');
  if (savedNotes) {
    try {
      notesList = JSON.parse(savedNotes);
    } catch(e) {
      notesList = [];
    }
  }

  // 6. 依序渲染畫面並更新 UI 狀態 (加上防呆檢查避免沒定義而中斷)
  renderCatalog();
  updateKeywordUI(); 
  if (typeof renderKnowledge === 'function') renderKnowledge();
  if (typeof populateTreeSelect === 'function') populateTreeSelect();
  if (typeof renderNotes === 'function') renderNotes();
});

function switchTab(tabId) {
  // 1. 切換頁籤內容顯示與隱藏
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.remove('hidden');

  // 2. 桌面版導覽按鈕樣式切換更新
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.className = "nav-btn flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all text-[#C5D0B3] hover:text-white hover:bg-white/10";
  });
  const activeNav = document.getElementById(`nav-${tabId}`);
  if (activeNav) {
    activeNav.className = "nav-btn flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all bg-white/20 text-white backdrop-blur-md shadow-md border border-white/30";
  }

// 3. 手機版底部導覽按鈕樣式切換更新
document.querySelectorAll('.mob-nav-btn').forEach(btn => {
  btn.className = "mob-nav-btn flex flex-col items-center justify-center py-1.5 text-[#E2E8D8] transition-all font-semibold relative select-none [-webkit-tap-highlight-color:transparent]";
});
const mobActiveNav = document.getElementById(`mob-nav-${tabId}`);
if (mobActiveNav) {
  mobActiveNav.className = "mob-nav-btn flex flex-col items-center justify-center py-1.5 text-white bg-[#556B2F] backdrop-blur-md rounded-full shadow-md transition-all font-bold relative select-none [-webkit-tap-highlight-color:transparent]";
}

  // 4. 特定頁籤的額外執行函數
  if (tabId === 'compare' && typeof renderCompare === 'function') renderCompare();
  if (tabId === 'quiz' && typeof startQuiz === 'function') startQuiz();
}

// 3. 科別切換處理函式
function filterFamily(family) {
  selectedFamily = family;
  renderCatalog();
}

// 4. 切換特徵 Pop-up Modal 彈窗顯示 / 隱藏
function toggleFeatureModal() {
  const modal = document.getElementById('feature-modal');
  if (!modal) return;
  
  modal.classList.toggle('hidden');
  
  if (!modal.classList.contains('hidden')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

// 2. 點擊關鍵字按鈕（特定組別支援單選互斥，其他組別支援多選）
function toggleKeywordFilter(keyword) {
  // 1. 定義互斥組別（二選一）
  const exclusiveGroups = [
    ['原生', '外來'], // 來源二選一
    ['常綠', '落葉']  // 葉性二選一
  ];

  const index = selectedKeywords.indexOf(keyword);

  if (index > -1) {
    // 如果點擊的是「已選取」的選項，則取消選取（允許取消不選）
    selectedKeywords.splice(index, 1);
  } else {
    // 如果點擊的是「未選取」的選項，檢查是否有同組互斥的項目，有的話先移除
    exclusiveGroups.forEach(group => {
      if (group.includes(keyword)) {
        group.forEach(item => {
          const itemIndex = selectedKeywords.indexOf(item);
          if (itemIndex > -1) {
            selectedKeywords.splice(itemIndex, 1);
          }
        });
      }
    });

    // 加入新選取的項目
    selectedKeywords.push(keyword);
  }

  // 更新 UI 樣式與重新渲染卡片
  updateKeywordUI();
  renderCatalog();
}

// 6. 清除所有特徵選取
function clearFeatureFilters() {
  selectedKeywords = [];
  updateKeywordUI();
  renderCatalog();
}

// 7. 更新按鈕選取樣式與 Badge 數量
function updateKeywordUI() {
  const buttons = document.querySelectorAll('.kw-btn, .color-btn');
  buttons.forEach(btn => {
    let kw = btn.dataset.kw;
    if (!kw) {
      const match = btn.getAttribute('onclick')?.match(/'([^']+)'/);
      kw = match ? match[1] : '';
    }

    const isSelected = kw && selectedKeywords.includes(kw);

    if (btn.classList.contains('color-btn')) {
      if (isSelected) {
        btn.classList.add('ring-2', 'ring-[#556B2F]', 'ring-offset-1', 'active');
      } else {
        btn.classList.remove('ring-2', 'ring-[#556B2F]', 'ring-offset-1', 'active');
      }
    } else {
      if (isSelected) {
        btn.className = "kw-btn cursor-pointer select-none px-2.5 py-1 rounded-full text-xs font-semibold bg-[#556B2F] text-white transition-all shadow-xs active";
      } else {
        btn.className = "kw-btn cursor-pointer select-none px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600 hover:bg-stone-200 transition-all";
      }
    }
  });

  const badge = document.getElementById('feature-count-badge');
  if (badge) {
    if (selectedKeywords.length > 0) {
      badge.textContent = selectedKeywords.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// 4. 渲染符合條件的卡片 HTML
function renderCatalog() {
  const searchInput = document.getElementById('search-input');
  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const grid = document.getElementById('tree-grid');
  if (!grid) return;

  // 1. 渲染科別選單
  const families = ['All', ...new Set(treesData.map(t => t.family).filter(Boolean))];
  const familyContainer = document.getElementById('family-filters');
  if (familyContainer) {
    familyContainer.innerHTML = families.map(f => `
      <button onclick="filterFamily('${f}')" class="px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${selectedFamily === f ? 'bg-[#556B2F] text-white shadow-xs' : 'bg-[#EBF0E3] text-[#556B2F] hover:bg-[#DCE4D0]'}">
        ${f === 'All' ? '全部' : f}
      </button>
    `).join('');
  }

  // 2. 進行三重過濾 (搜尋 + 科別 + 特徵)
  const filtered = treesData.filter(t => {
    const treeKeywords = Array.isArray(t.keywords) ? t.keywords : [];
    
    // 搜尋比對
    const matchSearch = !search || 
      t.name?.toLowerCase().includes(search) || 
      t.latinName?.toLowerCase().includes(search) ||
      treeKeywords.some(kw => typeof kw === 'string' && kw.toLowerCase().includes(search));

    // 科別比對
    const matchFamily = selectedFamily === 'All' || t.family === selectedFamily;

    // 特徵關鍵字嚴格比對
    const matchKeywords = selectedKeywords.every(kw => {
      if (kw === '常綠') return t.behavior && t.behavior.includes('常綠');
      if (kw === '落葉') return t.behavior && t.behavior.includes('落葉');
      if (kw === '原生') return t.species && t.species.includes('原生');
      if (kw === '外來') return t.species && t.species.includes('外來');

      const inKeywords = treeKeywords.some(tk => typeof tk === 'string' && (tk.includes(kw) || kw.includes(tk)));
      if (inKeywords) return true;

      const fullTextContent = [
        t.name,
        t.description,
        t.special,
        t.leaves,
        t.bark,
        t.flowers
      ].filter(Boolean).join(' ');

      return fullTextContent.includes(kw);
    });

    return matchSearch && matchFamily && matchKeywords;
  });

  // 3. 無符合條件的處理
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-stone-400">
        <i class="fa-solid fa-tree text-4xl mb-3 text-stone-300"></i>
        <p class="text-xs">沒有找到符合條件的樹木</p>
      </div>
    `;
    return;
  }

// 4. 渲染符合條件的卡片 HTML（名稱與拉丁學名置中、學名分行版）
  grid.innerHTML = filtered.map(tree => {
    const isCompared = compareList.some(c => c.id === tree.id);

    // 原生/外來 標籤（圓角 rounded-full）
    let speciesClass = 'bg-stone-100/80 backdrop-blur-md text-stone-700 border border-stone-200/80';
    if (tree.species) {
      if (tree.species.includes('原生')) {
        speciesClass = 'bg-sky-100/80 backdrop-blur-md text-sky-800 border border-sky-200/80';
      } else if (tree.species.includes('外來')) {
        speciesClass = 'bg-rose-100/80 backdrop-blur-md text-rose-800 border border-rose-200/80';
      }
    }

    // 常綠/落葉 標籤（圓角 rounded-full）
    let behaviorClass = 'bg-stone-100/80 backdrop-blur-md text-stone-700 border border-stone-200/80';
    if (tree.behavior) {
      if (tree.behavior.includes('常綠')) {
        behaviorClass = 'bg-emerald-100/80 backdrop-blur-md text-emerald-800 border border-emerald-200/80';
      } else if (tree.behavior.includes('落葉')) {
        behaviorClass = 'bg-[#EBF0E3]/80 backdrop-blur-md text-[#3E4A24] border border-stone-200/80';
      }
    }

    // 對比按鈕樣式：未選中為橄欖綠，選中後變為深灰色（Active 狀態）
    const compareBtnClass = isCompared 
      ? 'bg-stone-700 text-white hover:bg-stone-800 shadow-inner' 
      : 'bg-[#556B2F] text-white hover:bg-[#3E4A24]';

    return `
      <div class="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
        <div>
          <div class="h-44 w-full relative overflow-hidden bg-stone-100">
            <img src="${tree.mainImage}" class="w-full h-full object-cover">
            
            <!-- 左上角 Tag 區塊 (包含 科別、原生/外來、常綠/落葉) -->
            <div class="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[85%]">
              ${tree.family ? `<span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-stone-800/75 text-white backdrop-blur-xs">${tree.family}</span>` : ''}
              ${tree.species ? `<span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${speciesClass}">${tree.species}</span>` : ''}
              ${tree.behavior ? `<span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${behaviorClass}">${tree.behavior}</span>` : ''}
            </div>
          </div>
          <div class="p-3 space-y-1.5 text-center">
            <!-- 減少容器內距與上下空白，並收緊行距 -->
            <div class="leading-tight">
              <h3 class="font-extrabold text-lg sm:text-xl text-[#3E4A24]">${tree.name}</h3>
              ${tree.latinName ? `<p class="text-xs text-stone-400 font-serif italic mt-0.5">${tree.latinName}</p>` : ''}
            </div>
            <p class="text-xs text-stone-600 line-clamp-2 text-left">${tree.description || ''}</p>
          </div>
        </div>
        <div class="p-4 pt-0 flex gap-2">
          <button onclick="openTreeModal('${tree.id}')" class="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold py-2 rounded-lg transition-colors">考證詳細</button>
          <button onclick="toggleCompare('${tree.id}')" class="text-xs font-bold px-3 py-2 rounded-lg transition-all ${compareBtnClass}">
            ${isCompared ? '✓ 已加對比' : '加入對比'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// 對比功能邏輯
function toggleCompare(id) {
  const tree = treesData.find(t => t.id === id);
  const index = compareList.findIndex(c => c.id === id);
  if (index > -1) {
    compareList.splice(index, 1);
  } else {
    if (compareList.length >= 3) {
      alert("最多只能同時對比 3 種樹木！");
      return;
    }
    compareList.push(tree);
  }

// 更新 Badge 數字顯示
  const desktopBadge = document.getElementById('compare-badge-desktop');
  const mobileBadge = document.getElementById('compare-badge-mobile');
  
  if (compareList.length > 0) {
    if (desktopBadge) {
      desktopBadge.innerText = compareList.length;
      // 【修改處】將文字改為亮黃色 bg-[#DFF700] text-stone-950
      desktopBadge.className = "bg-[#DFF700] text-stone-950 backdrop-blur-md border border-white/30 text-[10px] px-1.5 py-0.2 rounded-full font-black ml-1 shadow-sm";
    }
    if (mobileBadge) {
      mobileBadge.innerText = compareList.length;
      // 【修改處】將背景改為亮黃色，文字為深色 bg-[#DFF700] text-stone-950
      mobileBadge.className = "absolute top-0.5 right-1.5 bg-[#DFF700] text-stone-950 backdrop-blur-md border border-white/30 text-[8px] px-1.5 py-0 rounded-full font-black shadow";
    }
  } else {
    if (desktopBadge) desktopBadge.classList.add('hidden');
    if (mobileBadge) mobileBadge.classList.add('hidden');
  }

  // 同時更新圖鑑卡片與對比表格頁面
  renderCatalog();
  renderCompare();
}

function clearCompare() {
  compareList = [];
  
  const desktopBadge = document.getElementById('compare-badge-desktop');
  const mobileBadge = document.getElementById('compare-badge-mobile');
  if (desktopBadge) desktopBadge.classList.add('hidden');
  if (mobileBadge) mobileBadge.classList.add('hidden');

  renderCompare();
  renderCatalog();
}

// 渲染特徵對比表格（左側標題強制不換行、最佳化手機版排版）
function renderCompare() {
  const container = document.getElementById('compare-table-container');
  if (!container) return;

  if (compareList.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl border border-dashed border-stone-300 py-16 text-center px-4">
        <i class="fa-solid fa-layer-group text-stone-300 text-4xl mb-3"></i>
        <p class="text-xs text-stone-400 mb-4">請在樹木圖鑑中點擊「加入對比」。</p>
        <button onclick="switchTab('catalog')" class="bg-[#556B2F] text-white text-xs font-bold px-4 py-2 rounded-lg">前往樹木圖鑑</button>
      </div>
    `;
    return;
  }

  let html = `
    <div class="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <!-- 稍微拉大表格最小寬度，確保內容舒適展開 -->
        <table class="w-full text-left border-collapse table-fixed">
          <thead>
            <tr class="bg-[#556B2F] text-white text-xs">
              <!-- 左側標題欄固定寬度並強制不換行 -->
              <th class="p-3 w-28 font-bold tracking-wide text-center whitespace-nowrap">對比項目</th>
              ${compareList.map(t => `
                <th class="p-3 w-[180px] border-l border-white/10">
                  <div class="flex justify-between items-center">
                    <div class="truncate pr-1">
                      <span class="font-extrabold text-xs block truncate">${t.name}</span>
                      <span class="text-[9px] text-[#DFF700]/70 italic font-serif block truncate">${t.latinName || ''}</span>
                    </div>
                    <button onclick="toggleCompare('${t.id}')" class="w-4 h-4 shrink-0 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                      <i class="fa-solid fa-xmark text-[9px]"></i>
                    </button>
                  </div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100 text-xs">
            <!-- 主生態照片 -->
            <tr>
              <td class="p-3 bg-stone-50/80 font-bold text-[#3E4A24] text-center whitespace-nowrap">主生態照片</td>
              ${compareList.map(t => `
                <td class="p-3 border-l border-stone-100">
                  <div class="w-full aspect-video rounded-lg overflow-hidden bg-stone-100 border border-stone-200/60 shadow-xs relative">
                    <img src="${t.mainImage}" class="absolute inset-0 w-full h-full object-cover">
                  </div>
                </td>
              `).join('')}
            </tr>

            <!-- 樹幹與樹皮 -->
            <tr>
              <td class="p-3 bg-stone-50/80 font-bold text-[#3E4A24] text-center whitespace-nowrap">樹幹與樹皮</td>
              ${compareList.map(t => {
                const spot = t.hotspots?.find(h => h.type === 'bark');
                const desc = spot?.description || spot?.desc || t.bark || t.description || '無特徵說明';
                return `
                  <td class="p-3 border-l border-stone-100 space-y-1">
                    <div class="w-full aspect-video rounded-lg overflow-hidden bg-stone-100 border border-stone-200/60 relative">
                      <img src="${spot?.img || t.mainImage}" class="absolute inset-0 w-full h-full object-cover">
                    </div>
                    ${spot?.name ? `<p class="font-bold text-[#3E4A24] text-[10px] truncate">${spot.name}</p>` : ''}
                    <p class="text-stone-600 text-[10px] leading-relaxed line-clamp-2">${desc}</p>
                  </td>
                `;
              }).join('')}
            </tr>

            <!-- 葉片與葉脈 -->
            <tr>
              <td class="p-3 bg-stone-50/80 font-bold text-[#3E4A24] text-center whitespace-nowrap">葉片與葉脈</td>
              ${compareList.map(t => {
                const spot = t.hotspots?.find(h => h.type === 'leaves');
                const desc = spot?.description || spot?.desc || t.leaves || t.description || '無特徵說明';
                return `
                  <td class="p-3 border-l border-stone-100 space-y-1">
                    <div class="w-full aspect-video rounded-lg overflow-hidden bg-stone-100 border border-stone-200/60 relative">
                      <img src="${spot?.img || t.mainImage}" class="absolute inset-0 w-full h-full object-cover">
                    </div>
                    ${spot?.name ? `<p class="font-bold text-[#3E4A24] text-[10px] truncate">${spot.name}</p>` : ''}
                    <p class="text-stone-600 text-[10px] leading-relaxed line-clamp-2">${desc}</p>
                  </td>
                `;
              }).join('')}
            </tr>

            <!-- 花朵與果實 -->
            <tr>
              <td class="p-3 bg-stone-50/80 font-bold text-[#3E4A24] text-center whitespace-nowrap">花朵與果實</td>
              ${compareList.map(t => {
                const spot = t.hotspots?.find(h => h.type === 'flowers');
                const desc = spot?.description || spot?.desc || t.flowers || t.description || '無特徵說明';
                return `
                  <td class="p-3 border-l border-stone-100 space-y-1">
                    <div class="w-full aspect-video rounded-lg overflow-hidden bg-stone-100 border border-stone-200/60 relative">
                      <img src="${spot?.img || t.mainImage}" class="absolute inset-0 w-full h-full object-cover">
                    </div>
                    ${spot?.name ? `<p class="font-bold text-[#3E4A24] text-[10px] truncate">${spot.name}</p>` : ''}
                    <p class="text-stone-600 text-[10px] leading-relaxed line-clamp-2">${desc}</p>
                  </td>
                `;
              }).join('')}
            </tr>

            <!-- 樹高與季節期 -->
            <tr>
              <!-- 加上 whitespace-nowrap 確保「樹高與季節期」永遠維持同一行 -->
              <td class="p-3 bg-stone-50/80 font-bold text-[#3E4A24] text-center whitespace-nowrap">樹高與季節期</td>
              ${compareList.map(t => `
                <td class="p-3 border-l border-stone-100 space-y-2 align-top">
                  <div class="flex items-center gap-1">
                    <span class="font-bold text-stone-700 text-xs whitespace-nowrap">樹高</span>
                    <span class="font-bold text-stone-700 text-xs ml-1">${t.height || '暫無數據'}</span>
                  </div>
                  <div>
                    ${renderSeasonGrid(t.bloomMonths, t.fruitMonths)}
                  </div>
                </td>
              `).join('')}
            </tr>

            <!-- 特別辨識標記 -->
            <tr class="bg-amber-50/20">
              <td class="p-3 bg-amber-50/50 font-bold text-[#3E4A24] text-center whitespace-nowrap">★ 特徵標記</td>
              ${compareList.map(t => `
                <td class="p-3 border-l border-stone-200/60 font-medium text-stone-700 text-[11px] leading-relaxed">
                  ${t.special || '無特殊標記'}
                </td>
              `).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
  container.innerHTML = html;
}

// 2. 極簡共用花果期表格渲染函數（防越界緊湊版）
function renderSeasonGrid(bloomMonths = [], fruitMonths = []) {
  const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  return `
    <div class="w-full text-[9px] select-none">
      <!-- 月份標題列：左側預留 22px 搭配 12 等分網格 -->
      <div class="grid grid-cols-[22px_1fr] items-center mb-1 gap-1">
        <div></div>
        <div class="grid grid-cols-12 text-center text-stone-400 font-medium">
          ${months.map(m => `<div class="text-center">${m}</div>`).join('')}
        </div>
      </div>

      <!-- 花期列 (柔和黃綠色高亮) -->
      <div class="grid grid-cols-[22px_1fr] items-center gap-1 mb-1.5">
        <span class="font-bold text-stone-700 text-[10px]">花期</span>
        <div class="grid grid-cols-12 border border-stone-200 rounded overflow-hidden bg-stone-50 h-3.5">
          ${months.map((_, idx) => {
            const isActive = Array.isArray(bloomMonths) && bloomMonths.includes(idx + 1);
            return `<div class="border-r last:border-r-0 border-stone-200/60 ${isActive ? 'bg-[#D4E157]' : ''}"></div>`;
          }).join('')}
        </div>
      </div>

      <!-- 果期列 (清爽亮綠色高亮) -->
      <div class="grid grid-cols-[22px_1fr] items-center gap-1">
        <span class="font-bold text-stone-700 text-[10px]">果期</span>
        <div class="grid grid-cols-12 border border-stone-200 rounded overflow-hidden bg-stone-50 h-3.5">
          ${months.map((_, idx) => {
            const isActive = Array.isArray(fruitMonths) && fruitMonths.includes(idx + 1);
            return `<div class="border-r last:border-r-0 border-stone-200/60 ${isActive ? 'bg-[#81C784]' : ''}"></div>`;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function openTreeModal(id) {
  // 取得樹木資料
  currentTree = treesData.find(t => t.id === id);
  if (!currentTree) return;
  
  // 1. 讀取 LocalStorage 備註
  const storedNote = localStorage.getItem(`tree_note_${currentTree.id}`);
  if (storedNote !== null) {
    currentTree.userNotes = storedNote;
  }

  // 2. 填入文字資訊 (補回 modal-special)
  const nameElem = document.getElementById('modal-tree-name');
  if (nameElem) nameElem.innerHTML = `<span>${currentTree.name}</span><span class="bg-[#556B2F] text-xs px-2 py-0.5 rounded-full font-bold ml-2">${currentTree.family || ''}</span>`;
  
  const latinElem = document.getElementById('modal-tree-latin');
  if (latinElem) latinElem.innerText = currentTree.latinName || '';

  const imgElem = document.getElementById('modal-main-img');
  if (imgElem) imgElem.src = currentTree.mainImage || '';

  const descElem = document.getElementById('modal-description');
  if (descElem) descElem.innerText = currentTree.description || '';

  // 🌟 補回：特別辨識標記
  const specialElem = document.getElementById('modal-special');
  if (specialElem) specialElem.innerText = currentTree.special || '無特殊標記';

  const heightElem = document.getElementById('modal-height');
  if (heightElem) heightElem.textContent = currentTree.height || '暫無數據';

  // 3. 渲染極簡共用花果期表格
  const seasonContainer = document.getElementById('modal-season-grid-container');
  if (seasonContainer) {
    seasonContainer.innerHTML = renderSeasonGrid(currentTree.bloomMonths, currentTree.fruitMonths);
  }

  // 4. 備註區塊設定
  const noteView = document.getElementById('note-view-mode');
  if (noteView) {
    noteView.innerHTML = currentTree.userNotes ? currentTree.userNotes : `<span class="text-stone-400 font-normal">（預設空白，點擊編輯備註...）</span>`;
  }
  
  const noteTextarea = document.getElementById('note-textarea');
  if (noteTextarea) noteTextarea.value = currentTree.userNotes || '';

  // 5. 熱點 (Hotspots) 初始化與按鈕渲染
  if (currentTree.hotspots && currentTree.hotspots.length > 0) {
    selectHotspot(currentTree.hotspots[0].id);
  } else {
    renderHotspotButtons(null);
    const detail = document.getElementById('modal-hotspot-detail');
    if (detail) detail.innerHTML = '<p class="text-xs text-stone-400">尚無部位細節資料</p>';
  }

  // 6. 顯示 Modal
  const modal = document.getElementById('tree-modal');
  if (modal) modal.classList.remove('hidden');
}

// 渲染熱點按鈕（按下 / 選中後移除邊框，呈現純色亮黃色塊與柔和光暈）
function renderHotspotButtons(activeSpotId) {
  const hotspotContainer = document.getElementById('modal-hotspots-container');
  if(!hotspotContainer) return;
  
  hotspotContainer.innerHTML = (currentTree?.hotspots || []).map(spot => {
    const isActive = spot.id === activeSpotId;
    
    // 選中時：純 #DFF700 填滿、無邊框 (border-transparent)、帶強烈光暈；未選中時：維持半透明毛玻璃與黃色邊框
    const colorStyle = isActive 
      ? 'bg-[#DFF700] border-transparent text-stone-950 shadow-lg shadow-[#DFF700]/50 scale-110' 
      : 'bg-stone-900/60 backdrop-blur-md border-2 border-[#DFF700]/80 text-[#DFF700] hover:bg-[#DFF700] hover:border-[#DFF700] hover:text-stone-950';

    return `
      <button onclick="selectHotspot('${spot.id}')" style="left:${spot.x}%; top:${spot.y}%;" class="absolute -translate-x-1/2 -translate-y-1/2 z-20 group focus:outline-none">
        ${!isActive ? `<span class="absolute inset-0 rounded-full bg-[#DFF700]/30 animate-ping pointer-events-none"></span>` : ''}
        
        <div class="relative flex items-center justify-center w-7 h-7 rounded-full ${colorStyle} text-[10px] font-black transition-all duration-300 group-hover:scale-110">
          ${spot.type === 'bark' ? '幹' : spot.type === 'leaves' ? '葉' : '花'}
        </div>
      </button>
    `;
  }).join('');
}

// 選擇熱點並顯示下方特寫卡片
function selectHotspot(spotId) {
  renderHotspotButtons(spotId);

  const spot = currentTree?.hotspots?.find(h => h.id === spotId);
  if(!spot) return;

  const detail = document.getElementById('modal-hotspot-detail');
  if(detail) {
    detail.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="bg-[#556B2F] text-white text-[11px] font-black px-2 py-0.5 rounded">
          ${spot.type === 'bark' ? '樹皮部位特寫' : spot.type === 'leaves' ? '葉脈結構特寫' : '花卉果實特寫'}
        </span>
        <h5 class="font-extrabold text-xs text-[#3E4A24]">${spot.name}</h5>
      </div>
      <div class="h-32 w-full bg-stone-100 rounded-lg overflow-hidden border border-stone-200 mb-2">
        <img src="${spot.img}" class="w-full h-full object-cover">
      </div>
      <p class="text-xs text-stone-600 leading-relaxed font-normal bg-stone-50 p-2.5 rounded-lg border border-stone-100">${spot.desc}</p>
    `;
  }
}
function closeTreeModal() {
  document.getElementById('tree-modal').classList.add('hidden');
}

function toggleEditNote() {
  document.getElementById('note-view-mode').classList.toggle('hidden');
  document.getElementById('note-edit-mode').classList.toggle('hidden');
}

function saveUserNote() {
  const val = document.getElementById('note-textarea').value;
  currentTree.userNotes = val;
  
  localStorage.setItem(`tree_note_${currentTree.id}`, val);

  document.getElementById('note-view-mode').innerHTML = val ? val : `<span class="text-stone-400 font-normal">（預設空白，點擊編輯備註...）</span>`;
  toggleEditNote();
  alert(`已成功儲存「${currentTree.name}」的自訂備註於您的裝置中！`);
}

// 知識頁面渲染
function renderKnowledge() {
  const grid = document.getElementById('knowledge-grid');
  if(!grid) return;
  grid.innerHTML = knowledgeData.map(art => `
    <div onclick="openArticleModal('${art.id}')" class="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between group space-y-3">
      <div class="space-y-2">
        <span class="text-[10px] font-black px-2.5 py-0.5 rounded border inline-block ${art.colorStyle}">
          ${art.category}
        </span>
        <h3 class="font-extrabold text-base text-[#3E4A24] group-hover:text-[#556B2F] transition-colors">${art.title}</h3>
        <p class="text-xs text-stone-600 leading-relaxed font-normal line-clamp-2">${art.summary}</p>
      </div>
      <div class="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#556B2F]">
        <span>閱讀完整文章</span>
        <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
      </div>
    </div>
  `).join('');
}

function openArticleModal(id) {
  const art = knowledgeData.find(a => a.id === id);
  if(!art) return;
  document.getElementById('article-modal-category').innerText = art.category;
  document.getElementById('article-modal-category').className = `text-xs font-bold px-2.5 py-0.5 rounded-full ${art.colorStyle}`;
  document.getElementById('article-modal-title').innerText = art.title;
  document.getElementById('article-modal-img').src = art.image;
  document.getElementById('article-modal-content').innerText = art.content;
  document.getElementById('article-modal').classList.remove('hidden');
}

function closeArticleModal() {
  document.getElementById('article-modal').classList.add('hidden');
}

// 野外手記控制
function toggleAddNoteForm() {
  const form = document.getElementById('add-note-form');
  const icon = document.getElementById('add-note-icon');
  if(form) form.classList.toggle('hidden');
  if(icon) icon.classList.toggle('rotate-45');
}

function populateTreeSelect() {
  const select = document.getElementById('note-tree-select');
  if(!select) return;
  select.innerHTML = '<option value="">-- 請選擇圖鑑樹木 --</option>' + 
    treesData.map(t => `<option value="${t.name}">${t.name} (${t.latinName})</option>`).join('');
}

function previewNoteImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    uploadedNoteImg = e.target.result;
    document.getElementById('note-preview-img').src = uploadedNoteImg;
    document.getElementById('note-image-preview').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function saveNote(e) {
  e.preventDefault();
  const treeName = document.getElementById('note-tree-select').value;
  const date = document.getElementById('note-date').value;
  const weather = document.getElementById('note-weather').value;
  const location = document.getElementById('note-location').value;
  const content = document.getElementById('note-content').value;

  const newNote = {
    id: Date.now(),
    treeName, date, weather, location, content, image: uploadedNoteImg
  };

  notesList.unshift(newNote);

  try {
    localStorage.setItem('field_notes_list', JSON.stringify(notesList));
  } catch(e) {
    console.warn("照片檔案可能過大超出 localStorage 限制，建議壓縮照片。");
  }

  renderNotes();
  toggleAddNoteForm();
  
  document.getElementById('note-content').value = '';
  document.getElementById('note-location').value = '';
  document.getElementById('note-image-input').value = '';
  document.getElementById('note-image-preview').classList.add('hidden');
  uploadedNoteImg = '';

  alert("觀測手記已成功儲存於您的本機裝置！");
}

function deleteNote(id) {
  if(!confirm("確定要刪除這筆觀察手記嗎？")) return;
  notesList = notesList.filter(n => n.id !== id);
  localStorage.setItem('field_notes_list', JSON.stringify(notesList));
  renderNotes();
}

function renderNotes() {
  const container = document.getElementById('notes-list');
  if(!container) return;
  if(notesList.length === 0) {
    container.innerHTML = `<div class="col-span-full py-12 text-center text-stone-400 text-xs">尚無手記。點擊上方加號按鈕新增！</div>`;
    return;
  }
  container.innerHTML = notesList.map(n => `
    <div class="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-sm space-y-3 relative group">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <span class="font-bold text-base text-[#3E4A24]">${n.treeName}</span>
          <span class="text-[10px] text-stone-400 font-bold">${n.date || '未註明日期'} @ ${n.location || '未標註地點'}</span>
        </div>
        <button onclick="deleteNote(${n.id})" class="text-stone-300 hover:text-red-500 text-xs p-1">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
      ${n.image ? `<div class="h-44 w-full rounded-xl overflow-hidden bg-stone-100 border"><img src="${n.image}" class="w-full h-full object-cover"></div>` : ''}
      <p class="text-xs text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100 font-medium">${n.content}</p>
    </div>
  `).join('');
}

let quizCurrent = null;
let score = 0, total = 0;

// 辨識挑戰題目生成（多樣化題庫）
function startQuiz() {
  // 確保資料已載入
  if (!treesData || treesData.length < 4) return;

  // 1. 先宣告基礎的 3 種題型陣列
  const questionGenerators = [
    // 題型 1：看學名猜樹名 (trees.json)
    () => {
      const correct = getRandomTree();
      const choices = getTreeChoices(correct);
      return {
        title: `哪一種樹木的拉丁學名為：「<i class="italic font-serif">${correct.latinName}</i>」？`,
        choices: choices.map(c => ({ id: c.id, text: `${c.name} (${c.family})` })),
        correctId: correct.id,
        correctName: correct.name
      };
    },

    // 題型 2：看 hotspots 的名稱 (name) 猜樹名
    () => {
      const correct = getRandomTree();
      const choices = getTreeChoices(correct);
      
      // 從 hotspots 隨機抽取一個熱點（若無則 fallback 取名稱）
      const hotspot = (correct.hotspots && correct.hotspots.length > 0)
        ? correct.hotspots[Math.floor(Math.random() * correct.hotspots.length)]
        : { name: correct.name };

      return {
        title: `以下哪種樹木具有「<span class="text-amber-700 font-bold">${hotspot.name}</span>」的顯著特徵？`,
        choices: choices.map(c => ({ id: c.id, text: c.name })),
        correctId: correct.id,
        correctName: correct.name
      };
    },

    // 題型 3：看 hotspots 的描述 (desc) 猜樹名
    () => {
      const correct = getRandomTree();
      const choices = getTreeChoices(correct);

      // 從 hotspots 隨機抽取一個熱點
      const hotspot = (correct.hotspots && correct.hotspots.length > 0)
        ? correct.hotspots[Math.floor(Math.random() * correct.hotspots.length)]
        : { desc: correct.description };

      return {
        title: `根據描述：「<span class="text-stone-700 font-normal">${hotspot.desc}</span>」，這是哪種樹木的特徵？`,
        choices: choices.map(c => ({ id: c.id, text: c.name })),
        correctId: correct.id,
        correctName: correct.name
      };
    }
  ];

  // 2. 陣列宣告完後，再用 if 判斷是否把「題型 4」加入陣列中
  if (typeof quizData !== 'undefined' && quizData && quizData.length > 0) {
    questionGenerators.push(() => {
      // 隨機抽出一題
      const q = quizData[Math.floor(Math.random() * quizData.length)];
      
      // 將選項隨機打亂（這樣每次考選項順序不同）
      const shuffledChoices = [...q.choices].sort(() => 0.5 - Math.random());

      return {
        title: `<span class="bg-[#556B2F] text-white text-[10px] font-bold px-2 py-0.5 rounded mr-1.5">精選考題</span>${q.title}`,
        choices: shuffledChoices,
        correctId: q.correctId,
        correctName: q.correctName
      };
    });
  }

  // 3. 隨機抽選一種題型並執行
  const randomGen = questionGenerators[Math.floor(Math.random() * questionGenerators.length)];
  quizCurrent = randomGen();

  // 4. 渲染題目至畫面
  const card = document.getElementById('quiz-card');
  card.innerHTML = `
    <h4 class="text-sm font-black text-stone-800 leading-relaxed">${quizCurrent.title}</h4>
    <div class="space-y-2 mt-4">
      ${quizCurrent.choices.map(c => `
        <button onclick="checkQuiz('${c.id}')" class="w-full p-3.5 rounded-xl border border-stone-200 text-left text-xs font-bold hover:bg-stone-50 hover:border-[#556B2F] transition-all flex justify-between items-center group">
          <span>${c.text}</span>
          <i class="fa-solid fa-chevron-right text-stone-300 group-hover:text-[#556B2F] text-[10px]"></i>
        </button>
      `).join('')}
    </div>
  `;
}

// 輔助函式：隨機抓一種樹
function getRandomTree() {
  return treesData[Math.floor(Math.random() * treesData.length)];
}

// 輔助函式：抓取 1 正確 + 3 干擾樹木選項
function getTreeChoices(correctTree) {
  const distractors = treesData.filter(t => t.id !== correctTree.id).sort(() => 0.5 - Math.random()).slice(0, 3);
  return [correctTree, ...distractors].sort(() => 0.5 - Math.random());
}

// 檢查答案
function checkQuiz(selectedId) {
  total++;
  if (selectedId === quizCurrent.correctId) {
    score++;
    alert("✔ 恭喜答對！");
  } else {
    alert(`✘ 答錯了！正確答案是：${quizCurrent.correctName}`);
  }
  
  // 更新計分板
  const scoreEl = document.getElementById('quiz-score');
  const totalEl = document.getElementById('quiz-total');
  if (scoreEl) scoreEl.innerText = score;
  if (totalEl) totalEl.innerText = `${total} 題`;

  // 載入下一題
  startQuiz();
}

// 匯出 / 匯入 JSON
function exportJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(treesData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `trees_database_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importJson(event) {
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if(Array.isArray(parsed)) {
        treesData = parsed;
        renderCatalog();
        populateTreeSelect();
        alert("成功匯入全新 JSON 樹木資料庫！");
      }
    } catch(err) {
      alert("JSON 檔案解析失敗，請確認格式。");
    }
  };
  reader.readAsText(file);
}
