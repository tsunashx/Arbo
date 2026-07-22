    let treesData = [];
    let knowledgeData = [];
    let compareList = [];
    let selectedFamily = 'All';
    let currentTree = null;
    let uploadedNoteImg = '';
    let notesList = [];

    // 初始化載入
    window.addEventListener('DOMContentLoaded', async () => {
      // 1. 讀取 JSON 資料庫（可適應 root 或 data/ 目錄）
      try {
        const treesRes = await fetch('data/trees.json').catch(() => fetch('trees.json'));
        treesData = await treesRes.json();
      } catch(e) {
        console.warn("未找到 trees.json 資料檔");
      }

      try {
        const knowRes = await fetch('data/knowledge.json').catch(() => fetch('knowledge.json'));
        knowledgeData = await knowRes.json();
      } catch(e) {
        console.warn("未找到 knowledge.json 資料檔");
      }

      // 2. 載入本機已儲存的樹木個人備註
      treesData.forEach(tree => {
        const localNote = localStorage.getItem(`tree_note_${tree.id}`);
        if (localNote !== null) {
          tree.userNotes = localNote;
        }
      });

      // 3. 載入本機已儲存的觀測手記
      const savedNotes = localStorage.getItem('field_notes_list');
      if (savedNotes) {
        try {
          notesList = JSON.parse(savedNotes);
        } catch(e) {
          notesList = [];
        }
      }

      renderCatalog();
      renderKnowledge();
      populateTreeSelect();
      renderNotes();
    });

    // 頁籤切換邏輯
    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
      document.getElementById(`tab-${tabId}`).classList.remove('hidden');

      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-[#556B2F]', 'text-white');
        btn.classList.add('text-[#C5D0B3]');
      });
      const activeNav = document.getElementById(`nav-${tabId}`);
      if(activeNav) {
        activeNav.classList.add('bg-[#556B2F]', 'text-white');
        activeNav.classList.remove('text-[#C5D0B3]');
      }

      document.querySelectorAll('.mob-nav-btn').forEach(btn => {
        btn.classList.remove('bg-[#556B2F]', 'text-[#EBF0E3]');
        btn.classList.add('text-[#8F9E75]');
      });
      const mobActiveNav = document.getElementById(`mob-nav-${tabId}`);
      if(mobActiveNav) {
        mobActiveNav.classList.add('bg-[#556B2F]', 'text-[#EBF0E3]');
        mobActiveNav.classList.remove('text-[#8F9E75]');
      }

      if(tabId === 'compare') renderCompare();
      if(tabId === 'quiz') startQuiz();
    }

    // 渲染圖鑑頁面
    function renderCatalog() {
      const search = document.getElementById('search-input').value.toLowerCase();
      const grid = document.getElementById('tree-grid');
      grid.innerHTML = '';

      const families = ['All', ...new Set(treesData.map(t => t.family))];
      const familyContainer = document.getElementById('family-filters');
      familyContainer.innerHTML = families.map(f => `
        <button onclick="filterFamily('${f}')" class="px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${selectedFamily === f ? 'bg-[#556B2F] text-white' : 'bg-[#EBF0E3] text-[#556B2F] hover:bg-[#DCE4D0]'}">
          ${f === 'All' ? '全部' : f}
        </button>
      `).join('');

      const filtered = treesData.filter(t => {
        const matchSearch = t.name.toLowerCase().includes(search) || t.family.toLowerCase().includes(search) || t.description.toLowerCase().includes(search);
        const matchFamily = selectedFamily === 'All' || t.family === selectedFamily;
        return matchSearch && matchFamily;
      });

      filtered.forEach(tree => {
        const isCompared = compareList.some(c => c.id === tree.id);
        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl border border-stone-200/80 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between group";
        card.innerHTML = `
          <div>
            <div class="h-48 w-full bg-stone-200 relative overflow-hidden cursor-pointer" onclick="openTreeModal('${tree.id}')">
              <img src="${tree.mainImage}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=500&q=80'">
              <span class="absolute top-3 left-3 bg-[#EBF0E3] text-[#3E4A24] px-2.5 py-0.5 rounded-full text-xs font-black shadow-sm">${tree.family}</span>
            </div>
            <div class="p-4 space-y-2">
              <h3 class="text-xl font-extrabold text-[#3E4A24] cursor-pointer" onclick="openTreeModal('${tree.id}')">${tree.name}</h3>
              <p class="text-xs text-stone-600 leading-relaxed line-clamp-2">${tree.description}</p>
            </div>
          </div>
          <div class="bg-stone-50 border-t border-stone-100 p-3.5 flex items-center justify-between">
            <button onclick="openTreeModal('${tree.id}')" class="bg-[#556B2F] hover:bg-[#3E4A24] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 shadow-sm">
              <i class="fa-solid fa-circle-info text-xs"></i><span>詳細資訊</span>
            </button>
            <button onclick="toggleCompare('${tree.id}')" class="text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${isCompared ? 'bg-[#D4AF37] border-[#B58900] text-stone-900 font-extrabold' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'}">
              ${isCompared ? '已選對比' : '加入對比'}
            </button>
          </div>
        `;
        grid.appendChild(card);
      });
    }

    function filterFamily(fam) {
      selectedFamily = fam;
      renderCatalog();
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

      const desktopBadge = document.getElementById('compare-badge-desktop');
      const mobileBadge = document.getElementById('compare-badge-mobile');
      
      if (compareList.length > 0) {
        desktopBadge.innerText = compareList.length;
        desktopBadge.classList.remove('hidden');
        mobileBadge.innerText = compareList.length;
        mobileBadge.classList.remove('hidden');
      } else {
        desktopBadge.classList.add('hidden');
        mobileBadge.classList.add('hidden');
      }

      renderCatalog();
    }

    function clearCompare() {
      compareList = [];
      
      // 隱藏頂部標籤數量提示
      const desktopBadge = document.getElementById('compare-badge-desktop');
      const mobileBadge = document.getElementById('compare-badge-mobile');
      if (desktopBadge) desktopBadge.classList.add('hidden');
      if (mobileBadge) mobileBadge.classList.add('hidden');

      // 關鍵：同時更新對比頁面與圖鑑頁面的 UI 狀態
      renderCompare();
      renderCatalog();
    }

    // 渲染特徵對比表格
    function renderCompare() {
      const container = document.getElementById('compare-table-container');
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
            <table class="w-full text-left border-collapse table-fixed min-w-[800px]">
              <thead>
                <tr class="bg-[#556B2F] text-white text-xs">
                  <th class="p-4 w-44 font-bold">對比特徵項目</th>
                  ${compareList.map(t => `
                    <th class="p-4 border-l border-white/10">
                      <div class="flex justify-between items-center">
                        <div>
                          <span class="font-bold text-sm block">${t.name}</span>
                          <span class="text-[10px] text-emerald-200 italic font-serif">${t.latinName}</span>
                        </div>
                        <button onclick="toggleCompare('${t.id}'); renderCompare();" class="text-white/60 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
                      </div>
                    </th>
                  `).join('')}
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-100 text-xs">
                <tr>
                  <td class="p-4 bg-stone-50 font-bold text-[#3E4A24]">主生態照片</td>
                  ${compareList.map(t => `<td class="p-4 border-l border-stone-100"><div class="h-32 rounded-lg overflow-hidden bg-stone-100"><img src="${t.mainImage}" class="w-full h-full object-cover"></div></td>`).join('')}
                </tr>
                <tr>
                  <td class="p-4 bg-stone-50 font-bold text-[#3E4A24]">樹幹與樹皮</td>
                  ${compareList.map(t => {
                    const spot = t.hotspots?.find(h => h.type === 'bark');
                    return `<td class="p-4 border-l border-stone-100 space-y-2"><div class="h-24 rounded-lg overflow-hidden bg-stone-100 border border-stone-200"><img src="${spot?.img}" class="w-full h-full object-cover"></div><p class="font-bold text-[#3E4A24]">${spot?.name}</p><p class="text-stone-600 text-[11px] leading-relaxed">${t.bark}</p></td>`;
                  }).join('')}
                </tr>
                <tr>
                  <td class="p-4 bg-stone-50 font-bold text-[#3E4A24]">葉片與葉脈</td>
                  ${compareList.map(t => {
                    const spot = t.hotspots?.find(h => h.type === 'leaves');
                    return `<td class="p-4 border-l border-stone-100 space-y-2"><div class="h-24 rounded-lg overflow-hidden bg-stone-100 border border-stone-200"><img src="${spot?.img}" class="w-full h-full object-cover"></div><p class="font-bold text-[#3E4A24]">${spot?.name}</p><p class="text-stone-600 text-[11px] leading-relaxed">${t.leaves}</p></td>`;
                  }).join('')}
                </tr>
                <tr>
                  <td class="p-4 bg-stone-50 font-bold text-[#3E4A24]">花朵與果實</td>
                  ${compareList.map(t => {
                    const spot = t.hotspots?.find(h => h.type === 'flowers');
                    return `<td class="p-4 border-l border-stone-100 space-y-2"><div class="h-24 rounded-lg overflow-hidden bg-stone-100 border border-stone-200"><img src="${spot?.img}" class="w-full h-full object-cover"></div><p class="font-bold text-[#3E4A24]">${spot?.name}</p><p class="text-stone-600 text-[11px] leading-relaxed">${t.flowers}</p></td>`;
                  }).join('')}
                </tr>
                <tr>
                  <td class="p-4 bg-stone-50 font-bold text-[#3E4A24]">樹高與花果期</td>
                  ${compareList.map(t => `<td class="p-4 border-l border-stone-100 space-y-1 text-[11px]"><p class="font-bold text-stone-800">📏 樹高：${t.height}</p><p class="text-stone-600">🌸 花期：${t.bloomPeriod}</p><p class="text-stone-600">🍎 果期：${t.fruitPeriod}</p></td>`).join('')}
                </tr>
                <tr class="bg-amber-50/20">
                  <td class="p-4 bg-amber-50/40 font-bold text-[#3E4A24]">★ 特別辨識標記</td>
                  ${compareList.map(t => `<td class="p-4 border-l border-stone-200 font-bold text-stone-800">${t.special}</td>`).join('')}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
      container.innerHTML = html;
    }

