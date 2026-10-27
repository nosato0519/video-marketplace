(function(){
const KEY='vm-demo-announcements';
const seed=[
{id:'a1',title:'VIDEO MARKETPLACEへようこそ',category:'お知らせ',status:'published',date:'2026-10-01',body:'VIDEO MARKETPLACEのサービスを開始しました。\n\n新しい映像作品との出会いをお楽しみください。'},
{id:'a2',title:'新しい作品を追加しました',category:'サービス',status:'published',date:'2026-09-28',body:'新しいクリエイターの作品を追加しました。\n\nぜひ作品一覧からチェックしてください。'}
];
let data=[],current=null;
const $=id=>document.getElementById(id);
async function load(){
  try{
    const response=await fetch('/api/admin/settings/page-editor',{credentials:'same-origin',cache:'no-store'});
    if(!response.ok)throw new Error('server_load_failed');
    const remote=await response.json();
    const raw=remote.entries&&remote.entries[KEY];
    if(typeof raw==='string'){
      const parsed=JSON.parse(raw);
      if(!Array.isArray(parsed))throw new Error('invalid_announcement_data');
      data=parsed;
    }else{
      data=[];
    }
    localStorage.setItem(KEY,JSON.stringify(data));
    return;
  }catch(error){
    try{
      const cached=JSON.parse(localStorage.getItem(KEY)||'null');
      data=Array.isArray(cached)?cached:[];
    }catch(_){data=[];}
  }
}
async function persist(){
  const serialized=JSON.stringify(data);
  const response=await fetch('/api/admin/settings/page-editor',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({merge:true,entries:{[KEY]:serialized}})});
  if(!response.ok)throw new Error('server_save_failed');
  localStorage.setItem(KEY,serialized);
}
function render(){
  const root=$('list');
  root.replaceChildren();
  if(!data.length){
    const empty=document.createElement('p');
    empty.className='muted';
    empty.textContent='お知らせはまだありません。「新しいお知らせ」から作成してください。';
    root.append(empty);
    return;
  }
  data.forEach(x=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='announce-item'+(x.id===current?' active':'');
    b.innerHTML='<strong></strong><small></small>';
    b.querySelector('strong').textContent=x.title;
    b.querySelector('small').textContent=(x.status==='published'?'公開':'下書き')+'　•　'+x.category+'　•　'+(x.date||'日付未設定');
    b.onclick=()=>{current=x.id;render();fill();};
    root.append(b);
  });
}
function fill(){
  const x=data.find(v=>v.id===current);
  $('title').value=x?.title||'';
  $('category').value=x?.category||'お知らせ';
  $('status').value=x?.status||'draft';
  $('date').value=x?.date||'';
  $('body').value=x?.body||'';
  $('state').textContent=x?(x.status==='published'?'公開':'下書き'):'未選択';
  $('editor-title').textContent=x?.title||'お知らせを編集';
  $('previewBox').hidden=true;
}
function collect(){const x=data.find(v=>v.id===current);if(!x)return;x.title=$('title').value.trim()||'無題のお知らせ';x.category=$('category').value;x.status=$('status').value;x.date=$('date').value;x.body=$('body').value;}
function msg(v){$('message').textContent=v;setTimeout(()=>$('message').textContent='サーバー保存を使用します。',2200);}
$('new').onclick=async()=>{const x={id:'a'+Date.now(),title:'新しいお知らせ',category:'お知らせ',status:'draft',date:'',body:''};data.unshift(x);current=x.id;render();fill();try{await persist();msg('新しいお知らせをサーバーに保存しました。');}catch(e){msg('サーバー保存に失敗しました。ログイン状態を確認してください。');}};
$('save').onclick=async()=>{if(!current){msg('先に「新しいお知らせ」から作成してください。');return;}collect();const x=data.find(v=>v.id===current);if(!x)return;x.status='draft';try{await persist();render();fill();msg('下書きをサーバーに保存しました。');}catch(e){msg('サーバー保存に失敗しました。ログイン状態を確認してください。');}};
$('publish').onclick=async()=>{if(!current){msg('先に「新しいお知らせ」から作成してください。');return;}collect();const x=data.find(v=>v.id===current);if(!x)return;if(!x.title||!x.body.trim()){msg('タイトルと本文を入力してください。');return;}x.status='published';if(!x.date)x.date=new Date().toISOString().slice(0,10);try{await persist();render();fill();msg('お知らせを公開し、公開サイトに反映しました。');}catch(e){msg('公開保存に失敗しました。ログイン状態を確認してください。');}};
$('preview').onclick=()=>{collect();const x=data.find(v=>v.id===current);$('previewTitle').textContent=x.title;$('previewMeta').textContent=x.category+'　•　'+(x.date||'公開日未設定');$('previewBody').textContent=x.body||'本文がありません。';$('previewBox').hidden=false;};
$('delete').onclick=async()=>{if(!current)return;if(!confirm('このお知らせを削除しますか？'))return;const previous=data.slice(),previousCurrent=current;data=data.filter(v=>v.id!==current);current=data[0]?.id||null;try{await persist();render();if(current)fill();else{$('editor-title').textContent='お知らせを編集';$('title').value='';$('body').value='';}msg('お知らせをサーバーから削除しました。');}catch(e){data=previous;current=previousCurrent;msg('削除のサーバー保存に失敗しました。');render();if(current)fill();}};
load().then(()=>{current=data[0]?.id||null;render();if(current)fill();}).catch(()=>{current=data[0]?.id||null;render();if(current)fill();});
})();
