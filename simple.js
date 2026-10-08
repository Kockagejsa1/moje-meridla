const TYPES={elektrina:["⚡","Elektřina","kWh"],plyn:["🟠","Plyn","m³"],studena:["🔵","Studená voda","m³"],tepla:["🔴","Teplá voda","m³"]};
let data={readings:[],enabled:["elektrina","plyn","studena","tepla"]};

function load(){
  try{
    const x=JSON.parse(localStorage.getItem("mojeMeridla"));
    if(x&&Array.isArray(x.readings)) data.readings=x.readings;
    if(x&&Array.isArray(x.enabled)&&x.enabled.length) data.enabled=x.enabled;
  }catch(e){}
}
function save(){try{localStorage.setItem("mojeMeridla",JSON.stringify(data));}catch(e){}}
function latest(t){
  const r=data.readings.filter(x=>x.type===t).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  return r.length?r[r.length-1]:null;
}
function home(){
  const a=document.getElementById("app");
  let h="<h2>Přehled</h2>";
  data.enabled.forEach(t=>{
    const m=TYPES[t],r=latest(t);
    h+='<div class="card meter"><span class="icon">'+m[0]+'</span><div><b>'+m[1]+'</b><div class="muted">'+(r?"Poslední odečet: "+r.date:"bez odečtu")+'</div></div><span class="value">'+(r?r.value:"—")+" "+m[2]+"</span></div>";
  });
  h+='<div class="card"><b>Nový odečet</b><p class="muted">Vyfoť měřidlo nebo vyber fotografie z galerie.</p><button class="btn" id="newReading">➕ Přidat odečet</button></div>';
  a.innerHTML=h;
  document.getElementById("newReading").onclick=add;
}
function add(){
  const a=document.getElementById("app");
  let h="<h2>Nový odečet</h2><div class='card'><label>Měřidlo</label><select id='type'>";
  data.enabled.forEach(t=>h+="<option value='"+t+"'>"+TYPES[t][0]+" "+TYPES[t][1]+"</option>");
  h+="</select><label>Datum</label><input id='date' type='date'><label>Stav</label><input id='value' inputmode='decimal' placeholder='např. 12345,6'>";
  h+="<label>Fotografie</label><div class='row photo-buttons'><button type='button' class='btn' id='cameraBtn'>📷 Fotoaparát</button><button type='button' class='btn secondary' id='galleryBtn'>🖼️ Galerie</button></div>";
  h+="<input id='cameraInput' type='file' accept='image/*' capture='environment' hidden><input id='galleryInput' type='file' accept='image/*' multiple hidden>";
  h+="<div id='photoInfo' class='muted'>Vyber fotografii fotoaparátem nebo jednu či více fotografií z galerie.</div>";
  h+="<button class='btn' id='saveReading'>💾 Uložit</button></div>";
  a.innerHTML=h;
  document.getElementById("date").value=new Date().toISOString().slice(0,10);

  const cameraInput=document.getElementById("cameraInput");
  const galleryInput=document.getElementById("galleryInput");
  const info=document.getElementById("photoInfo");

  document.getElementById("cameraBtn").onclick=function(){cameraInput.click();};
  document.getElementById("galleryBtn").onclick=function(){galleryInput.click();};

  cameraInput.onchange=function(){
    if(this.files&&this.files.length){
      info.textContent="📷 Fotoaparát: "+this.files[0].name;
    }
  };
  galleryInput.onchange=function(){
    if(this.files&&this.files.length){
      info.textContent="🖼️ Galerie: vybráno "+this.files.length+" fotografií";
    }
  };

  document.getElementById("saveReading").onclick=function(){
    const v=document.getElementById("value").value.replace(",",".");
    if(!v||isNaN(v)){alert("Zadej platnou hodnotu.");return;}
    data.readings.push({id:Date.now(),type:document.getElementById("type").value,date:document.getElementById("date").value,value:Number(v)});
    save();home();
  };
}
function history(){
  const a=document.getElementById("app");
  let h="<h2>Historie</h2>";
  if(!data.readings.length) h+="<div class='card muted'>Zatím nejsou žádné odečty.</div>";
  data.readings.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).forEach(r=>{
    const m=TYPES[r.type];
    h+="<div class='card'><b>"+m[0]+" "+m[1]+"</b><div>"+r.date+"</div><div class='value'>"+r.value+" "+m[2]+"</div></div>";
  });
  a.innerHTML=h;
}
function settings(){
  const a=document.getElementById("app");
  let h="<h2>Nastavení</h2><div class='card'><b>Zobrazená měřidla</b>";
  Object.keys(TYPES).forEach(t=>h+="<label><input type='checkbox' data-meter='"+t+"' "+(data.enabled.indexOf(t)>=0?"checked":"")+"> "+TYPES[t][0]+" "+TYPES[t][1]+"</label>");
  h+="</div><div class='card'><b>Záloha</b><p class='muted'>Odečty a nastavení bez fotografií.</p><button class='btn' id='export'>⬇️ Export JSON</button></div>";
  a.innerHTML=h;
  a.querySelectorAll("[data-meter]").forEach(c=>c.onchange=function(){
    data.enabled=Object.keys(TYPES).filter(t=>a.querySelector("[data-meter='"+t+"']").checked);
    if(!data.enabled.length){this.checked=true;data.enabled=[this.dataset.meter];}
    save();home();
  });
  document.getElementById("export").onclick=function(){
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const u=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=u;a.download="moje-odecet-zaloha.json";a.click();URL.revokeObjectURL(u);
  };
}
document.addEventListener("DOMContentLoaded",function(){
  load();
  document.querySelectorAll("nav button").forEach(function(b){
    b.onclick=function(){
      if(b.dataset.page==="home")home();
      if(b.dataset.page==="add")add();
      if(b.dataset.page==="history")history();
      if(b.dataset.page==="settings")settings();
    };
  });
  document.getElementById("settings").onclick=settings;
  home();
});