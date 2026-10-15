(() => {
  'use strict';

  // One draft drives every selector, planning control and saved configuration.
  // Dimensions and finishes are prototype preferences, not inventory claims.
  const products = [
    {id:'core3',name:'Core3',tag:'Open and flexible',description:'An open frame for everyday work, with room to make it yours.',handle:'vernal-height-adjustable-standing-desk',keywords:'focus standard open everyday',series:'core',shape:'standard',scene:'hero.png'},
    {id:'core3-l',name:'Core3 L-Shaped',tag:'Room for more screens',description:'A corner layout for more equipment and a larger working surface.',handle:'vernal-l-shaped-standing-desk',keywords:'multi screen corner l-shaped',series:'core',shape:'l',scene:'lshape.png'},
    {id:'hardwood',name:'Core3 Solid Hardwood',tag:'Natural wood character',description:'An open frame with a solid hardwood surface direction.',handle:'vernal-solid-wood-standing-desk',keywords:'natural solid hardwood material wood',series:'core',shape:'standard',scene:'hardwood.png'},
    {id:'executive',name:'Executive',tag:'Presence and privacy',description:'Leg panels and a modesty panel create a more enclosed appearance.',handle:'vernal-standard-executive-standing-desk',keywords:'business privacy panels standard',series:'executive',shape:'standard',scene:'executive.png'},
    {id:'executive-l',name:'L-Shaped Executive',tag:'Business style, more space',description:'A panelled executive look with a corner working surface.',handle:'vernal-executive-standing-desk',keywords:'business privacy corner multi l-shaped',series:'executive',shape:'l',scene:'executive-lshape.png'}
  ];
  const extras = {
    shelf:{name:'Desk shelf',copy:'Raise the things you reach for.',detail:'A raised shelf direction for displays and everyday essentials. Your list stores this preference; select the exact compatible shelf on the official store.'},
    cables:{name:'Cable management',copy:'A place for the cables beneath.',detail:'Keep cables and power supplies together beneath the desk. Confirm the tray size and mounting requirements for your chosen desktop.'},
    chair:{name:'Chair',copy:'Complete your seated workspace.',detail:'Add a chair to your workspace plan. Seat height, adjustability and fit should be considered alongside your desk.'},
    storage:{name:'Storage',copy:'Room for everything else.',detail:'Give everyday essentials a place of their own. Leave room for the chair and desk movement before selecting a storage unit.'}
  };
  const productById = id => products.find(p => p.id === id) || products[0];
  const officialUrl = p => 'https://www.vernalspace.com/products/' + p.handle;
  const assetUrl = name => typeof window.__vernalAssetURL==='function'?window.__vernalAssetURL(name):'assets/'+name;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const on = (selector,type,handler) => $(selector)?.addEventListener(type,handler);
  const text = (selector,value) => {const el=$(selector);if(el)el.textContent=value;};
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finite = (value,min,max,fallback) => {const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:fallback;};
  const validWidths = [120,140,160,180];
  const finishes = ['Walnut','Maple'];
  const storageKey='vernal-workspace-v3';
  const defaults = {productId:'core3',width:140,roomWidth:240,roomDepth:240,deskDepth:75,chairSpace:90,returnDepth:140,orientation:'right',material:'laminate',finish:'Walnut',addons:[],quantity:1,heightMode:'stand',view:'wide',testMode:'standing',testAction:'typing',buildStep:'desk',comparisonSplit:50,cableReveal:50,intent:'focus'};
  let editingId = null;
  let beforeEdit = null;
  let activeAddon = null;
  let toastTimeout;
  let persistTimeout;
  let storageWarningShown = false;
  let planDraft = null;
  let saved = [];
  let undoRemoval = null;
  let inspectionStep=-1,inspectionPlaying=false,inspectionTimer=null;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let finderStep=0;
  let finderChoices={use:'focus',shape:'standard',material:'laminate'};
  let configurationTouched=false;

  function normalize(data={}) {
    const product=productById(data.productId || products.find(p=>p.name===data.desk)?.id);
    const rawWidth=Number(data.width);
    const addons=Array.isArray(data.addons)?data.addons.map(a=>extras[a]?a:Object.keys(extras).find(k=>extras[k].name===a)).filter(Boolean):[];
    return {...defaults,...data,
      productId:product.id,
      width:validWidths.includes(rawWidth)?rawWidth:140,
      roomWidth:finite(data.roomWidth,120,600,240),
      roomDepth:finite(data.roomDepth,120,600,240),
      deskDepth:finite(data.deskDepth,50,100,75),
      chairSpace:finite(data.chairSpace,50,150,90),
      returnDepth:finite(data.returnDepth,100,240,140),
      orientation:data.orientation==='left'?'left':'right',
      material:product.id==='hardwood'?'hardwood':'laminate',
      finish:product.id==='hardwood'&&data.finish==='Maple'?'Maple':'Walnut',
      addons:[...new Set(addons)],
      quantity:Math.round(finite(data.quantity,1,9,1)),
      heightMode:data.heightMode==='sit'?'sit':'stand',
      view:data.view==='detail'?'detail':'wide',
      testMode:data.testMode==='seated'?'seated':'standing',
      testAction:['typing','mouse','height'].includes(data.testAction)?data.testAction:'typing',
      buildStep:['desk','organise','sit','store'].includes(data.buildStep)?data.buildStep:'desk',
      comparisonSplit:finite(data.comparisonSplit,5,95,50),
      cableReveal:finite(data.cableReveal,5,95,50),
      intent:['focus','multi','business'].includes(data.intent)?data.intent:'focus'
    };
  }
  function readStorage(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
  const initialStored=readStorage(storageKey,{});
  let state=normalize(initialStored.draft||defaults);
  const stored=initialStored.saved||null;
  const legacy=stored===null?readStorage('vernal-workspace-v1',[]):stored;
  if(Array.isArray(legacy)) saved=legacy.filter(x=>x&&typeof x==='object').slice(0,30).map((x,i)=>({...normalize(x),id:String(x.id||('migrated-'+i)),name:typeof x.name==='string'?x.name.slice(0,80):'',createdAt:x.createdAt||new Date().toISOString()}));

  function persist(){
    clearTimeout(persistTimeout);
    persistTimeout=setTimeout(()=>{
      try {localStorage.setItem(storageKey,JSON.stringify({version:3,draft:state,saved}));}
      catch {if(!storageWarningShown){storageWarningShown=true;toast('Your choices are available for this session. Browser storage is unavailable.');}}
    },120);
  }
  function pressed(selector,predicate){$$(selector).forEach(b=>{const active=typeof predicate==='function'?predicate(b):b===predicate;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
  function toast(message,{actionLabel,onAction,duration=3300}={}){clearTimeout(toastTimeout);let host=$('#toast');const cart=$('#cart-dialog');if(cart?.open){host=$('#cart-feedback');if(!host){host=document.createElement('div');host.id='cart-feedback';host.className='cart-feedback';host.setAttribute('role','status');host.setAttribute('aria-live','polite');cart.append(host);}}$('#toast')?.classList.remove('show');if(!host)return;host.textContent=message;if(actionLabel&&onAction){const button=document.createElement('button');button.className='toast-action';button.textContent=actionLabel;button.addEventListener('click',()=>{onAction();host.classList.remove('show');});host.append(' ',button);}host.classList.add('show');toastTimeout=setTimeout(()=>host.classList.remove('show'),duration);}
  function openDialog(id){const dialog=$(id);if(!dialog)return;closePopover();if(dialog.open)return;if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}
  function closeDialog(id){const dialog=$(id);if(!dialog)return;if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');}
  function showInfo(html){const host=$('#dialog-content');if(!host)return;host.innerHTML=html;openDialog('#info-dialog');}
  function snapshot(){return {...state,addons:[...state.addons]};}
  function commit(patch,{announce}={}){state=normalize({...state,...patch});render();persist();if(announce)toast(announce);}

  function setProduct(value,{announce=false}={}) {
    const product=typeof value==='number'?products[value]:productById(value);
    if(!product)return;
    const intent=product.series==='executive'?'business':product.shape==='l'?'multi':'focus';
    const patch={productId:product.id,intent};
    patch.material=product.id==='hardwood'?'hardwood':'laminate';
    patch.finish=product.id==='hardwood'?(state.productId==='hardwood'?state.finish:'Maple'):'Walnut';
    configurationTouched=true;
    commit(patch,{announce:announce?product.name+' selected. All configuration controls are updated.':null});
  }
  function selectSeries(series){
    const shape=productById(state.productId).shape;
    setProduct(series==='executive'?(shape==='l'?'executive-l':'executive'):(shape==='l'?'core3-l':'core3'));
  }
  function dimensionFit(draft=state){
    const p=productById(draft.productId);
    const width=Number(draft.width),wall=Number(draft.roomWidth),depth=Number(draft.roomDepth);
    if(!String(draft.roomWidth).trim()||!Number.isFinite(wall)||wall<120||wall>600)return {valid:false,message:'Enter an available wall width between 120 and 600 cm.'};
    if(!validWidths.includes(width))return {valid:false,message:'Choose one of the four planning widths.'};
    if(!String(draft.roomDepth).trim()||!Number.isFinite(depth)||depth<120||depth>600)return {valid:false,message:'Enter an available room depth between 120 and 600 cm.'};
    const desktopDepth=Number(draft.deskDepth),chairSpace=Number(draft.chairSpace),returnDepth=Number(draft.returnDepth);
    if(!Number.isFinite(desktopDepth)||desktopDepth<50||desktopDepth>100)return {valid:false,message:'Enter a desktop depth between 50 and 100 cm.'};
    if(!Number.isFinite(chairSpace)||chairSpace<50||chairSpace>150)return {valid:false,message:'Enter a chair zone between 50 and 150 cm.'};
    if(p.shape==='l'&&(!Number.isFinite(returnDepth)||returnDepth<100||returnDepth>240||returnDepth<desktopDepth))return {valid:false,message:'Enter an L-return depth between 100 and 240 cm, at least as deep as the desktop.'};
    const deskDepth=p.shape==='l'?returnDepth:desktopDepth;
    const side=wall-width,front=depth-desktopDepth;
    const conflicts=[];
    if(side<0)conflicts.push(`The desk is ${Math.abs(side)} cm wider than the available wall.`);
    if(depth<deskDepth)conflicts.push(`The ${deskDepth} cm planning footprint exceeds the room depth.`);
    if(front<chairSpace)conflicts.push(`Only ${Math.max(0,front)} cm remains in front of the main desktop, less than your ${chairSpace} cm chair zone.`);
    if(p.shape==='l'&&width-desktopDepth<45)conflicts.push('The inner opening is narrower than the 45 cm chair width used in this illustrative diagram. Try a wider desktop or a shallower return.');
    const message=conflicts.length?conflicts.join(' '):`${side} cm remains along the wall; ${front} cm remains in front of the main desktop for your ${chairSpace} cm chair zone.`;
    return {valid:true,width,wall,depth,deskDepth,desktopDepth,chairSpace,side,front,conflicts,fits:conflicts.length===0,message};
  }
  function configurationLabel(draft=state){
    return `${productById(draft.productId).name} · ${draft.width} × ${draft.deskDepth} cm · ${draft.finish} · ${draft.addons.length} ${draft.addons.length===1?'addition':'additions'}`;
  }
  function configurationFingerprint(draft){return JSON.stringify([draft.productId,draft.width,draft.material,draft.finish,[...draft.addons].sort(),draft.roomWidth,draft.roomDepth,draft.deskDepth,draft.chairSpace,draft.returnDepth,draft.orientation]);}
  function configurationRecord(){return {...snapshot(),id:editingId||('ws-'+Date.now()+'-'+Math.random().toString(36).slice(2,6)),createdAt:new Date().toISOString(),name:saved.find(item=>item.id===editingId)?.name||''};}

  function saveConfiguration(){
    const mainDraft=valuesFromFields(planningFields,state),mainFit=dimensionFit(mainDraft);
    const invalidRoom=['#room-width','#room-depth','#desk-depth','#chair-space','#desk-return'].map(s=>$(s)).find(el=>el&&!el.disabled&&(!el.checkValidity()||!String(el.value).trim()));
    if(invalidRoom){invalidRoom.reportValidity();invalidRoom.focus();return;}
    if(!mainFit.valid){toast(mainFit.message);return;}
    const fit=dimensionFit();
    if(!fit.valid){toast(fit.message);return;}
    const record=configurationRecord();
    if(editingId){
      const index=saved.findIndex(item=>item.id===editingId);
      if(index>=0)saved[index]=record;else saved.push(record);
      editingId=null;beforeEdit=null;toast('Saved configuration updated.');
    }else{
      const existing=saved.find(item=>configurationFingerprint(item)===configurationFingerprint(record));
      if(existing){existing.quantity=Math.min(9,existing.quantity+state.quantity);render();persist();renderCart();toast('Matching configuration found. Its quantity is now '+existing.quantity+'.');return;}
      if(saved.length>=30){toast('Your list contains 30 configurations. Remove one to make room.');openCart();return;}
      saved.push(record);toast('Your complete workspace configuration is saved.');
    }
    render();persist();renderCart();
  }
  function editSaved(id){
    const item=saved.find(x=>x.id===id);if(!item)return;
    if(!editingId)beforeEdit=snapshot();
    editingId=id;state=normalize(item);render();persist();closeDialog('#cart-dialog');
    $('#build')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    toast('Editing '+productById(item.productId).name+'. Save changes when you are ready.');
  }
  function cancelEditing(){
    if(!editingId)return;
    state=normalize(beforeEdit||defaults);editingId=null;beforeEdit=null;render();persist();toast('Edit cancelled. Your saved configuration is unchanged.');
  }
  function downloadList(){
    if(!saved.length){toast('Save a configuration before downloading your list.');openCart();return;}
    const content='VERNAL — WORKSPACE DESIGN LIST\nPrototype preferences only. No order has been placed.\nDimensions and finishes are planning choices; confirm exact options and compatibility on the official store.\n\n'+saved.map((item,i)=>{
      const p=productById(item.productId);
      return `${i+1}. ${item.name||p.name}\nDesk: ${p.name}\nPlanning width × depth: ${item.width} × ${item.deskDepth} cm\nMaterial: ${item.material}\nFinish preference: ${item.finish}\nWorkspace: ${item.roomWidth} × ${item.roomDepth} cm\nChair zone: ${item.chairSpace} cm\n${p.shape==='l'?`L-return planning depth: ${item.returnDepth} cm\nReturn orientation: ${item.orientation}\n`:''}Quantity: ${item.quantity}\nAdditions: ${item.addons.map(key=>extras[key].name).join(', ')||'Desk only'}\nProduct: ${officialUrl(p)}`;
    }).join('\n\n');
    const blob=new Blob([content],{type:'text/plain;charset=utf-8'}),href=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=href;link.download='my-vernal-workspace.txt';link.click();setTimeout(()=>URL.revokeObjectURL(href),1500);toast('Your workspace list has been downloaded.');
  }

  function setImage(selector,filename,alt){
    const img=$(selector);if(!img)return;
    if(alt)img.alt=alt;
    if(img.dataset.asset===filename)return;
    img.dataset.asset=filename;
    img.classList.add('image-changing');
    const finish=()=>img.classList.remove('image-changing');
    img.addEventListener('load',finish,{once:true});img.addEventListener('error',finish,{once:true});
    img.src=assetUrl(filename);setTimeout(finish,400);
  }
  function currentScene(){const p=productById(state.productId);return p.id==='hardwood'&&state.finish==='Walnut'?'hero.png':p.scene;}
  function buildProductGrid(){
    const host=$('#product-grid');if(!host)return;
    host.innerHTML=products.map((p,i)=>`<article class="product-card"><button class="product-image" data-product="${i}" aria-pressed="false" aria-label="Preview ${escape(p.name)}"><img src="${escape(assetUrl(p.scene))}" alt="${escape(p.name)} concept scene" loading="lazy"></button><h3>${escape(p.name)}</h3><p>${escape(p.tag)}</p><div class="product-card-actions"><button class="text-link" data-configure="${i}">Configure →</button><a class="text-link" href="${officialUrl(p)}" target="_blank" rel="noopener">Details ↗</a></div></article>`).join('');
    $$('[data-product]').forEach(b=>b.addEventListener('click',()=>setProduct(Number(b.dataset.product))));
    $$('[data-configure]').forEach(b=>b.addEventListener('click',()=>{setProduct(Number(b.dataset.configure));goToBuild();}));
    const select=$('#build-product');if(select)select.innerHTML=products.map(p=>`<option value="${p.id}">${escape(p.name)}</option>`).join('');
    const widths=$('#build-width');if(widths)widths.innerHTML=validWidths.map(w=>`<option value="${w}">${w} cm</option>`).join('');
  }
  const intentions={focus:{first:'core3',second:'hardwood',copy:'Core3 keeps the frame open and flexible. Prefer a natural wood surface? Compare Solid Hardwood.'},multi:{first:'core3-l',second:'executive-l',copy:'Choose a corner layout for a wider working area. Compare open-frame Core3 with the panelled Executive form.'},business:{first:'executive',second:'executive-l',copy:'Executive adds leg coverings and a modesty panel. Choose the corner version when you need more working area.'}};
  function renderSelection(){
    const p=productById(state.productId),index=products.indexOf(p);
    $$('.product-card').forEach((card,i)=>{card.classList.toggle('active',i===index);card.querySelector('[data-product]')?.setAttribute('aria-pressed',String(i===index));});
    pressed('[data-intent]',b=>b.dataset.intent===state.intent);
    text('#selected-name',p.name);text('#selected-description',p.description);
    text('#desk-preview-name',p.name);text('#desk-preview-copy',p.description+' '+state.width+' cm planning width · '+state.finish+' finish preference.');
    setImage('#desk-preview-image',currentScene(),p.name+' — '+state.finish+' concept preview');
    setImage('#build-scene-image',currentScene(),p.name+' workspace concept. Accessories are planning preferences.');
    ['#selected-link','#preview-official','#build-product-link'].forEach(selector=>{const link=$(selector);if(link)link.href=officialUrl(p);});
    text('#build-product-link','View '+p.name+' on the official store ↗');
    text('#build-desk','Selected desk: '+p.name);
    const intent=intentions[state.intent];
    text('#recommendation','Selected: '+p.name+'. '+intent.copy);
    const select=$('#build-product');if(select)select.value=p.id;
    const widths=$('#build-width');if(widths)widths.value=String(state.width);
    const configure=$('#configure-selected');if(configure)configure.setAttribute('aria-label','Configure '+p.name);
    const material=state.material;
    pressed('[data-material]',b=>b.dataset.material===material);
    pressed('[data-finish]',b=>b.dataset.finish===state.finish);
    pressed('[data-wood]',b=>b.dataset.wood===state.finish.toLowerCase());
    const finish=$('#finish');if(finish)finish.value=state.finish;
    setImage('#material-image',state.finish==='Maple'?'wood-maple.png':'wood.png',state.finish+' tabletop texture concept');
    text('#wood-name',state.finish+' · concept finish preference');
    text('#material-description',material==='hardwood'?'Solid hardwood direction, shown in '+state.finish+'. Selecting this material updates your desk to Core3 Solid Hardwood.':'Laminate direction, shown in Walnut. Your current desk and finish are reflected in the builder.');
    const materialLink=$('#material-link');if(materialLink){materialLink.href=officialUrl(p);materialLink.innerHTML='Explore '+escape(p.name)+' <span>↗</span>';}
    text('#configuration-summary',configurationLabel());
    text('#sticky-config-title',configurationLabel());
    ['#add-to-list','#sticky-save'].forEach(selector=>{const btn=$(selector);if(btn)btn.innerHTML=editingId?'Save changes <span>✓</span>':'Save workspace <span>+</span>';});
    const banner=$('#edit-banner');if(banner){banner.hidden=!editingId;let label=banner.querySelector('.edit-description');if(!label){[...banner.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).forEach(node=>node.remove());label=document.createElement('span');label.className='edit-description';banner.prepend(label);}label.textContent='Editing your saved '+p.name+' configuration. ';}
  }
  function renderComparison(){
    const p=productById(state.productId),corner=p.shape==='l',executive=p.series==='executive';
    pressed('[data-series]',b=>b.dataset.series===p.series);
    pressed('[data-compare-shape]',b=>(b.dataset.compareShape==='corner')===corner);
    setImage('#comparison-photo',corner?'lshape.png':'hero.png','Core3 '+(corner?'L-shaped':'standard')+' desk concept');
    setImage('#comparison-executive',corner?'executive-lshape.png':'executive.png','Executive '+(corner?'L-shaped':'standard')+' desk concept');
    const stage=$('#comparison-stage');if(stage)stage.style.setProperty('--split',state.comparisonSplit+'%');
    const range=$('#comparison-range');if(range){range.value=state.comparisonSplit;range.setAttribute('aria-valuetext',state.comparisonSplit+'% Core3 view, '+(100-state.comparisonSplit)+'% Executive view');}
    text('.compare-label.left span',corner?'Core3 L-Shaped':'Core3');text('.compare-label.right span',corner?'L-Shaped Executive':'Executive');
    text('#series-title',executive?'Presence and privacy.':'Open and flexible.');
    text('#series-copy',executive?'Leg coverings and a modesty panel create a more enclosed furniture presence. Your selected '+p.name+' is now reflected in the workspace builder.':'An open frame creates a lighter visual presence. Your selected '+p.name+' is now reflected in the workspace builder.');
    text('#frame-note',executive?'EXECUTIVE · LEG PANELS + MODESTY PANEL':'CORE3 · OPEN FRAME');
    const specs=$('#shared-specs');if(specs)specs.innerHTML=corner?'<span>L-shaped configuration</span><span>Compare exact specifications on the official product pages.</span>':'<span>Published standard-desk lift specs</span><span>Dual motors</span><span>160 kg rated dynamic load</span><span>1.6 in/s</span>';
  }
  function renderHero(){
    const hero=$('.hero');if(hero){hero.classList.toggle('seated',state.heightMode==='sit');hero.classList.toggle('detail',state.view==='detail');}
    pressed('[data-height]',b=>b.dataset.height===state.heightMode);pressed('[data-view]',b=>b.dataset.view===state.view);
  }
  function renderExtras(){
    const groups={desk:Object.keys(extras),organise:['shelf','cables'],sit:['chair'],store:['storage']};
    const notes={desk:'Start with your desk, then choose the pieces that make your day work.',organise:'Keep essentials within reach and cables quietly out of the way.',sit:'Plan the seated side of your workspace.',store:'Give everyday essentials a place of their own.'};
    pressed('[data-step]',b=>b.dataset.step===state.buildStep);
    text('#build-step-note',notes[state.buildStep]);
    $$('.addon').forEach(row=>{row.hidden=!groups[state.buildStep].includes(row.dataset.addonRow);row.style.display=row.hidden?'none':'';const input=row.querySelector('input');if(input)input.checked=state.addons.includes(input.value);});
    $$('.hotspot').forEach(b=>{const selected=state.addons.includes(b.dataset.addon);b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));b.setAttribute('aria-label',extras[b.dataset.addon].name+' details'+(selected?' — selected':''));});
    text('#selected-addon-summary',state.addons.length?'Selected across all steps: '+state.addons.map(k=>extras[k].name).join(', '):'No additions selected. Your desk is ready to save on its own.');
  }
  function render(){renderSelection();renderComparison();renderHero();renderExtras();renderPlanning();renderInspection();renderCable();text('#cart-count',saved.reduce((sum,item)=>sum+item.quantity,0));updateSticky();}

  const planningFields={roomWidth:'#room-width',roomDepth:'#room-depth',deskDepth:'#desk-depth',chairSpace:'#chair-space',returnDepth:'#desk-return',width:'#desk-width'};
  const modalPlanningFields={roomWidth:'#plan-room-width',roomDepth:'#plan-room-depth',deskDepth:'#plan-desk-depth',chairSpace:'#plan-chair-space',returnDepth:'#plan-return',width:'#plan-desk-width'};
  function valuesFromFields(fields,base){const values={...base};Object.entries(fields).forEach(([key,selector])=>{const input=$(selector);if(input)values[key]=input.value;});return values;}
  function diagramMarkup(draft){
    const fit=dimensionFit(draft),p=productById(draft.productId);
    if(!fit.valid)return `<svg viewBox="0 0 480 360" role="img" aria-label="Room planning preview awaiting valid dimensions"><rect x="20" y="20" width="440" height="320" rx="16" fill="#edf0e8"/><text x="240" y="170" text-anchor="middle" font-size="14" fill="#566259">Enter valid dimensions to preview your room.</text></svg>`;
    const scale=Math.min(390/Math.max(fit.wall,fit.width),244/Math.max(fit.depth,fit.deskDepth,fit.desktopDepth+fit.chairSpace));
    const roomW=fit.wall*scale,roomH=fit.depth*scale,x=(480-roomW)/2,y=48,w=fit.width*scale,d=fit.desktopDepth*scale,totalD=fit.deskDepth*scale,dx=x+(roomW-w)/2;
    const returnSide=draft.orientation==='left'?'left':'right';
    const path=p.shape==='l'?(returnSide==='left'?`M${dx},${y}H${dx+w}V${y+d}H${dx+d}V${y+totalD}H${dx}Z`:`M${dx},${y}H${dx+w}V${y+totalD}H${dx+w-d}V${y+d}H${dx}Z`):`M${dx},${y}H${dx+w}V${y+d}H${dx}Z`;
    const chairW=Math.min(65,p.shape==='l'?Math.max(0,fit.width-fit.desktopDepth):fit.width)*scale;
    const chairCenter=dx+w/2+(p.shape==='l'?(returnSide==='left'?d/2:-d/2):0),chairX=chairCenter-chairW/2,chairY=y+d+4,chairH=fit.chairSpace*scale;
    const error=!fit.fits,color=error?'#a5644d':'#678169';
    const finish=draft.finish==='Maple'?'#c7ad85':'#977b60';
    return `<svg viewBox="0 0 480 360" role="img" aria-label="${escape(p.name+' planning diagram. '+fit.message)}"><title>${escape(p.name)} — planning preference</title><desc>${escape(fit.message)} This is an illustrative footprint, not a verified product dimension.</desc><defs><pattern id="plan-grid-${escape(p.id)}" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#dce2d6" stroke-width=".65"/></pattern></defs><rect x="${x}" y="${y}" width="${roomW}" height="${roomH}" rx="5" fill="#f3f5ef" stroke="#a4b39d" stroke-width="1.3"/><rect x="${x}" y="${y}" width="${roomW}" height="${roomH}" fill="url(#plan-grid-${escape(p.id)})" opacity=".55"/><path d="${path}" fill="${finish}" stroke="${error?'#a5644d':'#7c6954'}" stroke-width="1.4" stroke-linejoin="round"/><rect x="${chairX}" y="${chairY}" width="${chairW}" height="${chairH}" rx="14" fill="${error?'#bc927e':'#91a68a'}" fill-opacity=".18" stroke="${color}" stroke-dasharray="5 4"/><circle cx="${chairCenter}" cy="${chairY+Math.min(chairH/2,26)}" r="${Math.min(chairW*.27,16)}" fill="#ffffff99" stroke="${color}"/><text x="240" y="25" text-anchor="middle" fill="#546a51" font-family="Segoe UI,Arial,sans-serif" font-size="12">Available wall · ${fit.wall} cm</text><path d="M${dx} ${y-9}H${dx+w}" fill="none" stroke="#7f8e75" stroke-width="1"/><text x="240" y="${y-15}" text-anchor="middle" fill="#53674e" font-size="10">Desk · ${fit.width} cm</text><text x="${Math.max(14,x-13)}" y="${y+roomH/2}" text-anchor="middle" transform="rotate(-90 ${Math.max(14,x-13)} ${y+roomH/2})" fill="#65765e" font-size="10">Room · ${fit.depth} cm</text><text x="${chairCenter}" y="${chairY+chairH-8}" text-anchor="middle" fill="${color}" font-size="9">Chair zone · ${fit.chairSpace} cm</text><text x="240" y="327" text-anchor="middle" fill="${color}" font-size="11">${error?'Check the highlighted planning clearance':'Fits within this illustrative footprint'}</text><text x="240" y="346" text-anchor="middle" fill="#7d8975" font-size="9">${p.shape==='l'?'L-return · '+fit.deskDepth+' cm · '+returnSide+' orientation':'Desktop depth · '+fit.desktopDepth+' cm'} · confirm exact product dimensions</text></svg>`;
  }
  function drawDiagram(selector,draft){const host=$(selector);if(host)host.innerHTML=diagramMarkup(draft);}
  function renderPlanning(){
    const p=productById(state.productId),corner=p.shape==='l',fit=dimensionFit();
    Object.entries(planningFields).forEach(([key,selector])=>{const field=$(selector);if(field){field.value=state[key];field.removeAttribute('aria-invalid');}});
    const returnField=$('#desk-return');if(returnField)returnField.disabled=!corner;
    const returnRow=$('#return-field');if(returnRow)returnRow.hidden=!corner;
    pressed('[data-width]',b=>Number(b.dataset.width)===state.width);
    pressed('[data-orientation]',b=>b.dataset.orientation===state.orientation);
    $$('[data-orientation]').forEach(b=>b.disabled=!corner);
    text('#width-output',state.width+' cm');text('#desk-dimension',state.width+' cm desk');text('#room-dimension',state.roomWidth+' cm available wall');
    text('#clearance',fit.side>=0?(fit.side/2)+' cm per side':'Desk exceeds wall width');
    text('#fit-result',fit.message);
    $('#fit-result')?.classList.toggle('fit-conflict',fit.valid&&!fit.fits);
    drawDiagram('#room-live-plan',state);
  }
  function changeMainPlanning(){
    const draft=valuesFromFields(planningFields,state),fit=dimensionFit(draft);
    if(!fit.valid){text('#fit-result',fit.message);drawDiagram('#room-live-plan',draft);Object.values(planningFields).forEach(selector=>{const field=$(selector);if(field)field.setAttribute('aria-invalid',String(!field.checkValidity()));});return;}
    commit(draft);
  }
  function renderPlanDraft(){
    if(!planDraft)return;
    planDraft=valuesFromFields(modalPlanningFields,planDraft);
    const fit=dimensionFit(planDraft);
    text('#plan-fit-result',fit.message);$('#plan-fit-result')?.classList.toggle('fit-conflict',fit.valid&&!fit.fits);
    drawDiagram('#plan-preview',planDraft);
    const footprint=$('#plan-footprint');if(footprint){footprint.style.width=fit.valid?Math.min(94,fit.width/fit.wall*88)+'%':'58%';footprint.textContent=state.width+' cm planning footprint';}
  }
  function openPlanner(){
    planDraft=snapshot();Object.entries(modalPlanningFields).forEach(([key,selector])=>{const input=$(selector);if(input)input.value=planDraft[key];});
    const returnInput=$('#plan-return');if(returnInput)returnInput.disabled=productById(state.productId).shape!=='l';
    renderPlanDraft();openDialog('#plan-dialog');
  }
  function applyPlanning(){
    renderPlanDraft();const fit=dimensionFit(planDraft||state);
    const invalidInput=Object.values(modalPlanningFields).map(s=>$(s)).find(el=>el&&!el.disabled&&!el.checkValidity());
    if(invalidInput){invalidInput.focus();invalidInput.reportValidity();return;}
    if(!fit.valid){toast(fit.message);const invalid=Object.values(modalPlanningFields).map(s=>$(s)).find(el=>el&&!el.checkValidity());invalid?.focus();invalid?.reportValidity();return;}
    commit(planDraft,{announce:'Room and desk planning measurements updated everywhere.'});closeDialog('#plan-dialog');planDraft=null;
  }

  function renderCart(){
    const host=$('#cart-items');if(!host)return;
    host.replaceChildren();
    if(!saved.length){host.innerHTML='<div class="cart-empty"><h3>Your room starts here.</h3><p>Select a desk, choose your planning preferences and save a workspace.</p><button class="button outline" id="cart-start">Explore every desk ↗</button></div>';$('#cart-start')?.addEventListener('click',()=>{closeDialog('#cart-dialog');$('#desks')?.scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth'});});return;}
    saved.forEach(item=>{
      const p=productById(item.productId),row=document.createElement('article');row.className='cart-row';row.dataset.savedId=item.id;
      row.innerHTML=`<div class="cart-thumbnail"><img src="${escape(assetUrl(p.id==='hardwood'&&item.finish==='Walnut'?'hero.png':p.scene))}" alt="${escape(p.name)} concept"></div><div class="cart-config"><strong>${escape(p.name)}</strong><p class="cart-config-details">${escape(item.width+' × '+item.deskDepth+' cm · '+item.finish+' · '+(item.material==='hardwood'?'Solid hardwood':'Laminate'))}</p><small>Room ${item.roomWidth} × ${item.roomDepth} cm · chair zone ${item.chairSpace} cm${p.shape==='l'?' · '+item.returnDepth+' cm L return, '+item.orientation:''}</small><small>${escape(item.addons.length?item.addons.map(k=>extras[k].name).join(', '):'Desk only')}</small><div class="cart-row-controls"><label class="quantity-label">Quantity <input type="number" min="1" max="9" step="1" value="${item.quantity}" aria-label="Quantity for ${escape(p.name)}"></label><button data-action="edit">Edit</button><button data-action="duplicate">Duplicate</button><button data-action="remove">Remove</button><a href="${officialUrl(p)}" target="_blank" rel="noopener">Official details ↗</a></div></div>`;
      const quantityInput=row.querySelector('input');if(quantityInput)quantityInput.required=true;
      quantityInput?.addEventListener('change',event=>{const input=event.target;if(!input.value.trim()||!input.checkValidity()){input.reportValidity();input.value=item.quantity;return;}item.quantity=Math.round(Number(input.value));render();persist();toast('Quantity updated.');});
      row.querySelector('[data-action="edit"]')?.addEventListener('click',()=>editSaved(item.id));
      row.querySelector('[data-action="duplicate"]')?.addEventListener('click',()=>{if(saved.length>=30){toast('Remove a saved configuration to make room.');return;}const copy={...item,addons:[...item.addons],id:'ws-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),createdAt:new Date().toISOString()};saved.push(copy);render();persist();renderCart();toast('A copy has been added. Edit it to create an alternative.');});
      row.querySelector('[data-action="remove"]')?.addEventListener('click',()=>{
        const index=saved.findIndex(x=>x.id===item.id);if(index<0)return;
        undoRemoval={item:saved.splice(index,1)[0],index};
        if(editingId===item.id){editingId=null;beforeEdit=null;}
        render();persist();renderCart();
        toast(p.name+' removed.',{duration:8500,actionLabel:'Undo',onAction:()=>{if(!undoRemoval||saved.length>=30)return;saved.splice(Math.min(undoRemoval.index,saved.length),0,undoRemoval.item);undoRemoval=null;render();persist();renderCart();}});
      });
      host.append(row);
    });
  }
  function openCart(){renderCart();openDialog('#cart-dialog');}
  function downloadJson(){
    if(!saved.length){toast('Save a configuration before downloading your list.');return;}
    const contents={format:'vernal-workspace-design-list',version:3,exportedAt:new Date().toISOString(),note:'Prototype planning preferences; no order placed. Confirm exact product options, dimensions and compatibility.',saved:saved.map(item=>({...item,productName:productById(item.productId).name,officialUrl:officialUrl(productById(item.productId))}))};
    const href=URL.createObjectURL(new Blob([JSON.stringify(contents,null,2)],{type:'application/json;charset=utf-8'})),link=document.createElement('a');link.href=href;link.download='my-vernal-workspaces.json';link.click();setTimeout(()=>URL.revokeObjectURL(href),1500);toast('Complete configurations downloaded as JSON.');
  }
  function goToBuild(){configurationTouched=true;updateSticky();$('#build')?.scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth',block:'start'});toast(productById(state.productId).name+' is ready to configure.');}
  function closePopover(){activeAddon=null;}
  function showAddon(key){
    if(!extras[key])return;activeAddon=key;
    const addon=extras[key],selected=state.addons.includes(key),image=key==='cables'?'cable-clean.png':'workspace.png';
    showInfo(`<span class="eyebrow">A THOUGHTFUL ADDITION</span><div class="addon-detail"><img src="${escape(assetUrl(image))}" alt="${escape(addon.name)} concept image"><h2>${escape(addon.name)}</h2><p>${escape(addon.detail)}</p><p class="caption">Currently ${selected?'included in':'not included in'} your workspace list.</p><button id="addon-toggle" class="button">${selected?'Remove from workspace −':'Add to workspace +'}</button><span class="caption">Concept image and planning preference. Confirm exact item and compatibility before ordering.</span></div>`);
    activeAddon=key;
    on('#addon-toggle','click',()=>{const addons=state.addons.includes(key)?state.addons.filter(x=>x!==key):[...state.addons,key];configurationTouched=true;commit({addons});closeDialog('#info-dialog');toast(addon.name+(addons.includes(key)?' added to':' removed from')+' your workspace.');});
  }

  function inspectionSteps(){
    const action=state.testAction,height=state.testMode==='seated'?'seated':'standing';
    return [
      {label:'Follow the desktop edge.',caption:action==='height'?`For a real lift test, keep the desktop and frame visible throughout the move. This is a still-image guide.`:`During ${action==='mouse'?'mouse use':'normal typing'} at ${height} height, observe the desktop edge against the background. This image contains no measured movement.`,left:12,top:61,width:76,height:16,origin:'50% 65%'},
      {label:'Watch the monitor.',caption:'Keep the monitor edges in the same continuous shot. A clear comparison needs a fixed camera and the same equipment load.',left:37,top:16,width:52,height:39,origin:'65% 35%'},
      {label:'Read the conditions.',caption:'A real demonstration must state desk model, height, desktop dimensions and equipment load. These values have not yet been recorded.',left:5,top:7,width:90,height:79,origin:'50% 50%'}
    ];
  }
  function stopInspection(){clearTimeout(inspectionTimer);inspectionTimer=null;inspectionPlaying=false;}
  function renderInspection(){
    $('.stability-scene')?.classList.toggle('inspecting',inspectionStep>=0);
    pressed('[data-test]',b=>b.dataset.test===state.testAction);pressed('#test-seated, #test-standing',b=>b.id===(state.testMode==='seated'?'test-seated':'test-standing'));
    const height=state.testMode==='seated'?'seated':'standing';
    text('#test-mode-note',height.charAt(0).toUpperCase()+height.slice(1)+' observation selected · still-image concept');
    const instruction=state.testAction==='height'?'In real footage, follow the desk through its seated-to-standing travel without edits that hide motion.':`In real footage, observe ${state.testAction==='mouse'?'mouse use':'typing'} at ${height} height with the desktop and monitor edges visible.`;
    text('#test-instruction',instruction);
    const overlay=$('#inspection-highlight'),image=$('#stability-image'),play=$('#stability-play');
    if(inspectionStep<0){
      if(overlay)overlay.hidden=true;
      text('#inspection-status','CONCEPT OBSERVATION WALKTHROUGH');
      text('#inspection-caption',reducedMotion.matches?'Tap the observation button to step through what to look for in a real stability test.':'Start a three-step guide to what a real stability test should show.');
      if(image)image.style.transform='';
    }else{
      const step=inspectionSteps()[inspectionStep];
      if(overlay){overlay.hidden=false;Object.entries({left:step.left,top:step.top,width:step.width,height:step.height}).forEach(([key,value])=>overlay.style[key]=value+'%');}
      text('#inspection-status',`STEP ${inspectionStep+1} / 3 · ${inspectionPlaying?'GUIDED OBSERVATION':'STILL-IMAGE OBSERVATION'}`);
      text('#inspection-caption',step.label+' '+step.caption);
      if(image){image.style.transformOrigin=step.origin;image.style.transform=reducedMotion.matches?'none':inspectionStep===1?'scale(1.035)':'scale(1.015)';}
    }
    $('#stability .test-panel')?.classList.toggle('conditions-highlight',inspectionStep===2);
    if(play){
      play.setAttribute('aria-pressed',String(inspectionPlaying));
      const label=reducedMotion.matches?(inspectionStep>=2?'Restart observation walkthrough':'Next observation step'):(inspectionPlaying?'Pause observation walkthrough':inspectionStep>=2?'Restart observation walkthrough':'Start observation walkthrough');
      play.setAttribute('aria-label',label);
      play.innerHTML=inspectionPlaying?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM14 5h4v14h-4z"/></svg>':reducedMotion.matches?'<span aria-hidden="true">→</span>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z"/></svg>';
    }
  }
  function scheduleInspection(){
    clearTimeout(inspectionTimer);if(!inspectionPlaying||reducedMotion.matches)return;
    inspectionTimer=setTimeout(()=>{if(inspectionStep<2){inspectionStep+=1;renderInspection();scheduleInspection();}else{stopInspection();renderInspection();}},4200);
  }
  function toggleInspection(){
    if(reducedMotion.matches){stopInspection();inspectionStep=inspectionStep>=2?0:inspectionStep+1;renderInspection();return;}
    if(inspectionPlaying){stopInspection();renderInspection();return;}
    inspectionPlaying=true;if(inspectionStep<0||inspectionStep>=2)inspectionStep=0;renderInspection();scheduleInspection();
  }
  function changeObservation(patch){stopInspection();inspectionStep=-1;commit(patch);}
  function showTestMethod(){showInfo('<span class="eyebrow">A REAL STABILITY DEMONSTRATION</span><h2>Show the work.<br>Show the conditions.</h2><ol><li>State the desk model, desktop dimensions, exact height and equipment load.</li><li>Keep the monitor edges, desktop and frame in one fixed-camera view.</li><li>Record everyday typing and mouse use at seated and standing heights.</li><li>Show the full lift sequence without cuts that hide movement.</li><li>Publish the original footage with the conditions next to it.</li></ol><p>The observation guide highlights areas of an AI-generated still image. It is an editorial guide, not recorded performance, a video or a measured stability result.</p>');}

  const finderSteps=[
    {key:'use',title:'How will you use your space?',options:[{value:'focus',title:'Focused everyday work',copy:'A computer, a clear surface and room to concentrate.'},{value:'multi',title:'Multi-screen creating',copy:'More displays and equipment within reach.'},{value:'business',title:'A business workspace',copy:'A furniture presence and privacy at the front.'}]},
    {key:'shape',title:'Which layout suits your room?',options:[{value:'standard',title:'A straight desk',copy:'An open layout along a wall or within the room.'},{value:'corner',title:'An L-shaped desk',copy:'A return surface for a broader working area.'}]},
    {key:'material',title:'What matters most about the surface?',options:[{value:'laminate',title:'An everyday surface',copy:'Start with the laminate direction and choose exact options on the store.'},{value:'hardwood',title:'Natural wood character',copy:'Explore the dedicated Solid Hardwood desk direction.'}]}
  ];
  function finderRecommendation(){
    const {use,shape,material}=finderChoices;
    let first,second,reason;
    if(material==='hardwood'){
      first='hardwood';second=shape==='corner'?(use==='business'?'executive-l':'core3-l'):(use==='business'?'executive':'core3');
      reason=shape==='corner'?'Your natural wood preference points to the dedicated straight Solid Hardwood desk. Your alternate retains the L-shaped layout. Confirm whether the official store offers your exact shape-and-material combination.':'Your surface preference points to Solid Hardwood. The alternate keeps an everyday surface or a more panelled appearance.';
    }else if(shape==='corner'){
      first=use==='business'?'executive-l':'core3-l';second=first==='executive-l'?'core3-l':'executive-l';
      reason=use==='business'?'Both give you a corner layout. Executive adds the panelled appearance you preferred; Core3 keeps the frame open.':'Both give you a corner layout. Core3 keeps an open frame; Executive is the alternative for leg coverings and a modesty panel.';
    }else{
      first=use==='business'?'executive':'core3';second=first==='executive'?'core3':'hardwood';
      reason=use==='business'?'Executive suits your preference for a more enclosed furniture appearance. Core3 provides the alternative with an open frame.':use==='multi'?'Your straight-layout preference points to Core3. Start with a larger planning width and check the space planner. Solid Hardwood is an alternative surface direction.':'Core3 gives you the open everyday workspace you preferred. Solid Hardwood offers an alternative with more natural wood character.';
    }
    return {first:productById(first),second:productById(second),reason};
  }
  function renderFinder(){
    const result=$('#finder-result'),options=$('#finder-options'),next=$('#finder-next'),back=$('#finder-back');
    if(finderStep<3){
      const step=finderSteps[finderStep];text('#finder-step-title',step.title);text('#finder-progress',`${finderStep+1} / 3`);
      if(options){options.hidden=false;options.innerHTML=step.options.map(option=>`<button class="finder-option ${finderChoices[step.key]===option.value?'active':''}" data-finder-value="${option.value}" aria-pressed="${finderChoices[step.key]===option.value}"><strong>${escape(option.title)}</strong><span>${escape(option.copy)}</span></button>`).join('');options.querySelectorAll('[data-finder-value]').forEach(button=>button.addEventListener('click',()=>{finderChoices[step.key]=button.dataset.finderValue;renderFinder();}));}
      if(result)result.hidden=true;
      if(next){next.hidden=false;next.textContent=finderStep===2?'See my options ↗':'Next ↗';}
      if(back){back.hidden=finderStep===0;back.textContent='Back';}
    }else{
      const recommendation=finderRecommendation();text('#finder-step-title','Two directions for your room.');text('#finder-progress','Your recommendations');
      if(options)options.hidden=true;if(next)next.hidden=true;if(back){back.hidden=false;back.textContent='Adjust answers';}
      if(result){result.hidden=false;result.innerHTML=`<p class="finder-reason">${escape(recommendation.reason)}</p><div class="finder-result-grid">${[recommendation.first,recommendation.second].map((p,i)=>`<article class="finder-result-card"><span class="eyebrow">${i===0?'YOUR STARTING POINT':'AN ALTERNATIVE'}</span><img src="${escape(assetUrl(p.scene))}" alt="${escape(p.name)} concept"><h3>${escape(p.name)}</h3><p>${escape(p.description)}</p><button class="button ${i?'outline':''}" data-finder-product="${p.id}">Choose ${escape(p.name)} ↗</button></article>`).join('')}</div><p class="caption">Recommendations use your stated needs. Confirm dimensions, surface availability and exact configuration on the official store.</p>`;result.querySelectorAll('[data-finder-product]').forEach(button=>button.addEventListener('click',()=>{setProduct(button.dataset.finderProduct);if(finderChoices.use==='multi'&&finderChoices.shape==='standard')commit({width:160});closeDialog('#finder-dialog');$('#desks')?.scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth',block:'start'});toast(productById(state.productId).name+' selected from your recommendations.');}));}
    }
  }
  function openFinder(){const p=productById(state.productId);finderStep=0;finderChoices={use:state.intent,shape:p.shape==='l'?'corner':'standard',material:state.material};renderFinder();openDialog('#finder-dialog');}

  function renderCable(){
    const stage=$('#cable-stage'),range=$('#cable-slider');
    if(stage)stage.style.setProperty('--reveal',state.cableReveal+'%');
    if(range){range.value=state.cableReveal;range.setAttribute('aria-valuetext',state.cableReveal+'% organised concept view');}
  }
  function search(){
    const input=$('#search-input'),host=$('#search-results');if(!host)return;
    const tokens=(input?.value||'').trim().toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
    const found=products.filter(p=>tokens.every(token=>(p.name+' '+p.keywords).toLowerCase().replace(/[^a-z0-9 ]/g,' ').includes(token)));
    host.innerHTML=found.length?found.map(p=>`<div class="search-result"><div><strong>${escape(p.name)}</strong><small>${escape(p.tag)}</small></div><button data-search-preview="${p.id}">Preview →</button></div>`).join(''):'<p>No matching desk. Try “corner”, “hardwood” or “privacy”.</p>';
    host.querySelectorAll('[data-search-preview]').forEach(button=>button.addEventListener('click',()=>{setProduct(button.dataset.searchPreview);closeDialog('#search-dialog');$('.desk-preview')?.scrollIntoView({behavior:reducedMotion.matches?'auto':'smooth',block:'center'});}));
  }
  function updateSticky(){
    const bar=$('.sticky-config'),desks=$('#desks');if(!bar)return;
    const pastDesks=desks?desks.getBoundingClientRect().bottom<105:false;
    bar.classList.toggle('visible',configurationTouched||pastDesks);
  }
  function bindEvents(){
    on('#build-product','change',event=>setProduct(event.target.value));
    on('#build-width','change',event=>{configurationTouched=true;commit({width:Number(event.target.value)});});
    on('#configure-selected','click',goToBuild);
    $$('[data-intent]').forEach(button=>button.addEventListener('click',()=>{const intent=button.dataset.intent;setProduct(intentions[intent].first);commit({intent});}));
    $$('[data-height]').forEach(button=>button.addEventListener('click',()=>commit({heightMode:button.dataset.height})));
    $$('[data-view]').forEach(button=>button.addEventListener('click',()=>commit({view:button.dataset.view})));
    $$('[data-series]').forEach(button=>button.addEventListener('click',()=>selectSeries(button.dataset.series)));
    $$('[data-compare-shape]').forEach(button=>button.addEventListener('click',()=>{const corner=button.dataset.compareShape==='corner',executive=productById(state.productId).series==='executive';setProduct(executive?(corner?'executive-l':'executive'):(corner?'core3-l':'core3'));}));
    on('#comparison-range','input',event=>{state.comparisonSplit=finite(event.target.value,5,95,50);renderComparison();persist();});
    on('#compare-details','click',()=>{
      const corner=productById(state.productId).shape==='l',core=productById(corner?'core3-l':'core3'),executive=productById(corner?'executive-l':'executive');
      showInfo(`<span class="eyebrow">CHOOSE BY YOUR ROOM</span><h2>${corner?'Compare the corner layouts.':'Core3 or Executive?'}</h2><table class="dialog-table"><thead><tr><th>Difference</th><th>${escape(core.name)}</th><th>${escape(executive.name)}</th></tr></thead><tbody><tr><td>Visual structure</td><td>Open frame</td><td>Leg coverings</td></tr><tr><td>Front privacy</td><td>Open beneath the desktop</td><td>Modesty panel</td></tr><tr><td>Best way to choose</td><td>Open visual presence</td><td>More enclosed furniture appearance</td></tr>${corner?'<tr><td>Lift specification</td><td colspan="2">Review exact motor, load and height specifications for each corner configuration on the official pages.</td></tr>':'<tr><td>Published main lift specs</td><td colspan="2">Dual motors · 160 kg rated dynamic load · 1.6 in/s</td></tr>'}</tbody></table><p>Pictures illustrate visual directions. ${corner?'Corner products can have different lift specifications.':'Equal published parameters do not establish identical internal construction.'} Confirm the exact desktop, frame and accessories before ordering.</p><div class="actions"><a class="button outline" href="${officialUrl(core)}" target="_blank" rel="noopener">${escape(core.name)} details ↗</a><a class="button outline" href="${officialUrl(executive)}" target="_blank" rel="noopener">${escape(executive.name)} details ↗</a></div>`);
    });
    Object.values(planningFields).forEach(selector=>{const input=$(selector);if(input?.type==='number'){input.required=true;input.step='1';}on(selector,'input',changeMainPlanning);});
    $$('[data-width]').forEach(button=>button.addEventListener('click',()=>{configurationTouched=true;commit({width:Number(button.dataset.width)});}));
    $$('[data-orientation]').forEach(button=>button.addEventListener('click',()=>{configurationTouched=true;commit({orientation:button.dataset.orientation});}));
    on('#plan-open','click',openPlanner);on('#plan-apply','click',applyPlanning);
    Object.values(modalPlanningFields).forEach(selector=>{const input=$(selector);if(input?.type==='number'){input.required=true;input.step='1';}on(selector,'input',renderPlanDraft);});
    const addons=$('#addons');if(addons){addons.innerHTML=Object.entries(extras).map(([key,addon])=>`<div class="addon" data-addon-row="${key}"><input type="checkbox" id="addon-${key}" value="${key}"><label for="addon-${key}"><span>${escape(addon.name)}<small>${escape(addon.copy)}</small></span></label><button class="addon-info" data-extra-info="${key}" aria-label="About ${escape(addon.name)}">i</button></div>`).join('');addons.querySelectorAll('input').forEach(input=>input.addEventListener('change',()=>{const key=input.value,include=input.checked;configurationTouched=true;commit({addons:include?[...state.addons,key]:state.addons.filter(x=>x!==key)});toast(extras[key].name+(include?' added.':' removed.'));}));addons.querySelectorAll('[data-extra-info]').forEach(button=>button.addEventListener('click',()=>showAddon(button.dataset.extraInfo)));}
    $$('.hotspot').forEach(button=>button.addEventListener('click',()=>showAddon(button.dataset.addon)));
    $$('[data-step]').forEach(button=>button.addEventListener('click',()=>commit({buildStep:button.dataset.step})));
    const chooseFinish=finish=>{configurationTouched=true;if(finish==='Maple')commit({productId:'hardwood',material:'hardwood',finish:'Maple',intent:'focus'});else commit({finish:'Walnut'});};
    $$('[data-finish]').forEach(button=>button.addEventListener('click',()=>chooseFinish(button.dataset.finish)));
    $$('[data-wood]').forEach(button=>button.addEventListener('click',()=>chooseFinish(button.dataset.wood==='maple'?'Maple':'Walnut')));
    on('#finish','change',event=>chooseFinish(event.target.value));
    $$('[data-material]').forEach(button=>button.addEventListener('click',()=>{configurationTouched=true;const hard=button.dataset.material==='hardwood';commit(hard?{productId:'hardwood',material:'hardwood',finish:'Maple',intent:'focus'}:{productId:state.productId==='hardwood'?'core3':state.productId,material:'laminate',finish:'Walnut'});toast(hard?'Solid Hardwood selected. Your desk and finish are updated.':'Laminate direction selected in Walnut.');}));
    on('#add-to-list','click',saveConfiguration);on('#sticky-save','click',saveConfiguration);on('#cancel-edit','click',cancelEditing);
    on('#cart-open','click',openCart);on('#footer-cart','click',openCart);
    on('#export-list','click',downloadList);on('#cart-export','click',downloadList);on('#cart-json-export','click',downloadJson);
    on('#stability-play','click',toggleInspection);on('#inspection-reset','click',()=>{stopInspection();inspectionStep=-1;renderInspection();});
    on('#inspection-next','click',()=>{stopInspection();inspectionStep=(inspectionStep+1)%3;renderInspection();});
    on('#test-seated','click',()=>changeObservation({testMode:'seated'}));on('#test-standing','click',()=>changeObservation({testMode:'standing'}));
    $$('[data-test]').forEach(button=>button.addEventListener('click',()=>changeObservation({testAction:button.dataset.test})));
    on('#test-method','click',showTestMethod);
    on('#cable-slider','input',event=>{state.cableReveal=finite(event.target.value,5,95,50);renderCable();persist();});
    on('#cable-demo','click',()=>showAddon('cables'));
    on('#search-open','click',()=>{openDialog('#search-dialog');search();$('#search-input')?.focus();});on('#search-input','input',search);
    on('#hero-finder','click',openFinder);on('#finder-open','click',openFinder);
    on('#finder-next','click',()=>{finderStep=Math.min(3,finderStep+1);renderFinder();});on('#finder-back','click',()=>{finderStep=Math.max(0,finderStep-1);renderFinder();});
    on('#newsletter-form','submit',event=>{event.preventDefault();if(!event.currentTarget.reportValidity())return;toast('Signup preview complete. This local prototype does not send or store email.');const button=event.currentTarget.querySelector('button');if(button){button.textContent='Preview complete ✓';setTimeout(()=>button.textContent='Join the list',3500);}});
    $$('.close-dialog').forEach(button=>button.addEventListener('click',()=>closeDialog('#'+button.closest('dialog').id)));
    $$('dialog').forEach(dialog=>{dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog('#'+dialog.id);});dialog.addEventListener('close',()=>{if(dialog.id==='plan-dialog')planDraft=null;});});
    window.addEventListener('scroll',updateSticky,{passive:true});
    window.addEventListener('pagehide',()=>{clearTimeout(persistTimeout);try{localStorage.setItem(storageKey,JSON.stringify({version:3,draft:state,saved}));}catch{}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){stopInspection();renderInspection();}});
    reducedMotion.addEventListener?.('change',()=>{stopInspection();renderInspection();});
  }
  buildProductGrid();bindEvents();render();persist();updateSticky();
})();
