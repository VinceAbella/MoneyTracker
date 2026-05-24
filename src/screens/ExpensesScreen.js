import React, { useContext, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const CURRENCIES = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','CNY','KRW','PLN'];
const DEFAULT_CATS = [
  {name:'Food & Dining', icon:'🍔', subs:['Groceries','Restaurants','Coffee','Takeout','Snacks']},
  {name:'Transport',     icon:'🚗', subs:['Fuel','Commute','Parking','Toll','Uber/Grab']},
  {name:'Shopping',      icon:'🛍️', subs:['Clothing','Electronics','Home','Personal Care','Accessories']},
  {name:'Bills & Utilities',icon:'🧾',subs:['Electricity','Water','Internet','Phone','Gas']},
  {name:'Health',        icon:'💊', subs:['Medicine','Doctor','Gym','Insurance','Dental']},
  {name:'Entertainment', icon:'🎬', subs:['Streaming','Movies','Games','Events','Hobbies']},
  {name:'Education',     icon:'📚', subs:['Tuition','Books','Courses','Supplies','Tutoring']},
  {name:'Savings',       icon:'🏦', subs:['Emergency Fund','Retirement','Vacation Fund','House Fund']},
  {name:'Housing',       icon:'🏠', subs:['Rent','Mortgage','Maintenance','Furnishing','Cleaning']},
  {name:'Family',        icon:'👨‍👩‍👧',subs:['Kids','Parents','Pets','Gifts','Celebrations']},
  {name:'Loan Payment',  icon:'💳', subs:[]},
  {name:'Other',         icon:'📦', subs:[]},
];

export default function ExpensesScreen({ navigation }) {
  const { appData, saveData, theme } = useContext(AppContext);
  const s = makeStyles(theme);

  // Calendar filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [calModal, setCalModal] = useState(false);
  const [tempFrom, setTempFrom] = useState('');
  const [tempTo,   setTempTo]   = useState('');

  // Edit modal state
  const [editModal,    setEditModal]    = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [eAmount,      setEAmount]      = useState('');
  const [eCat,         setECat]         = useState(DEFAULT_CATS[0]);
  const [eSub,         setESub]         = useState('');
  const [eCustomSub,   setECustomSub]   = useState('');
  const [eNote,        setENote]        = useState('');
  const [eCurrency,    setECurrency]    = useState('PHP');
  const [eDate,        setEDate]        = useState('');
  const [eAccount,     setEAccount]     = useState('');
  const [eBudgetKey,   setEBudgetKey]   = useState('');
  // Custom currency rate override (for late entries)
  const [useCustomRate,setUseCustomRate]= useState(false);
  const [customRate,   setCustomRate]   = useState('');

  // Pay loan modal
  const [loanModal, setLoanModal] = useState(false);
  const [selLoan,   setSelLoan]   = useState(null);
  const [loanAmt,   setLoanAmt]   = useState('');
  const [loanAcct,  setLoanAcct]  = useState('');

  const allCats = useMemo(() => {
    const custom = (appData.customCategories||[]).map(c=>({...c}));
    return [...DEFAULT_CATS, ...custom];
  }, [appData.customCategories]);

  const toBase = (a, c, customRateOverride) => {
    if (customRateOverride && parseFloat(customRateOverride) > 0) {
      // customRate = how many base currency per 1 unit of c
      return a * parseFloat(customRateOverride);
    }
    const r  = appData.exchangeRates[c]  || 1;
    const br = appData.exchangeRates[appData.baseCurrency] || 1;
    return (a / r) * br;
  };
  const fmt     = (a, c) => new Intl.NumberFormat('en-PH', { style:'currency', currency: c||appData.baseCurrency }).format(a);
  const fmtBase = (a)    => fmt(a, appData.baseCurrency);
  const getCat  = (name) => allCats.find(c => c.name === name) || { name, icon:'📦', subs:[] };

  // Live rate for display
  const liveRate = eCurrency !== appData.baseCurrency
    ? ((appData.exchangeRates[appData.baseCurrency]||1) / (appData.exchangeRates[eCurrency]||1)).toFixed(4)
    : null;

  const effectiveRate = useCustomRate && parseFloat(customRate) > 0
    ? parseFloat(customRate)
    : (liveRate ? parseFloat(liveRate) : 1);

  const eAmtInBase = parseFloat(eAmount) > 0
    ? toBase(parseFloat(eAmount), eCurrency, useCustomRate ? customRate : null)
    : 0;

  // Filter
  const displayed = useMemo(() => {
    return appData.expenses.filter(e => {
      const d = new Date(e.date);
      if (dateFrom) { const f = new Date(dateFrom); if (d < f) return false; }
      if (dateTo)   { const t = new Date(dateTo); t.setHours(23,59,59); if (d > t) return false; }
      return true;
    });
  }, [appData.expenses, dateFrom, dateTo]);

  const totalDisplayed = displayed.reduce((s,e) => s + toBase(e.amount, e.currency, e.customRate), 0);

  const grouped = useMemo(() => {
    const g = {};
    displayed.forEach(e => {
      const d = new Date(e.date).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
      if (!g[d]) g[d] = [];
      g[d].push(e);
    });
    return g;
  }, [displayed]);

  const getBudgetRemaining = (budgetId) => {
    const b = appData.budget.find(b => b.id === budgetId); if (!b) return null;
    const now = new Date();
    const spent = appData.expenses.filter(e => {
      const d = new Date(e.date);
      return e.budgetKey === budgetId && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    }).reduce((s,e) => s + toBase(e.amount, e.currency, e.customRate), 0);
    return toBase(b.allocated, b.currency||appData.baseCurrency) - spent;
  };

  const openEdit = (exp) => {
    setEditing(exp);
    setEAmount(String(exp.amount));
    setECat(getCat(exp.category));
    setESub(exp.subCategory || '');
    setECustomSub('');
    setENote(exp.note || '');
    setECurrency(exp.currency || appData.baseCurrency);
    setEDate(exp.date || '');
    setEAccount(exp.account || '');
    setEBudgetKey(exp.budgetKey || '');
    setUseCustomRate(!!exp.customRate);
    setCustomRate(exp.customRate ? String(exp.customRate) : '');
    setEditModal(true);
  };

  const saveEdit = () => {
    const amt = parseFloat(eAmount);
    if (!amt || isNaN(amt)) { Alert.alert('Error','Enter valid amount'); return; }
    const finalSub = eSub || eCustomSub.trim() || null;
    const rateToSave = useCustomRate && parseFloat(customRate) > 0 ? parseFloat(customRate) : null;

    // Reverse old expense from account, apply new
    let updAccs = [...appData.accounts];
    if (editing.account && editing.account !== 'Income Pool') {
      updAccs = updAccs.map(a => {
        if (a.name === editing.account) {
          const r = appData.exchangeRates[editing.currency]||1, ar = appData.exchangeRates[a.currency]||1;
          return { ...a, balance: a.balance + (editing.amount/r)*ar }; // refund old
        }
        return a;
      });
    }
    if (eAccount && eAccount !== 'Income Pool') {
      updAccs = updAccs.map(a => {
        if (a.name === eAccount) {
          const r = appData.exchangeRates[eCurrency]||1, ar = appData.exchangeRates[a.currency]||1;
          return { ...a, balance: a.balance - (amt/r)*ar }; // deduct new
        }
        return a;
      });
    }

    saveData({
      accounts: updAccs,
      expenses: appData.expenses.map(e => e.id === editing.id ? {
        ...e, amount:amt, category:eCat.name, subCategory:finalSub,
        note:eNote, currency:eCurrency, date:eDate,
        account:eAccount, budgetKey:eBudgetKey||null,
        customRate: rateToSave,
      } : e),
    });
    setEditModal(false);
  };

  const deleteExp = (exp) => Alert.alert('Delete','Remove this expense?',[
    { text:'Cancel', style:'cancel' },
    { text:'Delete', style:'destructive', onPress:() => {
      const updAccs = appData.accounts.map(a => {
        if (a.name === exp.account && exp.account !== 'Income Pool') {
          const r = appData.exchangeRates[exp.currency]||1, ar = appData.exchangeRates[a.currency]||1;
          return { ...a, balance: a.balance + (exp.amount/r)*ar };
        }
        return a;
      });
      saveData({ expenses: appData.expenses.filter(e => e.id !== exp.id), accounts: updAccs });
    }},
  ]);

  // Pay Loan
  const calcInterest = (loan) => {
    if (!loan.interestRate || loan.interestRate === 0) return 0;
    const start = new Date(loan.createdAt || loan.dueDate), now = new Date();
    const years = (now - start) / (1000*60*60*24*365);
    return loan.remaining * (loan.interestRate/100) * Math.max(years, 0);
  };

  const payLoan = () => {
    const amt = parseFloat(loanAmt);
    if (!amt || isNaN(amt)) { Alert.alert('Error','Enter valid amount'); return; }
    if (!loanAcct)           { Alert.alert('Error','Select an account');  return; }
    const loan = selLoan, acc = appData.accounts.find(a => a.name === loanAcct);
    if (!acc) return;
    const interest = calcInterest(loan), totalOwed = loan.remaining + interest;
    if (amt > totalOwed) { Alert.alert('Error',`Amount exceeds total owed ${fmt(totalOwed,loan.currency)}`); return; }
    const loanRate = appData.exchangeRates[loan.currency]||1, accRate = appData.exchangeRates[acc.currency]||1;
    const deduct = (amt/loanRate)*accRate;
    if (acc.balance < deduct) { Alert.alert('Insufficient Funds',`${acc.name} has ${fmt(acc.balance,acc.currency)}`); return; }
    const interestPaid = Math.min(amt,interest), principalPaid = amt - interestPaid;
    const newRemaining = Math.max(loan.remaining - principalPaid, 0);
    const updLoans = appData.loans.map(l => l.id===loan.id ? {...l,remaining:newRemaining,createdAt:new Date().toISOString()} : l).filter(l => l.remaining > 0.01);
    const updAccs  = appData.accounts.map(a => a.name===loanAcct ? {...a,balance:a.balance-deduct} : a);
    const exp = { id:Date.now().toString(), amount:amt, category:'Loan Payment', subCategory:loan.name, budgetKey:null, note:`Payment for ${loan.name}${interestPaid>0?` (incl. ${fmt(interestPaid,loan.currency)} interest)`:''}`, date:new Date().toISOString().split('T')[0], currency:loan.currency, account:loanAcct };
    saveData({ loans:updLoans, accounts:updAccs, expenses:[exp,...appData.expenses] });
    if (newRemaining <= 0.01) Alert.alert('🎉 Loan Paid Off!',`Congratulations! ${loan.name} is fully paid!`);
    else Alert.alert('Payment Made',`Paid ${fmt(amt,loan.currency)}. Remaining: ${fmt(newRemaining,loan.currency)}`);
    setLoanModal(false); setLoanAmt(''); setLoanAcct(''); setSelLoan(null);
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Expenses</Text>
          <Text style={s.subtitle}>{fmtBase(totalDisplayed)}{dateFrom||dateTo?' (filtered)':' total'}</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={[s.iconBtn,(dateFrom||dateTo)&&s.iconBtnOn]} onPress={()=>{setTempFrom(dateFrom);setTempTo(dateTo);setCalModal(true);}}>
            <Ionicons name="calendar" size={17} color={(dateFrom||dateTo)?'#fff':theme.subtext}/>
          </TouchableOpacity>
          {(dateFrom||dateTo)&&(
            <TouchableOpacity onPress={()=>{setDateFrom('');setDateTo('');}}>
              <Ionicons name="close-circle" size={20} color={theme.danger}/>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.loanBtn} onPress={()=>setLoanModal(true)}>
            <Ionicons name="card" size={14} color="#fff"/>
            <Text style={s.loanBtnTxt}>Pay Loan</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>navigation.navigate('AddExpense')}>
            <Ionicons name="add-circle" size={32} color={theme.primary}/>
          </TouchableOpacity>
        </View>
      </View>

      {(dateFrom||dateTo)&&(
        <View style={s.filterBanner}>
          <Ionicons name="calendar-outline" size={13} color={theme.primary}/>
          <Text style={s.filterBannerTxt}>{dateFrom||'Start'} → {dateTo||'End'}</Text>
        </View>
      )}

      <ScrollView style={s.content}>
        {Object.keys(grouped).length === 0 && (
          <View style={s.empty}><Ionicons name="receipt-outline" size={64} color={theme.border}/><Text style={s.emptyTxt}>No expenses found</Text></View>
        )}

        {Object.keys(grouped).sort((a,b) => new Date(b)-new Date(a)).map(date => {
          const dayTotal = grouped[date].reduce((s,e) => s+toBase(e.amount,e.currency,e.customRate), 0);
          return (
            <View key={date} style={s.group}>
              <View style={s.groupHeader}>
                <Text style={s.groupDate}>{date}</Text>
                <Text style={s.groupTotal}>-{fmtBase(dayTotal)}</Text>
              </View>
              {grouped[date].map(exp => {
                const isForeign   = exp.currency !== appData.baseCurrency;
                const baseAmt     = toBase(exp.amount, exp.currency, exp.customRate);
                const budgetItem  = exp.budgetKey ? appData.budget.find(b => b.id === exp.budgetKey) : null;
                const cat         = getCat(exp.category);
                const hasCustomRate = !!exp.customRate;
                return (
                  <View key={exp.id} style={s.card}>
                    <View style={s.catIconWrap}><Text style={s.catEmoji}>{cat.icon}</Text></View>
                    <View style={s.details}>
                      <Text style={s.cat}>{exp.category}{exp.subCategory ? <Text style={s.sub}> › {exp.subCategory}</Text> : null}</Text>
                      {budgetItem && (
                        <View style={s.budgetTag}><Ionicons name="pie-chart" size={10} color={theme.primary}/><Text style={s.budgetTagTxt}>{budgetItem.subCategory?`${budgetItem.category} › ${budgetItem.subCategory}`:budgetItem.category}</Text></View>
                      )}
                      <Text style={s.meta}>{exp.note?`${exp.note}  ·  `:''}{exp.account||'—'}</Text>
                    </View>
                    <View style={s.amtCol}>
                      <Text style={s.amt}>-{fmt(exp.amount, exp.currency)}</Text>
                      {isForeign && <Text style={s.amtConv}>≈ {fmtBase(baseAmt)}</Text>}
                      <View style={s.curTagRow}>
                        <View style={s.curTag}><Text style={s.curTagTxt}>{exp.currency}</Text></View>
                        {hasCustomRate && <View style={[s.curTag,{backgroundColor:theme.warning+'22'}]}><Text style={[s.curTagTxt,{color:theme.warning}]}>custom rate</Text></View>}
                      </View>
                    </View>
                    {/* EDIT & DELETE BUTTONS */}
                    <View style={s.actions}>
                      <TouchableOpacity style={s.editBtn} onPress={()=>openEdit(exp)}>
                        <Ionicons name="pencil" size={14} color="#fff"/>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.deleteBtn} onPress={()=>deleteExp(exp)}>
                        <Ionicons name="trash" size={14} color="#fff"/>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
        <View style={{height:20}}/>
      </ScrollView>

      {/* ── Calendar Modal ── */}
      <Modal visible={calModal} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}>
          <Text style={s.modalTitle}>📅 Date Range Filter</Text>
          <Text style={s.lbl}>From (YYYY-MM-DD)</Text>
          <TextInput style={s.input} value={tempFrom} onChangeText={setTempFrom} placeholder="e.g. 2024-01-01" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>To (YYYY-MM-DD)</Text>
          <TextInput style={s.input} value={tempTo} onChangeText={setTempTo} placeholder="e.g. 2024-12-31" placeholderTextColor={theme.subtext}/>
          <View style={s.presets}>
            {[
              {label:'This Month', from:()=>{const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`;},to:()=>new Date().toISOString().split('T')[0]},
              {label:'Last Month', from:()=>{const n=new Date();n.setMonth(n.getMonth()-1);return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`;},to:()=>{const n=new Date();n.setDate(0);return n.toISOString().split('T')[0];}},
              {label:'This Year',  from:()=>`${new Date().getFullYear()}-01-01`,to:()=>new Date().toISOString().split('T')[0]},
            ].map(p=>(
              <TouchableOpacity key={p.label} style={s.presetBtn} onPress={()=>{setTempFrom(p.from());setTempTo(p.to());}}>
                <Text style={s.presetTxt}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.row}>
            <TouchableOpacity style={[s.btn,s.btnCancel]} onPress={()=>setCalModal(false)}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,s.btnSave]} onPress={()=>{setDateFrom(tempFrom);setDateTo(tempTo);setCalModal(false);}}><Text style={s.btnSaveTxt}>Apply</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* ── EDIT Modal ── */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={s.overlay}><ScrollView keyboardShouldPersistTaps="handled"><View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>✏️ Edit Expense</Text>
            <TouchableOpacity onPress={()=>setEditModal(false)}><Ionicons name="close" size={22} color={theme.subtext}/></TouchableOpacity>
          </View>

          {/* Amount + Currency */}
          <Text style={s.lbl}>Amount</Text>
          <View style={s.amtEditRow}>
            <TextInput style={[s.input,{flex:1,marginBottom:0,fontSize:22,fontWeight:'700'}]} value={eAmount} onChangeText={setEAmount} keyboardType="numeric" placeholderTextColor={theme.subtext}/>
            <Text style={s.amtEditCur}>{eCurrency}</Text>
          </View>
          {parseFloat(eAmount)>0 && eCurrency !== appData.baseCurrency && (
            <Text style={s.convNote}>≈ {fmtBase(eAmtInBase)} {useCustomRate ? '(custom rate)' : '(live rate)'}</Text>
          )}

          {/* Currency selector */}
          <Text style={s.lbl}>Currency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
            <View style={s.chips}>{CURRENCIES.map(c=><TouchableOpacity key={c} style={[s.chip,eCurrency===c&&s.chipSel]} onPress={()=>setECurrency(c)}><Text style={[s.chipTxt,eCurrency===c&&s.chipTxtSel]}>{c}</Text></TouchableOpacity>)}</View>
          </ScrollView>

          {/* Custom Rate Override */}
          <View style={s.customRateRow}>
            <TouchableOpacity style={[s.customRateToggle, useCustomRate && s.customRateToggleOn]} onPress={()=>setUseCustomRate(!useCustomRate)}>
              <Ionicons name={useCustomRate ? 'checkmark-circle' : 'radio-button-off'} size={18} color={useCustomRate ? '#fff' : theme.subtext}/>
              <Text style={[s.customRateTxt, useCustomRate && {color:'#fff'}]}>Use custom exchange rate</Text>
            </TouchableOpacity>
          </View>
          {useCustomRate && (
            <View style={s.customRateInput}>
              <Text style={s.lbl}>1 {eCurrency} = ? {appData.baseCurrency} (on expense date)</Text>
              {liveRate && <Text style={s.convNote}>Live rate: 1 {eCurrency} = {liveRate} {appData.baseCurrency}</Text>}
              <TextInput style={s.input} value={customRate} onChangeText={setCustomRate} keyboardType="numeric" placeholder={`e.g. ${liveRate || '1.0'}`} placeholderTextColor={theme.subtext}/>
              {parseFloat(eAmount)>0 && parseFloat(customRate)>0 && (
                <Text style={[s.convNote,{color:theme.warning}]}>With custom rate: {fmt(parseFloat(eAmount))} {eCurrency} = {fmtBase(parseFloat(eAmount)*parseFloat(customRate))}</Text>
              )}
            </View>
          )}

          {/* Category */}
          <Text style={s.lbl}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}}>
            <View style={{flexDirection:'row',gap:8}}>
              {allCats.map(cat=>(
                <TouchableOpacity key={cat.name} style={[s.catChip,eCat.name===cat.name&&s.catChipSel]} onPress={()=>{setECat(cat);setESub('');setECustomSub('');}}>
                  <Text style={s.catEmoji2}>{cat.icon}</Text>
                  <Text style={[s.catTxt2,eCat.name===cat.name&&{color:'#fff'}]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {eCat.subs?.length>0&&(
            <>
              <Text style={s.lbl}>Subcategory</Text>
              <View style={s.chips2}>{eCat.subs.map(sub=><TouchableOpacity key={sub} style={[s.chip,eSub===sub&&s.chipSel]} onPress={()=>setESub(eSub===sub?'':sub)}><Text style={[s.chipTxt,eSub===sub&&s.chipTxtSel]}>{sub}</Text></TouchableOpacity>)}</View>
              <TextInput style={s.input} value={eCustomSub} onChangeText={setECustomSub} placeholder="Custom subcategory..." placeholderTextColor={theme.subtext}/>
            </>
          )}

          {/* Budget link */}
          {appData.budget.length > 0 && (
            <>
              <Text style={s.lbl}>Link to Budget</Text>
              <View style={s.chips2}>
                {appData.budget.map(b=>{
                  const rem = getBudgetRemaining(b.id);
                  return (
                    <TouchableOpacity key={b.id} style={[s.chip,eBudgetKey===b.id&&s.chipSel]} onPress={()=>setEBudgetKey(eBudgetKey===b.id?'':b.id)}>
                      <Text style={[s.chipTxt,eBudgetKey===b.id&&s.chipTxtSel]}>{b.icon} {b.subCategory?`${b.category} › ${b.subCategory}`:b.category}</Text>
                      {rem!==null&&<Text style={[s.chipSub,eBudgetKey===b.id&&{color:'#fff'}]}>{rem>=0?`${fmtBase(rem)} left`:`${fmtBase(Math.abs(rem))} over`}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Account */}
          <Text style={s.lbl}>Account</Text>
          <View style={s.chips2}>
            <TouchableOpacity style={[s.chip,eAccount==='Income Pool'&&s.chipSel]} onPress={()=>setEAccount('Income Pool')}>
              <Text style={[s.chipTxt,eAccount==='Income Pool'&&s.chipTxtSel]}>💰 Income Pool</Text>
            </TouchableOpacity>
            {appData.accounts.map(a=>(
              <TouchableOpacity key={a.id} style={[s.chip,eAccount===a.name&&s.chipSel]} onPress={()=>setEAccount(a.name)}>
                <Text style={[s.chipTxt,eAccount===a.name&&s.chipTxtSel]}>{a.name}</Text>
                <Text style={[s.chipSub,eAccount===a.name&&{color:'#fff'}]}>{fmt(a.balance,a.currency)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note & Date */}
          <Text style={s.lbl}>Note</Text>
          <TextInput style={s.input} value={eNote} onChangeText={setENote} placeholder="Note..." placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Date (YYYY-MM-DD)</Text>
          <TextInput style={s.input} value={eDate} onChangeText={setEDate} placeholderTextColor={theme.subtext}/>

          <View style={s.row}>
            <TouchableOpacity style={[s.btn,s.btnCancel]} onPress={()=>setEditModal(false)}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,s.btnSave]} onPress={saveEdit}><Text style={s.btnSaveTxt}>Save Changes</Text></TouchableOpacity>
          </View>
        </View></ScrollView></View>
      </Modal>

      {/* ── Pay Loan Modal ── */}
      <Modal visible={loanModal} animationType="slide" transparent>
        <View style={s.overlay}><ScrollView><View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>💳 Pay Loan</Text>
            <TouchableOpacity onPress={()=>setLoanModal(false)}><Ionicons name="close" size={22} color={theme.subtext}/></TouchableOpacity>
          </View>

          <Text style={s.lbl}>Select Loan</Text>
          {(!appData.loans||appData.loans.length===0) ? (
            <Text style={s.noLoans}>No active loans</Text>
          ) : (
            appData.loans.map(loan=>{
              const interest = calcInterest(loan);
              const isSel = selLoan?.id === loan.id;
              return (
                <TouchableOpacity key={loan.id} style={[s.loanItem, isSel&&s.loanItemSel]} onPress={()=>setSelLoan(isSel?null:loan)}>
                  <View style={s.loanItemLeft}>
                    <Text style={[s.loanItemName, isSel&&{color:'#fff'}]}>{loan.name}</Text>
                    <Text style={[s.loanItemSub,  isSel&&{color:'rgba(255,255,255,0.8)'}]}>Principal: {fmt(loan.remaining,loan.currency)}</Text>
                    <Text style={[s.loanItemSub,  isSel&&{color:'rgba(255,255,255,0.8)'}]}>Interest:  {fmt(interest,loan.currency)}</Text>
                    <Text style={[s.loanItemTotal, isSel&&{color:'#fca5a5'}]}>Total owed: {fmt(loan.remaining+interest,loan.currency)}</Text>
                  </View>
                  {isSel && <Ionicons name="checkmark-circle" size={22} color="#fff"/>}
                </TouchableOpacity>
              );
            })
          )}

          {selLoan && <>
            <Text style={s.lbl}>Payment Amount ({selLoan.currency})</Text>
            <TextInput style={s.input} value={loanAmt} onChangeText={setLoanAmt} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.subtext}/>
            <Text style={s.lbl}>Pay from Account</Text>
            <View style={s.chips2}>
              {appData.accounts.map(a=>(
                <TouchableOpacity key={a.id} style={[s.chip,loanAcct===a.name&&s.chipSel]} onPress={()=>setLoanAcct(a.name)}>
                  <Text style={[s.chipTxt,loanAcct===a.name&&s.chipTxtSel]}>{a.name}</Text>
                  <Text style={[s.chipSub,loanAcct===a.name&&{color:'#fff'}]}>{fmt(a.balance,a.currency)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.interestNote}>⚡ Interest paid first, then principal</Text>
          </>}

          <View style={s.row}>
            <TouchableOpacity style={[s.btn,s.btnCancel]} onPress={()=>setLoanModal(false)}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,s.btnSave]} onPress={payLoan}><Text style={s.btnSaveTxt}>Pay Now</Text></TouchableOpacity>
          </View>
        </View></ScrollView></View>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    header:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',padding:20,paddingTop:60,backgroundColor:t.card},
    title:{fontSize:26,fontWeight:'800',color:t.text,marginBottom:4},
    subtitle:{fontSize:13,color:t.subtext,fontWeight:'600'},
    headerRight:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap',justifyContent:'flex-end'},
    iconBtn:{width:36,height:36,borderRadius:10,backgroundColor:t.border,alignItems:'center',justifyContent:'center'},
    iconBtnOn:{backgroundColor:t.primary},
    loanBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:t.warning,paddingHorizontal:10,paddingVertical:7,borderRadius:10},
    loanBtnTxt:{color:'#fff',fontWeight:'700',fontSize:12},
    filterBanner:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:t.primary+'18',paddingHorizontal:16,paddingVertical:8},
    filterBannerTxt:{fontSize:13,color:t.primary,fontWeight:'600'},
    content:{flex:1,padding:16},
    group:{marginBottom:18},
    groupHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
    groupDate:{fontSize:13,fontWeight:'700',color:t.subtext},
    groupTotal:{fontSize:13,fontWeight:'700',color:t.danger},
    card:{flexDirection:'row',alignItems:'flex-start',backgroundColor:t.card,borderRadius:14,padding:12,marginBottom:8,elevation:1},
    catIconWrap:{width:36,height:36,borderRadius:9,backgroundColor:t.primary+'18',alignItems:'center',justifyContent:'center',marginRight:10},
    catEmoji:{fontSize:18},
    details:{flex:1},
    cat:{fontSize:14,fontWeight:'600',color:t.text,marginBottom:2},
    sub:{fontSize:13,color:t.subtext,fontWeight:'500'},
    budgetTag:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:t.primary+'15',borderRadius:5,paddingHorizontal:6,paddingVertical:2,marginBottom:3,alignSelf:'flex-start'},
    budgetTagTxt:{fontSize:10,color:t.primary,fontWeight:'600'},
    meta:{fontSize:11,color:t.subtext},
    amtCol:{alignItems:'flex-end',marginRight:6,marginTop:2,minWidth:90},
    amt:{fontSize:14,fontWeight:'700',color:t.danger},
    amtConv:{fontSize:13,color:t.subtext,fontWeight:'600',fontStyle:'italic',marginTop:2},
    curTagRow:{flexDirection:'row',gap:4,marginTop:3,justifyContent:'flex-end',flexWrap:'wrap'},
    curTag:{backgroundColor:t.border,borderRadius:5,paddingHorizontal:5,paddingVertical:1},
    curTagTxt:{fontSize:10,color:t.subtext,fontWeight:'700'},
    actions:{flexDirection:'column',gap:5,marginLeft:2},
    editBtn:{width:28,height:28,borderRadius:8,backgroundColor:t.primary,alignItems:'center',justifyContent:'center'},
    deleteBtn:{width:28,height:28,borderRadius:8,backgroundColor:t.danger,alignItems:'center',justifyContent:'center'},
    empty:{alignItems:'center',paddingVertical:60},
    emptyTxt:{fontSize:16,fontWeight:'600',color:t.subtext,marginTop:16},
    // Modals
    overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
    modal:{backgroundColor:t.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:22,paddingBottom:40},
    modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
    modalTitle:{fontSize:19,fontWeight:'700',color:t.text},
    lbl:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:8},
    input:{borderWidth:1,borderColor:t.border,borderRadius:12,padding:14,marginBottom:14,fontSize:16,color:t.text,backgroundColor:t.background},
    amtEditRow:{flexDirection:'row',alignItems:'center',gap:10,marginBottom:8},
    amtEditCur:{fontSize:18,fontWeight:'700',color:t.primary},
    convNote:{fontSize:12,color:t.subtext,marginBottom:12,fontStyle:'italic'},
    customRateRow:{marginBottom:10},
    customRateToggle:{flexDirection:'row',alignItems:'center',gap:8,padding:12,borderRadius:12,borderWidth:1,borderColor:t.border,backgroundColor:t.background},
    customRateToggleOn:{backgroundColor:t.warning,borderColor:t.warning},
    customRateTxt:{fontSize:14,fontWeight:'600',color:t.subtext},
    customRateInput:{backgroundColor:t.warning+'12',borderRadius:12,padding:14,marginBottom:14},
    chips:{flexDirection:'row',gap:8,paddingBottom:4},
    chips2:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:14},
    chip:{paddingHorizontal:12,paddingVertical:8,borderRadius:14,backgroundColor:t.background,borderWidth:1,borderColor:t.border},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:13,color:t.text,fontWeight:'500'},
    chipTxtSel:{color:'#fff',fontWeight:'600'},
    chipSub:{fontSize:11,color:t.subtext,marginTop:2},
    catChip:{alignItems:'center',paddingHorizontal:12,paddingVertical:8,borderRadius:12,backgroundColor:t.background,borderWidth:1.5,borderColor:t.border,minWidth:72},
    catChipSel:{backgroundColor:t.primary,borderColor:t.primary},
    catEmoji2:{fontSize:18,marginBottom:3},
    catTxt2:{fontSize:10,color:t.text,fontWeight:'600',textAlign:'center'},
    presets:{flexDirection:'row',gap:8,marginBottom:14,flexWrap:'wrap'},
    presetBtn:{paddingHorizontal:13,paddingVertical:8,borderRadius:20,backgroundColor:t.primary+'22',borderWidth:1,borderColor:t.primary},
    presetTxt:{fontSize:13,color:t.primary,fontWeight:'600'},
    // Loan modal
    loanItem:{padding:14,borderRadius:12,borderWidth:1,borderColor:t.border,backgroundColor:t.background,marginBottom:8,flexDirection:'row',alignItems:'center'},
    loanItemSel:{backgroundColor:t.primary,borderColor:t.primary},
    loanItemLeft:{flex:1},
    loanItemName:{fontSize:15,fontWeight:'700',color:t.text,marginBottom:4},
    loanItemSub:{fontSize:12,color:t.subtext,marginBottom:2},
    loanItemTotal:{fontSize:13,fontWeight:'700',color:t.danger,marginTop:4},
    noLoans:{textAlign:'center',color:t.subtext,padding:16},
    interestNote:{fontSize:12,color:t.warning,marginBottom:14,fontWeight:'600'},
    row:{flexDirection:'row',gap:12,marginTop:4},
    btn:{flex:1,padding:15,borderRadius:12,alignItems:'center'},
    btnCancel:{backgroundColor:t.light},
    btnCancelTxt:{fontSize:15,fontWeight:'600',color:t.subtext},
    btnSave:{backgroundColor:t.primary},
    btnSaveTxt:{fontSize:15,fontWeight:'600',color:'#fff'},
  });
}
