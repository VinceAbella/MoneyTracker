import React, { useContext, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

export default function TransactionHistoryScreen() {
  const { appData, saveData, theme } = useContext(AppContext);
  const s = makeStyles(theme);

  const [calModal,  setCalModal]  = useState(false);
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [tempFrom,  setTempFrom]  = useState('');
  const [tempTo,    setTempTo]    = useState('');
  const [typeFilter,setTypeFilter]= useState('all'); // all | transfer | expense | income

  const toBase = (a,c) => { const r=appData.exchangeRates[c]||1,br=appData.exchangeRates[appData.baseCurrency]||1; return (a/r)*br; };
  const fmt    = (a,c) => new Intl.NumberFormat('en-PH',{style:'currency',currency:c||appData.baseCurrency}).format(a);
  const fmtBase= (a)   => fmt(a, appData.baseCurrency);

  // Build unified transaction list
  const allTransactions = useMemo(() => {
    const txns = [];

    // Transfers
    (appData.transfers || []).forEach(t => {
      txns.push({
        id: t.id, type: 'transfer', date: t.date,
        title: t.toAccount === '__expense__' ? 'Pool → Expense' : `Transfer → ${t.toAccount}`,
        subtitle: t.note || '',
        amount: t.amount, currency: t.currency,
        icon: 'swap-horizontal', color: 'primary',
        sign: '-',
      });
    });

    // Expenses
    appData.expenses.forEach(e => {
      txns.push({
        id: e.id, type: 'expense', date: e.date,
        title: e.category + (e.subCategory ? ` › ${e.subCategory}` : ''),
        subtitle: (e.note || '') + (e.account ? ` · ${e.account}` : '') + (e.subAccount ? ` › ${e.subAccount}` : ''),
        amount: e.amount, currency: e.currency,
        icon: 'receipt', color: 'danger',
        sign: '-',
      });
    });

    // Income
    (appData.incomes || []).forEach(i => {
      txns.push({
        id: i.id, type: 'income', date: i.date,
        title: i.category,
        subtitle: (i.note || '') + (i.account ? ` · ${i.account}` : ''),
        amount: i.amount, currency: i.currency,
        icon: 'trending-up', color: 'success',
        sign: '+',
      });
    });

    return txns.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [appData.transfers, appData.expenses, appData.incomes]);

  const filtered = useMemo(() => {
    return allTransactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      const d = new Date(t.date);
      if (dateFrom) { const f=new Date(dateFrom); if(d<f) return false; }
      if (dateTo)   { const to=new Date(dateTo); to.setHours(23,59,59); if(d>to) return false; }
      return true;
    });
  }, [allTransactions, typeFilter, dateFrom, dateTo]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(t => {
      const d = new Date(t.date).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
      if (!g[d]) g[d] = [];
      g[d].push(t);
    });
    return g;
  }, [filtered]);

  const totalIn  = filtered.filter(t=>t.sign==='+').reduce((s,t)=>s+toBase(t.amount,t.currency),0);
  const totalOut = filtered.filter(t=>t.sign==='-').reduce((s,t)=>s+toBase(t.amount,t.currency),0);

  const TYPE_FILTERS = [
    { key:'all',      label:'All',      icon:'list' },
    { key:'income',   label:'Income',   icon:'trending-up' },
    { key:'expense',  label:'Expenses', icon:'receipt' },
    { key:'transfer', label:'Transfers',icon:'swap-horizontal' },
  ];

  const COLORS = { primary:theme.primary, danger:theme.danger, success:theme.success, warning:theme.warning };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Transactions</Text>
        <TouchableOpacity style={[s.calBtn,(dateFrom||dateTo)&&s.calBtnOn]} onPress={()=>{setTempFrom(dateFrom);setTempTo(dateTo);setCalModal(true);}}>
          <Ionicons name="calendar" size={16} color={(dateFrom||dateTo)?'#fff':theme.subtext}/>
          {(dateFrom||dateTo)&&<Text style={s.calBtnTxt}>{dateFrom||'Start'} → {dateTo||'End'}</Text>}
        </TouchableOpacity>
        {(dateFrom||dateTo)&&<TouchableOpacity onPress={()=>{setDateFrom('');setDateTo('');}}>
          <Ionicons name="close-circle" size={22} color={theme.danger}/>
        </TouchableOpacity>}
      </View>

      {/* Summary */}
      <View style={s.summRow}>
        <View style={s.summItem}>
          <Text style={s.summLbl}>In</Text>
          <Text style={[s.summVal,{color:theme.success}]}>+{fmtBase(totalIn)}</Text>
        </View>
        <View style={s.summDiv}/>
        <View style={s.summItem}>
          <Text style={s.summLbl}>Out</Text>
          <Text style={[s.summVal,{color:theme.danger}]}>-{fmtBase(totalOut)}</Text>
        </View>
        <View style={s.summDiv}/>
        <View style={s.summItem}>
          <Text style={s.summLbl}>Net</Text>
          <Text style={[s.summVal,{color:totalIn-totalOut>=0?theme.success:theme.danger}]}>{fmtBase(totalIn-totalOut)}</Text>
        </View>
      </View>

      {/* Type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
        <View style={s.filterRow}>
          {TYPE_FILTERS.map(f=>(
            <TouchableOpacity key={f.key} style={[s.filterBtn,typeFilter===f.key&&s.filterBtnOn]} onPress={()=>setTypeFilter(f.key)}>
              <Ionicons name={f.icon} size={13} color={typeFilter===f.key?'#fff':theme.subtext}/>
              <Text style={[s.filterTxt,typeFilter===f.key&&s.filterTxtOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Transaction list */}
      <ScrollView style={s.list}>
        {Object.keys(grouped).length===0&&(
          <View style={s.empty}><Ionicons name="list-outline" size={64} color={theme.border}/><Text style={s.emptyTxt}>No transactions found</Text></View>
        )}
        {Object.keys(grouped).map(date=>{
          const dayIn  = grouped[date].filter(t=>t.sign==='+').reduce((s,t)=>s+toBase(t.amount,t.currency),0);
          const dayOut = grouped[date].filter(t=>t.sign==='-').reduce((s,t)=>s+toBase(t.amount,t.currency),0);
          return (
            <View key={date} style={s.group}>
              <View style={s.groupHeader}>
                <Text style={s.groupDate}>{date}</Text>
                <View style={s.groupTotals}>
                  {dayIn>0&&<Text style={[s.groupAmt,{color:theme.success}]}>+{fmtBase(dayIn)}</Text>}
                  {dayOut>0&&<Text style={[s.groupAmt,{color:theme.danger}]}>-{fmtBase(dayOut)}</Text>}
                </View>
              </View>
              {grouped[date].map(txn=>{
                const isForeign=txn.currency!==appData.baseCurrency;
                const baseAmt=toBase(txn.amount,txn.currency);
                return (
                  <View key={txn.id} style={s.txnCard}>
                    <View style={[s.txnIcon,{backgroundColor:COLORS[txn.color]+'22'}]}>
                      <Ionicons name={txn.icon} size={18} color={COLORS[txn.color]}/>
                    </View>
                    <View style={s.txnInfo}>
                      <Text style={s.txnTitle} numberOfLines={1}>{txn.title}</Text>
                      {txn.subtitle?<Text style={s.txnSub} numberOfLines={1}>{txn.subtitle}</Text>:null}
                      <View style={s.txnTypeBadge}><Text style={[s.txnTypeText,{color:COLORS[txn.color]}]}>{txn.type}</Text></View>
                    </View>
                    <View style={s.txnAmtCol}>
                      <Text style={[s.txnAmt,{color:txn.sign==='+'?theme.success:theme.danger}]}>
                        {txn.sign}{fmt(txn.amount,txn.currency)}
                      </Text>
                      {isForeign&&<Text style={s.txnConv}>≈ {fmtBase(baseAmt)}</Text>}
                      <View style={s.txnCurTag}><Text style={s.txnCurTxt}>{txn.currency}</Text></View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
        <View style={{height:20}}/>
      </ScrollView>

      {/* Calendar modal */}
      <Modal visible={calModal} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}>
          <Text style={s.modalTitle}>📅 Filter by Date Range</Text>
          <Text style={s.lbl}>From (YYYY-MM-DD)</Text>
          <TextInput style={s.input} value={tempFrom} onChangeText={setTempFrom} placeholder="e.g. 2024-01-01" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>To (YYYY-MM-DD)</Text>
          <TextInput style={s.input} value={tempTo} onChangeText={setTempTo} placeholder="e.g. 2024-12-31" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Quick Presets</Text>
          <View style={s.presets}>
            {[
              {label:'This Month',from:()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`;},to:()=>new Date().toISOString().split('T')[0]},
              {label:'Last Month',from:()=>{const n=new Date();n.setMonth(n.getMonth()-1);return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`;},to:()=>{const n=new Date();n.setDate(0);return n.toISOString().split('T')[0];}},
              {label:'This Year', from:()=>`${new Date().getFullYear()}-01-01`,to:()=>new Date().toISOString().split('T')[0]},
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
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    header:{flexDirection:'row',alignItems:'center',gap:10,padding:20,paddingTop:60,backgroundColor:t.card,flexWrap:'wrap'},
    title:{fontSize:24,fontWeight:'800',color:t.text,flex:1},
    calBtn:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:t.border,paddingHorizontal:12,paddingVertical:7,borderRadius:20},
    calBtnOn:{backgroundColor:t.primary},
    calBtnTxt:{fontSize:12,color:'#fff',fontWeight:'600'},
    summRow:{flexDirection:'row',backgroundColor:t.card,marginHorizontal:18,marginVertical:10,borderRadius:14,overflow:'hidden'},
    summItem:{flex:1,alignItems:'center',padding:14},
    summDiv:{width:1,backgroundColor:t.border},
    summLbl:{fontSize:11,color:t.subtext,marginBottom:4},
    summVal:{fontSize:15,fontWeight:'800'},
    filterScroll:{maxHeight:52},
    filterRow:{flexDirection:'row',gap:8,paddingHorizontal:18,paddingBottom:10},
    filterBtn:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:13,paddingVertical:7,borderRadius:20,backgroundColor:t.card,borderWidth:1,borderColor:t.border},
    filterBtnOn:{backgroundColor:t.primary,borderColor:t.primary},
    filterTxt:{fontSize:12,color:t.subtext,fontWeight:'600'},
    filterTxtOn:{color:'#fff'},
    list:{flex:1,padding:16},
    group:{marginBottom:18},
    groupHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
    groupDate:{fontSize:13,fontWeight:'700',color:t.subtext},
    groupTotals:{flexDirection:'row',gap:8},
    groupAmt:{fontSize:12,fontWeight:'700'},
    txnCard:{flexDirection:'row',alignItems:'flex-start',backgroundColor:t.card,borderRadius:14,padding:13,marginBottom:8,elevation:1},
    txnIcon:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',marginRight:10},
    txnInfo:{flex:1},
    txnTitle:{fontSize:14,fontWeight:'600',color:t.text,marginBottom:2},
    txnSub:{fontSize:12,color:t.subtext,marginBottom:4},
    txnTypeBadge:{backgroundColor:t.border,borderRadius:5,paddingHorizontal:6,paddingVertical:2,alignSelf:'flex-start'},
    txnTypeText:{fontSize:10,fontWeight:'700',textTransform:'uppercase'},
    txnAmtCol:{alignItems:'flex-end',minWidth:90},
    txnAmt:{fontSize:14,fontWeight:'700'},
    txnConv:{fontSize:12,color:t.subtext,fontStyle:'italic',marginTop:2},
    txnCurTag:{backgroundColor:t.border,borderRadius:5,paddingHorizontal:5,paddingVertical:1,marginTop:3},
    txnCurTxt:{fontSize:10,color:t.subtext,fontWeight:'700'},
    empty:{alignItems:'center',paddingVertical:60},
    emptyTxt:{fontSize:16,fontWeight:'600',color:t.subtext,marginTop:16},
    overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
    modal:{backgroundColor:t.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:22,paddingBottom:40},
    modalTitle:{fontSize:19,fontWeight:'700',color:t.text,marginBottom:16},
    lbl:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:8},
    input:{borderWidth:1,borderColor:t.border,borderRadius:12,padding:14,marginBottom:14,fontSize:16,color:t.text,backgroundColor:t.background},
    presets:{flexDirection:'row',gap:8,marginBottom:14,flexWrap:'wrap'},
    presetBtn:{paddingHorizontal:13,paddingVertical:8,borderRadius:20,backgroundColor:t.primary+'22',borderWidth:1,borderColor:t.primary},
    presetTxt:{fontSize:13,color:t.primary,fontWeight:'600'},
    row:{flexDirection:'row',gap:12,marginTop:4},
    btn:{flex:1,padding:15,borderRadius:12,alignItems:'center'},
    btnCancel:{backgroundColor:t.light},
    btnCancelTxt:{fontSize:15,fontWeight:'600',color:t.subtext},
    btnSave:{backgroundColor:t.primary},
    btnSaveTxt:{fontSize:15,fontWeight:'600',color:'#fff'},
  });
}
