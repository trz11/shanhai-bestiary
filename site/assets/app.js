(() => {
  'use strict';
  const entries = window.SHANHAI_ENTRIES || [];
  const byId = new Map(entries.map(e => [e.id, e]));
  const base = document.body.dataset.base || './';
  const pageId = document.body.dataset.creature;
  const featured = ['008','020','002','057','117','239','244','211'];
  const $ = s => document.querySelector(s);
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalizeSearch = value => value.normalize('NFKC').toLocaleLowerCase().replace(/([一二三四五六七八九十百])(?:只|条|个)/g,'$1');
  const href = e => `${base}creatures/${e.id}/`;
  const img = (e, small = false) => `${base}assets/${small ? 'thumbs' : 'creatures'}/${e.id}.webp`;
  const storageKey = 'shanhai:saved:v1';
  let saved = new Set();
  try { const stored = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(stored)) saved = new Set(stored.filter(id => byId.has(id))); } catch { /* 收藏不可用时仍可浏览 */ }
  const params = new URL(location.href).searchParams;
  const validSections = new Set(entries.map(e => e.section));
  const state = { query:(params.get('q') || '').slice(0,120), section:validSections.has(params.get('section')) ? params.get('section') : '', saved:params.get('saved') === '1', sort:'recommended', limit:24 };
  const dialog = $('#creature-dialog');
  const shareDialog = $('#share-dialog');
  let modalId = null;
  let modalPushed = false;
  let toastTimer;
  let inputTimer;

  function notify(text) {
    const toast = $('#toast');
    toast.textContent = text;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
  }
  function updateBodyLock() { document.body.classList.toggle('modal-open', dialog.open || shareDialog.open); }
  function updateSavedButtons() {
    document.querySelectorAll('.saved-count').forEach(n => { n.textContent = String(saved.size); });
    document.querySelectorAll('[data-save]').forEach(button => {
      const e = byId.get(button.dataset.save);
      if (!e) return;
      const active = saved.has(e.id);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', `${active ? '取消收藏' : '收藏'}${e.name}`);
      const label = button.querySelector('[data-save-label]');
      if (label) label.textContent = active ? '已收藏' : '收藏异兽';
    });
    if ($('.collection-toggle')) $('.collection-toggle').setAttribute('aria-pressed',String(state.saved));
  }
  function toggleSave(id) {
    if (!byId.has(id)) return;
    const removing = saved.has(id);
    removing ? saved.delete(id) : saved.add(id);
    let persisted = true;
    try { localStorage.setItem(storageKey,JSON.stringify([...saved])); } catch { persisted = false; }
    if (state.saved && $('#creature-grid')) render();
    updateSavedButtons();
    notify(persisted ? (removing ? '已从收藏中移除' : '已收入你的山海收藏') : '已收藏于本次浏览，浏览器未允许保存');
  }
  function card(e) {
    return `<article class="creature-card"><a class="card-picture" href="${href(e)}" data-open="${e.id}" aria-label="查看${esc(e.name)}"><img src="${img(e,true)}" width="640" height="640" alt="${esc(e.name)}的工笔风格艺术复原图" loading="lazy" decoding="async"><span class="card-number">NO. ${e.id}</span><span class="card-reveal" aria-hidden="true">↗</span></a><button class="favorite-button" data-save="${e.id}" type="button" aria-label="收藏${esc(e.name)}" aria-pressed="${saved.has(e.id)}">${icon('bookmark')}</button><div class="card-content"><div class="card-title-row"><h3><a href="${href(e)}" data-open="${e.id}">${esc(e.name)}</a></h3><span class="chapter-tag">${esc(e.chapter)}</span></div><p class="card-description">${esc(e.description)}</p></div></article>`;
  }
  function matching() {
    const words = normalizeSearch(state.query).trim().split(/\s+/).filter(Boolean);
    let result = entries.filter(e => (!state.section || e.section === state.section) && (!state.saved || saved.has(e.id)) && words.every(word => normalizeSearch(`${e.id} ${e.name} ${e.alias} ${e.description} ${e.chapter} ${e.section}`).includes(word)));
    if (state.sort === 'name') result.sort((a,b) => a.name.localeCompare(b.name,'zh-Hans-CN'));
    else if (state.sort === 'recommended') result.sort((a,b) => {
      const rank = e => featured.includes(e.id) ? featured.indexOf(e.id) : Number(e.id)+100;
      return rank(a)-rank(b);
    });
    return result;
  }
  function updateQueryUrl() {
    const url = new URL(location.href);
    for (const [key,value] of [['q',state.query.trim()],['section',state.section],['saved',state.saved ? '1' : '']]) value ? url.searchParams.set(key,value) : url.searchParams.delete(key);
    history.replaceState(history.state,'',url);
  }
  function render({sync=true,focusNew=false} = {}) {
    const grid = $('#creature-grid');
    if (!grid) return;
    const result = matching();
    const shown = result.slice(0,state.limit);
    const oldCount = grid.children.length;
    grid.innerHTML = shown.map(card).join('');
    $('#empty-state').hidden = result.length > 0;
    $('#load-more').hidden = shown.length >= result.length;
    $('.load-area').hidden = !result.length;
    $('#load-progress').textContent = shown.length === result.length ? `已阅尽本卷 · ${result.length} 位生灵` : `已展卷 ${shown.length} / ${result.length}`;
    $('#result-count').innerHTML = state.saved ? `你的收藏 · <b>${result.length}</b> 位山海生灵` : state.query || state.section ? `寻得 <b>${result.length}</b> 位山海生灵` : `共 <b>${result.length}</b> 位山海生灵，等你相识`;
    $('#empty-state h3').textContent = state.saved ? '收藏里还没有这位生灵' : '暂未寻得这位生灵';
    $('#empty-state p').textContent = state.saved ? '点击图上的书签，把喜爱的异兽收入收藏。收藏仅保存在当前浏览器。' : '换个名字或形貌关键词，再去山海间找找。';
    $('.clear-search').hidden = !state.query;
    document.querySelectorAll('.filter').forEach(b => b.setAttribute('aria-pressed',String((b.dataset.section || '') === state.section)));
    updateSavedButtons();
    if (sync) updateQueryUrl();
    if (focusNew && grid.children[oldCount]) grid.children[oldCount].querySelector('a').focus({preventScroll:true});
  }
  function detailMarkup(e) {
    const index = entries.indexOf(e);
    const prev = entries[(index+entries.length-1)%entries.length];
    const next = entries[(index+1)%entries.length];
    return `<div class="detail-layout"><div class="detail-art"><img src="${img(e)}" width="1254" height="1254" alt="${esc(e.name)}的艺术复原图"><span class="art-index">NO. ${e.id} / 266</span></div><div class="detail-copy"><div class="detail-topline"><span>${esc(e.chapter)}</span><span>山海异兽录 · ${e.id}</span></div><h2 class="detail-name" id="dialog-name">${esc(e.name)}</h2><p class="detail-description">${esc(e.description)}</p><div class="detail-facts"><span>${esc(e.section)}</span><span>${esc(e.fidelity)}</span></div><div class="detail-source"><h3>古籍有载 <a href="${esc(e.source_url)}" target="_blank" rel="noopener noreferrer">查看篇章 ↗</a></h3><blockquote>${esc(e.source_excerpt)}</blockquote></div>${e.limitation ? `<p class="detail-note"><strong>图像说明</strong> · ${esc(e.limitation)}</p>` : ''}<p class="detail-disclaimer">AI 艺术复原，色彩、姿态与未详细节含现代想象。</p><div class="detail-actions"><button class="button primary" data-share="${e.id}" type="button">${icon('share')}分享这只异兽</button><button class="button outline" data-save="${e.id}" aria-pressed="${saved.has(e.id)}" type="button">${icon('bookmark')}<span data-save-label>收藏异兽</span></button><button class="download-art" type="button" data-card="${e.id}">${icon('download')}保存图文卡片</button><a class="download-art" href="${img(e)}" download="山海异兽录_${e.id}_${esc(e.name)}.webp">${icon('download')}下载插画</a></div></div></div><div class="detail-pagination"><button data-open="${prev.id}" type="button">← ${esc(prev.name)}</button><a class="detail-permalink" href="${href(e)}">打开独立页面 ↗</a><button data-open="${next.id}" type="button">${esc(next.name)} →</button></div>`;
  }
  function openCreature(id,{fromUrl=false,replace=false}={}) {
    const e = byId.get(id);
    if (!e) return;
    modalId = id;
    $('#dialog-content').innerHTML = detailMarkup(e);
    dialog.scrollTop = 0;
    if (!dialog.open) dialog.showModal();
    updateBodyLock();
    updateSavedButtons();
    if (!fromUrl) {
      const url = new URL(location.href);
      url.searchParams.set('beast',id);
      if (modalPushed || replace) history.replaceState({...history.state,shanhaiModal:true},'',url);
      else { history.pushState({...history.state,shanhaiModal:true},'',url); modalPushed = true; }
    }
  }
  function closeCreature({fromUrl=false}={}) {
    if (dialog.open) dialog.close();
    modalId = null;
    updateBodyLock();
    if (!fromUrl) {
      if (modalPushed) { modalPushed=false; history.back(); }
      else { const url = new URL(location.href); url.searchParams.delete('beast'); history.replaceState(history.state,'',url); }
    }
  }
  function showSaved() {
    if (!$('#creature-grid')) { location.href = `${base}?saved=1#catalog`; return; }
    state.saved = !state.saved;
    state.limit = 24;
    render();
    $('#catalog').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function showShare(id=null) {
    const e = id ? byId.get(id) : null;
    const url = new URL(e ? href(e) : base,location.href);
    $('#share-title').textContent = e ? `把「${e.name}」分享出去。` : '把这份山海，分享出去。';
    $('#share-url').value = url.href;
    $('.share-hint').textContent = /^(localhost|127\.0\.0\.1)$/.test(url.hostname) || url.protocol === 'file:' ? '这是本地预览地址。网站发布后，这里会自动生成可公开分享的链接。' : '朋友打开链接，即可直接浏览，无需登录。';
    $('#copy-link').innerHTML = `复制链接 ${icon('copy')}`;
    shareDialog.showModal();
    updateBodyLock();
  }
  function closeShare() { shareDialog.close(); updateBodyLock(); }
  async function copyShare() {
    try { await navigator.clipboard.writeText($('#share-url').value); $('#copy-link').textContent='链接已复制 ✓'; }
    catch { $('#share-url').focus(); $('#share-url').select(); $('.share-hint').textContent='请长按链接，或按 Ctrl/Cmd + C 复制。'; }
  }
  function wrapText(ctx,text,maxWidth) {
    const lines=[];
    let line='';
    for (const char of text) { if (line && ctx.measureText(line+char).width > maxWidth) { lines.push(line); line=char; } else line+=char; }
    if (line) lines.push(line);
    return lines;
  }
  async function downloadCard(id,button) {
    const e = byId.get(id);
    if (!e || button.disabled) return;
    const previous = button.innerHTML;
    button.disabled=true; button.textContent='正在制作…';
    try {
      const art=new Image(); art.decoding='async'; art.src=img(e);
      await art.decode();
      if (document.fonts?.ready) await document.fonts.ready;
      const canvas=document.createElement('canvas'); const ctx=canvas.getContext('2d');
      canvas.width=1080;
      ctx.font='28px "Microsoft YaHei", sans-serif';
      const lines=wrapText(ctx,e.description,964);
      canvas.height=1310+lines.length*48;
      ctx.fillStyle='#f6f3eb';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(art,40,40,1000,1000);
      ctx.fillStyle='#a44330';ctx.font='22px "Microsoft YaHei", sans-serif';ctx.fillText(`山海异兽录 / ${e.chapter} / NO. ${e.id}`,52,1097);
      ctx.fillStyle='#283a33';ctx.font='600 62px Shanhai, SimSun, serif';ctx.fillText(e.name,50,1183,978);
      ctx.fillStyle='#69746a';ctx.font='28px "Microsoft YaHei", sans-serif';
      lines.forEach((line,i)=>ctx.fillText(line,52,1241+i*48));
      ctx.strokeStyle='#dcded2';ctx.beginPath();ctx.moveTo(52,canvas.height-68);ctx.lineTo(1028,canvas.height-68);ctx.stroke();
      ctx.font='18px "Microsoft YaHei", sans-serif';ctx.fillText('依据《山海经》文字 · AI 艺术复原',52,canvas.height-34);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.93));
      if (!blob) throw new Error('图片导出失败');
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`山海异兽录_${e.id}_${e.name}.jpg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
      button.textContent='卡片已保存 ✓';
    } catch { button.textContent='保存失败，请重试'; }
    finally { button.disabled=false;setTimeout(()=>{button.innerHTML=previous;},3000); }
  }

  document.addEventListener('click',event=>{
    const save=event.target.closest('[data-save]'); if(save){toggleSave(save.dataset.save);return;}
    const open=event.target.closest('[data-open]'); if(open && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey){event.preventDefault();openCreature(open.dataset.open);return;}
    const random=event.target.closest('[data-random]'); if(random){const pool=entries.filter(e=>e.id!==modalId);openCreature(pool[Math.floor(Math.random()*pool.length)].id);return;}
    const share=event.target.closest('[data-share]'); if(share){showShare(share.dataset.share);return;}
    if(event.target.closest('[data-share-site]')){showShare();return;}
    if(event.target.closest('[data-show-saved],.collection-toggle')){showSaved();return;}
    const download=event.target.closest('[data-card]');if(download){downloadCard(download.dataset.card,download);return;}
    const filter=event.target.closest('.filter');if(filter){state.section=filter.dataset.section||'';state.limit=24;render();return;}
    if(event.target.closest('[data-reset]')){state.query='';state.section='';state.saved=false;state.limit=24;$('#search').value='';render();return;}
  });
  $('.dialog-close').addEventListener('click',()=>closeCreature());
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeCreature();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeCreature();}});
  $('.share-close').addEventListener('click',closeShare);
  shareDialog.addEventListener('close',updateBodyLock);
  $('#copy-link').addEventListener('click',copyShare);
  if($('#search')) {
    $('#search').value=state.query;
    $('#search').addEventListener('input',event=>{clearTimeout(inputTimer);state.query=event.target.value;state.limit=24;inputTimer=setTimeout(()=>render(),100);});
    $('.clear-search').addEventListener('click',()=>{clearTimeout(inputTimer);state.query='';state.limit=24;$('#search').value='';render();$('#search').focus();});
    $('#sort').addEventListener('change',event=>{state.sort=event.target.value;state.limit=24;render();});
    $('#load-more').addEventListener('click',()=>{state.limit+=24;render({focusNew:true});});
    render({sync:false});
  }
  document.addEventListener('keydown',event=>{
    if(event.key==='/' && !dialog.open && !shareDialog.open && !/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) && !event.target.isContentEditable && $('#search')){event.preventDefault();$('#search').focus();}
    if(dialog.open && !shareDialog.open && !/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) && ['ArrowLeft','ArrowRight'].includes(event.key)){
      const index=entries.findIndex(e=>e.id===modalId);event.preventDefault();openCreature(entries[(index+(event.key==='ArrowLeft'?-1:1)+entries.length)%entries.length].id,{replace:true});
    }
  });
  window.addEventListener('popstate',()=>{
    const url=new URL(location.href);
    if($('#search')){state.query=(url.searchParams.get('q')||'').slice(0,120);state.section=validSections.has(url.searchParams.get('section'))?url.searchParams.get('section'):'';state.saved=url.searchParams.get('saved')==='1';$('#search').value=state.query;render({sync:false});}
    const id=url.searchParams.get('beast');
    if(byId.has(id))openCreature(id,{fromUrl:true});else {modalPushed=false;closeCreature({fromUrl:true});}
  });
  window.addEventListener('storage',event=>{
    if(event.key!==storageKey)return;
    try{const next=JSON.parse(event.newValue||'[]');saved=new Set(Array.isArray(next)?next.filter(id=>byId.has(id)):[]);if(state.saved)render({sync:false});updateSavedButtons();}catch{/* 忽略其他页面写入的无效内容 */}
  });
  updateSavedButtons();
  if(params.get('beast') && byId.has(params.get('beast')))openCreature(params.get('beast'),{fromUrl:true});
})();
