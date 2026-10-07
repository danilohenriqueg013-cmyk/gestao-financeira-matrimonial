(()=>{
  const C=window.__GFM,V=window.GFMV4,G=window.G;if(!C||!V||!G)return;
  const {S,esc,brl,today,num,by,pname,toast,api,render:baseRender,mutate,optionPeople,optionCards}=C,H=V.helpers;
  const PHOTO=window.GFMV5_PHOTO||'';
  const money=n=>Math.round((Number(n)||0)*100)/100;
  const marker=(kind,value)=>`[${kind}:${encodeURIComponent(String(value??''))}]`;
  const markerValue=(notes,kind)=>{const m=String(notes||'').match(new RegExp(`\\[${kind}:([^\\]]+)\\]`));if(!m)return null;try{return decodeURIComponent(m[1])}catch{return m[1]}};
  const splitValue=(value,count,index)=>{const base=Math.floor(money(value)*100/count)/100;return index===count-1?money(value-base*(count-1)):base};
  const oldLayout=V.layout;
  function decorate(html){
    if(PHOTO)html=html.replace(/(<div class="logo photo"><img src=")[^"]+("[^>]*>)/,`$1${PHOTO}$2`);
    html=html.replace(/(<nav class="nav">)([\s\S]*?)(<\/nav>)/,(_,a,b,c)=>`${a}${b}<button class="${S.page==='categories'?'active':''}" onclick="G.go('categories')">▦ &nbsp;Categorias</button>${c}`);
    html=html.replace(/(<nav class="mobile">)([\s\S]*?)(<\/nav>)/,(_,a,b,c)=>`${a}${b}<button class="${S.page==='categories'?'active':''}" onclick="G.go('categories')"><span>▦</span>Categorias</button>${c}`);
    if(S.page==='categories')html=html.replace(/<h1>[^<]*<\/h1>/,'<h1>Categorias</h1>');return html;
  }
  V.layout=body=>decorate(oldLayout(body));
  function renderV5(){if(S.loading||!S.session||!S.hid||S.page!=='categories'||!V.categories){baseRender();return}C.app.innerHTML=V.layout(V.categories())}
  G.go=p=>{S.page=p;S.modal=null;renderV5()};
  G.modal=(kind,arg=null,id=null)=>{S.modal={kind,arg,id};renderV5()};
  G.close=()=>{S.modal=null;renderV5()};
  G.theme=()=>{S.dark=!S.dark;document.documentElement.dataset.theme=S.dark?'dark':'light';localStorage.setItem('gfm-theme',S.dark?'dark':'light');renderV5()};
  G.refresh=async()=>{await C.load();if(S.page==='categories')renderV5()};
  window.GFMV5={C,V,G,S,H,esc,brl,today,num,by,pname,toast,api,mutate,optionPeople,optionCards,money,marker,markerValue,splitValue,renderV5};
  baseRender();
})();
