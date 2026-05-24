import React, { useContext, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const CURRENCIES = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','CNY','KRW','PLN'];
const ACCOUNT_ICONS = { savings:'wallet', checking:'card', cash:'cash', investment:'bar-chart', credit:'card', 'e-wallet':'phone-portrait' };

const DEFAULT_CATEGORIES = [
  { name:'Food & Dining',    icon:'🍔', subs:['Groceries','Restaurants','Coffee','Takeout','Snacks'] },
  { name:'Transport',        icon:'🚗', subs:['Fuel','Commute','Parking','Toll','Uber/Grab'] },
  { name:'Shopping',         icon:'🛍️', subs:['Clothing','Electronics','Home','Personal Care','Accessories'] },
  { name:'Bills & Utilities',icon:'🧾', subs:['Electricity','Water','Internet','Phone','Gas'] },
  { name:'Health',           icon:'💊', subs:['Medicine','Doctor','Gym','Insurance','Dental'] },
  { name:'Entertainment',    icon:'🎬', subs:['Streaming','Movies','Games','Events','Hobbies'] },
  { name:'Education',        icon:'📚', subs:['Tuition','Books','Courses','Supplies','Tutoring'] },
  { name:'Savings',          icon:'🏦', subs:['Emergency Fund','Retirement','Vacation Fund','House Fund'] },
  { name:'Housing',          icon:'🏠', subs:['Rent','Mortgage','Maintenance','Furnishing','Cleaning'] },
  { name:'Family',           icon:'👨‍👩‍👧', subs:['Kids','Parents','Pets','Gifts','Celebrations'] },
  { name:'Other',            icon:'📦', subs:[] },
];

export default function BudgetScreen() {
  const { appData, saveData, theme } = useContext(AppContext);
  const s = makeStyles(theme);

  const allCategories = useMemo(() => {
    const custom = (appData.customCategories || []).map(c => ({ ...c, isCustom: true }));
    return [...DEFAULT_CATEGORIES, ...custom];
  }, [appData.customCategories]);

  // Add/edit budget entry modal
  const [modal, setModal]               = useState(false);
  const [step, setStep]                 = useState(1);
  const [editingBudget, setEditingBudget] = useState(null); // null=new, object=editing
  const [selectedCat, setSelectedCat]   = useState(null);
  const [selectedSub, setSelectedSub]   = useState('');
  const [customSub, setCustomSub]       = useState('');
  const [allocated, setAllocated]       = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState(appData.baseCurrency);
  const [linkedAccount, setLinkedAccount]   = useState('');

  // New custom category modal
  const [newCatModal, setNewCatModal] = useState(false);
  const [newCatName, setNewCatName]   = useState('');
  const [newCatIcon, setNewCatIcon]   = useState('📦');
  const [newCatSubs, setNewCatSubs]   = useState('');

  // Add subcategory to existing budget group modal
  const [addSubModal, setAddSubModal]     = useState(false);
  const [addSubForCat, setAddSubForCat]   = useState(null);
  const [addSubName, setAddSubName]       = useState('');
  const [addSubAmount, setAddSubAmount]   = useState('');
  const [addSubCurrency, setAddSubCurrency] = useState(appData.baseCurrency);
  const [addSubAccount, setAddSubAccount] = useState('');

  // Custom exchange rate override
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRate, setCustomRate]       = useState('');

  const toBase = (a, c) => { const r=appData.exchangeRates[c]||1, br=appData.exchangeRates[appData.baseCurrency]||1; return (a/r)*br; };
  const fmtBase = (a) => new Intl.NumberFormat('en-PH',{ style:'currency', currency:appData.baseCurrency, minimumFractionDigits:2 }).format(a);
  const fmt = (a, c) => new Intl.NumberFormat('en-PH',{ style:'currency', currency:c||appData.baseCurrency, minimumFractionDigits:2 }).format(a);

  const totalIncome    = (appData.incomes||[]).reduce((sum,i)=>sum+toBase(i.amount,i.currency),0);
  const totalAllocated = appData.budget.reduce((s,b)=>s+toBase(b.allocated,b.currency||appData.baseCurrency),0);
  const unallocated    = totalIncome - totalAllocated;

  const getSpent = (budgetId) => {
    const now = new Date();
    return appData.expenses.filter(e => {
      const d = new Date(e.date);
      return e.budgetKey === budgetId && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    }).reduce((s,e)=>s+toBase(e.amount,e.currency),0);
  };

  const openNewBudget = () => {
    setEditingBudget(null);
    setStep(1); setSelectedCat(null); setSelectedSub(''); setCustomSub('');
    setAllocated(''); setBudgetCurrency(appData.baseCurrency); setLinkedAccount('');
    setUseCustomRate(false); setCustomRate('');
    setModal(true);
  };

  const openEditBudget = (item) => {
    setEditingBudget(item);
    const cat = allCategories.find(c=>c.name===item.category) || { name:item.category, icon:item.icon, subs:[] };
    setSelectedCat(cat);
    setSelectedSub(item.subCategory||'');
    setCustomSub('');
    setAllocated(String(item.allocated));
    setBudgetCurrency(item.currency||appData.baseCurrency);
    setLinkedAccount(item.linkedAccount||'');
    setUseCustomRate(false); setCustomRate('');
    setStep(2);
    setModal(true);
  };

  const saveBudget = () => {
    if (!selectedCat) { Alert.alert('Error','Select a category'); return; }
    if (!allocated||isNaN(parseFloat(allocated))) { Alert.alert('Error','Enter valid amount'); return; }
    const finalSub = selectedSub||customSub.trim()||null;
    const key      = finalSub ? `${selectedCat.name} › ${finalSub}` : selectedCat.name;

    if (editingBudget) {
      // Update existing
      saveData({ budget: appData.budget.map(b => b.id===editingBudget.id
        ? { ...b, category:selectedCat.name, subCategory:finalSub, key, icon:selectedCat.icon, allocated:parseFloat(allocated), currency:budgetCurrency, linkedAccount:linkedAccount||null }
        : b
      )});
    } else {
      if (appData.budget.find(b=>b.key===key&&b.linkedAccount===linkedAccount)) {
        Alert.alert('Already exists','This budget entry already exists for this account'); return;
      }
      saveData({ budget:[...appData.budget, { id:Date.now().toString(), category:selectedCat.name, subCategory:finalSub, key, icon:selectedCat.icon, allocated:parseFloat(allocated), currency:budgetCurrency, linkedAccount:linkedAccount||null }] });
    }
    setModal(false);
  };

  const openAddSub = (catName, icon) => {
    setAddSubForCat({ name:catName, icon });
    setAddSubName(''); setAddSubAmount(''); setAddSubCurrency(appData.baseCurrency); setAddSubAccount('');
    setAddSubModal(true);
  };

  const saveAddSub = () => {
    if (!addSubAmount||isNaN(parseFloat(addSubAmount))) { Alert.alert('Error','Enter valid amount'); return; }
    const subName = addSubName.trim();
    const key     = subName ? `${addSubForCat.name} › ${subName}` : addSubForCat.name;
    if (appData.budget.find(b=>b.key===key)) { Alert.alert('Already exists','This subcategory already exists'); return; }
    const entry = { id:Date.now().toString(), category:addSubForCat.name, subCategory:subName||null, key, icon:addSubForCat.icon, allocated:parseFloat(addSubAmount), currency:addSubCurrency, linkedAccount:addSubAccount||null };
    saveData({ budget:[...appData.budget, entry] });
    setAddSubModal(false);
  };

  const addCustomCategory = () => {
    if (!newCatName.trim()) { Alert.alert('Error','Enter category name'); return; }
    const subs = newCatSubs.split(',').map(s=>s.trim()).filter(Boolean);
    const newCat = { name:newCatName.trim(), icon:newCatIcon||'📦', subs };
    const existing = appData.customCategories||[];
    if (existing.find(c=>c.name===newCatName.trim())) { Alert.alert('Already exists'); return; }
    saveData({ customCategories:[...existing, newCat] });
    setNewCatName(''); setNewCatIcon('📦'); setNewCatSubs('');
    setNewCatModal(false);
    // Reopen budget modal with new cat pre-selected
    const cat = { name:newCatName.trim(), icon:newCatIcon||'📦', subs, isCustom:true };
    setSelectedCat(cat); setStep(2);
    setTimeout(()=>setModal(true),350);
  };

  const deleteBudget = (id) => Alert.alert('Delete','Remove this budget?',[
    {text:'Cancel',style:'cancel'},
    {text:'Delete',style:'destructive',onPress:()=>saveData({budget:appData.budget.filter(b=>b.id!==id)})}
  ]);

  const grouped = {};
  appData.budget.forEach(b=>{
    if(!grouped[b.category]) grouped[b.category]={icon:b.icon,items:[]};
    grouped[b.category].items.push(b);
  });

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Zero-Based Budget</Text>
        <Text style={s.subtitle}>Every peso has a purpose</Text>
      </View>

      <View style={s.summCard}>
        <Text style={s.summNote}>Based on your total income</Text>
        <View style={s.summRow}>
          <View><Text style={s.summLbl}>Income</Text><Text style={[s.summVal,{color:theme.success}]}>{fmt(totalIncome)}</Text></View>
          <View><Text style={s.summLbl}>Allocated</Text><Text style={[s.summVal,{color:theme.primary}]}>{fmt(totalAllocated)}</Text></View>
          <View><Text style={s.summLbl}>Unallocated</Text><Text style={[s.summVal,{color:unallocated>=0?theme.accent:theme.danger}]}>{fmt(unallocated)}</Text></View>
        </View>
        {totalIncome===0&&<View style={s.warnBox}><Ionicons name="warning" size={14} color={theme.warning}/><Text style={s.warnTxt}>Add income first to start budgeting</Text></View>}
        {unallocated===0&&totalAllocated>0&&<Text style={s.perfect}>✓ Perfect zero-based budget!</Text>}
      </View>

      <ScrollView style={s.list}>
        {Object.keys(grouped).map(cat=>{
          const grp=grouped[cat];
          const catAlloc=grp.items.reduce((s,i)=>s+toBase(i.allocated,i.currency||appData.baseCurrency),0);
          const catSpent=grp.items.reduce((s,i)=>s+getSpent(i.id),0);
          const catPct=catAlloc>0?(catSpent/catAlloc)*100:0;
          return (
            <View key={cat} style={s.catGroup}>
              <View style={s.catHeader}>
                <Text style={s.catEmoji}>{grp.icon}</Text>
                <View style={s.catHeaderInfo}>
                  <Text style={s.catName}>{cat}</Text>
                  <Text style={s.catTotals}>{fmt(catSpent)} / {fmt(catAlloc)}</Text>
                </View>
                {/* Add subcategory to this group */}
                <TouchableOpacity style={s.addSubBtn} onPress={()=>openAddSub(cat,grp.icon)}>
                  <Ionicons name="add" size={16} color={theme.primary}/>
                  <Text style={s.addSubTxt}>Add</Text>
                </TouchableOpacity>
              </View>
              <View style={s.progBar}><View style={[s.progFill,{width:`${Math.min(catPct,100)}%`,backgroundColor:catPct>100?theme.danger:catPct>80?theme.warning:theme.success}]}/></View>

              {grp.items.map(item=>{
                const spent=getSpent(item.id);
                const allocBase=toBase(item.allocated,item.currency||appData.baseCurrency);
                const pct=allocBase>0?(spent/allocBase)*100:0;
                const rem=allocBase-spent;
                const acc=appData.accounts.find(a=>a.name===item.linkedAccount);
                return (
                  <View key={item.id} style={s.subItem}>
                    <View style={s.subLeft}>
                      <View style={s.subTitleRow}>
                        <Text style={s.subCatName}>{item.subCategory?`↳ ${item.subCategory}`:item.category}</Text>
                        {item.currency&&item.currency!==appData.baseCurrency&&<View style={s.curBadge}><Text style={s.curBadgeTxt}>{item.currency}</Text></View>}
                        {acc&&<View style={s.accBadge}><Ionicons name={ACCOUNT_ICONS[acc.type]||'wallet'} size={10} color={theme.primary}/><Text style={s.accBadgeTxt}>{acc.name}</Text></View>}
                      </View>
                      <View style={s.subProg}><View style={[s.subProgFill,{width:`${Math.min(pct,100)}%`,backgroundColor:pct>100?theme.danger:pct>80?theme.warning:theme.success}]}/></View>
                      <View style={s.subFooter}>
                        <Text style={s.subSpent}>Spent: {fmt(spent)}</Text>
                        <Text style={[s.subRem,{color:rem>=0?theme.success:theme.danger}]}>Left: {fmt(rem)}</Text>
                      </View>
                    </View>
                    <View style={s.subRight}>
                      <Text style={s.subAlloc}>{fmt(item.allocated,item.currency)}</Text>
                      <Text style={s.subPct}>{pct.toFixed(0)}%</Text>
                      <View style={s.subActions}>
                        <TouchableOpacity onPress={()=>openEditBudget(item)}><Ionicons name="pencil" size={14} color={theme.primary}/></TouchableOpacity>
                        <TouchableOpacity onPress={()=>deleteBudget(item.id)}><Ionicons name="trash-outline" size={14} color={theme.danger}/></TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
        {appData.budget.length===0&&<View style={s.empty}><Ionicons name="pie-chart-outline" size={64} color={theme.border}/><Text style={s.emptyTxt}>No budget yet</Text><Text style={s.emptySub}>Tap + to start allocating</Text></View>}
        <View style={{height:80}}/>
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={openNewBudget}><Ionicons name="add" size={28} color="#fff"/></TouchableOpacity>

      {/* ── Add/Edit Budget Modal ── */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={s.overlay}>
          <ScrollView keyboardShouldPersistTaps="handled"><View style={s.modal}>
            {step===1&&<>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editingBudget?'Edit Category':'Select Category'}</Text>
                <TouchableOpacity onPress={()=>setModal(false)}><Ionicons name="close" size={22} color={theme.subtext}/></TouchableOpacity>
              </View>
              {/* Simple list — name + icon only, no subs shown */}
              {allCategories.map(cat=>(
                <TouchableOpacity key={cat.name} style={[s.catListItem,selectedCat?.name===cat.name&&s.catListItemSel]} onPress={()=>{setSelectedCat(cat);setSelectedSub('');}}>
                  <Text style={s.catListEmoji}>{cat.icon}</Text>
                  <Text style={[s.catListName,selectedCat?.name===cat.name&&{color:'#fff'}]}>{cat.name}</Text>
                  {cat.isCustom&&<View style={s.customBadge}><Text style={s.customBadgeTxt}>Custom</Text></View>}
                  {selectedCat?.name===cat.name&&<Ionicons name="checkmark-circle" size={20} color="#fff"/>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.addCatBtn} onPress={()=>{setModal(false);setNewCatModal(true);}}>
                <Ionicons name="add-circle-outline" size={18} color={theme.primary}/>
                <Text style={s.addCatTxt}>Create New Category</Text>
              </TouchableOpacity>
              <View style={s.row}>
                <TouchableOpacity style={[s.btn,s.btnCancel]} onPress={()=>setModal(false)}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[s.btn,s.btnSave]} onPress={()=>{if(!selectedCat){Alert.alert('Error','Select a category');return;}setStep(2);}}><Text style={s.btnSaveTxt}>Next →</Text></TouchableOpacity>
              </View>
            </>}

            {step===2&&<>
              <View style={s.modalHeader}>
                <TouchableOpacity style={s.backRow} onPress={()=>editingBudget?setModal(false):setStep(1)}>
                  <Ionicons name="arrow-back" size={18} color={theme.primary}/>
                  <Text style={s.backTxt}>{editingBudget?'Cancel':'Back'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>setModal(false)}><Ionicons name="close" size={22} color={theme.subtext}/></TouchableOpacity>
              </View>
              <Text style={s.modalTitle}>{editingBudget?'Edit Budget':'Add Budget'} — {selectedCat?.icon} {selectedCat?.name}</Text>

              {selectedCat?.subs?.length>0&&<>
                <Text style={s.lbl}>Subcategory <Text style={s.opt}>(optional)</Text></Text>
                {selectedCat.subs.map(sub=>(
                  <TouchableOpacity key={sub} style={[s.subListItem,selectedSub===sub&&s.subListItemSel]} onPress={()=>setSelectedSub(selectedSub===sub?'':sub)}>
                    <Text style={[s.subListTxt,selectedSub===sub&&{color:'#fff'}]}>{sub}</Text>
                    {selectedSub===sub&&<Ionicons name="checkmark" size={16} color="#fff"/>}
                  </TouchableOpacity>
                ))}
              </>}
              <TextInput style={[s.input,{marginTop:8}]} value={customSub} onChangeText={setCustomSub} placeholder="Or type custom subcategory..." placeholderTextColor={theme.subtext}/>

              <Text style={s.lbl}>Allocated Amount</Text>
              <TextInput style={s.input} value={allocated} onChangeText={setAllocated} keyboardType="numeric" placeholder="e.g. 5000" placeholderTextColor={theme.subtext}/>

              <Text style={s.lbl}>Budget Currency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
                <View style={s.chipRow}>{CURRENCIES.map(c=><TouchableOpacity key={c} style={[s.chip,budgetCurrency===c&&s.chipSel]} onPress={()=>setBudgetCurrency(c)}><Text style={[s.chipTxt,budgetCurrency===c&&s.chipTxtSel]}>{c}</Text></TouchableOpacity>)}</View>
              </ScrollView>
              {budgetCurrency!==appData.baseCurrency&&parseFloat(allocated)>0&&<Text style={s.convNote}>≈ {fmt(toBase(parseFloat(allocated),budgetCurrency))} base currency</Text>}

              {/* Custom Rate Override */}
              <View style={s.customRateRow}>
                <TouchableOpacity style={[s.customRateToggle, useCustomRate && s.customRateToggleOn]} onPress={()=>setUseCustomRate(!useCustomRate)}>
                  <Ionicons name={useCustomRate ? 'checkmark-circle' : 'radio-button-off'} size={18} color={useCustomRate ? '#fff' : theme.subtext}/>
                  <Text style={[s.customRateTxt, useCustomRate && {color:'#fff'}]}>Use custom exchange rate</Text>
                </TouchableOpacity>
              </View>
              {useCustomRate && (()=>{
                const budgetCurrencyRate = appData.exchangeRates[budgetCurrency] || 1;
                const baseRate = appData.exchangeRates[appData.baseCurrency] || 1;
                const liveRate = (baseRate / budgetCurrencyRate).toFixed(4);
                return (
                  <View style={s.customRateInput}>
                    <Text style={s.lbl}>1 {budgetCurrency} = ? {appData.baseCurrency} (on budget date)</Text>
                    {liveRate && <Text style={s.convNote}>Live rate: 1 {budgetCurrency} = {liveRate} {appData.baseCurrency}</Text>}
                    <TextInput style={s.input} value={customRate} onChangeText={setCustomRate} keyboardType="numeric" placeholder={`e.g. ${liveRate || '1.0'}`} placeholderTextColor={theme.subtext}/>
                    {parseFloat(allocated)>0 && parseFloat(customRate)>0 && budgetCurrency!==appData.baseCurrency && (
                      <Text style={[s.convNote,{color:theme.warning}]}>With custom rate: {fmt(parseFloat(allocated),budgetCurrency)} = {fmtBase(parseFloat(allocated)*parseFloat(customRate))}</Text>
                    )}
                  </View>
                );
              })()}

              <Text style={s.lbl}>Link to Account <Text style={s.opt}>(optional)</Text></Text>
              <Text style={s.sublbl}>Budget spending tracked from this account</Text>
              <TouchableOpacity style={[s.accListItem,!linkedAccount&&s.accListItemSel]} onPress={()=>setLinkedAccount('')}>
                <Ionicons name="albums-outline" size={18} color={!linkedAccount?'#fff':theme.subtext}/>
                <Text style={[s.accListName,!linkedAccount&&{color:'#fff'}]}>No specific account</Text>
                {!linkedAccount&&<Ionicons name="checkmark-circle" size={18} color="#fff"/>}
              </TouchableOpacity>
              {appData.accounts.map(acc=>(
                <TouchableOpacity key={acc.id} style={[s.accListItem,linkedAccount===acc.name&&s.accListItemSel]} onPress={()=>setLinkedAccount(acc.name)}>
                  <Ionicons name={ACCOUNT_ICONS[acc.type]||'wallet'} size={18} color={linkedAccount===acc.name?'#fff':theme.primary}/>
                  <View style={s.accListInfo}>
                    <Text style={[s.accListName,linkedAccount===acc.name&&{color:'#fff'}]}>{acc.name}</Text>
                    <Text style={[s.accListBal,linkedAccount===acc.name&&{color:'rgba(255,255,255,0.8)'}]}>{acc.balance.toFixed(2)} {acc.currency}</Text>
                  </View>
                  {linkedAccount===acc.name&&<Ionicons name="checkmark-circle" size={18} color="#fff"/>}
                </TouchableOpacity>
              ))}

              <View style={s.row}>
                <TouchableOpacity style={[s.btn,s.btnCancel]} onPress={()=>setModal(false)}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[s.btn,s.btnSave]} onPress={saveBudget}><Text style={s.btnSaveTxt}>{editingBudget?'Save Changes':'Add Budget'}</Text></TouchableOpacity>
              </View>
            </>}
          </View></ScrollView>
        </View>
      </Modal>

      {/* ── Add Subcategory to existing group ── */}
      <Modal visible={addSubModal} animationType="slide" transparent>
        <View style={s.overlay}><ScrollView keyboardShouldPersistTaps="handled"><View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{addSubForCat?.icon} {addSubForCat?.name}</Text>
            <TouchableOpacity onPress={()=>setAddSubModal(false)}><Ionicons name="close" size={22} color={theme.subtext}/></TouchableOpacity>
          </View>
          <Text style={s.lbl}>Subcategory Name <Text style={s.opt}>(blank = main category)</Text></Text>
          <TextInput style={s.input} value={addSubName} onChangeText={setAddSubName} placeholder="e.g. Groceries" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Allocated Amount</Text>
          <TextInput style={s.input} value={addSubAmount} onChangeText={setAddSubAmount} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Currency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
            <View style={s.chipRow}>{CURRENCIES.map(c=><TouchableOpacity key={c} style={[s.chip,addSubCurrency===c&&s.chipSel]} onPress={()=>setAddSubCurrency(c)}><Text style={[s.chipTxt,addSubCurrency===c&&s.chipTxtSel]}>{c}</Text></TouchableOpacity>)}</View>
          </ScrollView>
          <Text style={s.lbl}>Link Account <Text style={s.opt}>(optional)</Text></Text>
          <View style={s.chipRow2}>{appData.accounts.map(a=><TouchableOpacity key={a.id} style={[s.chip,addSubAccount===a.name&&s.chipSel]} onPress={()=>setAddSubAccount(addSubAccount===a.name?'':a.name)}><Text style={[s.chipTxt,addSubAccount===a.name&&s.chipTxtSel]}>{a.name}</Text></TouchableOpacity>)}</View>
          <View style={s.row}>
            <TouchableOpacity style={[s.btn,s.btnCancel]} onPress={()=>setAddSubModal(false)}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,s.btnSave]} onPress={saveAddSub}><Text style={s.btnSaveTxt}>Add</Text></TouchableOpacity>
          </View>
        </View></ScrollView></View>
      </Modal>

      {/* ── New Custom Category Modal ── */}
      <Modal visible={newCatModal} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Category</Text>
            <TouchableOpacity onPress={()=>setNewCatModal(false)}><Ionicons name="close" size={22} color={theme.subtext}/></TouchableOpacity>
          </View>
          <Text style={s.lbl}>Icon (emoji)</Text>
          <TextInput style={s.input} value={newCatIcon} onChangeText={setNewCatIcon} placeholder="📦" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Category Name</Text>
          <TextInput style={s.input} value={newCatName} onChangeText={setNewCatName} placeholder="e.g. Date Night" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Subcategories <Text style={s.opt}>(comma separated)</Text></Text>
          <TextInput style={s.input} value={newCatSubs} onChangeText={setNewCatSubs} placeholder="e.g. Dinner, Movies, Activities" placeholderTextColor={theme.subtext}/>
          <View style={s.row}>
            <TouchableOpacity style={[s.btn,s.btnCancel]} onPress={()=>setNewCatModal(false)}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,s.btnSave]} onPress={addCustomCategory}><Text style={s.btnSaveTxt}>Create & Continue</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    header:{padding:24,paddingTop:60,backgroundColor:t.card},
    title:{fontSize:28,fontWeight:'800',color:t.text,marginBottom:4},
    subtitle:{fontSize:14,color:t.subtext},
    summCard:{margin:18,padding:18,backgroundColor:t.card,borderRadius:16,elevation:2},
    summNote:{fontSize:12,color:t.subtext,marginBottom:10,fontStyle:'italic'},
    summRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:8},
    summLbl:{fontSize:12,color:t.subtext,marginBottom:4},
    summVal:{fontSize:16,fontWeight:'700'},
    warnBox:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:t.warning+'18',borderRadius:8,padding:10,marginTop:8},
    warnTxt:{fontSize:12,color:t.warning,fontWeight:'600'},
    perfect:{textAlign:'center',color:t.success,fontWeight:'700',marginTop:8},
    list:{flex:1,padding:18,paddingTop:0},
    catGroup:{backgroundColor:t.card,borderRadius:14,padding:16,marginBottom:12,elevation:1},
    catHeader:{flexDirection:'row',alignItems:'center',marginBottom:10,gap:10},
    catEmoji:{fontSize:22},
    catHeaderInfo:{flex:1},
    catName:{fontSize:16,fontWeight:'700',color:t.text},
    catTotals:{fontSize:11,color:t.subtext,marginTop:2},
    addSubBtn:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:t.primary+'18',borderRadius:8,paddingHorizontal:10,paddingVertical:5},
    addSubTxt:{fontSize:12,color:t.primary,fontWeight:'700'},
    progBar:{height:6,backgroundColor:t.border,borderRadius:3,overflow:'hidden',marginBottom:12},
    progFill:{height:'100%',borderRadius:3},
    subItem:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',paddingVertical:10,borderTopWidth:1,borderTopColor:t.border},
    subLeft:{flex:1,marginRight:8},
    subTitleRow:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6,marginBottom:6},
    subCatName:{fontSize:14,fontWeight:'600',color:t.text},
    curBadge:{backgroundColor:t.accent+'22',borderRadius:5,paddingHorizontal:5,paddingVertical:2},
    curBadgeTxt:{fontSize:10,color:t.accent,fontWeight:'700'},
    accBadge:{flexDirection:'row',alignItems:'center',gap:3,backgroundColor:t.primary+'18',borderRadius:5,paddingHorizontal:5,paddingVertical:2},
    accBadgeTxt:{fontSize:10,color:t.primary,fontWeight:'600'},
    subProg:{height:5,backgroundColor:t.border,borderRadius:3,overflow:'hidden',marginBottom:6},
    subProgFill:{height:'100%',borderRadius:3},
    subFooter:{flexDirection:'row',justifyContent:'space-between'},
    subSpent:{fontSize:11,color:t.subtext},
    subRem:{fontSize:11,fontWeight:'600'},
    subRight:{alignItems:'flex-end',gap:4},
    subAlloc:{fontSize:14,fontWeight:'700',color:t.text},
    subPct:{fontSize:11,color:t.subtext},
    subActions:{flexDirection:'row',gap:8},
    fab:{position:'absolute',right:20,bottom:20,width:56,height:56,borderRadius:28,backgroundColor:t.primary,alignItems:'center',justifyContent:'center',elevation:8},
    empty:{alignItems:'center',paddingVertical:60},
    emptyTxt:{fontSize:17,fontWeight:'600',color:t.subtext,marginTop:16,marginBottom:8},
    emptySub:{fontSize:13,color:t.border,textAlign:'center'},
    overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
    modal:{backgroundColor:t.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:22,paddingBottom:40},
    modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
    modalTitle:{fontSize:19,fontWeight:'700',color:t.text,flex:1},
    catListItem:{flexDirection:'row',alignItems:'center',padding:14,borderRadius:12,borderWidth:1,borderColor:t.border,backgroundColor:t.background,marginBottom:8,gap:12},
    catListItemSel:{backgroundColor:t.primary,borderColor:t.primary},
    catListEmoji:{fontSize:22,width:30,textAlign:'center'},
    catListName:{flex:1,fontSize:15,fontWeight:'600',color:t.text},
    customBadge:{backgroundColor:t.accent+'22',borderRadius:5,paddingHorizontal:6,paddingVertical:2},
    customBadgeTxt:{fontSize:10,color:t.accent,fontWeight:'700'},
    addCatBtn:{flexDirection:'row',alignItems:'center',gap:8,padding:14,borderRadius:12,borderWidth:1.5,borderColor:t.primary,borderStyle:'dashed',marginBottom:14},
    addCatTxt:{fontSize:14,fontWeight:'600',color:t.primary},
    subListItem:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:12,borderRadius:10,borderWidth:1,borderColor:t.border,backgroundColor:t.background,marginBottom:6},
    subListItemSel:{backgroundColor:t.primary,borderColor:t.primary},
    subListTxt:{fontSize:14,color:t.text,fontWeight:'500'},
    accListItem:{flexDirection:'row',alignItems:'center',padding:13,borderRadius:12,borderWidth:1,borderColor:t.border,backgroundColor:t.background,marginBottom:8,gap:12},
    accListItemSel:{backgroundColor:t.primary,borderColor:t.primary},
    accListInfo:{flex:1},
    accListName:{fontSize:14,fontWeight:'600',color:t.text},
    accListBal:{fontSize:12,color:t.subtext,marginTop:2},
    lbl:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:8},
    opt:{fontWeight:'400',color:t.subtext},
    sublbl:{fontSize:12,color:t.subtext,marginBottom:10,marginTop:-4},
    input:{borderWidth:1,borderColor:t.border,borderRadius:12,padding:14,marginBottom:14,fontSize:16,color:t.text,backgroundColor:t.background},
    chipRow:{flexDirection:'row',gap:8,paddingBottom:4},
    chipRow2:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:14},
    chip:{paddingHorizontal:13,paddingVertical:7,borderRadius:20,backgroundColor:t.background,borderWidth:1,borderColor:t.border},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:13,color:t.text},
    chipTxtSel:{color:'#fff',fontWeight:'600'},
    convNote:{fontSize:12,color:t.subtext,marginBottom:14,marginTop:-10,fontStyle:'italic'},
    customRateRow:{marginBottom:14},
    customRateToggle:{flexDirection:'row',alignItems:'center',gap:8,padding:12,borderRadius:12,borderWidth:1,borderColor:t.border,backgroundColor:t.background},
    customRateToggleOn:{backgroundColor:t.primary,borderColor:t.primary},
    customRateTxt:{fontSize:13,fontWeight:'600',color:t.text},
    customRateInput:{backgroundColor:t.background,borderRadius:10,padding:12,marginBottom:14},
    backRow:{flexDirection:'row',alignItems:'center',gap:6},
    backTxt:{color:t.primary,fontWeight:'600',fontSize:14},
    row:{flexDirection:'row',gap:12,marginTop:8},
    btn:{flex:1,padding:15,borderRadius:12,alignItems:'center'},
    btnCancel:{backgroundColor:t.light},
    btnCancelTxt:{fontSize:15,fontWeight:'600',color:t.subtext},
    btnSave:{backgroundColor:t.primary},
    btnSaveTxt:{fontSize:15,fontWeight:'600',color:'#fff'},
  });
}
