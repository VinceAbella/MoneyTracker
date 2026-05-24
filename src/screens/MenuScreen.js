import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const CURRENCIES = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','CNY','KRW','PLN'];

export default function MenuScreen({ navigation }) {
  const { appData, saveData, fetchExchangeRates, theme } = useContext(AppContext);
  const s = makeStyles(theme);

  const [convModal,  setConvModal]  = useState(false);
  const [convAmount, setConvAmount] = useState('');
  const [convFrom,   setConvFrom]   = useState('USD');
  const [convTo,     setConvTo]     = useState('PHP');

  const fmt     = (a,c) => new Intl.NumberFormat('en-PH',{style:'currency',currency:c||appData.baseCurrency}).format(a);
  const fmtBase = (a)   => fmt(a, appData.baseCurrency);
  const toBase  = (a,c) => { const r=appData.exchangeRates[c]||1,br=appData.exchangeRates[appData.baseCurrency]||1; return (a/r)*br; };

  const convResult = () => {
    const amt = parseFloat(convAmount);
    if (!amt || isNaN(amt)) return null;
    const fr = appData.exchangeRates[convFrom] || 1;
    const tr = appData.exchangeRates[convTo]   || 1;
    return (amt / fr) * tr;
  };

  const clearData = (type) => {
    const labels = { all:'ALL Data', expenses:'Expenses', budget:'Budgets', loans:'Loans', income:'Income & Transfers', investments:'Investments', accounts:'Accounts' };
    Alert.alert(`Clear ${labels[type]}`, `This will permanently delete all ${labels[type].toLowerCase()}. This cannot be undone.`, [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress: () => {
        if      (type==='all')         saveData({ accounts:[], expenses:[], budget:[], loans:[], netWorth:[], incomes:[], investments:[], transfers:[], customCategories:[] });
        else if (type==='expenses')    saveData({ expenses:[] });
        else if (type==='budget')      saveData({ budget:[] });
        else if (type==='loans')       saveData({ loans:[] });
        else if (type==='income')      saveData({ incomes:[], transfers:[] });
        else if (type==='investments') saveData({ investments:[] });
        else if (type==='accounts')    saveData({ accounts:[] });
      }}
    ]);
  };

  const navItems = [
    { title:'Income',          icon:'trending-up',      color:theme.success,   bg:theme.success+'22',   screen:'Income' },
    { title:'Loan Tracker',    icon:'card',             color:theme.warning,   bg:theme.warning+'22',   screen:'Loans' },
    { title:'Investments',     icon:'bar-chart',        color:theme.primary,   bg:theme.primary+'22',   screen:'Investments' },
    { title:'Net Worth',       icon:'analytics',        color:theme.accent,    bg:theme.accent+'22',    screen:'NetWorth' },
    { title:'Transfer Money',  icon:'swap-horizontal',  color:theme.secondary, bg:theme.secondary+'22', screen:'Transfer' },
    { title:'Add Account',     icon:'wallet',           color:theme.primary,   bg:theme.primary+'22',   screen:'AddAccount' },
    { title:'Add Loan',        icon:'add-circle',       color:theme.warning,   bg:theme.warning+'22',   screen:'AddLoan' },
    { title:'Settings',        icon:'settings',         color:theme.subtext,   bg:theme.border,         screen:'Settings' },
  ];

  const res = convResult();

  // App stats
  const totalBalance = appData.accounts.reduce((s,a)=>s+toBase(a.balance,a.currency),0);
  const totalIncome  = (appData.incomes||[]).reduce((s,i)=>s+toBase(i.amount,i.currency),0);
  const totalTransf  = (appData.transfers||[]).reduce((s,t)=>s+toBase(t.amount,t.currency),0);
  const incomePool   = totalIncome - totalTransf;

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.header}><Text style={s.title}>Menu</Text></View>

      {/* Quick stats banner */}
      <View style={s.statsRow}>
        <View style={s.statItem}><Text style={s.statLbl}>Balance</Text><Text style={[s.statVal,{color:theme.success}]} numberOfLines={1}>{fmtBase(totalBalance)}</Text></View>
        <View style={s.statDiv}/>
        <View style={s.statItem}><Text style={s.statLbl}>Pool</Text><Text style={[s.statVal,{color:theme.primary}]} numberOfLines={1}>{fmtBase(incomePool)}</Text></View>
        <View style={s.statDiv}/>
        <View style={s.statItem}><Text style={s.statLbl}>Expenses</Text><Text style={s.statVal}>{appData.expenses.length}</Text></View>
      </View>

      {/* Appearance */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Appearance</Text>
        <View style={s.row}>
          <View style={[s.rowIcon,{backgroundColor:theme.primary+'22'}]}><Ionicons name={appData.darkMode?'moon':'sunny'} size={20} color={theme.primary}/></View>
          <Text style={s.rowText}>Dark Mode</Text>
          <Switch value={!!appData.darkMode} onValueChange={v=>saveData({darkMode:v})} trackColor={{false:theme.border,true:theme.primary}} thumbColor={appData.darkMode?'#fff':theme.subtext}/>
        </View>
      </View>

      {/* Base Currency */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Base Currency</Text>
        <View style={s.chipGrid}>
          {CURRENCIES.map(c=>(
            <TouchableOpacity key={c} style={[s.chip,appData.baseCurrency===c&&s.chipSel]} onPress={()=>saveData({baseCurrency:c})}>
              <Text style={[s.chipTxt,appData.baseCurrency===c&&s.chipTxtSel]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Currency Converter */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Currency Converter</Text>
        <View style={s.converterCard}>
          <TextInput style={s.convInput} value={convAmount} onChangeText={setConvAmount} keyboardType="numeric" placeholder="Enter amount..." placeholderTextColor={theme.subtext}/>
          <View style={s.convSelRow}>
            <View style={s.convSide}>
              <Text style={s.convLabel}>From</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.chips}>{CURRENCIES.map(c=><TouchableOpacity key={c} style={[s.chip,convFrom===c&&s.chipSel]} onPress={()=>setConvFrom(c)}><Text style={[s.chipTxt,convFrom===c&&s.chipTxtSel]}>{c}</Text></TouchableOpacity>)}</View>
              </ScrollView>
            </View>
          </View>
          <TouchableOpacity style={s.swapBtn} onPress={()=>{const t=convFrom;setConvFrom(convTo);setConvTo(t);}}>
            <Ionicons name="swap-vertical" size={18} color={theme.primary}/>
            <Text style={s.swapTxt}>Swap</Text>
          </TouchableOpacity>
          <View style={s.convSelRow}>
            <View style={s.convSide}>
              <Text style={s.convLabel}>To</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.chips}>{CURRENCIES.map(c=><TouchableOpacity key={c} style={[s.chip,convTo===c&&s.chipSel]} onPress={()=>setConvTo(c)}><Text style={[s.chipTxt,convTo===c&&s.chipTxtSel]}>{c}</Text></TouchableOpacity>)}</View>
              </ScrollView>
            </View>
          </View>
          {res !== null && (
            <View style={s.convResult}>
              <Text style={s.convResultFrom}>{convAmount} {convFrom}</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.primary}/>
              <Text style={s.convResultTo}>{res.toFixed(4)} {convTo}</Text>
              <Text style={s.convRate}>Rate: 1 {convFrom} = {((appData.exchangeRates[convTo]||1)/(appData.exchangeRates[convFrom]||1)).toFixed(4)} {convTo}</Text>
            </View>
          )}
          <TouchableOpacity style={s.refreshBtn} onPress={fetchExchangeRates}>
            <Ionicons name="refresh" size={15} color="#fff"/>
            <Text style={s.refreshTxt}>Refresh Live Rates</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Navigate To</Text>
        <View style={s.navGrid}>
          {navItems.map((item,i)=>(
            <TouchableOpacity key={i} style={s.navCard} onPress={()=>navigation.navigate(item.screen)}>
              <View style={[s.navIcon,{backgroundColor:item.bg}]}><Ionicons name={item.icon} size={22} color={item.color}/></View>
              <Text style={s.navTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Exchange Rates */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Exchange Rates (USD base)</Text>
        <View style={s.ratesList}>
          {['PHP','EUR','GBP','JPY','SGD','PLN','CNY','KRW','AUD','CAD'].map(c=>(
            <View key={c} style={s.rateItem}>
              <Text style={s.rateCur}>{c}</Text>
              <Text style={s.rateVal}>{appData.exchangeRates[c]?appData.exchangeRates[c].toFixed(4):'—'}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* App Stats */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>App Stats</Text>
        <View style={s.appStatsGrid}>
          {[
            {label:'Accounts',   val:appData.accounts.length,      color:theme.primary},
            {label:'Expenses',   val:appData.expenses.length,       color:theme.danger},
            {label:'Budgets',    val:appData.budget.length,         color:theme.accent},
            {label:'Loans',      val:(appData.loans||[]).length,    color:theme.warning},
            {label:'Incomes',    val:(appData.incomes||[]).length,  color:theme.success},
            {label:'Investments',val:(appData.investments||[]).length,color:theme.secondary},
          ].map((item,i)=>(
            <View key={i} style={s.appStatItem}>
              <Text style={[s.appStatVal,{color:item.color}]}>{item.val}</Text>
              <Text style={s.appStatLbl}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Data Management */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Data Management</Text>
        {[
          {label:'Clear Expenses',   type:'expenses',    color:theme.warning},
          {label:'Clear Budgets',    type:'budget',      color:theme.warning},
          {label:'Clear Loans',      type:'loans',       color:theme.warning},
          {label:'Clear Income',     type:'income',      color:theme.warning},
          {label:'Clear Investments',type:'investments', color:theme.warning},
          {label:'Clear Accounts',   type:'accounts',    color:theme.danger},
          {label:'⚠ Clear ALL Data', type:'all',         color:theme.danger},
        ].map((item,i)=>(
          <TouchableOpacity key={i} style={[s.clearBtn,{borderColor:item.color+'50',backgroundColor:item.color+'0D'}]} onPress={()=>clearData(item.type)}>
            <Ionicons name="trash-outline" size={16} color={item.color}/>
            <Text style={[s.clearBtnTxt,{color:item.color}]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{height:40}}/>
    </ScrollView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    header:{padding:24,paddingTop:60,backgroundColor:t.card},
    title:{fontSize:28,fontWeight:'800',color:t.text},
    statsRow:{flexDirection:'row',backgroundColor:t.card,margin:18,borderRadius:14,overflow:'hidden',elevation:2},
    statItem:{flex:1,alignItems:'center',padding:14},
    statDiv:{width:1,backgroundColor:t.border},
    statLbl:{fontSize:11,color:t.subtext,marginBottom:4},
    statVal:{fontSize:14,fontWeight:'800',color:t.text},
    section:{margin:18,marginBottom:0},
    sectionTitle:{fontSize:12,fontWeight:'700',color:t.subtext,textTransform:'uppercase',letterSpacing:0.6,marginBottom:12},
    row:{flexDirection:'row',alignItems:'center',backgroundColor:t.card,borderRadius:12,padding:16,marginBottom:8},
    rowIcon:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',marginRight:12},
    rowText:{flex:1,fontSize:15,fontWeight:'600',color:t.text},
    chipGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
    chips:{flexDirection:'row',gap:8,paddingBottom:4},
    chip:{paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:t.card,borderWidth:1,borderColor:t.border},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:13,color:t.text},
    chipTxtSel:{color:'#fff',fontWeight:'600'},
    converterCard:{backgroundColor:t.card,borderRadius:16,padding:16,elevation:1},
    convInput:{borderWidth:1,borderColor:t.border,borderRadius:12,padding:14,fontSize:22,fontWeight:'700',color:t.text,backgroundColor:t.background,marginBottom:12,textAlign:'center'},
    convSelRow:{marginBottom:8},
    convSide:{},
    convLabel:{fontSize:12,fontWeight:'700',color:t.subtext,marginBottom:8},
    swapBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:8,marginBottom:8},
    swapTxt:{fontSize:14,color:t.primary,fontWeight:'600'},
    convResult:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,backgroundColor:t.primary+'15',borderRadius:12,padding:14,marginTop:12,flexWrap:'wrap'},
    convResultFrom:{fontSize:16,fontWeight:'600',color:t.subtext},
    convResultTo:{fontSize:22,fontWeight:'800',color:t.primary},
    convRate:{width:'100%',textAlign:'center',fontSize:11,color:t.subtext,marginTop:4,fontStyle:'italic'},
    refreshBtn:{flexDirection:'row',alignItems:'center',backgroundColor:t.primary,borderRadius:10,padding:12,justifyContent:'center',gap:8,marginTop:12},
    refreshTxt:{color:'#fff',fontWeight:'600',fontSize:13},
    navGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
    navCard:{width:'22%',alignItems:'center',backgroundColor:t.card,borderRadius:14,padding:12,elevation:1},
    navIcon:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center',marginBottom:8},
    navTitle:{fontSize:10,fontWeight:'600',color:t.text,textAlign:'center'},
    ratesList:{backgroundColor:t.card,borderRadius:12,overflow:'hidden'},
    rateItem:{flexDirection:'row',justifyContent:'space-between',padding:12,borderBottomWidth:1,borderBottomColor:t.border},
    rateCur:{fontSize:14,fontWeight:'600',color:t.text},
    rateVal:{fontSize:14,color:t.subtext},
    appStatsGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',backgroundColor:t.card,borderRadius:12,padding:14,gap:4},
    appStatItem:{width:'30%',alignItems:'center',padding:8},
    appStatVal:{fontSize:22,fontWeight:'800',marginBottom:4},
    appStatLbl:{fontSize:11,color:t.subtext,textAlign:'center'},
    clearBtn:{flexDirection:'row',alignItems:'center',gap:10,padding:14,borderRadius:12,borderWidth:1,marginBottom:8},
    clearBtnTxt:{fontSize:14,fontWeight:'700'},
  });
}
