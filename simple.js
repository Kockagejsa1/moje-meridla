const TYPES={elektrina:["⚡","Elektřina","kWh"],plyn:["🟠","Plyn","m³"],studena:["🔵","Studená voda","m³"],tepla:["🔴","Teplá voda","m³"]};
let data={readings:[],enabled:["elektrina","plyn","studena","tepla"]};

function load(){try{const x=JSON.parse(localStorage.getItem("mojeMeridla"));if(x&&Array.isArray(x.readings))data.readings=x.readings;if(x&&Array.isArray(x.enabled)&&x.enabled.length)data.enabled=x.enabled;}catch(e){}}
function save(){try{localStorage.setItem("mojeMeridla",JSON.stringify(data));}catch(e){}}
function latest(t){const r=data.readings.filter(x=>x.type===t).sort((a,b)=>String(a.date).localeCompare(String(b.date)));return r.length?r[r.length-1]:null;}
function previousReading(t,r){return data.readings.filter(x=>x.type===t&&String(x.date)<String(r.date)).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]||null;}
function home(){
 const a=document.getElementById("app");let h="<h2>Přehled</h2>";
 data.enabled.forEach(t=>{
  const m=TYPES[t],r=latest(t),p=r?previousReading(t,r):null;
  let consumption="";
  if(r&&p){const d=Number(r.value)-Number(p.value);consumption=d>=0?"<div class='muted'>Spotřeba od předchozího odečtu: <b>"+d.toLocaleString('cs-CZ',{maximumFractionDigits:3})+" "+m[2]+"</b></div>":"<div class='muted'>Spotřebu nelze vypočítat (stav klesl).</div>";}
  h+='<div class="card meter"><span class="icon">'+m[0]+'</span><div><b>'+m[1]+'</b><div class="muted">'+(r?"Poslední odečet: "+r.date:"bez odečtu")+'</div>'+consumption+'</div><span class="value">'+(r?r.value:"—")+" "+m[2]+"</span></div>";
 });
 h+='<div class="card"><b>Nový odečet</b><p class="muted">Vyfoť měřidlo nebo vyber fotografie z galerie.</p><button class="btn" id="newReading">➕ Přidat odečet</button></div>';a.innerHTML=h;document.getElementById("newReading").onclick=add;
}
function exifDate(file){
 return new Promise(resolve=>{
  if(!file||!file.type.match(/^image\/jpe?g$/i)){resolve(null);return;}
  const reader=new FileReader();
  reader.onload=function(){
   try{
    const v=new DataView(reader.result);if(v.getUint16(0,false)!==0xFFD8){resolve(null);return;}
    let o=2;
    while(o<v.byteLength){
     if(v.getUint8(o)!==0xFF){o++;continue;}
     const marker=v.getUint8(o+1),len=v.getUint16(o+2,false);
     if(marker===0xE1){
      const start=o+4;if(new TextDecoder().decode(new Uint8Array(v.buffer,start,6))!=="Exif\0\0"){o+=2+len;continue;}
      const t=start+6;const little=v.getUint16(t,false)===0x4949;const u16=p=>v.getUint16(p,little),u32=p=>v.getUint32(p,little);
      const ifd=t+u32(t+4);const n=u16(ifd);
      for(let i=0;i<n;i++){const p=ifd+2+i*12,tag=u16(p);if(tag===0x8769||tag===0x9003){const sub=t+u32(p+8),sn=u16(sub);for(let j=0;j<sn;j++){const q=sub+2+j*12;if(u16(q)===0x9003){const off=t+u32(q+8);const s=new TextDecoder().decode(new Uint8Array(v.buffer,off,19)).trim();const m=s.match(/(\\d{4}):(\\d{2}):(\\d{2})/);if(m){resolve(m[1]+"-"+m[2]+"-"+m[3]);return;}}}}}}
     o+=2+len;
    }
   }catch(e){}
   resolve(null);
  };reader.readAsArrayBuffer(file.slice(0,128*1024));
 });
}
function guessType(text,name){
 const s=(text+" "+name).toLowerCase();
 if(/kwh|kw\/h|elektr|elektrom/.test(s))return "elektrina";
 if(/plyn|gas|m3|m³/.test(s))return "plyn";
 if(/tepl|hot water|tuv/.test(s))return "tepla";
 if(/vod|water|studen/.test(s))return "studena";
 return data.enabled[0]||"elektrina";
}
function numberFromOCR(text){
 const a=(text||"").replace(/,/g,".").match(/\d[\d\s.]{2,}/g)||[];
 const nums=a.map(x=>x.replace(/\s/g,"")).filter(x=>/^\d+(?:\.\d+)?$/.test(x));
 return nums.length?nums.sort((a,b)=>b.length-a.length)[0]:"";
}
async function processPhotos(files){
 const results=[];const info=document.getElementById("photoInfo");
 for(let i=0;i<files.length;i++){
  const f=files[i];info.textContent="🔎 Zpracovávám fotografii "+(i+1)+" z "+files.length+"…";
  const date=await exifDate(f);let text="";
  try{if(window.Tesseract){const r=await Tesseract.recognize(f,"eng",{logger:m=>{if(m.status==="recognizing text"&&m.progress)info.textContent="🔎 OCR "+(i+1)+"/"+files.length+" — "+Math.round(m.progress*100)+" %";}});text=r.data.text||"";}}catch(e){}
  const value=numberFromOCR(text);const type=guessType(text,f.name);
  results.push({file:f,date:date||new Date().toISOString().slice(0,10),value,type,ocr:text});
 }
 return results;
}
function add(){
 const a=document.getElementById("app");let h="<h2>Nový odečet</h2><div class='card'>";
 h+="<label>Měřidlo</label><select id='type'>";data.enabled.forEach(t=>h+="<option value='"+t+"'>"+TYPES[t][0]+" "+TYPES[t][1]+"</option>");h+="</select>";
 h+="<label>Datum odečtu</label><input id='date' type='date'>";
 h+="<label>Stav</label><input id='value' inputmode='decimal' placeholder='např. 12345,6'>";
 h+="<label>Fotografie</label><div class='row photo-buttons'><button type='button' class='btn' id='cameraBtn'>📷 Fotoaparát</button><button type='button' class='btn secondary' id='galleryBtn'>🖼️ Galerie</button></div>";
 h+="<input id='cameraInput' type='file' accept='image/*' capture='environment' hidden><input id='galleryInput' type='file' accept='image/*' multiple hidden>";
 h+="<div id='photoInfo' class='muted'>Z galerie můžeš vybrat více fotografií najednou.</div><div id='photoResults'></div>";
 h+="<button class='btn' id='saveReading'>💾 Uložit</button></div>";a.innerHTML=h;
 document.getElementById("date").value=new Date().toISOString().slice(0,10);
 const cam=document.getElementById("cameraInput"),gal=document.getElementById("galleryInput"),info=document.getElementById("photoInfo");
 document.getElementById("cameraBtn").onclick=()=>cam.click();document.getElementById("galleryBtn").onclick=()=>gal.click();
 async function selected(files){
  if(!files||!files.length)return;
  const rs=await processPhotos(Array.from(files));const box=document.getElementById("photoResults");box.innerHTML="";
  rs.forEach((r,i)=>{
   const m=TYPES[r.type];box.innerHTML+="<div class='card'><b>"+m[0]+" "+m[1]+"</b><label>Datum z EXIF</label><input type='date' id='pd"+i+"' value='"+r.date+"'><label>Rozpoznaná hodnota</label><input id='pv"+i+"' value='"+r.value+"' inputmode='decimal'><label>Měřidlo</label><select id='pt"+i+"'>"+data.enabled.map(t=>"<option value='"+t+"' "+(t===r.type?"selected":"")+">"+TYPES[t][0]+" "+TYPES[t][1]+"</option>").join("")+"</select><div class='muted'>"+r.file.name+"</div></div>";
  });
  info.textContent="✅ Zpracováno "+rs.length+" fotografií. Zkontroluj údaje a ulož.";
  window._photoResults=rs;
  if(rs.length===1){document.getElementById("date").value=rs[0].date;if(rs[0].value)document.getElementById("value").value=rs[0].value;document.getElementById("type").value=rs[0].type;}
 }
 cam.onchange=()=>selected(cam.files);gal.onchange=()=>selected(gal.files);
 document.getElementById("saveReading").onclick=function(){
  const rs=window._photoResults||[];
  if(rs.length){
   rs.forEach((r,i)=>{const v=document.getElementById("pv"+i).value.replace(",","."),d=document.getElementById("pd"+i).value,t=document.getElementById("pt"+i).value;if(v&&!isNaN(v))data.readings.push({id:Date.now()+i,type:t,date:d,value:Number(v)});});
   save();home();return;
  }
  const v=document.getElementById("value").value.replace(",",".");if(!v||isNaN(v)){alert("Zadej platnou hodnotu.");return;}
  data.readings.push({id:Date.now(),type:document.getElementById("type").value,date:document.getElementById("date").value,value:Number(v)});save();home();
 };
}
function history(){
 const a=document.getElementById("app");
 const types=Object.keys(TYPES).filter(t=>data.readings.some(r=>r.type===t)||data.enabled.includes(t));
 const chosen=window._historyType&&types.includes(window._historyType)?window._historyType:(types[0]||data.enabled[0]||"elektrina");
 const readings=data.readings.filter(r=>r.type===chosen&&r.date&&Number.isFinite(Number(r.value))).slice().sort((x,y)=>String(x.date).localeCompare(String(y.date)));
 const consumptionById={},monthly={};
 for(let i=1;i<readings.length;i++){
  const prev=readings[i-1],cur=readings[i],diff=Number(cur.value)-Number(prev.value);
  if(diff>=0){consumptionById[String(cur.id)]=diff;const month=String(cur.date).slice(0,7);monthly[month]=(monthly[month]||0)+diff;}
 }
 let h="<h2>Historie odečtů</h2><div class='card'><label for='historyType'>Vyber měřidlo</label><select id='historyType'>";
 types.forEach(t=>h+="<option value='"+t+"' "+(t===chosen?"selected":"")+">"+TYPES[t][0]+" "+TYPES[t][1]+"</option>");
 h+="</select></div>";
 if(!readings.length)h+="<div class='card muted'>Pro toto měřidlo zatím nejsou uložené žádné odečty.</div>";
 else {
  h+="<div class='card'><b>Měsíční spotřeba</b>";
  const months=Object.keys(monthly).sort().reverse();
  if(!months.length)h+="<p class='muted'>Pro výpočet spotřeby je potřeba alespoň dvojice odečtů.</p>";
  months.forEach(m=>h+="<div class='history-month'><b>"+m+"</b><div class='value'>"+monthly[m].toLocaleString('cs-CZ',{maximumFractionDigits:3})+" "+TYPES[chosen][2]+"</div></div>");
  h+="</div><h3>Jednotlivé odečty</h3>";
  readings.slice().reverse().forEach(r=>{
   const m=TYPES[r.type],has=Object.prototype.hasOwnProperty.call(consumptionById,String(r.id));
   h+="<div class='card'><b>"+m[0]+" "+m[1]+"</b><div>"+r.date+"</div><div class='value'>"+r.value+" "+m[2]+"</div>";
   if(has)h+="<div class='muted'>Spotřeba od předchozího odečtu: <b>"+consumptionById[String(r.id)].toLocaleString('cs-CZ',{maximumFractionDigits:3})+" "+m[2]+"</b></div>";
   else if(readings[0].id!==r.id)h+="<div class='muted'>Spotřebu nelze vypočítat (stav klesl).</div>";
   h+="<button class='btn secondary' data-edit-reading='"+r.id+"'>✏️ Upravit</button></div>";
  });
 }
 a.innerHTML=h;
 document.getElementById("historyType").onchange=function(){window._historyType=this.value;history();};
 a.querySelectorAll("[data-edit-reading]").forEach(b=>b.onclick=()=>editReading(b.dataset.editReading));
}
function editReading(id){const r=data.readings.find(x=>String(x.id)===String(id));if(!r)return;const a=document.getElementById("app");let h="<h2>Upravit odečet</h2><div class='card'><label>Měřidlo</label><select id='editType'>";data.enabled.forEach(t=>h+="<option value='"+t+"' "+(t===r.type?"selected":"")+">"+TYPES[t][0]+" "+TYPES[t][1]+"</option>");if(!data.enabled.includes(r.type))h+="<option value='"+r.type+"' selected>"+TYPES[r.type][0]+" "+TYPES[r.type][1]+"</option>";h+="</select><label>Datum odečtu</label><input id='editDate' type='date' value='"+r.date+"'><label>Stav měřidla</label><input id='editValue' inputmode='decimal' value='"+r.value+"'><div class='row'><button class='btn' id='saveEdit'>💾 Uložit změny</button><button class='btn secondary' id='cancelEdit'>Zrušit</button></div></div>";a.innerHTML=h;document.getElementById("saveEdit").onclick=function(){const v=document.getElementById("editValue").value.trim().replace(",","."),d=document.getElementById("editDate").value,t=document.getElementById("editType").value;if(!v||!Number.isFinite(Number(v))||Number(v)<0){alert("Zadej platný nezáporný stav měřidla.");return;}if(!d){alert("Vyber datum odečtu.");return;}r.value=Number(v);r.date=d;r.type=t;save();history();};document.getElementById("cancelEdit").onclick=history;}
function stats(){
 const a=document.getElementById("app");
 const typeList=data.enabled.filter(t=>TYPES[t]);
 const chosen=window._statsType&&typeList.includes(window._statsType)?window._statsType:(typeList[0]||"elektrina");
 const readings=data.readings.filter(r=>r.type===chosen&&r.date&&Number.isFinite(Number(r.value))).slice().sort((x,y)=>String(x.date).localeCompare(String(y.date)));
 const monthly={};
 for(let i=1;i<readings.length;i++){const prev=readings[i-1],cur=readings[i],cons=Number(cur.value)-Number(prev.value);if(cons<0)continue;const month=String(cur.date).slice(0,7);monthly[month]=(monthly[month]||0)+cons;}
 const months=Object.keys(monthly).sort().slice(-12),vals=months.map(m=>monthly[m]),max=Math.max(1,...vals);
 let h="<h2>Statistiky spotřeby</h2><div class='card'><label for='statsType'>Vyber měřidlo</label><select id='statsType'>";
 typeList.forEach(t=>h+="<option value='"+t+"' "+(t===chosen?"selected":"")+">"+TYPES[t][0]+" "+TYPES[t][1]+"</option>");
 h+="</select><p class='muted'>Měsíční spotřeba se počítá z rozdílu po sobě jdoucích odečtů a přiřazuje se k měsíci novějšího odečtu.</p></div>";
 if(months.length){h+="<div class='card'><b>"+TYPES[chosen][0]+" "+TYPES[chosen][1]+" — měsíční spotřeba</b><div class='bar-chart' role='img' aria-label='Sloupcový graf měsíční spotřeby'>";
 months.forEach((m,i)=>{const v=monthly[m],prev=i?monthly[months[i-1]]:null;let cmp="";if(prev!==null){if(v>prev)cmp="<div class='muted danger'>▲ "+(((v-prev)/(prev||1))*100).toFixed(0)+" %</div>";else if(v<prev)cmp="<div class='muted ok'>▼ "+(((prev-v)/(prev||1))*100).toFixed(0)+" %</div>";else cmp="<div class='muted'>beze změny</div>";}
 h+="<div class='bar-col'><b>"+Number(v.toFixed(2))+" "+TYPES[chosen][2]+"</b><div class='bar-track'><div class='bar-fill' style='height:"+Math.max(3,(v/max)*100)+"%'></div></div><span>"+m.slice(5)+"/"+m.slice(0,4)+"</span>"+cmp+"</div>";});
 h+="</div></div>";const sorted=months.slice().sort((x,y)=>monthly[x]-monthly[y]),lm=months[months.length-1],lv=monthly[lm];
 h+="<div class='card'><b>Vyhodnocení</b><p>Poslední zaznamenaná měsíční spotřeba: <strong>"+lv.toFixed(2)+" "+TYPES[chosen][2]+"</strong> ("+lm+").</p>";
 if(months.length>1){const pm=months[months.length-2],pv=monthly[pm],diff=lv-pv,pct=pv?Math.abs(diff/pv*100):0;h+="<p>"+(diff>0?"Spotřeba vzrostla":diff<0?"Spotřeba klesla":"Spotřeba se nezměnila")+" oproti "+pm+(diff!==0?" o "+pct.toFixed(1)+" %":"")+".</p><p>Nejnižší spotřeba: <b>"+sorted[0]+" — "+monthly[sorted[0]].toFixed(2)+" "+TYPES[chosen][2]+"</b>.</p><p>Nejvyšší spotřeba: <b>"+sorted[sorted.length-1]+" — "+monthly[sorted[sorted.length-1]].toFixed(2)+" "+TYPES[chosen][2]+"</b>.</p>";}
 h+="</div>";
 }else h+="<div class='card'>Pro graf zatím nejsou dostatečné údaje. Zadej alespoň dva odečty stejného měřidla s různými daty.</div>";
 a.innerHTML=h;document.getElementById("statsType").onchange=function(){window._statsType=this.value;stats();};
}
function downloadFile(blob,name){const u=URL.createObjectURL(blob),x=document.createElement("a");x.href=u;x.download=name;document.body.appendChild(x);x.click();x.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function exportJSON(){downloadFile(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),"moje-odecet-zaloha.json");}
function validBackup(x){
 if(!x||!Array.isArray(x.readings)||!Array.isArray(x.enabled))return false;
 return x.readings.every(r=>r&&TYPES[r.type]&&typeof r.date==="string"&&r.date.length>=10&&Number.isFinite(Number(r.value))&&Number(r.value)>=0);
}
function applyBackup(x){
 if(!validBackup(x)){alert("Soubor nemá platný formát zálohy MŮJ ODEČET.");return false;}
 if(!confirm("Import nahradí všechny současné odečty a nastavení. Před pokračováním doporučuji vytvořit zálohu. Chceš pokračovat?"))return false;
 data={readings:x.readings.map((r,i)=>({...r,id:r.id??(Date.now()+i),value:Number(r.value)})),enabled:x.enabled.filter(t=>TYPES[t])};
 if(!data.enabled.length)data.enabled=Object.keys(TYPES);
 save();alert("Záloha byla úspěšně importována.");home();return true;
}
function importJSONFile(file){
 if(!file)return;
 const reader=new FileReader();
 reader.onload=()=>{try{applyBackup(JSON.parse(reader.result));}catch(e){alert("Soubor JSON se nepodařilo načíst.");}};
 reader.readAsText(file);
}
function exportExcel(){
 if(!window.XLSX){alert("Knihovna pro Excel se nenačetla. Zkontroluj připojení k internetu a zkus to znovu.");return;}
 const rows=data.readings.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(r=>({Datum:r.date,Měřidlo:TYPES[r.type]?.[1]||r.type,Typ:r.type,Hodnota:Number(r.value),Jednotka:TYPES[r.type]?.[2]||""}));
 const meters=data.enabled.map(t=>({Typ:t,Měřidlo:TYPES[t][1],Aktivní:"Ano"}));
 const wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.length?rows:[{Datum:"",Měřidlo:"",Typ:"",Hodnota:"",Jednotka:""}]),"Odečty");
 XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(meters),"Nastavení");
 const bytes=XLSX.write(wb,{bookType:"xlsx",type:"array"});
 downloadFile(new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),"moje-odecet-zaloha.xlsx");
}
function importExcelFile(file){
 if(!file)return;
 if(!window.XLSX){alert("Knihovna pro Excel se nenačetla. Zkontroluj připojení k internetu a zkus to znovu.");return;}
 const reader=new FileReader();
 reader.onload=()=>{try{
  const wb=XLSX.read(reader.result,{type:"array",cellDates:true});
  const sheet=wb.Sheets["Odečty"]||wb.Sheets[wb.SheetNames[0]];
  if(!sheet)throw new Error("Chybí list s odečty.");
  const rows=XLSX.utils.sheet_to_json(sheet,{defval:""});
  const key=x=>String(x??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const parsed=rows.map((row,i)=>{
   const keys=Object.keys(row),get=(...names)=>{const k=keys.find(k=>names.includes(key(k)));return k===undefined?undefined:row[k];};
   let type=get("typ","type","klic meridla","kod meridla");
   const meter=get("meridlo","meridla","nazev meridla");
   if(!TYPES[type])type=Object.keys(TYPES).find(t=>key(TYPES[t][1])===key(meter));
   if(!TYPES[type])throw new Error("Neznámý typ měřidla na řádku "+(i+2)+". Použij sloupec Typ nebo Měřidlo.");
   let date=get("datum","date");
   if(date instanceof Date&&!isNaN(date))date=date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");
   else if(typeof date==="number"&&date>20000&&date<80000){const d=XLSX.SSF.parse_date_code(date);date=d.y+"-"+String(d.m).padStart(2,"0")+"-"+String(d.d).padStart(2,"0");}
   else date=String(date||"").slice(0,10);
   const value=Number(String(get("hodnota","stav","value","odecet","odecetni stav")??"").replace(/\s/g,"").replace(",","."));
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(value)||value<0)throw new Error("Neplatné datum nebo hodnota na řádku "+(i+2)+".");
   return {id:Date.now()+i,type,date,value};
  });
  if(!parsed.length)throw new Error("V souboru nejsou žádné odečty.");
  const settingsSheet=wb.Sheets["Nastavení"],enabled=[];
  if(settingsSheet){XLSX.utils.sheet_to_json(settingsSheet,{defval:""}).forEach(row=>{const type=row.Typ||row.typ;if(TYPES[type]&&!enabled.includes(type))enabled.push(type);});}
  applyBackup({readings:parsed,enabled:enabled.length?enabled:Object.keys(TYPES)});
 }catch(e){alert("Import Excelu se nepodařil: "+(e.message||"zkontroluj strukturu souboru."));}};
 reader.readAsArrayBuffer(file);
}
function settings(){
 const a=document.getElementById("app");let h="<h2>Nastavení</h2><div class='card'><b>Barva aplikace</b><p class='muted'>Vyber barvu horní lišty, tlačítek a grafů.</p><div class='accent-options'>";
 const accents={blue:["Modrá","#1565c0"],yellow:["Žlutá","#d6a400"],red:["Červená","#d32f2f"],orange:["Oranžová","#ef6c00"],pastelblue:["Pastelově modrá","#80c4e8"],green:["Zelená","#2e8b57"]};
 const currentAccent=readAccent();
 Object.keys(accents).forEach(k=>h+="<button type='button' class='accent-choice' data-accent-choice='"+k+"' aria-pressed='"+(k===currentAccent?"true":"false")+"' title='"+accents[k][0]+"' style='--swatch:"+accents[k][1]+"'><span class='accent-dot'></span><span>"+accents[k][0]+"</span>"+(k===currentAccent?" ✓":"")+"</button>");
 h+="</div></div><div class='card'><b>Zobrazená měřidla</b>";
 Object.keys(TYPES).forEach(t=>h+="<label><input type='checkbox' data-meter='"+t+"' "+(data.enabled.indexOf(t)>=0?"checked":"")+"> "+TYPES[t][0]+" "+TYPES[t][1]+"</label>");
 h+="</div><div class='card'><b>Záloha a obnova</b><p class='muted'>Záloha obsahuje odečty a nastavení měřidel, nikoli fotografie. Import nahradí stávající data.</p><button class='btn' id='exportJSON'>⬇️ Export do JSON</button><button class='btn secondary' id='importJSON'>⬆️ Import z JSON</button><input id='jsonFile' type='file' accept='.json,application/json' hidden><hr><button class='btn' id='exportExcel'>📊 Export do Excelu (.xlsx)</button><button class='btn secondary' id='importExcel'>📥 Import z Excelu (.xlsx)</button><input id='excelFile' type='file' accept='.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel' hidden></div>";
 a.innerHTML=h;
 a.querySelectorAll("[data-accent-choice]").forEach(b=>b.onclick=()=>{applyAccent(b.dataset.accentChoice);settings();});
 a.querySelectorAll("[data-meter]").forEach(c=>c.onchange=function(){data.enabled=Object.keys(TYPES).filter(t=>a.querySelector("[data-meter='"+t+"']").checked);if(!data.enabled.length){this.checked=true;data.enabled=[this.dataset.meter];}save();settings();});
 document.getElementById("exportJSON").onclick=exportJSON;
 document.getElementById("importJSON").onclick=()=>document.getElementById("jsonFile").click();
 document.getElementById("jsonFile").onchange=e=>importJSONFile(e.target.files[0]);
 document.getElementById("exportExcel").onclick=exportExcel;
 document.getElementById("importExcel").onclick=()=>document.getElementById("excelFile").click();
 document.getElementById("excelFile").onchange=e=>importExcelFile(e.target.files[0]);
}
const ACCENTS={blue:"#1565c0",yellow:"#d6a400",red:"#d32f2f",orange:"#ef6c00",pastelblue:"#80c4e8",green:"#2e8b57"};
function readAccent(){try{const v=localStorage.getItem("mojeMeridlaAccent");return ACCENTS[v]?v:"blue";}catch(e){return "blue";}}
function applyAccent(key){const chosen=ACCENTS[key]?key:"blue";document.body.dataset.accent=chosen;try{localStorage.setItem("mojeMeridlaAccent",chosen);}catch(e){}const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=ACCENTS[chosen];}
function applyTheme(theme){
 const chosen=theme==="dark"?"dark":"light";document.body.dataset.theme=chosen;
 const b=document.getElementById("themeToggle");if(b){b.textContent=chosen==="dark"?"☀️":"🌙";b.setAttribute("aria-label",chosen==="dark"?"Zapnout světlý režim":"Zapnout tmavý režim");b.title=chosen==="dark"?"Zapnout světlý režim":"Zapnout tmavý režim";}
 applyAccent(readAccent());
}
function toggleTheme(){const next=document.body.dataset.theme==="dark"?"light":"dark";try{localStorage.setItem("mojeMeridlaTheme",next);}catch(e){}applyTheme(next);}
document.addEventListener("DOMContentLoaded",function(){load();let theme="light";try{theme=localStorage.getItem("mojeMeridlaTheme")||"light";}catch(e){}applyTheme(theme);applyAccent(readAccent());document.getElementById("themeToggle").onclick=toggleTheme;document.querySelectorAll("nav button").forEach(function(b){b.onclick=function(){if(b.dataset.page==="home")home();if(b.dataset.page==="add")add();if(b.dataset.page==="history")history();if(b.dataset.page==="stats")stats();if(b.dataset.page==="settings")settings();};});document.getElementById("settings").onclick=settings;home();});