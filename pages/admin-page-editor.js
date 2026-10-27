(function(){
const PAGE_KEY='vm-demo-pages',SECTION_PREFIX='vm-demo-page-sections-',THEME_PREFIX='vm-demo-page-theme-';
const definitions=[
 {key:'hero',label:'メインビジュアル'},
 {key:'announcements',label:'お知らせ'},
 {key:'video-showcase',label:'作品紹介'},
 {key:'trustbar',label:'安心・購入ガイド'},
 {key:'collection',label:'動画コレクション'},
 {key:'popular',label:'人気の動画'},
 {key:'new-releases',label:'新着動画'},
 {key:'genre-rail',label:'気分から選ぶ'},
 {key:'genre-recommendations',label:'ジャンル別おすすめ'},
 {key:'spotlight',label:'今、観てほしい作品たち'},
 {key:'finder',label:'あなたに合った動画を探す'},
 {key:'categories',label:'カテゴリーから探す'},
 {key:'library',label:'買ったあとも、迷わない'},
 {key:'creator',label:'あなたの動画を販売しませんか？'},
 {key:'creators',label:'注目のクリエイター'},
 {key:'cta',label:'まだ知らない映像と、出会う'},
 {key:'custom-text',label:'自由ブロック：文章'},
 {key:'custom-image',label:'自由ブロック：画像'},
 {key:'custom-image-text',label:'自由ブロック：画像＋文章'},
 {key:'custom-gallery',label:'自由ブロック：画像ギャラリー'},
 {key:'custom-cards',label:'自由ブロック：カード一覧'},
 {key:'custom-button',label:'自由ブロック：ボタン'},
 {key:'custom-divider',label:'自由ブロック：区切り線'},
 {key:'custom-spacer',label:'自由ブロック：余白'}
];
const RESERVED_PAGE_URLS = new Set([
  '/', '/pages/video-list.html', '/pages/categories.html', '/pages/about.html', '/pages/contact.html'
]);
const defaults=[];
const editor=document.getElementById('page-editor'),editorTitle=document.getElementById('editor-title'),nameInput=document.getElementById('page-name'),urlInput=document.getElementById('page-url'),statusInput=document.getElementById('page-edit-status'),parentInput=document.getElementById('page-parent'),editorStatus=document.getElementById('editor-status');
const sectionList=document.getElementById('homepage-section-list');
const sectionEditor=document.getElementById('section-editor'),sectionEditorTitle=document.getElementById('section-editor-title'),sectionName=document.getElementById('section-edit-name'),sectionStatus=document.getElementById('section-edit-status'),sectionBg=document.getElementById('section-theme-bg'),sectionAccent=document.getElementById('section-theme-accent'),sectionRadius=document.getElementById('section-theme-radius'),sectionThemeText=document.getElementById('section-theme-text'),sectionThemeButtonText=document.getElementById('section-theme-button-text'),sectionThemeWidth=document.getElementById('section-theme-width'),sectionThemeSpacing=document.getElementById('section-theme-spacing'),sectionThemeImageFit=document.getElementById('section-theme-image-fit'),sectionEditorStatus=document.getElementById('section-editor-status');
const META_PREFIX='vm-demo-page-meta-',DESIGN_PREFIX='vm-demo-page-design-',CHROME_PREFIX='vm-demo-page-chrome-';
const heroDefaults={kicker:'DISCOVER SOMETHING NEW',headline:'見つける。\n買う。\n楽しむ。',copy:'',backgroundImage:'',buttonLabel:'詳しく見る',buttonUrl:'/pages/video-list.html',imagePosition:'center',imageFit:'cover'};
function savePageEditorMetadata(pageId){const design={bg:document.getElementById('page-bg').value,text:document.getElementById('page-text').value,accent:document.getElementById('page-accent').value,buttonText:document.getElementById('page-button-text').value,headingSize:document.getElementById('page-heading-size').value,contentWidth:document.getElementById('page-content-width').value,cardShape:document.getElementById('page-card-shape').value,style:document.getElementById('page-style').value};const hero={kicker:document.getElementById('hero-kicker').value,headline:document.getElementById('hero-headline').value,copy:document.getElementById('hero-copy').value,backgroundImage:document.getElementById('hero-background-image').value,buttonLabel:document.getElementById('hero-button-label').value,buttonUrl:document.getElementById('hero-button-url').value,imagePosition:document.getElementById('hero-image-position').value,imageFit:document.getElementById('hero-image-fit').value};const chrome={showPurchase:document.getElementById('header-show-purchase').checked,showSell:document.getElementById('header-show-sell').checked,showAccount:document.getElementById('header-show-account').checked,showCart:document.getElementById('header-show-cart').checked,menuOrder:document.getElementById('header-menu-order').value,footerDescription:document.getElementById('footer-description').value,footerShowLinks:document.getElementById('footer-show-links').value,footerCopyright:document.getElementById('footer-copyright').value};localStorage.setItem(DESIGN_PREFIX+pageId,JSON.stringify(design));localStorage.setItem(META_PREFIX+pageId,JSON.stringify({description:document.getElementById('page-description').value,seoTitle:document.getElementById('page-seo-title').value,seoDescription:document.getElementById('page-seo-description').value,hero}));localStorage.setItem(CHROME_PREFIX+pageId,JSON.stringify(chrome));}
function loadPageMetadata(pageId){let meta={},design={},chrome={};try{meta=JSON.parse(localStorage.getItem(META_PREFIX+pageId)||'{}')||{};design=JSON.parse(localStorage.getItem(DESIGN_PREFIX+pageId)||'{}')||{};chrome=JSON.parse(localStorage.getItem(CHROME_PREFIX+pageId)||localStorage.getItem('vm-demo-site-chrome')||'{}')||{};}catch(e){}document.getElementById('page-description').value=meta.description||'';document.getElementById('page-seo-title').value=meta.seoTitle||'';document.getElementById('page-seo-description').value=meta.seoDescription||'';document.getElementById('header-show-purchase').checked=chrome.showPurchase!==false;document.getElementById('header-show-sell').checked=chrome.showSell!==false;document.getElementById('header-show-account').checked=chrome.showAccount!==false;document.getElementById('header-show-cart').checked=chrome.showCart!==false;document.getElementById('header-menu-order').value=chrome.menuOrder||'cart,purchase,sell';document.getElementById('footer-description').value=chrome.footerDescription||'見つける。買う。楽しむ。';document.getElementById('footer-show-links').value=chrome.footerShowLinks||'show';document.getElementById('footer-copyright').value=chrome.footerCopyright||'© 2026 VIDEO MARKETPLACE. All rights reserved.';const hero={...heroDefaults,...(meta.hero||{})};const heroMap={kicker:'hero-kicker',headline:'hero-headline',copy:'hero-copy',backgroundImage:'hero-background-image',buttonLabel:'hero-button-label',buttonUrl:'hero-button-url',imagePosition:'hero-image-position',imageFit:'hero-image-fit'};Object.entries(hero).forEach(([key,value])=>{const el=document.getElementById(heroMap[key]);if(el)el.value=value;});const designMap={bg:'page-bg',text:'page-text',accent:'page-accent',buttonText:'page-button-text',headingSize:'page-heading-size',contentWidth:'page-content-width',cardShape:'page-card-shape',style:'page-style'};Object.entries(design).forEach(([key,value])=>{const el=document.getElementById(designMap[key]);if(el)el.value=value;});const branding=JSON.parse(localStorage.getItem('vm-demo-site-branding')||'{}');document.getElementById('preview-brand').textContent=branding.siteName||'VIDEO MARKETPLACE';}

function resetPageMetadata(){document.getElementById('page-description').value='';document.getElementById('page-seo-title').value='';document.getElementById('page-seo-description').value='';document.getElementById('header-show-purchase').checked=true;document.getElementById('header-show-sell').checked=true;document.getElementById('header-show-account').checked=true;document.getElementById('header-show-cart').checked=true;document.getElementById('footer-description').value='映像との出会いを、もっと自由に。';document.getElementById('footer-show-links').value='show';document.getElementById('footer-copyright').value='© VIDEO MARKETPLACE';const heroMap={kicker:'hero-kicker',headline:'hero-headline',copy:'hero-copy',backgroundImage:'hero-background-image',buttonLabel:'hero-button-label',buttonUrl:'hero-button-url',imagePosition:'hero-image-position',imageFit:'hero-image-fit'};Object.entries(heroDefaults).forEach(([key,value])=>{const el=document.getElementById(heroMap[key]);if(el)el.value=value;});const design={bg:'#07090d',text:'#f4f4f5',accent:'#d9b45f',buttonText:'#101010',headingSize:'standard',contentWidth:'standard',cardShape:'rounded',style:'cinematic'};const designMap={bg:'page-bg',text:'page-text',accent:'page-accent',buttonText:'page-button-text',headingSize:'page-heading-size',contentWidth:'page-content-width',cardShape:'page-card-shape',style:'page-style'};Object.entries(design).forEach(([key,value])=>{document.getElementById(designMap[key]).value=value;document.getElementById(designMap[key]).dispatchEvent(new Event('input',{bubbles:true}));});}
const contentTitle=document.getElementById('section-content-title'),contentSubtitle=document.getElementById('section-content-subtitle'),contentButton=document.getElementById('section-content-button'),contentLink=document.getElementById('section-content-link'),contentImage=document.getElementById('section-content-image'),specificSettings=document.getElementById('section-specific-settings'),sectionItemsEditor=document.getElementById('section-items-editor');
const sectionOptions={
'hero':[{key:'imagePosition',label:'画像の配置',options:[['background','背景いっぱい'],['left','左に配置'],['right','右に配置']]},{key:'height',label:'高さ',options:[['compact','コンパクト'],['standard','標準'],['large','大きめ']]}],
'video-showcase':[{key:'videoCount',label:'表示する作品数',options:[['1','1件'],['2','2件'],['3','3件'],['4','4件']]},{key:'layout',label:'レイアウト',options:[['feature','大きな作品を強調'],['grid','カード一覧']]}],
'popular':[{key:'videoCount',label:'表示する動画数',options:[['4','4件'],['8','8件'],['12','12件'],['16','16件'],['24','24件'],['36','36件'],['48','48件']]},{key:'columns',label:'1行のカード数',options:[['2','2列'],['3','3列'],['4','4列'],['5','5列']]},{key:'source',label:'動画の選び方',options:[['popular','人気順で自動表示'],['manual','選んだ動画を表示'],['category','カテゴリーで絞り込む']]},{key:'period',label:'人気の集計期間',options:[['all','全期間'],['month','過去30日'],['week','過去7日']]},{key:'more',label:'続きの表示',options:[['load-more','もっと見るボタン'],['pagination','ページ送り'],['all','すべて表示']]}],
'new-releases':[{key:'videoCount',label:'表示する動画数',options:[['4','4件'],['8','8件'],['12','12件'],['16','16件'],['24','24件'],['36','36件'],['48','48件']]},{key:'columns',label:'1行のカード数',options:[['2','2列'],['3','3列'],['4','4列'],['5','5列']]},{key:'source',label:'動画の選び方',options:[['latest','新着順で自動表示'],['manual','選んだ動画を表示'],['category','カテゴリーで絞り込む']]},{key:'more',label:'続きの表示',options:[['load-more','もっと見るボタン'],['pagination','ページ送り'],['all','すべて表示']]}],
'genre-rail':[{key:'genreCount',label:'表示するカテゴリー数',options:[['4','4件'],['6','6件'],['8','8件'],['10','10件'],['12','12件']]},{key:'layout',label:'表示形式',options:[['rail','横スクロール'],['grid','グリッド']]}],
'genre-recommendations':[{key:'genreCount',label:'表示するジャンル数',options:[['2','2ジャンル'],['3','3ジャンル'],['4','4ジャンル'],['6','6ジャンル']]},{key:'videoCount',label:'各ジャンルの動画数',options:[['3','3件'],['4','4件'],['6','6件'],['8','8件']]}],
'spotlight':[{key:'featureCount',label:'特集の数',options:[['1','1件'],['2','2件'],['3','3件'],['4','4件']]},{key:'layout',label:'レイアウト',options:[['feature','大きな特集を強調'],['grid','カード一覧']]}],
'finder':[{key:'searchFields',label:'検索条件',options:[['basic','キーワード・カテゴリー'],['extended','キーワード・カテゴリー・価格']]}],
'categories':[{key:'categoryCount',label:'表示するカテゴリー数',options:[['6','6件'],['8','8件'],['12','12件'],['16','16件'],['20','20件']]},{key:'columns',label:'1行の表示数',options:[['2','2列'],['3','3列'],['4','4列']]}],
'library':[{key:'layout',label:'レイアウト',options:[['cards','カード型'],['steps','ステップ型']]},{key:'showIcons',label:'アイコン',options:[['yes','表示する'],['no','表示しない']]}],
'creator':[{key:'layout',label:'案内のレイアウト',options:[['split','画像と文章'],['centered','中央揃え']]}],
'creators':[{key:'creatorCount',label:'表示するクリエイター数',options:[['3','3人'],['4','4人'],['6','6人'],['8','8人'],['12','12人']]},{key:'source',label:'クリエイターの選び方',options:[['featured','運営おすすめ'],['popular','人気順'],['manual','選んだ人を表示']]},{key:'columns',label:'1行の表示数',options:[['2','2列'],['3','3列'],['4','4列']]}],
'collection':[{key:'layout',label:'作品の見せ方',options:[['cards','カード一覧'],['editorial','大きな画像と文章']]},{key:'videoCount',label:'表示する作品数',options:[['3','3件'],['4','4件'],['6','6件'],['8','8件']]}],
'trustbar':[{key:'itemCount',label:'案内項目数',options:[['2','2項目'],['3','3項目'],['4','4項目']]}],
'cta':[{key:'layout',label:'レイアウト',options:[['banner','横長バナー'],['centered','中央揃え']]}]
};
let editingSectionIndex=null;
let pages=[],editingId=null,sectionState=[];
async function persistEditorSettings(){
const entries={};
for(let i=0;i<localStorage.length;i++){
const key=localStorage.key(i);
if(key==='vm-demo-pages'||key==='vm-demo-homepage-sections'||key==='vm-demo-site-chrome'||key==='vm-demo-site-branding'||key==='vm-demo-admin-setting-general'||key==='vm-demo-announcements'||key==='vm-demo-homepage-theme'||/^vm-demo-page-(sections|theme|meta|design|chrome)-[a-zA-Z0-9_-]+$/.test(key)){
const value=localStorage.getItem(key);
if(value!==null)entries[key]=value;
}
}
const response=await fetch('/api/admin/settings/page-editor',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({entries})});
if(!response.ok){
let reason='';
try{
const result=await response.json();
reason=typeof result.error==='string'?result.error:result.error?.code||'';
}catch(e){}
const details=reason||('HTTP '+response.status);
throw new Error('ページ設定のサーバー保存に失敗しました（'+details+'）。');
}
return true;
}
async function loadServerEditorSettings(){
try{
const response=await fetch('/api/admin/settings/page-editor',{credentials:'same-origin',cache:'no-store'});
if(!response.ok)return null;
const data=await response.json();
if(!data.entries||typeof data.entries!=='object')return null;
Object.entries(data.entries).forEach(([key,value])=>{if(typeof value==='string')localStorage.setItem(key,value);});
return data.entries;
}catch(error){console.error('Loading page editor settings failed',error);return null;}
}
function load(){try{const saved=JSON.parse(localStorage.getItem(PAGE_KEY)||'null');pages=Array.isArray(saved)?saved.filter(page=>page&&page.id!=='top'&&!RESERVED_PAGE_URLS.has(page.url)):defaults.map(x=>({...x}));}catch(e){pages=defaults.map(x=>({...x}));}}
function save(){try{localStorage.setItem(PAGE_KEY,JSON.stringify(pages));return true;}catch(e){return false;}}
async function move(index,delta){const target=index+delta;if(target<0||target>=pages.length)return;const previous=pages.slice();[pages[index],pages[target]]=[pages[target],pages[index]];save();renderPageList();try{await persistEditorSettings();}catch(error){pages=previous;save();renderPageList();editorStatus.textContent=error.message||'ページ順のサーバー保存に失敗しました。';}}
async function removePage(page){
  if(page.locked)return;
  if(!confirm('「'+page.name+'」を削除しますか？'))return;
  const previousPages=pages.slice(),removedSettings=[];
  const prefixes=[
    'vm-demo-page-sections-'+page.id,
    'vm-demo-page-meta-'+page.id,
    'vm-demo-page-design-'+page.id,
    'vm-demo-page-chrome-'+page.id,
    'vm-demo-page-theme-'+page.id+'-'
  ];
  for(let index=0;index<localStorage.length;index++){
    const key=localStorage.key(index);
    if(key&&prefixes.some(prefix=>key.startsWith(prefix)))removedSettings.push([key,localStorage.getItem(key)]);
  }
  pages=pages.filter(item=>item.id!==page.id);
  removedSettings.forEach(([key])=>localStorage.removeItem(key));
  save();
  if(editingId===page.id)closeEditor();
  renderPageList();
  try{
    await persistEditorSettings();
  }catch(error){
    pages=previousPages;
    save();
    removedSettings.forEach(([key,value])=>localStorage.setItem(key,value));
    renderPageList();
    editorStatus.textContent=error.message||'ページ削除のサーバー保存に失敗しました。';
  }
}
function fillParents(currentId){parentInput.replaceChildren();const none=document.createElement('option');none.value='';none.textContent='親ページなし';parentInput.append(none);pages.filter(p=>p.id!==currentId).forEach(p=>{const option=document.createElement('option');option.value=p.name;option.textContent=p.name;parentInput.append(option);});}
function loadPageSettings(id){
  try {
    const saved = JSON.parse(localStorage.getItem(SECTION_PREFIX + id) || 'null');
    sectionState = Array.isArray(saved) ? saved : [];
  } catch (_) {
    sectionState = [];
  }
  renderSections();
}
function renderSections(){
sectionList.replaceChildren();
sectionState.forEach((item,index)=>{
if(!item||typeof item!=='object')return;
const row=document.createElement('div');row.className='homepage-section-row'+(item.hidden?' is-hidden':'');
row.dataset.previewTitle=(item.content&&item.content.title)||item.label||'';
row.dataset.previewDescription=(item.content&&item.content.subtitle)||'';
row.dataset.previewButton=(item.content&&item.content.button)||'';
row.dataset.previewImage=(item.content&&item.content.image)||'';
row.dataset.itemCount=String(Array.isArray(item.items)?item.items.length:0);
row.dataset.hidden=String(!!item.hidden);
let rowTheme={};
try{rowTheme=JSON.parse(localStorage.getItem(THEME_PREFIX+(editingId||'new')+'-'+item.id)||'{}')||{};}catch(e){}
row.dataset.themeBg=rowTheme.bg||'';row.dataset.themeText=rowTheme.text||'';row.dataset.themeAccent=rowTheme.accent||'';row.dataset.themeButtonText=rowTheme.buttonText||'#101010';row.dataset.themeRadius=rowTheme.radius||'rounded';row.dataset.themeWidth=rowTheme.width||'standard';row.dataset.themeSpacing=rowTheme.spacing||'standard';row.dataset.themeImageFit=rowTheme.imageFit||'cover';
const validItems=Array.isArray(item.items)?item.items.filter(entry=>entry&&typeof entry==='object'&&Object.values(entry).some(value=>value)):[];row.dataset.previewItems=JSON.stringify(validItems);
const title=document.createElement('div');title.className='homepage-section-title';const strong=document.createElement('strong');strong.textContent=item.label||definitions.find(d=>d.key===item.type)?.label||item.type||'セクション';const meta=document.createElement('small');meta.textContent=item.added?'追加したセクション':'TOPの標準セクション';title.append(strong,meta);
const actions=document.createElement('div');actions.className='homepage-section-actions';
const up=document.createElement('button');up.type='button';up.className='btn';up.textContent='↑';up.disabled=index===0;up.addEventListener('click',()=>moveSection(index,-1));
const down=document.createElement('button');down.type='button';down.className='btn';down.textContent='↓';down.disabled=index===sectionState.length-1;down.addEventListener('click',()=>moveSection(index,1));
const toggle=document.createElement('button');toggle.type='button';toggle.className='btn'+(item.hidden?'':' primary');toggle.textContent=item.hidden?'非表示':'表示';toggle.addEventListener('click',()=>{item.hidden=!item.hidden;renderSections();});
const edit=document.createElement('button');edit.type='button';edit.className='btn primary';edit.textContent='編集';edit.addEventListener('click',()=>openSectionEditor(index));
const duplicate=document.createElement('button');duplicate.type='button';duplicate.className='btn duplicate-section';duplicate.textContent='複製';duplicate.title='このセクションの設定を複製';duplicate.addEventListener('click',()=>duplicateSection(index));
const remove=document.createElement('button');remove.type='button';remove.className='btn';remove.textContent='削除';remove.disabled=!item.added;remove.title=remove.disabled?'TOP標準セクションは削除できません。非表示にできます。':'追加したセクションを削除';remove.addEventListener('click',()=>{sectionState=sectionState.filter(x=>x&&x.id!==item.id);renderSections();});
actions.append(up,down,toggle,edit,duplicate,remove);row.append(title,actions);sectionList.append(row);
});
}
function moveSection(index,delta){const target=index+delta;if(target<0||target>=sectionState.length)return;[sectionState[index],sectionState[target]]=[sectionState[target],sectionState[index]];renderSections();}
function duplicateSection(index){const source=sectionState[index];if(!source)return;const copy=JSON.parse(JSON.stringify(source));copy.id=source.type+'-copy-'+Date.now();copy.label=source.label+'（複製）';copy.added=true;copy.order=index+1;sectionState.splice(index+1,0,copy);sectionState.forEach((item,i)=>item.order=i);renderSections();}
function openSectionEditor(index){
const item=sectionState[index];if(!item)return;
editingSectionIndex=index;
sectionEditorTitle.textContent=item.label+'を編集';
sectionName.value=item.label;
sectionStatus.value=item.hidden?'非表示':'表示';
const theme=JSON.parse(localStorage.getItem(THEME_PREFIX+(editingId||'new')+'-'+item.id)||'null');
sectionBg.value=theme?.bg||'#07090d';sectionAccent.value=theme?.accent||'#d9b45f';sectionRadius.value=theme?.radius||'rounded';sectionThemeText.value=theme?.text||'#f4f4f5';sectionThemeButtonText.value=theme?.buttonText||'#101010';sectionThemeWidth.value=theme?.width||'standard';sectionThemeSpacing.value=theme?.spacing||'standard';sectionThemeImageFit.value=theme?.imageFit||'cover';
const content=item.content||{};contentTitle.value=content.title||item.label;contentSubtitle.value=content.subtitle||'';contentButton.value=content.button||'';contentLink.value=content.link||'';contentImage.value=content.image||'';const contentImagePreview=document.getElementById('section-content-image-preview');contentImagePreview.src=content.image||'';contentImagePreview.hidden=!content.image;
renderSectionItems(item);renderSpecificSettings(item);renderSectionEditorPreview();
editor.hidden=true;sectionEditor.hidden=false;sectionEditor.scrollIntoView({behavior:'smooth',block:'start'});sectionName.focus();
}
function renderSectionItems(item){sectionItemsEditor.replaceChildren();sectionItemsEditor.hidden=item.type==='hero';const items=Array.isArray(item.items)?item.items:[];items.forEach((entry,index)=>appendSectionItem(entry,index));}
function compressPageImage(file){
 return new Promise((resolve,reject)=>{
  if(!file||!file.type||!file.type.startsWith('image/')){reject(new Error('画像ファイルを選択してください。'));return;}
  const reader=new FileReader();
  reader.onerror=()=>reject(new Error('画像を読み込めませんでした。'));
  reader.onload=()=>{
   const image=new Image();
   image.onerror=()=>reject(new Error('画像を開けませんでした。'));
   image.onload=()=>{
    let scale=Math.min(1,1200/image.width,900/image.height);
    let width=Math.max(1,Math.round(image.width*scale)),height=Math.max(1,Math.round(image.height*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');
    if(!context){reject(new Error('画像を処理できませんでした。'));return;}
    context.drawImage(image,0,0,width,height);
    let quality=.78,data=canvas.toDataURL('image/webp',quality);
    while(data.length>100000&&quality>.42){quality=Math.max(.42,quality-.08);data=canvas.toDataURL('image/webp',quality);}
    while(data.length>100000&&canvas.width>480){const nextWidth=Math.max(480,Math.round(canvas.width*.8)),nextHeight=Math.max(1,Math.round(canvas.height*nextWidth/canvas.width));canvas.width=nextWidth;canvas.height=nextHeight;context.drawImage(image,0,0,nextWidth,nextHeight);data=canvas.toDataURL('image/webp',quality);}
    if(data.length>120000){reject(new Error('画像サイズが大きすぎます。小さい画像を選択してください。'));return;}
    resolve(data);
   };
   image.src=String(reader.result||'');
  };
  reader.readAsDataURL(file);
 });
}
function bindPageImageUpload(fileInput,targetInput,preview){
 if(!fileInput||!targetInput)return;
 fileInput.addEventListener('change',async()=>{
  const file=fileInput.files&&fileInput.files[0];if(!file)return;
  fileInput.disabled=true;
  try{
   const dataUrl=await compressPageImage(file);
   targetInput.value=dataUrl;
   targetInput.dispatchEvent(new Event('input',{bubbles:true}));
   if(preview){preview.src=dataUrl;preview.hidden=false;}
  }catch(error){alert(error&&error.message||'画像を読み込めませんでした。');}
  finally{fileInput.disabled=false;fileInput.value='';}
 });
}
function appendSectionItem(entry,index){
const card=document.createElement('div');card.className='section-item-card';
const head=document.createElement('div');head.className='section-item-head';
const title=document.createElement('strong');title.textContent='項目 '+(index+1);
const remove=document.createElement('button');remove.type='button';remove.className='btn';remove.textContent='削除';
remove.addEventListener('click',()=>{card.remove();Array.from(sectionItemsEditor.querySelectorAll('.section-item-card')).forEach((item,i)=>{const label=item.querySelector('.section-item-head strong');if(label)label.textContent='項目 '+(i+1);});renderSectionEditorPreview();});
head.append(title,remove);card.append(head);
[['title','項目名','タイトル'],['description','説明文','説明文'],['image','画像URL','画像URL（任意）'],['button','ボタン名','ボタン名'],['link','リンク先','/pages/video-list.html（任意）']].forEach(([key,label,placeholder])=>{
const wrap=document.createElement('label');wrap.textContent=label;
const input=document.createElement('input');input.type='text';input.dataset.itemKey=key;input.placeholder=placeholder;input.value=entry&&entry[key]||'';
input.addEventListener('input',renderSectionEditorPreview);
if(key==='image'){const upload=document.createElement('input');upload.type='file';upload.accept='image/*';upload.setAttribute('aria-label','画像ファイルを選択');upload.style.cssText='display:block;max-width:100%;margin-top:6px;';wrap.append(input,upload);bindPageImageUpload(upload,input);}else wrap.append(input);
card.append(wrap);
});
sectionItemsEditor.append(card);
}
function renderSectionEditorPreview(){
const root=document.getElementById('section-preview-root');
if(!root||editingSectionIndex===null)return;
const section=sectionState[editingSectionIndex];
if(!section)return;
const settings=getPreviewSettings(section);
const content=section.content||{};
const type=section.type;
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const img=(src,cls='',alt='')=>'<img class="'+cls+'" src="'+src+'" alt="'+esc(alt)+'" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
const asset={
hero:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2200&q=90',
p1:'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=88',
p2:'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=88',
p3:'https://images.unsplash.com/photo-1464822759023-fed622ff2c0e0c0e?auto=format&fit=crop&w=800&q=88',
t1:'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1100&q=88',
t2:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1000&q=88',
t3:'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=88',
t4:'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1000&q=88',
t5:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=88',
t6:'https://images.unsplash.com/photo-1464822759023-fed622ff2c0e0c0e?auto=format&fit=crop&w=1000&q=88',
t7:'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=88',
t8:'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=88',
t9:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=88',
s1:'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=1200&q=86',
s2:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1000&q=86',
s3:'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=86',
s4:'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=86',
s5:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=86',
c1:'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=700&q=80',
c2:'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=700&q=80',
c3:'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=700&q=80',
c4:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=700&q=80',
c5:'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=700&q=80',
a1:'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=180&q=80',
a2:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=180&q=80',
a3:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=180&q=80',
a4:'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=180&q=80',
r1:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=88',
r2:'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=88',
r3:'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=88',
r4:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=88',
r5:'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=88',
r6:'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=88',
cta:'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=85'
};
const defaults={
hero:{k:'ONE MARKETPLACE / MANY CREATORS',t:'見つける。買う。楽しむ。',p:'映画、学び、ドキュメンタリー、クリエイティブ。いろんなクリエイターの作品が集まる、動画マーケットプレイス。'},
'video-showcase':{k:'CURATED VIDEO COLLECTION',t:'作品との出会いを、もっと自由に。',p:'ひとつの作品だけではなく、いろんなクリエイターの映像を眺めながら、次に観たい一本を見つける。'},
trustbar:{k:'',t:'',p:''},collection:{k:'CURATED VIDEO COLLECTION',t:'作品との出会いを、もっと自由に。',p:'ひとつの作品だけではなく、いろんなクリエイターの映像を眺めながら、次に観たい一本を見つける。'},
popular:{k:'DISCOVER',t:'人気の動画',p:''},'new-releases':{k:'NEW RELEASES',t:'新着動画',p:''},
'genre-rail':{k:'EXPLORE BY MOOD',t:'気分から選ぶ',p:''},'genre-recommendations':{k:'EDITORIAL PICKS',t:'ジャンル別おすすめ',p:''},
spotlight:{k:'EDITORIAL',t:'今、観てほしい作品たち。',p:'多彩なクリエイターから注目作品をセレクト。マーケットプレイスだからこそ出会える一本を。'},
finder:{k:'FIND YOUR NEXT VIDEO',t:'あなたに合った動画を探す',p:'気になるテーマ、価格、評価から。欲しい作品にすぐ出会えます。'},
categories:{k:'EXPLORE',t:'カテゴリーから探す',p:''},library:{k:'AFTER PURCHASE',t:'買ったあとも、迷わない。',p:'購入した動画はマイライブラリへ。いつでも視聴・ダウンロードできます。'},
creator:{k:'CREATOR STUDIO / FOR CREATORS',t:'あなたの動画を販売しませんか？',p:'作品を登録して、視聴者へ。売上・購入数・審査・出金まで、ひとつのCreator Studioで管理できます。'},
creators:{k:'CREATORS',t:'注目のクリエイター',p:''},cta:{k:'DISCOVER YOUR NEXT STORY',t:'まだ知らない映像と、出会う。',p:'いろんなクリエイターの作品から、あなたの次の一本を見つけよう。'}
};
const d=defaults[type]||{k:'',t:section.label,p:''};
const title=esc(content.title||d.t||section.label), subtitle=esc(content.subtitle||d.p);
const link=content.link||'#', button=esc(content.button||'');
const sectionWrap=html=>{root.replaceChildren();root.className='vm-top-preview '+(root.dataset.mode==='mobile'?'is-mobile':'is-desktop');root.innerHTML=html;};
const head=(k,t,p='',more='')=>'<div class="vm-pv-head"><div><span class="vm-pv-kicker">'+esc(k)+'</span><h3 class="vm-pv-title">'+esc(t)+'</h3>'+(p?'<p class="vm-pv-copy">'+esc(p)+'</p>':'')+'</div>'+(more?'<a href="#">'+esc(more)+' <b>→</b></a>':'')+'</div>';
const card=(image,k,t,p,by,price)=>'<article class="vm-pv-card">'+img(image,'',t)+'<div class="vm-pv-card-info"><small>'+esc(k)+'</small><strong>'+esc(t)+'</strong><span>'+esc(p)+'</span><span>by '+esc(by)+' ★</span><b>'+esc(price)+'</b></div></article>';
let html='';
if(type.startsWith('custom-')){
  const customItems=Array.from(sectionItemsEditor.querySelectorAll('.section-item-card')).map(card=>{
    const value=key=>card.querySelector('[data-item-key="'+key+'"]')?.value||'';
    return {title:value('title'),description:value('description'),image:value('image'),button:value('button'),link:value('link')};
  }).filter(item=>Object.values(item).some(Boolean));
  const itemCards=customItems.map(item=>'<article class="vm-pv-card">'+(item.image?img(esc(item.image),'',item.title):'')+'<div class="vm-pv-card-info"><strong>'+esc(item.title)+'</strong><span>'+esc(item.description)+'</span>'+(item.button?'<b>'+esc(item.button)+'</b>':'')+'</div></article>').join('');
  if(type==='custom-divider') html='<section class="vm-pv-section"><hr style="border:0;border-top:1px solid #ffffff30"></section>';
  else if(type==='custom-spacer') html='<section class="vm-pv-section"><div style="height:64px"></div></section>';
  else if(type==='custom-image-text') html='<section class="vm-pv-section"><h3 class="vm-pv-title">'+title+'</h3><div class="vm-pv-image-text">'+(content.image?img(esc(content.image),'page-section-image',title):'')+'<div>'+(subtitle?'<p class="vm-pv-copy">'+subtitle+'</p>':'')+(content.button?'<a class="vm-pv-primary" href="'+esc(link)+'">'+button+'</a>':'')+'</div></div></section>';
  else html='<section class="vm-pv-section">'+(title?'<h3 class="vm-pv-title">'+title+'</h3>':'')+(subtitle?'<p class="vm-pv-copy">'+subtitle+'</p>':'')+(type==='custom-image'&&content.image?img(esc(content.image),'page-section-image',title):'')+(['custom-gallery','custom-cards'].includes(type)&&itemCards?'<div class="vm-pv-grid">'+itemCards+'</div>':'')+(type==='custom-button'&&content.button?'<a class="vm-pv-primary" href="'+esc(link)+'">'+button+'</a>':'')+'</section>';
}else if(type==='hero'){
html='<section class="vm-pv-hero">'+img(asset.hero,'vm-pv-hero-bg','hero')+'<div class="vm-pv-hero-copy"><span class="vm-pv-kicker">'+d.k+'</span><h3>見つける。<br>買う。<em>楽しむ。</em></h3><p>'+esc(content.subtitle||d.p)+'</p><div class="vm-pv-meta"><span>複数クリエイター</span><span>4K / HD</span><span>購入後すぐ視聴</span><span>ダウンロード対応</span></div><div class="vm-pv-actions"><a class="vm-pv-primary" href="'+esc(link)+'">'+esc(content.button||'動画を探す')+' →</a><a class="vm-pv-secondary" href="#">クリエイターになる</a></div></div><div class="vm-pv-mosaic"><div class="vm-pv-mosaic-card vm-pv-m1">'+img(asset.p1,'','')+'</div><div class="vm-pv-mosaic-card vm-pv-m2">'+img(asset.p2,'','')+'</div><div class="vm-pv-mosaic-card vm-pv-m3">'+img(asset.p3,'','')+'</div></div></section>';
}else if(type==='video-showcase'){
html='<section class="vm-pv-section">'+head(d.k,d.t,d.p)+'<div class="vm-pv-showcase">'+[['s1','01 THE LAST SIGNAL'],['s2','02 Tokyo After Hours'],['s3','03 Build Your Brand'],['s4','04 BLUE HORIZON'],['s5','05 Mastering Motion']].map(x=>'<div class="vm-pv-showcase-card">'+img(asset[x[0]],'',x[1])+'<div><b>'+x[1].slice(0,2)+'</b><span>'+esc(x[1].slice(3))+'</span></div></div>').join('')+'</div><div class="vm-pv-dark-link">DISCOVER / WATCH / PURCHASE</div></section>';
}else if(type==='trustbar'){
html='<section class="vm-pv-trust">'+[['✓','安全な決済','安心して購入できます'],['▶','購入後すぐ視聴','マイライブラリに保存'],['↧','ダウンロード対応','購入作品をいつでも'],['◉','保護された配信','購入者専用アクセス']].map(x=>'<div><b>'+x[0]+'</b><span><strong>'+x[1]+'</strong>'+x[2]+'</span></div>').join('')+'</section>';
}else if(type==='collection'){
html='<section class="vm-pv-section">'+head(d.k,d.t,d.p)+'<div class="vm-pv-grid">'+[
['t9','4K','THE LAST SIGNAL','遠い宇宙から届いた、最後のメッセージ。','Aki Studio','¥1,980'],
['t7','4K','Tokyo After Hours','夜の東京を切り取る映像作品。','KEN FILMS','¥980'],
['t5','HD','Build Your Brand','ブランドを育てる実践ドキュメント。','MIKA','¥1,480'],
['t4','4K','BLUE HORIZON','海と光を巡るシネマティック映像。','North Coast','¥780'],
['t3','HD','Mastering Motion','動きをデザインするための映像講座。','FRAME LAB','¥2,400']
].map(x=>card(asset[x[0]],x[1],x[2],x[3],x[4],x[5])).join('')+'</div></section>';
}else if(type==='popular'){
html='<section class="vm-pv-section">'+head(d.k,d.t,'','すべて見る')+'<div class="vm-pv-grid">'+[
['t1','4K','THE LAST SIGNAL','遠い宇宙から届いた、最後のメッセージ。','Aki Studio','¥1,980'],['t2','4K','Tokyo After Hours','夜の東京を切り取る映像作品。','KEN FILMS','¥980'],['t3','HD','Build Your Brand','ブランドを育てる実践ドキュメント。','MIKA','¥1,480'],['t4','4K','BLUE HORIZON','海と光を巡るシネマティック映像。','North Coast','¥780'],['t5','HD','Mastering Motion','動きをデザインするための映像講座。','FRAME LAB','¥2,400'],['t6','4K','Mountain Silence','山で過ごす静かな7日間。','YAMA FILM','¥1,200'],['t7','4K','KYOTO IN MOTION','古都の一日を映画のように記録。','KOTO FILMS','¥1,380'],['t8','HD','NIGHT SESSION','一夜限りのライブセッションを収録。','ROOM 09','¥680'],['t9','4K','THE CRAFTSMEN','ものづくりの現場に密着した長編作品。','FIELD NOTE','¥1,680']
].map(x=>card(asset[x[0]],x[1],x[2],x[3],x[4],x[5])).join('')+'</div></section>';
}else if(type==='new-releases'){
html='<section class="vm-pv-section">'+head(d.k,d.t,'','すべて見る')+'<div class="vm-pv-grid">'+[
['t6','NEW','Mountain Silence','静かな山の時間を切り取った映像作品。','YAMA FILM','¥1,200'],['t1','4K','Creator Masterclass','作品づくりから販売までを体系的に学ぶ。','Nova Studio','¥2,980'],['t2','4K','Cinematic Travel Pack','旅の映像を美しく仕上げる撮影と編集。','Luma Collective','¥2,280'],['t3','1080P','Build Your Digital Product','アイデアをデジタル商品へ変える実践ガイド。','Alex Rivera','¥3,480'],['t4','4K','Motion Design Toolkit','モーションデザインの制作フローを実践。','Mika Chen','¥1,780'],['t5','COURSE','Designing Ideas','アイデアを整理し、伝わる形へデザインする。','Frame Lab','¥2,480']
].map(x=>card(asset[x[0]],x[1],x[2],x[3],x[4],x[5])).join('')+'</div></section>';
}else if(type==='genre-rail'){
html='<section class="vm-pv-section">'+head(d.k,d.t)+'<div class="vm-pv-rail">'+[['映画のような映像','12,400作品'],['学びたい夜','3,820作品'],['旅に出る','5,160作品'],['音楽に浸る','2,940作品'],['大人の映像','18+ / 成人向け']].map(x=>'<div class="vm-pv-mood"><strong>'+x[0]+'</strong><span>'+x[1]+'</span></div>').join('')+'</div></section>';
}else if(type==='genre-recommendations'){
html='<section class="vm-pv-section">'+head(d.k,d.t,'','作品をもっと見る →')+'<div class="vm-pv-recs">'+[['r1','シネマティック','Night City Stories','NORTH LIGHTS'],['r2','クリエイター','Behind the Lens','KAI VISUALS'],['r3','ビジネス','Work, Ideas & People','STUDIO COMMON'],['r4','イベント','One Night Live','ROOM 09'],['r5','インタビュー','Creators at Work','FRAME LAB'],['r6','ラーニング','Learn by Making','MAKER CLASS']].map(x=>'<div class="vm-pv-rec">'+img(asset[x[0]],'',x[2])+'<div><small>'+x[1]+'</small><strong>'+x[2]+'</strong><span>by '+x[3]+'</span></div></div>').join('')+'</div></section>';
}else if(type==='spotlight'){
html='<section class="vm-pv-feature"><div><span class="vm-pv-kicker">'+d.k+'</span><h3>今、観てほしい<br>作品たち。</h3><p class="vm-pv-copy">'+d.p+'</p><div class="vm-pv-actions"><a class="vm-pv-primary" href="#">おすすめ作品を見る →</a></div></div><div class="vm-pv-stack">'+[['t9','01','THE CRAFTSMEN','¥1,680'],['t7','02','KYOTO IN MOTION','¥1,380'],['t8','03','NIGHT SESSION','¥680']].map(x=>'<div class="vm-pv-mini" style="background-image:linear-gradient(90deg,#10151eee,#10151d55),url('+asset[x[0]]+')"><b>'+x[1]+'</b><span>'+x[2]+'</span><strong>'+x[3]+'</strong></div>').join('')+'</div></section>';
}else if(type==='finder'){
html='<section class="vm-pv-finder"><div><span class="vm-pv-kicker">'+d.k+'</span><h3>'+title+'</h3><p class="vm-pv-copy">'+subtitle+'</p></div><div class="vm-pv-find-ui"><input placeholder="タイトル、キーワード、クリエイター"><div class="vm-pv-chips">'+['教育','ビジネス','映像','クリエイティブ','ドキュメンタリー','音楽','旅'].map(x=>'<span>'+x+'</span>').join('')+'</div><div class="vm-pv-chips"><span>価格：すべて ⌄</span><span>評価：4.0以上 ⌄</span></div><a class="vm-pv-primary" href="'+esc(link)+'">'+esc(content.button||'検索する')+' →</a></div></section>';
}else if(type==='categories'){
html='<section class="vm-pv-section">'+head(d.k,d.t)+'<div class="vm-pv-category-grid">'+[['c1','EDUCATION','教育・学習'],['c2','BUSINESS','ビジネス・仕事'],['c3','CREATIVE','映像・クリエイティブ'],['c4','DOCUMENTARY','ドキュメンタリー'],['c5','LIFESTYLE','ライフスタイル']].map(x=>'<div class="vm-pv-cat" style="background-image:url('+asset[x[0]]+')"><strong>'+x[1]+'</strong><span>'+x[2]+' / →</span></div>').join('')+'</div></section>';
}else if(type==='library'){
html='<section class="vm-pv-library"><div><span class="vm-pv-kicker">'+d.k+'</span><h3>'+title+'</h3><p class="vm-pv-copy">'+subtitle+'</p><a class="vm-pv-primary" href="'+esc(link)+'">'+esc(content.button||'マイライブラリを見る')+' →</a></div><div class="vm-pv-flow">'+[['01','購入','安全なデモ決済'],['02','保存','マイライブラリ'],['03','視聴','いつでも楽しめる'],['04','DL','購入作品を保存']].map(x=>'<div class="vm-pv-flow-card"><span>'+x[0]+'</span><b>'+x[1]+'</b><small>'+x[2]+'</small></div>').join('')+'</div></section>';
}else if(type==='creator'){
html='<section class="vm-pv-creator"><div class="vm-pv-creator-art"><div class="vm-pv-orb"></div></div><div><span class="vm-pv-kicker">'+d.k+'</span><h3>'+title+'</h3><p class="vm-pv-copy">'+subtitle+'</p><div class="vm-pv-chips"><span>✓ 商品登録</span><span>✓ 動画アップロード</span><span>✓ 売上管理</span><span>✓ 出金申請</span></div><a class="vm-pv-primary" href="'+esc(link)+'">'+esc(content.button||'販売を始める')+' →</a></div></section>';
}else if(type==='creators'){
html='<section class="vm-pv-section">'+head(d.k,d.t,'','すべて見る')+'<div class="vm-pv-people">'+[['a1','Aki Studio','映像・ドキュメンタリー'],['a2','KEN FILMS','シネマティック映像'],['a3','FRAME LAB','教育・クリエイティブ'],['a4','YAMA FILM','旅・ライフスタイル']].map(x=>'<div class="vm-pv-person"><div class="vm-pv-avatar" style="background-image:url('+asset[x[0]]+')"></div><strong>'+x[1]+'</strong><span>'+x[2]+'</span></div>').join('')+'</div></section>';
}else if(type==='cta'){
html='<section class="vm-pv-cta"><div class="vm-pv-cta-image" style="background-image:url('+asset.cta+')"></div><span class="vm-pv-kicker">'+d.k+'</span><h3>まだ知らない映像と、<br><em>出会う。</em></h3><p>'+d.p+'</p><div class="vm-pv-actions"><a class="vm-pv-primary" href="'+esc(link)+'">'+esc(content.button||'動画を探す')+' →</a><a class="vm-pv-secondary" href="#">販売を始める</a></div></section>';
}else{html='<section class="vm-pv-section">'+head(d.k,title,subtitle)+'</section>';}
sectionWrap(html);
}

function getPreviewSettings(section){
const settings={...(section.settings||{})};
specificSettings.querySelectorAll('[data-setting-key]').forEach(input=>{settings[input.dataset.settingKey]=input.value;});
return settings;
}
function renderSpecificSettings(item){
specificSettings.replaceChildren();const fields=sectionOptions[item.type]||[];
if(!fields.length){const note=document.createElement('p');note.className='section-setting-note';note.textContent='このセクションは、見出し・説明文・画像・ボタンとデザイン設定を編集できます。';specificSettings.append(note);return;}
fields.forEach(field=>{const label=document.createElement('label');label.textContent=field.label;const select=document.createElement('select');select.dataset.settingKey=field.key;
field.options.forEach(([value,text])=>{const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);});
select.value=(item.settings&&item.settings[field.key])||field.options[0][0];label.append(select);specificSettings.append(label);});
}
contentImage.addEventListener('input',()=>{const preview=document.getElementById('section-content-image-preview');preview.src=contentImage.value.trim();preview.hidden=!contentImage.value.trim();});
bindPageImageUpload(document.getElementById('section-content-image-file'),contentImage,document.getElementById('section-content-image-preview'));
[contentTitle,contentSubtitle,contentButton,contentLink,contentImage,sectionName,sectionBg,sectionAccent,sectionRadius,sectionThemeText,sectionThemeButtonText,sectionThemeWidth,sectionThemeSpacing,sectionThemeImageFit].forEach(input=>{if(input){input.addEventListener('input',renderSectionEditorPreview);input.addEventListener('change',renderSectionEditorPreview);}});
sectionItemsEditor.addEventListener('input',renderSectionEditorPreview);sectionItemsEditor.addEventListener('change',renderSectionEditorPreview);specificSettings.addEventListener('input',renderSectionEditorPreview);specificSettings.addEventListener('change',renderSectionEditorPreview);

function closeSectionEditor(){sectionEditor.hidden=true;editor.hidden=false;editingSectionIndex=null;editor.scrollIntoView({behavior:'smooth',block:'start'});}
function saveSection(){
if(editingSectionIndex===null)return;
const item=sectionState[editingSectionIndex];const label=sectionName.value.trim();if(!label){sectionEditorStatus.textContent='セクション名を入力してください。';return;}
item.label=label;item.hidden=sectionStatus.value==='非表示';
item.content={title:contentTitle.value.trim(),subtitle:contentSubtitle.value.trim(),button:contentButton.value.trim(),link:contentLink.value.trim(),image:contentImage.value.trim()};
item.items=Array.from(sectionItemsEditor.querySelectorAll('.section-item-card')).map(card=>{const data={};card.querySelectorAll('[data-item-key]').forEach(input=>data[input.dataset.itemKey]=input.value.trim());return data;}).filter(entry=>Object.values(entry).some(value=>value));
item.settings=item.settings||{};specificSettings.querySelectorAll('[data-setting-key]').forEach(input=>{item.settings[input.dataset.settingKey]=input.value;});
try{localStorage.setItem(THEME_PREFIX+(editingId||'new')+'-'+item.id,JSON.stringify({bg:sectionBg.value,accent:sectionAccent.value,radius:sectionRadius.value,text:sectionThemeText.value,buttonText:sectionThemeButtonText.value,width:sectionThemeWidth.value,spacing:sectionThemeSpacing.value,imageFit:sectionThemeImageFit.value}));}catch(e){}
renderSections();if(editingId){try{localStorage.setItem(SECTION_PREFIX+editingId,JSON.stringify(sectionState));if(editingId==='top')localStorage.setItem('vm-demo-homepage-sections',JSON.stringify(sectionState));}catch(e){sectionEditorStatus.textContent='このブラウザに保存できませんでした。';return;}}sectionEditorStatus.textContent='編集内容を反映しました。ページ編集画面で下書き保存すると確定します。';
}
function openEditor(page,sectionIndex=null){if(page.id==='top'){window.location.href='/pages/admin-setting-general.html';return;}editingId=page.id;document.getElementById('page-management').hidden=true;editorTitle.textContent=page.name+'を編集';fillParents(editingId);nameInput.value=page.name;urlInput.value=page.url;statusInput.value=page.status;parentInput.value=page.parent||'';loadPageSettings(page.id);loadPageMetadata(page.id);editor.hidden=false;editor.scrollIntoView({behavior:'smooth',block:'start'});nameInput.focus();if(sectionIndex!==null)openSectionEditor(sectionIndex);}
function newPage(){document.getElementById('page-management').hidden=true;editingId=null;editorTitle.textContent='新しいページを作成';fillParents(null);nameInput.value='';urlInput.value='';statusInput.value='下書き';parentInput.value='';sectionState=[];renderSections();resetPageMetadata();editor.hidden=false;editor.scrollIntoView({behavior:'smooth',block:'start'});nameInput.focus();}
function closeEditor(){editor.hidden=true;editingId=null;document.getElementById('page-management').hidden=false;}
async function savePage(){
const name=nameInput.value.trim();
let url=urlInput.value.trim();
if(!name){editorStatus.textContent='ページ名を入力してください。';return false;}
if(!url){url='/pages/page-'+Date.now();urlInput.value=url;}
if(!url.startsWith('/')){editorStatus.textContent='URLは / から始まるパスを入力してください。';return false;}
const data={name,url,status:statusInput.value,parent:parentInput.value};
const wasNew=!editingId;
let pageId=editingId;
if(editingId){
const page=pages.find(p=>p.id===editingId);
if(!page)return false;
Object.assign(page,data);
}else{
pageId='page-'+Date.now();
pages.push({id:pageId,...data,locked:false,createdByEditor:true});
editingId=pageId;
}
sectionState.forEach((item,i)=>item.order=i);
try{
if(wasNew){
sectionState.forEach(item=>{
const draftThemeKey=THEME_PREFIX+'new-'+item.id;
const draftTheme=localStorage.getItem(draftThemeKey);
if(draftTheme){
localStorage.setItem(THEME_PREFIX+pageId+'-'+item.id,draftTheme);
localStorage.removeItem(draftThemeKey);
}
});
}
localStorage.setItem(SECTION_PREFIX+pageId,JSON.stringify(sectionState));
savePageEditorMetadata(pageId);
}catch(e){
editorStatus.textContent='ページ内容を保存できませんでした。ブラウザの保存容量を確認してください。';
return false;
}
if(!save()){
editorStatus.textContent='保存できませんでした。';
return false;
}
editorTitle.textContent=name+'を編集';
editorStatus.textContent='サーバーに保存しています…';
try{
await persistEditorSettings();

editorStatus.textContent=statusInput.value==='公開'
? '公開しました: '+url
: '下書きを保存しました。';
renderPageList();
return true;
}catch(error){
editorStatus.textContent=error instanceof Error&&error.message
? error.message
: 'ページ設定のサーバー保存に失敗しました。運営者ログイン状態とサーバーログを確認してください。';
return false;
}
}
document.getElementById('new-page').addEventListener('click',newPage);
document.getElementById('cancel-page').addEventListener('click',closeEditor);
document.getElementById('save-page').textContent='下書き保存';
document.getElementById('save-page').addEventListener('click',()=>{statusInput.value='下書き';savePage();});
document.getElementById('save-page-bottom').addEventListener('click',()=>{statusInput.value='下書き';savePage();});
document.getElementById('run-publish-check').addEventListener('click',runPublishCheck);
document.getElementById('publish-page').addEventListener('click',async()=>{const result=runPublishCheck();if(!result.ok){editorStatus.textContent='公開前チェックで未完了の項目があります。';return;}statusInput.value='公開';await savePage();});
document.getElementById('close-section-editor').addEventListener('click',closeSectionEditor);
document.getElementById('cancel-section').addEventListener('click',closeSectionEditor);
document.getElementById('save-section').addEventListener('click',saveSection);
document.getElementById('add-section-item').addEventListener('click',()=>{if(editingSectionIndex===null)return;appendSectionItem({},sectionItemsEditor.querySelectorAll('.section-item-card').length);});
function renderPageList() {
  const root = document.getElementById('managed-pages-list');
  if (!root) return;
  root.replaceChildren();
  if (!pages.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'まだ独立ページがありません。「新しいページを作成」から追加してください。';
    root.appendChild(empty);
    return;
  }
  pages.forEach((page, index) => {
    const row = document.createElement('div');
    row.className = 'homepage-section-row';
    const title = document.createElement('div');
    title.className = 'homepage-section-title';
    const name = document.createElement('strong');
    name.textContent = page.name;
    const meta = document.createElement('small');
    meta.textContent = (page.status === '公開' ? '公開' : '下書き') + ' ・ ' + page.url;
    title.append(name, meta);
    const actions = document.createElement('div');
    actions.className = 'homepage-section-actions';
    const addButton = (label, disabled, handler, primary) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn' + (primary ? ' primary' : '');
      button.textContent = label;
      button.disabled = disabled;
      button.addEventListener('click', handler);
      actions.appendChild(button);
    };
    addButton('↑', index === 0, () => move(index, -1));
    addButton('↓', index === pages.length - 1, () => move(index, 1));
    addButton('編集', false, () => openEditor(page), true);
    addButton('削除', false, () => removePage(page));
    row.append(title, actions);
    root.appendChild(row);
  });
}
document.getElementById('homepage-add-section').addEventListener('click',()=>{
  const type = document.getElementById('homepage-add-type').value;
  const definition = definitions.find(item => item.key === type);
  if (!definition) return;
  sectionState.push({id:type+'-'+Date.now(),type,label:definition.label,hidden:false,added:true,order:sectionState.length,content:{}});
  renderSections();
});
function runPublishCheck(){
  const name=nameInput.value.trim();
  let url=urlInput.value.trim();
  if(name&&!url){url='/pages/page-'+Date.now();urlInput.value=url;}
  const visibleSections=sectionState.filter(item=>item&&!item.hidden).length;
  const heroHasContent=['hero-kicker','hero-headline','hero-copy','hero-background-image'].some(id=>{
    const field=document.getElementById(id);
    return !!field&&field.value.trim()!=='';
  });
  const hasVisibleContent=visibleSections>0||heroHasContent;
  const duplicateUrl=pages.some(page=>page.id!==editingId&&page.url===url);
  const checks=[
    {label:'ページ名が入力されている',ok:!!name},
    {label:'URLが / から始まっている',ok:!!url&&url.startsWith('/')},
    {label:'URLが他のページと重複していない',ok:!!url&&!duplicateUrl},
    {label:'既存の固定ページとURLが重複していない',ok:!!url&&!RESERVED_PAGE_URLS.has(url)},
    {label:'表示するセクションがある',ok:hasVisibleContent},
    {label:'ページの説明が入力されている',ok:!!document.getElementById('page-description').value.trim(),optional:true},
    {label:'検索タイトルが入力されている',ok:!!document.getElementById('page-seo-title').value.trim(),optional:true}
  ];
  const box=document.getElementById('publish-checklist');
  box.replaceChildren();
  checks.forEach(item=>{
    const row=document.createElement('div');row.className='publish-check '+(item.ok?'is-ok':'is-warn');
    const label=document.createElement('span');label.textContent=item.label;
    const state=document.createElement('span');state.className='check-state';
    state.textContent=item.ok?'確認済み':item.optional?'任意・未入力':'要確認';
    row.append(label,state);box.append(row);
  });
  const ok=checks.filter(item=>!item.optional).every(item=>item.ok);
  editorStatus.textContent=ok?'必須項目を確認しました。':'必須項目を確認してください。';
  return {ok};
}
bindPageImageUpload(document.getElementById('hero-background-image-file'),document.getElementById('hero-background-image'),document.getElementById('hero-image-preview'));
loadServerEditorSettings().then(() => {
  load();
  pages = pages.filter(page => page && page.id !== 'top' && !RESERVED_PAGE_URLS.has(page.url));
  save();
  renderPageList();
}).catch(() => {
  load();
  pages = pages.filter(page => page && page.id !== 'top');
  renderPageList();
});

})();

