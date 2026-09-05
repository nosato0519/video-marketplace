function goHome(){hideWorkspace();window.scrollTo({top:0,behavior:'smooth'});}
function goBrowse(){hideWorkspace();setTimeout(()=>document.getElementById('market').scrollIntoView({behavior:'smooth'}),20);}
function goCategories(){hideWorkspace();setTimeout(()=>document.getElementById('categorySection').scrollIntoView({behavior:'smooth'}),20);}
function showBuyer(){activeTab='library';login('buyer').then(()=>{renderRole();document.getElementById('workspace').scrollIntoView({behavior:'smooth'});}).catch(e=>toast(e.message));}
function showSeller(){activeTab='overview';login('seller').then(()=>sellerView()).catch(e=>toast(e.message));}
function showAdmin(){activeTab='overview';login('admin').then(()=>adminView()).catch(e=>toast(e.message));}
function loginModal(){openModal(`<span class="eyebrow">Demo access</span><h2>Choose a workspace</h2><p class="muted">No real credentials are required. This switches the server-backed demo session.</p><div class="actions"><button class="btn primary" onclick="closeModal();login('buyer')">Buyer</button><button class="btn" onclick="closeModal();showSeller()">Seller</button><button class="btn" onclick="closeModal();showAdmin()">Admin</button></div>`);}
function openModal(html){document.getElementById('modal').innerHTML=`<div class="modal"><button class="x" onclick="closeModal()" aria-label="Close">×</button>${html}</div>`;showModal();}
function renderRole(){const workspace=document.getElementById('workspace');workspace.classList.add('show');if(state.role==='buyer')workspace.innerHTML=buyerView();else if(state.role==='seller')sellerView();else adminView();}

function polishCustomerExperience(){
  document.title='VIDORA — 動画を探す、買う、売る';
  const nav=document.querySelector('.links');
  if(nav){
    const buttons=nav.querySelectorAll('button');
    if(buttons[0])buttons[0].textContent='ホーム';
    if(buttons[1])buttons[1].textContent='動画を探す';
    if(buttons[2])buttons[2].textContent='カテゴリー';
    if(buttons[3])buttons[3].textContent='購入した動画';
    if(buttons[4])buttons[4].textContent='動画を販売する';
    if(buttons[5])buttons[5].style.display='none';
  }
  const topBtns=document.querySelectorAll('.right .btn');
  if(topBtns[0])topBtns[0].textContent='ログイン';
  if(topBtns[1])topBtns[1].textContent='動画を販売する';
  const eyebrow=document.querySelector('#hero .eyebrow');
  if(eyebrow)eyebrow.textContent='VIDEO MARKETPLACE';
  const heroTitle=document.querySelector('#hero h1');
  if(heroTitle)heroTitle.innerHTML='好きな動画を、<br><span>見つける。買う。楽しむ。</span>';
  const heroP=document.querySelector('#hero p');
  if(heroP)heroP.textContent='見たい動画を探して、安心して購入。購入した動画はマイページからいつでも視聴・ダウンロードできます。クリエイターは動画を登録して販売できます。';
  const heroActions=document.querySelectorAll('#hero .actions .btn');
  if(heroActions[0])heroActions[0].textContent='動画を探す →';
  if(heroActions[1])heroActions[1].textContent='動画を販売する';
  if(heroActions[2])heroActions[2].style.display='none';
  const trust=document.querySelector('.trust');
  if(trust){
    const items=trust.querySelectorAll('div');
    const copy=[['動画を探す','カテゴリー・検索から探せます'],['安心して購入','購入後すぐに利用可能'],['マイページ','視聴・ダウンロード'],['クリエイター','動画を登録して販売'],['安全な仕組み','権限チェックで保護']];
    items.forEach((el,i)=>{if(copy[i]){el.querySelector('b').textContent=copy[i][0];el.querySelector('small').textContent=copy[i][1];}});
  }
  const marketEy=document.querySelector('#market .eyebrow'); if(marketEy)marketEy.textContent='おすすめ';
  const marketH=document.querySelector('#market h2'); if(marketH)marketH.textContent='注目の動画';
  const marketP=document.querySelector('#market .head p'); if(marketP)marketP.textContent='気になる動画を選んで詳細を確認';
  const search=document.getElementById('search'); if(search)search.placeholder='動画タイトル・クリエイターを検索…';
  const filter=document.getElementById('filter'); if(filter)filter.options[0].textContent='すべてのカテゴリー';
  const catEy=document.querySelector('#categorySection .eyebrow'); if(catEy)catEy.textContent='カテゴリー';
  const catH=document.querySelector('#categorySection h2'); if(catH)catH.textContent='目的から動画を探す';
  const catP=document.querySelector('#categorySection .head p'); if(catP)catP.textContent='Adultは18歳以上の方のみご利用ください';
  const footer=document.querySelector('.footer'); if(footer)footer.textContent='VIDORA — 動画を探す・購入する・販売するためのマーケットプレイス。これは購入・視聴・販売の流れを確認できるデモです。';
  if(!document.getElementById('howItWorks')){
    const section=document.createElement('section');
    section.id='howItWorks';
    section.className='section';
    section.innerHTML=`<div class="head"><div><div class="eyebrow">HOW IT WORKS</div><h2>使い方は、かんたん3ステップ</h2></div></div><div class="cards" style="grid-template-columns:repeat(3,1fr)"><article class="panel"><div style="font-size:28px;font-weight:950">01</div><h3>動画を探す</h3><p class="muted">カテゴリーや検索から気になる動画を見つけ、詳細ページで内容・価格・クリエイターを確認します。</p></article><article class="panel"><div style="font-size:28px;font-weight:950">02</div><h3>購入する</h3><p class="muted">購入すると、その動画がマイページの「購入した動画」に追加されます。</p></article><article class="panel"><div style="font-size:28px;font-weight:950">03</div><h3>視聴・ダウンロード</h3><p class="muted">マイページから購入済み動画を視聴。権限が確認されたユーザーだけがダウンロードできます。</p></article></div>`;
    document.getElementById('categorySection').after(section);
  }
  const style=document.createElement('style');
  style.textContent='@media(max-width:650px){#howItWorks .cards{grid-template-columns:1fr!important}}';
  document.head.appendChild(style);
}

polishCustomerExperience();
window.goHome=goHome;window.goBrowse=goBrowse;window.goCategories=goCategories;window.showBuyer=showBuyer;window.showSeller=showSeller;window.showAdmin=showAdmin;window.loginModal=loginModal;window.openModal=openModal;window.renderRole=renderRole;
