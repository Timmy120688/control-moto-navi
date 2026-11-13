const $ = id => document.getElementById(id);
const today = new Date();
const localDate = d => new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
const money = n => 'Bs ' + Number(n||0).toFixed(2).replace('.',',');
let cfg = JSON.parse(localStorage.getItem('cmn_cfg') || '{"fuelPrice":6.96,"kmPer3":100}');
let services = JSON.parse(localStorage.getItem('cmn_services') || '[]');
let expenses = JSON.parse(localStorage.getItem('cmn_expenses') || '[]');
let pending = null;
let historyMode = 'services';
function costKm(){return Number(cfg.fuelPrice)/(Number(cfg.kmPer3)/3)}
function show(view){
 ['service','expense','review','history','settings'].forEach(v=>$(v+'View').classList.toggle('hidden',v!==view));
}
function refresh(){
 const d=localDate(new Date());
 const dayS=services.filter(x=>x.date===d);
 const dayE=expenses.filter(x=>x.date===d);
 const income=dayS.reduce((a,x)=>a+x.amount,0);
 const net=dayS.reduce((a,x)=>a+x.amount-x.commission-x.fuelEstimate,0)-dayE.filter(x=>x.category!=='Gasolina').reduce((a,x)=>a+x.amount,0);
 $('todayIncome').textContent=money(income);
 $('todayNet').textContent=money(net);
 $('fuelEstimate').innerHTML='Gasolina estimada: <strong>'+money(Number($('km').value||0)*costKm())+'</strong>';
}
function setDefaults(){
 $('sDate').value=localDate(today);$('eDate').value=localDate(today);
 $('sTime').value=today.toTimeString().slice(0,5);$('eTime').value=today.toTimeString().slice(0,5);
 $('fuelPrice').value=cfg.fuelPrice;$('kmPer3').value=cfg.kmPer3;$('pricePerLiter').value=cfg.fuelPrice;
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>show(b.dataset.view)));
$('km').addEventListener('input',refresh);
$('category').addEventListener('change',()=>{$('fuelFields').classList.toggle('hidden',$('category').value!=='Gasolina');});
$('serviceForm').addEventListener('submit',e=>{
 e.preventDefault();
 const data={date:$('sDate').value,time:$('sTime').value,platform:$('platform').value,type:$('serviceType').value,detail:$('detail').value.trim(),amount:Number($('amount').value),km:Number($('km').value),fuelEstimate:Number($('km').value)*costKm(),commission:Number($('commission').value||0)};
 if(data.commission>data.amount){alert('La comisión no puede ser mayor que el importe cobrado.');return}
 pending={kind:'service',data};
 $('reviewText').innerHTML=`<p>Tipo: <strong>Servicio</strong></p><p>Fecha y hora: <strong>${data.date} ${data.time}</strong></p><p>Plataforma: <strong>${data.platform}</strong></p><p>Servicio: <strong>${data.type}</strong></p><p>Detalle: <strong>${data.detail||'—'}</strong></p><p>Importe cobrado: <strong>${money(data.amount)}</strong></p><p>Kilómetros: <strong>${data.km.toFixed(1)} km</strong></p><p>Gasolina estimada: <strong>${money(data.fuelEstimate)}</strong></p><p>Comisión: <strong>${money(data.commission)}</strong></p><p>Resultado estimado: <strong>${money(data.amount-data.commission-data.fuelEstimate)}</strong></p>`;
 show('review');
});
$('expenseForm').addEventListener('submit',e=>{
 e.preventDefault();
 const cat=$('category').value, amount=Number($('expenseAmount').value);
 if(cat==='Gasolina' && Number($('liters').value||0)>0){
   const calc=Number($('liters').value)*Number($('pricePerLiter').value||cfg.fuelPrice);
   if(Math.abs(calc-amount)>0.02){alert('El monto no coincide con litros × precio por litro. Revisa los datos.');return}
 }
 pending={kind:'expense',data:{date:$('eDate').value,time:$('eTime').value,category:cat,amount,detail:$('expenseDetail').value.trim(),liters:Number($('liters').value||0),pricePerLiter:Number($('pricePerLiter').value||cfg.fuelPrice)}};
 const x=pending.data;
 $('reviewText').innerHTML=`<p>Tipo: <strong>Gasto</strong></p><p>Fecha y hora: <strong>${x.date} ${x.time}</strong></p><p>Categoría: <strong>${x.category}</strong></p><p>Monto: <strong>${money(x.amount)}</strong></p><p>Detalle: <strong>${x.detail||'—'}</strong></p>${x.category==='Gasolina'?`<p>Litros: <strong>${x.liters}</strong></p><p>Precio por litro: <strong>${money(x.pricePerLiter)}</strong></p>`:''}`;
 show('review');
});
$('confirmSave').addEventListener('click',()=>{
 if(!pending)return;
 const rec={...pending.data,id:Date.now()};
 if(pending.kind==='service'){services.push(rec);localStorage.setItem('cmn_services',JSON.stringify(services));}
 else{expenses.push(rec);localStorage.setItem('cmn_expenses',JSON.stringify(expenses));}
 pending=null;$('serviceForm').reset();$('expenseForm').reset();setDefaults();refresh();show('service');
 alert('Registro guardado en este dispositivo.');
});
$('backEdit').addEventListener('click',()=>{show(pending?.kind==='expense'?'expense':'service')});
$('showServices').addEventListener('click',()=>{historyMode='services';renderHistory()});
$('showExpenses').addEventListener('click',()=>{historyMode='expenses';renderHistory()});
function renderHistory(){
 const arr=historyMode==='services'?services:expenses;
 $('historyList').innerHTML=arr.slice().reverse().map(x=>historyMode==='services'
 ?`<div class="item"><strong>${money(x.amount)}</strong> · ${x.platform} / ${x.type}<small>${x.date} ${x.time} · ${x.km} km · Gasolina estimada ${money(x.fuelEstimate)} · Comisión ${money(x.commission)}</small><small>${x.detail||''}</small><button class="danger" onclick="deleteRecord('services',${x.id})">Eliminar</button></div>`
 :`<div class="item"><strong>${money(x.amount)}</strong> · ${x.category}<small>${x.date} ${x.time} · ${x.detail||''}</small><button class="danger" onclick="deleteRecord('expenses',${x.id})">Eliminar</button></div>`).join('') || '<p class="note">Todavía no hay registros.</p>';
 show('history');
}
window.deleteRecord=(kind,id)=>{if(!confirm('¿Deseas eliminar este registro?'))return;if(kind==='services'){services=services.filter(x=>x.id!==id);localStorage.setItem('cmn_services',JSON.stringify(services));}else{expenses=expenses.filter(x=>x.id!==id);localStorage.setItem('cmn_expenses',JSON.stringify(expenses));}renderHistory();refresh()};
$('saveSettings').addEventListener('click',()=>{
 const p=Number($('fuelPrice').value),k=Number($('kmPer3').value);
 if(!(p>0&&k>0)){alert('Ingresa valores mayores que cero.');return}
 cfg={fuelPrice:p,kmPer3:k};localStorage.setItem('cmn_cfg',JSON.stringify(cfg));$('costPerKm').textContent=money(costKm());$('pricePerLiter').value=p;refresh();alert('Configuración guardada.');
});
setDefaults();$('costPerKm').textContent=money(costKm());refresh();
if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
