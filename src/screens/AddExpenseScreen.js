import React, { useContext, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const CURRENCIES = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','CNY','KRW','PLN'];
const PRESET_CATS = [
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
  { name:'Loan Payment',     icon:'💳', subs:[] },
  { name:'Other',            icon:'📦', subs:[] },
];

export default function AddExpenseScreen({ navigation }) {
  const { appData, saveData, theme } = useContext(AppContext);
  const s = makeStyles(theme);

  const [mode, setMode]               = useState('budget'); // 'budget' | 'category'
  const [amount, setAmount]           = useState('');
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);
  const [subCategory, setSubCategory] = useState('');
  const [customSub, setCustomSub]     = useState('');
  const [note, setNote]               = useState('');
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency]       = useState(appData.baseCurrency);
  const [account, setAccount]         = useState('');
  const [subAccount, setSubAccount]   = useState(''); // sub-account of selected account
  // Custom exchange rate
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRate, setCustomRate]       = useState('');

  const allCats = useMemo(() => [...PRESET_CATS, ...(appData.customCategories||[])], [appData.customCategories]);

  const toBase = (a, c, rate) => {
    if (rate && parseFloat(rate) > 0) return a * parseFloat(rate);
    const r = appData.exchangeRates[c]||1, br = appData.exchangeRates[appData.baseCurrency]||1;
    return (a/r)*br;
  };
  const fmt     = (a,c) => new Intl.NumberFormat('en-PH',{style:'currency',currency:c||appData.baseCurrency}).format(a);
  const fmtBase = (a)   => fmt(a, appData.baseCurrency);

  const parsedAmt  = parseFloat(amount)||0;
  const effectiveRate = useCustomRate && parseFloat(customRate)>0 ? parseFloat(customRate) : null;
  const liveRate   = currency !== appData.baseCurrency
    ? ((appData.exchangeRates[appData.baseCurrency]||1)/(appData.exchangeRates[currency]||1))
    : null;
  const amtInBase  = parsedAmt > 0 ? toBase(parsedAmt, currency, effectiveRate ? String(effectiveRate) : null) : 0;

  // Income pool
  const incomePool = useMemo(() => {
    const ti = (appData.incomes||[]).reduce((s,i)=>s+toBase(i.amount,i.currency,null),0);
    const tt = (appData.transfers||[]).reduce((s,t)=>s+toBase(t.amount,t.currency,null),0);
    return ti - tt;
  }, [appData.incomes, appData.transfers, appData.exchangeRates]);

  // Selected account
  const selAcc       = account && account !== '__pool__' ? appData.accounts.find(a=>a.name===account) : null;
  const accCurrency  = selAcc?.currency || appData.baseCurrency;
  const costInAcc    = parsedAmt ? (parsedAmt/(appData.exchangeRates[currency]||1))*(appData.exchangeRates[accCurrency]||1) : 0;
  const balAfter     = selAcc ? selAcc.balance - costInAcc : incomePool - amtInBase;

  // Budget remaining
  const getBudgetRem = (b) => {
    if (!b) return null;
    const now = new Date();
    const spent = appData.expenses
      .filter(e => { const d=new Date(e.date); return e.budgetKey===b.id && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); })
      .reduce((s,e)=>s+toBase(e.amount,e.currency,e.customRate?String(e.customRate):null),0);
    return toBase(b.allocated,b.currency||appData.baseCurrency,null) - spent;
  };

  const getCatForBudget = (b) => allCats.find(c=>c.name===b.category)||{name:b.category,icon:b.icon||'📦',subs:[]};

  const handleBudgetSelect = (b) => {
    if (selectedBudget?.id===b.id) { setSelectedBudget(null); setSelectedCat(null); }
    else { setSelectedBudget(b); setSelectedCat(getCatForBudget(b)); setSubCategory(b.subCategory||''); }
  };
  const handleModeSwitch = (m) => {
    setMode(m); setSelectedBudget(null);
    setSelectedCat(m==='category' ? allCats[0] : null);
    setSubCategory(''); setCustomSub('');
  };
  const handleAccSelect = (accName) => {
    setAccount(accName);
    setSubAccount(''); // reset sub when account changes
  };

  const save = () => {
    if (!parsedAmt) { Alert.alert('Error','Enter valid amount'); return; }
    if (!account)   { Alert.alert('Error','Select a payment source'); return; }
    if (mode==='budget'   && !selectedBudget) { Alert.alert('Error','Select a budget or switch to Category mode'); return; }
    if (mode==='category' && !selectedCat)    { Alert.alert('Error','Select a category'); return; }

    const finalCat = mode==='budget' ? getCatForBudget(selectedBudget) : selectedCat;
    const finalSub = subCategory||customSub.trim()||null;
    const rateToSave = useCustomRate && parseFloat(customRate)>0 ? parseFloat(customRate) : null;

    const exp = {
      id: Date.now().toString(),
      amount: parsedAmt, category: finalCat.name, subCategory: finalSub,
      budgetKey: selectedBudget?.id||null, note, date, currency,
      account: account==='__pool__' ? 'Income Pool' : account,
      subAccount: subAccount||null,
      customRate: rateToSave,
    };

    if (account==='__pool__') {
      if (amtInBase > incomePool+0.01) { Alert.alert('Insufficient Pool',`Only ${fmtBase(incomePool)} available`); return; }
      const tx = { id:Date.now().toString()+'_exp', amount:parsedAmt, currency, toAccount:'__expense__', note:`Expense: ${finalCat.name}`, date };
      saveData({ expenses:[exp,...appData.expenses], transfers:[...(appData.transfers||[]),tx] });
    } else {
      const acc = appData.accounts.find(a=>a.name===account);
      if (!acc) { Alert.alert('Error','Account not found'); return; }
      if (acc.balance < costInAcc) { Alert.alert('Insufficient Funds',`${acc.name}: ${fmt(acc.balance,acc.currency)}\nNeeded: ${fmt(costInAcc,acc.currency)}`); return; }
      const updAccs = appData.accounts.map(a => a.name===account
        ? {...a, balance: a.balance - (parsedAmt/(appData.exchangeRates[currency]||1))*(appData.exchangeRates[a.currency]||1)}
        : a
      );
      saveData({ expenses:[exp,...appData.expenses], accounts:updAccs });
    }
    navigation.goBack();
  };

  const selAccSubs = selAcc?.subAccounts||[];

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">

      {/* ── Amount ── */}
      <View style={s.amtCard}>
        <View style={s.amtRow}>
          <Text style={s.curLbl}>{currency}</Text>
          <TextInput style={s.amtInput} placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="numeric" autoFocus placeholderTextColor={theme.subtext}/>
        </View>
        {parsedAmt>0 && liveRate && (
          <Text style={s.convLine}>
            {useCustomRate && effectiveRate
              ? `Custom: ${fmtBase(amtInBase)}  ·  Live would be ${fmtBase(parsedAmt*liveRate)}`
              : `≈ ${fmtBase(amtInBase)}`
            }
          </Text>
        )}
      </View>

      {/* ── Custom Exchange Rate ── */}
      {currency !== appData.baseCurrency && (
        <View style={s.section}>
          <TouchableOpacity style={[s.rateToggle, useCustomRate&&s.rateToggleOn]} onPress={()=>setUseCustomRate(!useCustomRate)}>
            <Ionicons name={useCustomRate?'checkmark-circle':'radio-button-off'} size={17} color={useCustomRate?'#fff':theme.subtext}/>
            <View style={s.rateToggleText}>
              <Text style={[s.rateToggleTitle, useCustomRate&&{color:'#fff'}]}>Use custom rate (late entry)</Text>
              {liveRate && <Text style={[s.rateToggleSub, useCustomRate&&{color:'rgba(255,255,255,0.8)'}]}>Live: 1 {currency} = {liveRate.toFixed(4)} {appData.baseCurrency}</Text>}
            </View>
          </TouchableOpacity>
          {useCustomRate && (
            <View style={s.rateInputBox}>
              <Text style={s.lbl}>1 {currency} = ? {appData.baseCurrency}</Text>
              <TextInput style={s.input} value={customRate} onChangeText={setCustomRate} keyboardType="numeric" placeholder={liveRate ? liveRate.toFixed(4) : '0.0000'} placeholderTextColor={theme.subtext}/>
            </View>
          )}
        </View>
      )}

      {/* ── Mode: Budget or Category ── */}
      <View style={s.section}>
        <Text style={s.lbl}>Categorize by</Text>
        <View style={s.modeRow}>
          {[{k:'budget',label:'From Budget',icon:'pie-chart'},{k:'category',label:'By Category',icon:'grid'}].map(m=>(
            <TouchableOpacity key={m.k} style={[s.modeBtn, mode===m.k&&s.modeBtnSel]} onPress={()=>handleModeSwitch(m.k)}>
              <Ionicons name={m.icon} size={14} color={mode===m.k?'#fff':theme.subtext}/>
              <Text style={[s.modeTxt,mode===m.k&&s.modeTxtSel]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Budget Mode ── */}
      {mode==='budget' && (
        <View style={s.section}>
          <Text style={s.lbl}>Select Budget</Text>
          {appData.budget.length===0
            ? <View style={s.infoBox}><Ionicons name="information-circle-outline" size={15} color={theme.subtext}/><Text style={s.infoTxt}>No budgets yet. Switch to Category mode.</Text></View>
            : appData.budget.map(b=>{
                const rem=getBudgetRem(b); const isSel=selectedBudget?.id===b.id; const isOver=rem!==null&&rem<0;
                return (
                  <TouchableOpacity key={b.id} style={[s.budgetItem,isSel&&s.budgetItemSel,isOver&&!isSel&&s.budgetItemOver]} onPress={()=>handleBudgetSelect(b)}>
                    <Text style={s.budgetEmoji}>{b.icon}</Text>
                    <View style={s.budgetInfo}>
                      <Text style={[s.budgetName,isSel&&{color:'#fff'}]}>{b.subCategory?`${b.category} › ${b.subCategory}`:b.category}</Text>
                      <Text style={[s.budgetRem,isSel&&{color:'rgba(255,255,255,0.85)'},isOver&&!isSel&&{color:theme.danger}]}>
                        {rem!==null?(rem>=0?`${fmtBase(rem)} left`:`${fmtBase(Math.abs(rem))} over`):''}
                        {b.linkedAccount?`  ·  📍${b.linkedAccount}`:''}
                      </Text>
                    </View>
                    {isSel&&<Ionicons name="checkmark-circle" size={20} color="#fff"/>}
                  </TouchableOpacity>
                );
              })
          }
          {selectedBudget && (
            <View style={s.autoCat}>
              <Ionicons name="checkmark-circle" size={14} color={theme.success}/>
              <Text style={s.autoCatTxt}>Category: <Text style={{fontWeight:'700',color:t=>t.text}}>{getCatForBudget(selectedBudget).icon} {selectedBudget.subCategory?`${selectedBudget.category} › ${selectedBudget.subCategory}`:selectedBudget.category}</Text></Text>
            </View>
          )}
        </View>
      )}

      {/* ── Category Mode ── */}
      {mode==='category' && (
        <View style={s.section}>
          <Text style={s.lbl}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.catRow}>
              {allCats.map(cat=>(
                <TouchableOpacity key={cat.name} style={[s.catChip,selectedCat?.name===cat.name&&s.catChipSel]} onPress={()=>{setSelectedCat(cat);setSubCategory('');setCustomSub('');}}>
                  <Text style={s.catEmoji}>{cat.icon}</Text>
                  <Text style={[s.catTxt,selectedCat?.name===cat.name&&{color:'#fff'}]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {selectedCat?.subs?.length>0 && (
            <>
              <Text style={[s.lbl,{marginTop:12}]}>Subcategory <Text style={s.opt}>(optional)</Text></Text>
              <View style={s.chips}>
                {selectedCat.subs.map(sub=>(
                  <TouchableOpacity key={sub} style={[s.chip,subCategory===sub&&s.chipSel]} onPress={()=>setSubCategory(subCategory===sub?'':sub)}>
                    <Text style={[s.chipTxt,subCategory===sub&&s.chipTxtSel]}>{sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={s.input} placeholder="Or custom subcategory..." value={customSub} onChangeText={t=>{setCustomSub(t);if(t)setSubCategory('');}} placeholderTextColor={theme.subtext}/>
            </>
          )}
        </View>
      )}

      {/* ── Currency ── */}
      <View style={s.section}>
        <Text style={s.lbl}>Currency</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.chips}>
            {CURRENCIES.map(c=>(
              <TouchableOpacity key={c} style={[s.chip,currency===c&&s.chipSel]} onPress={()=>{setCurrency(c);setUseCustomRate(false);setCustomRate('');}}>
                <Text style={[s.chipTxt,currency===c&&s.chipTxtSel]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        {liveRate && !useCustomRate && <Text style={s.rateNote}>Live: 1 {currency} = {liveRate.toFixed(4)} {appData.baseCurrency}</Text>}
      </View>

      {/* ── Payment Source ── */}
      <View style={s.section}>
        <Text style={s.lbl}>Payment Source</Text>
        {/* Pool */}
        <TouchableOpacity style={[s.sourceItem, account==='__pool__'&&s.sourceItemSel]} onPress={()=>handleAccSelect('__pool__')}>
          <View style={[s.sourceIcon,{backgroundColor:theme.success+'22'}]}><Ionicons name="cash" size={18} color={theme.success}/></View>
          <View style={s.sourceInfo}>
            <Text style={[s.sourceName,account==='__pool__'&&{color:'#fff'}]}>💰 Income Pool</Text>
            <Text style={[s.sourceSub,account==='__pool__'&&{color:'rgba(255,255,255,0.8)'}]}>{fmtBase(incomePool)} available</Text>
          </View>
          {account==='__pool__'&&<Ionicons name="checkmark-circle" size={18} color="#fff"/>}
        </TouchableOpacity>
        {/* Accounts */}
        {appData.accounts.map(a=>{
          const isSel=account===a.name;
          const insuf=parsedAmt>0&&a.balance<(parsedAmt/(appData.exchangeRates[currency]||1))*(appData.exchangeRates[a.currency]||1);
          return (
            <TouchableOpacity key={a.id} style={[s.sourceItem,isSel&&s.sourceItemSel,insuf&&!isSel&&s.sourceItemWarn]} onPress={()=>handleAccSelect(a.name)}>
              <View style={[s.sourceIcon,{backgroundColor:theme.primary+'22'}]}><Ionicons name="wallet" size={18} color={theme.primary}/></View>
              <View style={s.sourceInfo}>
                <Text style={[s.sourceName,isSel&&{color:'#fff'}]}>{a.name}</Text>
                <Text style={[s.sourceSub,isSel&&{color:'rgba(255,255,255,0.8)'},insuf&&{color:theme.danger}]}>
                  {fmt(a.balance,a.currency)}{a.currency!==appData.baseCurrency?` ≈ ${fmtBase(toBase(a.balance,a.currency,null))}`:''}
                  {insuf?' ⚠ Low':''}
                </Text>
              </View>
              {isSel&&<Ionicons name="checkmark-circle" size={18} color="#fff"/>}
            </TouchableOpacity>
          );
        })}

        {/* Sub-account picker (shown when a real account is selected) */}
        {selAccSubs.length>0 && (
          <View style={s.subAccPicker}>
            <Text style={s.subAccPickerLbl}>Sub-account <Text style={s.opt}>(optional)</Text></Text>
            <View style={s.chips}>
              {selAccSubs.map(sub=>(
                <TouchableOpacity key={sub.id} style={[s.chip,subAccount===sub.name&&s.chipSel]} onPress={()=>setSubAccount(subAccount===sub.name?'':sub.name)}>
                  <Text style={[s.chipTxt,subAccount===sub.name&&s.chipTxtSel]}>{sub.name}</Text>
                  {sub.purpose&&<Text style={[s.chipSubTxt,subAccount===sub.name&&{color:'rgba(255,255,255,0.8)'}]}>{sub.purpose}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Balance preview */}
        {parsedAmt>0 && account && (
          <View style={[s.balPreview,{borderColor:balAfter>=0?theme.success:theme.danger}]}>
            <View style={s.balRow}><Text style={s.balLbl}>Current</Text><Text style={s.balVal}>{account==='__pool__'?fmtBase(incomePool):fmt(selAcc?.balance,accCurrency)}</Text></View>
            <View style={s.balRow}><Text style={s.balLbl}>Expense</Text><Text style={[s.balVal,{color:theme.danger}]}>-{account==='__pool__'?fmtBase(amtInBase):fmt(costInAcc,accCurrency)}</Text></View>
            <View style={[s.balRow,s.balTotal]}><Text style={[s.balLbl,{fontWeight:'700'}]}>After</Text><Text style={[s.balVal,{fontWeight:'800',color:balAfter>=0?theme.success:theme.danger}]}>{account==='__pool__'?fmtBase(balAfter):fmt(balAfter,accCurrency)}</Text></View>
          </View>
        )}
      </View>

      {/* ── Note & Date ── */}
      <View style={s.section}>
        <Text style={s.lbl}>Note <Text style={s.opt}>(optional)</Text></Text>
        <TextInput style={s.input} placeholder="Add a note..." value={note} onChangeText={setNote} placeholderTextColor={theme.subtext}/>
        <Text style={s.lbl}>Date</Text>
        <TextInput style={s.input} value={date} onChangeText={setDate} placeholderTextColor={theme.subtext}/>
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={save}>
        <Text style={s.saveTxt}>Save Expense</Text>
      </TouchableOpacity>
      <View style={{height:40}}/>
    </ScrollView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    amtCard:{backgroundColor:t.card,padding:22,marginBottom:2},
    amtRow:{flexDirection:'row',alignItems:'center'},
    curLbl:{fontSize:18,fontWeight:'700',color:t.primary,marginRight:10},
    amtInput:{fontSize:44,fontWeight:'800',color:t.text,flex:1},
    convLine:{fontSize:13,color:t.subtext,marginTop:6},
    section:{padding:16,paddingBottom:0},
    lbl:{fontSize:12,fontWeight:'700',color:t.text,marginBottom:8,textTransform:'uppercase',letterSpacing:0.3},
    opt:{fontWeight:'400',color:t.subtext,textTransform:'none'},
    rateNote:{fontSize:11,color:t.subtext,marginTop:6,fontStyle:'italic'},
    // Custom rate toggle
    rateToggle:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:12,borderWidth:1,borderColor:t.border,backgroundColor:t.card},
    rateToggleOn:{backgroundColor:t.warning,borderColor:t.warning},
    rateToggleText:{flex:1},
    rateToggleTitle:{fontSize:13,fontWeight:'600',color:t.text},
    rateToggleSub:{fontSize:11,color:t.subtext,marginTop:2},
    rateInputBox:{backgroundColor:t.warning+'12',borderRadius:10,padding:12,marginTop:8},
    // Mode
    modeRow:{flexDirection:'row',gap:8},
    modeBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,padding:11,borderRadius:10,backgroundColor:t.card,borderWidth:1.5,borderColor:t.border},
    modeBtnSel:{backgroundColor:t.primary,borderColor:t.primary},
    modeTxt:{fontSize:12,fontWeight:'600',color:t.subtext},
    modeTxtSel:{color:'#fff'},
    // Budget items
    budgetItem:{flexDirection:'row',alignItems:'center',padding:12,borderRadius:12,borderWidth:1.5,borderColor:t.border,backgroundColor:t.card,marginBottom:7,gap:10},
    budgetItemSel:{backgroundColor:t.primary,borderColor:t.primary},
    budgetItemOver:{borderColor:t.danger+'80'},
    budgetEmoji:{fontSize:20,width:28,textAlign:'center'},
    budgetInfo:{flex:1},
    budgetName:{fontSize:13,fontWeight:'600',color:t.text,marginBottom:2},
    budgetRem:{fontSize:11,color:t.success,fontWeight:'600'},
    autoCat:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:t.success+'15',borderRadius:8,padding:10,marginTop:6},
    autoCatTxt:{fontSize:12,color:t.text,flex:1},
    // Category chips
    catRow:{flexDirection:'row',gap:7,paddingBottom:4},
    catChip:{alignItems:'center',paddingHorizontal:12,paddingVertical:9,borderRadius:12,backgroundColor:t.card,borderWidth:1.5,borderColor:t.border,minWidth:76},
    catChipSel:{backgroundColor:t.primary,borderColor:t.primary},
    catEmoji:{fontSize:20,marginBottom:3},
    catTxt:{fontSize:10,color:t.text,fontWeight:'600',textAlign:'center'},
    // Sources
    sourceItem:{flexDirection:'row',alignItems:'center',padding:12,borderRadius:12,borderWidth:1.5,borderColor:t.border,backgroundColor:t.card,marginBottom:7,gap:10},
    sourceItemSel:{backgroundColor:t.primary,borderColor:t.primary},
    sourceItemWarn:{borderColor:t.danger+'70'},
    sourceIcon:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center'},
    sourceInfo:{flex:1},
    sourceName:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:2},
    sourceSub:{fontSize:11,color:t.subtext},
    subAccPicker:{backgroundColor:t.background,borderRadius:10,padding:12,marginTop:4,marginBottom:2},
    subAccPickerLbl:{fontSize:12,fontWeight:'600',color:t.subtext,marginBottom:8},
    chipSubTxt:{fontSize:10,color:t.subtext,marginTop:1},
    // Balance preview
    balPreview:{marginTop:10,borderRadius:10,borderWidth:1,padding:12,backgroundColor:t.background,gap:5},
    balRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
    balTotal:{borderTopWidth:1,borderTopColor:t.border,paddingTop:7,marginTop:2},
    balLbl:{fontSize:11,color:t.subtext},
    balVal:{fontSize:12,fontWeight:'600',color:t.text},
    // Info box
    infoBox:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:t.border+'50',borderRadius:8,padding:10},
    infoTxt:{fontSize:12,color:t.subtext,flex:1},
    // Shared
    chips:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:8},
    chip:{paddingHorizontal:11,paddingVertical:7,borderRadius:12,backgroundColor:t.card,borderWidth:1,borderColor:t.border},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:12,color:t.text,fontWeight:'500'},
    chipTxtSel:{color:'#fff',fontWeight:'600'},
    input:{borderWidth:1,borderColor:t.border,borderRadius:10,padding:12,marginBottom:12,fontSize:15,color:t.text,backgroundColor:t.card},
    saveBtn:{margin:16,backgroundColor:t.primary,padding:16,borderRadius:14,alignItems:'center'},
    saveTxt:{fontSize:16,fontWeight:'700',color:'#fff'},
  });
}
