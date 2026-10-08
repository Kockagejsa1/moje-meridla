const TYPES={
  elektrina:["⚡","Elektřina","kWh"],
  plyn:["🟠","Plyn","m³"],
  studena:["🔵","Studená voda","m³"],
  tepla:["🔴","Teplá voda","m³"]
};

let data={readings:[],enabled:Object.keys(TYPES)};
try{
  const x=JSON.parse(localStorage.getItem("mojeMeridla")||"null");
  if(x){
    if(Array.isArray(x.readings)) data.readings=x.readings;
    if(Array.isArray(x.enabled)&&x.enabled.length) data.enabled=x.enabled;
  }
}catch(e){}

function save(){localStorage.setItem("mojeMeridla",JSON.stringify(data));}
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function fmt(n){return Number(n).toLocaleString("cs-CZ",{maximumFractionDigits:3});}
function readingsFor(t){return data.readings.filter(r=>r.type===t).sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id);}
function latest(t){const r=readingsFor(t);return r.length?r[r.length-1]:null;}
function previous(t){const r=readingsFor(t);return r.length>1?r[r.length-2]:null;}
function consumption(t){const a=latest(t),b=previous(t);return a&&b&&a.value>=b.value?a.value-b.value:null;}

function renderHome(){
  const a=document.getElementById("app");
  let html="<h2>Přehled</h2>";
  data.enabled.forEach(t=>{
    const m=TYPES[t],r=latest(t),c=consumption(t);
    html+='<div class="card meter"><span class="icon">'+m[0]+'</span><div><b>'+m[1]+'</b><div class="muted">'+
      (r?"Poslední odečet: "+esc(r.date):"bez odečtu")+
      (c!==null?' · spotřeba od minulého: '+fmt(c)+' '+m[2]:"")+
      '</div></div><span class="value">'+(r?fmt(r.value):"—")+' '+m[2]+'</span></div>';
  });
  html+='<div class="card"><b>Nový odečet</b><p class="muted">Zadej stav ručně nebo připravíme načtení z fotografie.</p><button class="btn" id="add">➕ Přidat odečet</button></div>';
  a.innerHTML=html;
  document.getElementById("add").onclick=renderAdd;
}

function renderAdd(){
  const a=document.getElementById("app");
  a.innerHTML='<h2>Nový odečet</h2><div class="card">'+
    '<label>Měřidlo</label><select id="type">'+data.enabled.map(t=>'<option value="'+t+'">'+TYPES[t][0]+' '+TYPES[t][1]+'</option>').join("")+'</select>'+
    '<label>Datum</label><input id="date" type="date">'+
    '<label>Stav</label><input id="val" inputmode="decimal" placeholder="např. 12345,6">'+
    '<label>Fotografie (volitelné)</label><input id="photo" type="file" accept="image/*" capture="environment">'+
    '<div id="photoInfo" class="muted"></div><div id="preview"></div>'+
    '<div class="row"><button class="btn secondary" id="back">Zpět</button><button class="btn" id="save">💾 Uložit</button></div></div>';
  document.getElementById("date").value=new Date().toISOString().slice(0,10);
  document.getElementById("back").onclick=renderHome;
  document.getElementById("photo").onchange=e=>{
    const f=e.target.files[0]; if(!f)return;
    document.getElementById("photoInfo").textContent="Fotografie se pouze dočasně zpracuje a neukládá se do zálohy.";
    const u=URL.createObjectURL(f);
    document.getElementById("preview").innerHTML='<img class="photo" src="'+u+'" alt="Náhled">';
  };
  document.getElementById("save").onclick=()=>{
    const v=document.getElementById("val").value.replace(",",".").trim();
    if(!v||isNaN(v)){alert("Zadej platnou hodnotu odečtu.");return;}
    data.readings.push({id:Date.now(),type:document.getElementById("type").value,date:document.getElementById("date").value,value:+v});
    save();renderHome();
  };
}

function renderHistory(){
  const a=document.getElementById("app");
  const rows=[...data.readings].sort((x,y)=>y.date.localeCompare(x.date)||y.id-x.id);
  let html="<h2>Historie</h2>";
  if(!rows.length) html+='<div class="card muted">Zatím nejsou uloženy žádné odečty.</div>';
  rows.forEach(r=>{
    const m=TYPES[r.type], list=readingsFor(r.type),idx=list.findIndex(x=>x.id===r.id),prev=idx>0?list[idx-1]:null;
    const diff=prev&&r.value>=prev.value?r.value-prev.value:null;
    html+='<div class="card"><div class="row"><b>'+m[0]+' '+m[1]+'</b><span>'+esc(r.date)+'</span></div>'+
      '<div class="value" style="margin-top:8px">'+fmt(r.value)+' '+m[2]+'</div>'+
      (diff!==null?'<div class="muted">Spotřeba od minulého odečtu: '+fmt(diff)+' '+m[2]+'</div>':"")+
      '<button class="btn secondary" data-del="'+r.id+'" style="margin-top:10px">🗑️ Smazat</button></div>';
  });
  a.innerHTML=html;
  a.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{
    if(confirm("Smazat tento odečet?")){data.readings=data.readings.filter(r=>String(r.id)!==b.dataset.del);save();renderHistory();}
  });
}

function renderSettings(){
  const a=document.getElementById("app");
  let html="<h2>Nastavení</h2><div class="card"><b>Zobrazená měřidla</b>";
  Object.entries(TYPES).forEach(([k,m])=>{
    html+='<label style="display:flex;align-items:center;gap:10px"><input class="meterToggle" type="checkbox" data-type="'+k+'" '+(data.enabled.includes(k)?"checked":"")+' style="width:auto">'+m[0]+' '+m[1]+'</label>';
  });
  html+='</div><div class="card"><b>Záloha dat</b><p class="muted">Záloha obsahuje pouze odečty a nastavení. Fotografie se neukládají.</p><div class="row"><button class="btn" id="export">⬇️ Export JSON</button><label class="btn secondary" style="text-align:center;cursor:pointer">⬆️ Import JSON<input id="import" type="file" accept=".json,application/json" style="display:none"></label></div></div>';
  a.innerHTML=html;
  a.querySelectorAll(".meterToggle").forEach(c=>c.onchange=()=>{
    data.enabled=Object.keys(TYPES).filter(k=>a.querySelector('[data-type="'+k+'"]').checked);
    if(!data.enabled.length){c.checked=true;data.enabled=[c.dataset.type];}
    save();
  });
  document.getElementById("export").onclick=()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const u=URL.createObjectURL(blob),x=document.createElement("a");
    x.href=u;x.download="moje-odecet-zaloha.json";x.click();URL.revokeObjectURL(u);
  };
  document.getElementById("import").onchange=e=>{
    const f=e.target.files[0];if(!f)return;
    const rd=new FileReader();
    rd.onload=()=>{
      try{
        const x=JSON.parse(rd.result);
        if(!Array.isArray(x.readings)||!Array.isArray(x.enabled))throw Error();
        data={readings:x.readings,enabled:x.enabled.filter(k=>TYPES[k])};
        if(!data.enabled.length)data.enabled=Object.keys(TYPES);
        save();renderSettings();alert("Záloha byla načtena.");
      }catch(err){alert("Soubor JSON není platná záloha aplikace.");}
    };
    rd.readAsText(f);
  };
}

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{
    if(b.dataset.page==="home")renderHome();
    else if(b.dataset.page==="add")renderAdd();
    else if(b.dataset.page==="history")renderHistory();
    else if(b.dataset.page==="settings")renderSettings();
  });
  document.getElementById("settings").onclick=()=>renderSettings();
  renderHome();
});