(function(){
const ids=['page-bg','page-text','page-accent','page-button-text','page-heading-size','page-content-width','page-card-shape','page-style'];
const $=id=>document.getElementById(id);
const defaults={bg:'#07090d',text:'#f4f4f5',accent:'#d9b45f',buttonText:'#101010',headingSize:'standard',contentWidth:'standard',cardShape:'rounded',style:'cinematic'};

function read(){const d={};ids.forEach(id=>{const el=$(id);if(el)d[({ 'page-bg':'bg','page-text':'text','page-accent':'accent','page-button-text':'buttonText','page-heading-size':'headingSize','page-content-width':'contentWidth','page-card-shape':'cardShape','page-style':'style'})[id]]=el.value;});return d;}
function preview(){const d=read(),name=$('page-name').value.trim()||'新しいページ',desc=$('page-description').value.trim()||'ページの説明がここに表示されます。';const branding=JSON.parse(localStorage.getItem('vm-demo-site-branding')||'{}'),brand=branding.siteName||'VIDEO MARKETPLACE',showPurchase=$('header-show-purchase')?.checked!==false,showSell=$('header-show-sell')?.checked!==false,showAccount=$('header-show-account')?.checked!==false,showCart=$('header-show-cart')?.checked!==false,menuOrder=$('header-menu-order')?.value||'cart,purchase,sell',footerDescription=$('footer-description')?.value.trim()||'映像との出会いを、もっと自由に。',footerShowLinks=$('footer-show-links')?.value!=='hide',footerCopyright=$('footer-copyright')?.value.trim()||'© VIDEO MARKETPLACE';const kicker=$('hero-kicker')?.value.trim()||'DISCOVER SOMETHING NEW',headline=$('hero-headline')?.value||name,heroCopy=$('hero-copy')?.value.trim()||desc,buttonLabel=$('hero-button-label')?.value.trim()||'詳しく見る',buttonUrl=$('hero-button-url')?.value.trim()||'#preview-content',imageUrl=$('hero-background-image')?.value.trim()||'',imagePosition=$('hero-image-position')?.value||'center',imageFit=$('hero-image-fit')?.value||'cover';$('preview-brand').textContent=brand;$('preview-header-actions').textContent=menuOrder.split(',').map(key=>({cart:showCart?'カート':'',purchase:showPurchase?'動画を購入する':'',sell:showSell?'動画を販売する':''}[key]||'')).concat(showAccount?'ログイン':'').filter(Boolean).filter(Boolean).join('　')||'ナビゲーション非表示';$('preview-footer-description').textContent=footerDescription;$('preview-footer-links').hidden=!footerShowLinks;$('preview-copyright').textContent=footerCopyright;$('preview-title').textContent=headline;$('preview-title').style.whiteSpace='pre-line';$('preview-description').textContent=heroCopy;$('preview-button').textContent=buttonLabel;$('preview-button').setAttribute('href',buttonUrl);document.querySelector('.preview-kicker').textContent=kicker;const hero=document.querySelector('.preview-hero');hero.style.backgroundImage=imageUrl?('linear-gradient(145deg,rgba(0,0,0,.38),rgba(0,0,0,.18)),url("'+imageUrl.replace(/["\\]/g,'')+'")'):'linear-gradient(145deg,rgba(255,255,255,.04),transparent 70%)';hero.style.backgroundSize=imageFit;hero.style.backgroundPosition=imagePosition;const heroImagePreview=$('hero-image-preview');heroImagePreview.src=imageUrl;heroImagePreview.hidden=!imageUrl;const p=$('page-preview');p.style.background=d.bg;p.style.color=d.text;p.style.setProperty('--preview-accent',d.accent);p.style.setProperty('--preview-radius',d.cardShape==='square'?'0':'12px');$('preview-title').style.fontSize=d.headingSize==='large'?'2.3rem':d.headingSize==='compact'?'1.35rem':'1.8rem';$('preview-button').style.background=d.accent;$('preview-button').style.color=d.buttonText;$('preview-button').style.borderRadius=d.cardShape==='square'?'0':'10px';p.classList.toggle('is-wide',d.contentWidth==='wide');p.classList.toggle('is-narrow',d.contentWidth==='narrow');p.classList.toggle('is-minimal',d.style==='minimal');p.classList.toggle('is-editorial',d.style==='editorial');[['page-bg','page-bg-value'],['page-text','page-text-value'],['page-accent','page-accent-value'],['page-button-text','page-button-text-value']].forEach(([a,b])=>{if($(b))$(b).textContent=$(a).value.toUpperCase();});const list=$('preview-section-list'),sections=$('homepage-section-list');if(list&&sections){list.replaceChildren();sections.querySelectorAll('.homepage-section-row').forEach(row=>{if(row.dataset.hidden==='true')return;const chip=document.createElement('div');chip.className='preview-section-chip';chip.style.backgroundColor=row.dataset.themeBg||'rgba(255,255,255,.035)';if(row.dataset.themeText)chip.style.color=row.dataset.themeText;chip.style.borderColor=row.dataset.themeAccent||'rgba(255,255,255,.13)';chip.style.borderRadius=row.dataset.themeRadius==='square'?'0':'var(--preview-radius)';chip.style.padding=row.dataset.themeSpacing==='compact'?'7px 9px':row.dataset.themeSpacing==='large'?'18px 16px':'12px 13px';chip.style.maxWidth=row.dataset.themeWidth==='narrow'?'78%':row.dataset.themeWidth==='wide'?'100%':'92%';chip.style.marginInline=row.dataset.themeWidth==='narrow'?'auto':'0';const title=document.createElement('strong');title.textContent=row.dataset.previewTitle||row.querySelector('.homepage-section-title strong')?.textContent||'';chip.append(title);const description=row.dataset.previewDescription||'';if(description){const copy=document.createElement('p');copy.textContent=description;chip.append(copy);}if(row.dataset.previewImage){const sectionImg=document.createElement('img');sectionImg.src=row.dataset.previewImage;sectionImg.alt=row.dataset.previewTitle||'';sectionImg.loading='lazy';sectionImg.style.display='block';sectionImg.style.width='100%';sectionImg.style.maxHeight='92px';sectionImg.style.objectFit=row.dataset.themeImageFit||'cover';sectionImg.style.marginTop='8px';chip.append(sectionImg);}if(row.dataset.previewButton){const sectionButton=document.createElement('span');sectionButton.textContent=row.dataset.previewButton;sectionButton.style.display='inline-block';sectionButton.style.marginTop='8px';sectionButton.style.padding='6px 10px';sectionButton.style.background=row.dataset.themeAccent||'var(--preview-accent)';sectionButton.style.color=row.dataset.themeButtonText||'#101010';sectionButton.style.borderRadius=row.dataset.themeRadius==='square'?'0':'7px';chip.append(sectionButton);}const count=Number(row.dataset.itemCount||0);if(count){const meta=document.createElement('small');meta.textContent='掲載項目 '+count+'件';chip.append(meta);}let items=[];try{items=JSON.parse(row.dataset.previewItems||'[]');}catch(e){}items.forEach(entry=>{const itemCard=document.createElement('div');itemCard.style.marginTop='10px';itemCard.style.padding='9px';itemCard.style.border='1px solid rgba(255,255,255,.12)';itemCard.style.borderRadius=row.dataset.themeRadius==='square'?'0':'8px';if(entry.image){const img=document.createElement('img');img.src=entry.image;img.alt=entry.title||'';img.loading='lazy';img.style.display='block';img.style.width='100%';img.style.maxHeight='74px';img.style.objectFit=row.dataset.themeImageFit||'cover';img.style.marginBottom='7px';itemCard.append(img);}if(entry.title){const itemTitle=document.createElement('strong');itemTitle.textContent=entry.title;itemTitle.style.display='block';itemCard.append(itemTitle);}if(entry.description){const itemCopy=document.createElement('p');itemCopy.textContent=entry.description;itemCopy.style.margin='5px 0 0';itemCard.append(itemCopy);}if(entry.button){const itemButton=document.createElement('small');itemButton.textContent=entry.button;itemButton.style.display='inline-block';itemButton.style.marginTop='6px';itemButton.style.background=row.dataset.themeAccent||'var(--preview-accent)';itemButton.style.color=row.dataset.themeButtonText||'#101010';itemButton.style.padding='4px 7px';itemButton.style.borderRadius=row.dataset.themeRadius==='square'?'0':'5px';itemCard.append(itemButton);}chip.append(itemCard);});list.append(chip);});}}
function applyDefaults(){Object.entries(defaults).forEach(([k,v])=>{const map={bg:'page-bg',text:'page-text',accent:'page-accent',buttonText:'page-button-text',headingSize:'page-heading-size',contentWidth:'page-content-width',cardShape:'page-card-shape',style:'page-style'};if($(map[k]))$(map[k]).value=v;});preview();}
ids.forEach(id=>{if($(id)){$(id).addEventListener('input',preview);$(id).addEventListener('change',preview);}});
['page-name','page-description','hero-kicker','hero-headline','hero-copy','hero-background-image','hero-button-label','hero-button-url','hero-image-position','hero-image-fit'].forEach(id=>{if($(id)){ $(id).addEventListener('input',preview);$(id).addEventListener('change',preview); }});
$('new-page').addEventListener('click',()=>{applyDefaults();setTimeout(preview,0);});
['header-show-purchase','header-show-sell','header-show-account','header-show-cart','footer-description','footer-show-links','footer-copyright'].forEach(id=>{const el=$(id);if(el){el.addEventListener('input',preview);el.addEventListener('change',preview);}});

const add=$('homepage-add-section');if(add)add.addEventListener('click',()=>setTimeout(preview,0));
const previewPanel=$('page-preview');$('preview-button').addEventListener('click',event=>event.preventDefault());document.querySelectorAll('[data-preview-mode]').forEach(button=>button.addEventListener('click',()=>{const mobile=button.dataset.previewMode==='mobile';previewPanel.classList.toggle('is-mobile',mobile);previewPanel.classList.toggle('is-desktop',!mobile);document.querySelectorAll('[data-preview-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
document.querySelectorAll('[data-design-preset]').forEach(button=>button.addEventListener('click',()=>{const presets={cinematic:{bg:'#07090d',text:'#f4f4f5',accent:'#d9b45f',buttonText:'#101010',headingSize:'large',contentWidth:'wide',cardShape:'rounded',style:'cinematic'},minimal:{bg:'#111318',text:'#f4f4f5',accent:'#e5e7eb',buttonText:'#111318',headingSize:'standard',contentWidth:'narrow',cardShape:'square',style:'minimal'},editorial:{bg:'#17130f',text:'#f8f1e7',accent:'#d6a96b',buttonText:'#17130f',headingSize:'large',contentWidth:'standard',cardShape:'square',style:'editorial'}};const preset=presets[button.dataset.designPreset];if(!preset)return;const map={bg:'page-bg',text:'page-text',accent:'page-accent',buttonText:'page-button-text',headingSize:'page-heading-size',contentWidth:'page-content-width',cardShape:'page-card-shape',style:'page-style'};Object.entries(preset).forEach(([key,value])=>$(map[key]).value=value);preview();}));
const list=$('homepage-section-list');if(list)new MutationObserver(preview).observe(list,{childList:true,subtree:true});
})();
