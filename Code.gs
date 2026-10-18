/** Personal Cookbook: public read-only feed and Google-authenticated owner editor. */
function setupCookbook() {
  const props = PropertiesService.getScriptProperties();
  const email = Session.getEffectiveUser().getEmail();
  if (!email) throw new Error('Run setup while signed in as the cookbook owner.');
  if (props.getProperty('OWNER_EMAIL') && props.getProperty('OWNER_EMAIL') !== email) throw new Error('Owner mismatch.');
  props.setProperty('OWNER_EMAIL', email);
  if (!props.getProperty('SPREADSHEET_ID')) {
    const book = SpreadsheetApp.create('Personal Cookbook - Recipe Storage');
    const sheet = book.getSheets()[0]; sheet.setName('Recipes');
    sheet.appendRow(['ID','Meal name','Main protein','Servings','Prep minutes','Cook minutes','Seasonings','Instructions','Ingredients JSON','Updated']);
    sheet.setFrozenRows(1); sheet.getRange(1,1,1,10).setFontWeight('bold').setBackground('#344d3e').setFontColor('#ffffff');
    sheet.setColumnWidths(1,10,170);
    props.setProperty('SPREADSHEET_ID',book.getId());
  }
  console.log('Storage: https://docs.google.com/spreadsheets/d/'+props.getProperty('SPREADSHEET_ID'));
}
function ownerOnly_() {
  const owner = PropertiesService.getScriptProperties().getProperty('OWNER_EMAIL');
  const active = Session.getActiveUser().getEmail();
  if (!owner || !active || active.toLowerCase() !== owner.toLowerCase()) throw new Error('Only the cookbook owner may edit recipes.');
}
function sheet_() {
  const id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if(!id)throw new Error('Run setupCookbook first.');
  return SpreadsheetApp.openById(id).getSheetByName('Recipes');
}
function listRecipes() {
  const sheet=sheet_(); if(sheet.getLastRow()<2)return [];
  return sheet.getRange(2,1,sheet.getLastRow()-1,10).getValues().map(r=>({id:String(r[0]),name:String(r[1]),mainProtein:String(r[2]),servings:Number(r[3]),prepMinutes:Number(r[4]),cookMinutes:Number(r[5]),seasonings:String(r[6]),instructions:String(r[7]),ingredients:JSON.parse(r[8]),updated:String(r[9])}));
}
function doGet(e) {
  if(e && e.parameter.mode==='edit') {
    try { ownerOnly_(); } catch(error) { return HtmlService.createHtmlOutput('<h1>Owner sign-in required</h1><p>Open the owner editor deployment while signed in with the cookbook owner Google account.</p>'); }
    return HtmlService.createHtmlOutputFromFile('Index').setTitle('Personal Cookbook - Owner Editor');
  }
  const callback=e && e.parameter.callback;
  const json=JSON.stringify(listRecipes()).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
  if(callback && callback!=='cookbookLoad')throw new Error('Invalid callback');
  return ContentService.createTextOutput(callback?'cookbookLoad('+json+');':json).setMimeType(callback?ContentService.MimeType.JAVASCRIPT:ContentService.MimeType.JSON);
}
function saveRecipe(input) {
  ownerOnly_();
  if(!input || typeof input!=='object')throw new Error('Invalid recipe');
  const text=(v,max,required)=>{if(typeof v!=='string'||v.length>max||required&&!v.trim())throw new Error('Invalid text');return v.trim()};
  const num=(v,min,max,integer)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||integer&&!Number.isInteger(v))throw new Error('Invalid number');return v};
  if(!Array.isArray(input.ingredients)||!input.ingredients.length)throw new Error('Add at least one ingredient');
  const r={name:text(input.name,160,true),mainProtein:text(input.mainProtein,160,false),servings:num(input.servings,1,1000,true),prepMinutes:num(input.prepMinutes,0,10080,true),cookMinutes:num(input.cookMinutes,0,10080,true),seasonings:text(input.seasonings,10000,false),instructions:text(input.instructions,20000,true),ingredients:input.ingredients.map(i=>({name:text(i.name,160,true),grams:num(i.grams,0,1000000,false),calories:num(i.calories,0,1000000,false),protein:num(i.protein,0,1000000,false),carbs:num(i.carbs,0,1000000,false),method:text(i.method||'',1000,false),cookMinutes:i.cookMinutes==null?null:num(i.cookMinutes,0,10080,true),startNote:text(i.startNote||'',1000,false)})),updated:new Date().toISOString()};
  if(JSON.stringify(r.ingredients).length>45000)throw new Error('Ingredient list is too long');
  const lock=LockService.getScriptLock();lock.waitLock(15000);
  try {
    const sheet=sheet_();let row=sheet.getLastRow()+1;
    if(input.id){const ids=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues():[];const found=ids.findIndex(x=>String(x[0])===input.id);if(found<0)throw new Error('Recipe no longer exists');row=found+2;r.id=input.id}else r.id=Utilities.getUuid();
    // RichText writes preserve literal user text and prevent spreadsheet formulas.
    const values=[r.id,r.name,r.mainProtein,String(r.servings),String(r.prepMinutes),String(r.cookMinutes),r.seasonings,r.instructions,JSON.stringify(r.ingredients),r.updated];
    sheet.getRange(row,1,1,10).setRichTextValues([values.map(v=>SpreadsheetApp.newRichTextValue().setText(v).build())]);
    SpreadsheetApp.flush();return r;
  } finally {lock.releaseLock()}
}