// 樹木詳細 Pop-up 開啟與互動
    function openTreeModal(id) {
      currentTree = treesData.find(t => t.id === id);
      
      // 開啟時優先讀取 localStorage 備註
      const storedNote = localStorage.getItem(`tree_note_${currentTree.id}`);
      if (storedNote !== null) {
        currentTree.userNotes = storedNote;
      }

      document.getElementById('modal-tree-name').innerHTML = `<span>${currentTree.name}</span><span class="bg-[#556B2F] text-xs px-2 py-0.5 rounded-full font-bold ml-2">${currentTree.family}</span>`;
      document.getElementById('modal-tree-latin').innerText = currentTree.latinName;
      document.getElementById('modal-main-img').src = currentTree.mainImage;
      document.getElementById('modal-description').innerText = currentTree.description;
      document.getElementById('modal-height').innerText = currentTree.height;
      document.getElementById('modal-bloom').innerText = currentTree.bloomPeriod;
      document.getElementById('modal-fruit').innerText = currentTree.fruitPeriod;
      document.getElementById('modal-special').innerText = currentTree.special;

      document.getElementById('note-view-mode').innerHTML = currentTree.userNotes ? currentTree.userNotes : `<span class="text-stone-400 font-normal">（預設空白，點擊編輯備註...）</span>`;
      document.getElementById('note-textarea').value = currentTree.userNotes || '';

      // 開啟時預設選取第一個熱點並渲染按鈕
      if(currentTree.hotspots && currentTree.hotspots.length > 0) {
        selectHotspot(currentTree.hotspots[0].id);
      } else {
        renderHotspotButtons(null);
      }

      document.getElementById('tree-modal').classList.remove('hidden');
    }

    // 獨立出來的熱點按鈕渲染邏輯（動態判斷選取狀態）
    function renderHotspotButtons(activeSpotId) {
      const hotspotContainer = document.getElementById('modal-hotspots-container');
      hotspotContainer.innerHTML = (currentTree.hotspots || []).map(spot => {
        const isActive = spot.id === activeSpotId;
        
        // 根據是否被選中切換樣式
        const colorStyle = isActive 
          ? 'bg-red-500 border-red-500 text-white'       // 被選中：紅底 / 紅邊 / 白字
          : 'bg-white border-red-500 text-red-600';     // 未選中：白底 / 紅邊 / 紅字

        return `
          <button onclick="selectHotspot('${spot.id}')" style="left:${spot.x}%; top:${spot.y}%;" class="absolute -translate-x-1/2 -translate-y-1/2 z-20 group">
            <div class="flex items-center justify-center w-7 h-7 rounded-full border-2 ${colorStyle} text-[10px] font-black shadow-lg transition-all duration-300 group-hover:scale-110">
              ${spot.type === 'bark' ? '幹' : spot.type === 'leaves' ? '葉' : '花'}
            </div>
          </button>
        `;
      }).join('');
    }

    // 點擊熱點時：更新右側詳細資訊 + 重新渲染按鈕狀態
    function selectHotspot(spotId) {
      // 1. 重新渲染按鈕狀態
      renderHotspotButtons(spotId);

      // 2. 更新右側面板詳細內容
      const spot = currentTree.hotspots.find(h => h.id === spotId);
      if(!spot) return;

      const detail = document.getElementById('modal-hotspot-detail');
      detail.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="bg-[#556B2F] text-white text-[10px] font-black px-2.5 py-0.5 rounded">
            ${spot.type === 'bark' ? '樹皮部位特寫' : spot.type === 'leaves' ? '葉脈結構特寫' : '花卉果實特寫'}
          </span>
          <h5 class="font-extrabold text-sm text-[#3E4A24]">${spot.name}</h5>
        </div>
        <div class="h-36 w-full bg-stone-300 rounded-lg overflow-hidden border border-stone-200">
          <img src="${spot.img}" class="w-full h-full object-cover">
        </div>
        <p class="text-xs text-stone-700 leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-stone-100">${spot.desc}</p>
      `;
    }

    function closeTreeModal() {
      document.getElementById('tree-modal').classList.add('hidden');
    }

    function toggleEditNote() {
      document.getElementById('note-view-mode').classList.toggle('hidden');
      document.getElementById('note-edit-mode').classList.toggle('hidden');
    }

    // 關鍵修改：將個人的樹木備註持久化寫入 localStorage
    function saveUserNote() {
      const val = document.getElementById('note-textarea').value;
      currentTree.userNotes = val;
      
      // 寫入本機儲存空間
      localStorage.setItem(`tree_note_${currentTree.id}`, val);

      document.getElementById('note-view-mode').innerHTML = val ? val : `<span class="text-stone-400 font-normal">（預設空白，點擊編輯備註...）</span>`;
      toggleEditNote();
      alert(`已成功儲存「${currentTree.name}」的自訂備註於您的裝置中！`);
    }

    // 知識頁面渲染
    function renderKnowledge() {
      const grid = document.getElementById('knowledge-grid');
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

    // 野外手記控制與上傳相片
    function toggleAddNoteForm() {
      const form = document.getElementById('add-note-form');
      const icon = document.getElementById('add-note-icon');
      form.classList.toggle('hidden');
      icon.classList.toggle('rotate-45');
    }

    function populateTreeSelect() {
      const select = document.getElementById('note-tree-select');
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

    // 關鍵修改：將新增的野外觀察手記寫入 localStorage
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

      // 儲存至本機
      try {
        localStorage.setItem('field_notes_list', JSON.stringify(notesList));
      } catch(e) {
        console.warn("照片檔案可能過大超出 localStorage 限制，建議壓縮照片。");
      }

      renderNotes();
      toggleAddNoteForm();
      
      // 清空輸入框
      document.getElementById('note-content').value = '';
      document.getElementById('note-location').value = '';
      document.getElementById('note-image-input').value = '';
      document.getElementById('note-image-preview').classList.add('hidden');
      uploadedNoteImg = '';

      alert("觀測手記已成功儲存於您的本機裝置！");
    }

    // 刪除手記功能
    function deleteNote(id) {
      if(!confirm("確定要刪除這筆觀察手記嗎？")) return;
      notesList = notesList.filter(n => n.id !== id);
      localStorage.setItem('field_notes_list', JSON.stringify(notesList));
      renderNotes();
    }

    function renderNotes() {
      const container = document.getElementById('notes-list');
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

    // 辨識挑戰題目生成
    let quizCurrent = null;
    function startQuiz() {
      if(treesData.length < 3) return;
      const correct = treesData[Math.floor(Math.random() * treesData.length)];
      const distractors = treesData.filter(t => t.id !== correct.id).sort(() => 0.5 - Math.random()).slice(0, 3);
      const choices = [correct, ...distractors].sort(() => 0.5 - Math.random());

      quizCurrent = { correct, choices };
      const card = document.getElementById('quiz-card');
      card.innerHTML = `
        <h4 class="text-sm font-black text-stone-800 leading-relaxed">哪一種樹木其學名為：「${correct.latinName}」？</h4>
        <div class="p-3 bg-amber-50 border-l-4 border-amber-400 text-xs font-bold text-stone-800">💡 考證線索： ${correct.special}</div>
        <div class="space-y-2">
          ${choices.map(c => `
            <button onclick="checkQuiz('${c.id}')" class="w-full p-3.5 rounded-xl border border-stone-200 text-left text-xs font-bold hover:bg-stone-50 flex justify-between items-center">
              <span>${c.name} (${c.family})</span>
            </button>
          `).join('')}
        </div>
      `;
    }

    let score = 0, total = 0;
    function checkQuiz(id) {
      total++;
      if(id === quizCurrent.correct.id) {
        score++;
        alert("✔ 恭喜答對！");
      } else {
        alert(`✘ 答錯了！正確答案是：${quizCurrent.correct.name}`);
      }
      document.getElementById('quiz-score').innerText = score;
      document.getElementById('quiz-total').innerText = `${total} 題`;
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
