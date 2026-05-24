import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const CURRENCIES = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','CNY','KRW','PLN'];

export default function MenuScreen({ navigation }) {
  const { appData, saveData, fetchExchangeRates, theme } = useContext(AppContext);
  const s = makeStyles(theme);

  const [convAmount, setConvAmount] = useState('');
  const [convFrom,   setConvFrom]   = useState('USD');
  const [convTo,     setConvTo]     = useState(appData.baseCurrency);

  const toBase = (a,c) => { const r=appData.exchangeRates[c]||1, br=appData.exchangeRates[appData.baseCurrency]||1; return (a/r)*br; };
  const fmt    = (a,c) => new Intl.NumberFormat('en-PH',{style:'currency',currency:c||appData.baseCurrency}).format(a);
  const fmtBase= (a)   => fmt(a, appData.baseCurrency);

  const totalBalance = appData.accounts.reduce((s,a)=>s+toBase(a.balance,a.currency),0);
  const totalIncome  = (appData.incomes||[]).reduce((s,i)=>s+toBase(i.amount,i.currency),0);
  const totalTransf  = (appData.transfers||[]).reduce((s,t)=>s+toBase(t.amount,t.currency),0);
  const incomePool   = totalIncome - totalTransf;

  const convResult = convAmount && parseFloat(convAmount) > 0
    ? (parseFloat(convAmount) / (appData.exchangeRates[convFrom]||1)) * (appData.exchangeRates[convTo]||1)
    : null;


  const navItems = [
    {title:'Income',         icon:'trending-up',     color:theme.success,   bg:theme.success+'22',   screen:'Income'},
    {title:'Loan Tracker',   icon:'card',            color:theme.warning,   bg:theme.warning+'22',   screen:'Loans'},
    {title:'Investments',    icon:'bar-chart',       color:theme.primary,   bg:theme.primary+'22',   screen:'Investments'},
    {title:'Net Worth',      icon:'analytics',       color:theme.accent,    bg:theme.accent+'22',    screen:'NetWorth'},
    {title:'Transfer',       icon:'swap-horizontal', color:theme.secondary, bg:theme.secondary+'22', screen:'Transfer'},
    {title:'Add Account',    icon:'wallet',          color:theme.primary,   bg:theme.primary+'22',   screen:'AddAccount'},
    {title:'Add Loan',       icon:'add-circle',      color:theme.warning,   bg:theme.warning+'22',   screen:'AddLoan'},
    {title:'Settings',       icon:'settings',        color:theme.subtext,   bg:theme.border,         screen:'Settings'},
  ];

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.header}><Text style={s.title}>Menu</Text></View>

      {/* Appearance */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Appearance</Text>
        <View style={s.row}>
          <View style={[s.rowIcon,{backgroundColor:theme.primary+'22'}]}>
            <Ionicons name={appData.darkMode?'moon':'sunny'} size={20} color={theme.primary}/>
          </View>
          <Text style={s.rowText}>Dark Mode</Text>
          <Switch
            value={!!appData.darkMode}
            onValueChange={v=>saveData({darkMode:v})}
            trackColor={{false:theme.border,true:theme.primary}}
            thumbColor={appData.darkMode?'#fff':theme.subtext}
          />
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
          <TextInput
            style={s.convInput}
            value={convAmount}
            onChangeText={setConvAmount}
            keyboardType="numeric"
            placeholder="Enter amount..."
            placeholderTextColor={theme.subtext}
          />
          <Text style={s.convLabel}>From</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}}>
            <View style={s.chips}>
              {CURRENCIES.map(c=>(
                <TouchableOpacity key={c} style={[s.chip,convFrom===c&&s.chipSel]} onPress={()=>setConvFrom(c)}>
                  <Text style={[s.chipTxt,convFrom===c&&s.chipTxtSel]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={s.swapBtn} onPress={()=>{const t=convFrom;setConvFrom(convTo);setConvTo(t);}}>
            <Ionicons name="swap-vertical" size={18} color={theme.primary}/>
            <Text style={s.swapTxt}>Swap</Text>
          </TouchableOpacity>
          <Text style={s.convLabel}>To</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
            <View style={s.chips}>
              {CURRENCIES.map(c=>(
                <TouchableOpacity key={c} style={[s.chip,convTo===c&&s.chipSel]} onPress={()=>setConvTo(c)}>
                  <Text style={[s.chipTxt,convTo===c&&s.chipTxtSel]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {convResult !== null && (
            <View style={s.convResult}>
              <Text style={s.convFrom}>{convAmount} {convFrom}</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.primary}/>
              <Text style={s.convTo}>{convResult.toFixed(4)} {convTo}</Text>
              <Text style={s.convRate}>1 {convFrom} = {((appData.exchangeRates[convTo]||1)/(appData.exchangeRates[convFrom]||1)).toFixed(4)} {convTo}</Text>
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
              <View style={[s.navIcon,{backgroundColor:item.bg}]}>
                <Ionicons name={item.icon} size={22} color={item.color}/>
              </View>
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
              <Text style={s.rateVal}>
                {appData.exchangeRates[c] ? appData.exchangeRates[c].toFixed(4) : '—'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* App Stats */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>App Stats</Text>
        <View style={s.appStatsGrid}>
          {[
            {label:'Accounts',    val:appData.accounts.length,           color:theme.primary},
            {label:'Expenses',    val:appData.expenses.length,            color:theme.danger},
            {label:'Budgets',     val:appData.budget.length,              color:theme.accent},
            {label:'Loans',       val:(appData.loans||[]).length,         color:theme.warning},
            {label:'Incomes',     val:(appData.incomes||[]).length,       color:theme.success},
            {label:'Investments', val:(appData.investments||[]).length,   color:theme.secondary},
          ].map((item,i)=>(
            <View key={i} style={s.appStatItem}>
              <Text style={[s.appStatVal,{color:item.color}]}>{item.val}</Text>
              <Text style={s.appStatLbl}>{item.label}</Text>
            </View>
          ))}
        </View>
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
    chips:{flexDirection:'row',gap:8,paddingBottom:2},
    chip:{paddingHorizontal:13,paddingVertical:8,borderRadius:20,backgroundColor:t.card,borderWidth:1,borderColor:t.border},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:13,color:t.text},
    chipTxtSel:{color:'#fff',fontWeight:'600'},
    converterCard:{backgroundColor:t.card,borderRadius:14,padding:16},
    convInput:{borderWidth:1,borderColor:t.border,borderRadius:10,padding:12,fontSize:20,fontWeight:'700',color:t.text,backgroundColor:t.background,marginBottom:14,textAlign:'center'},
    convLabel:{fontSize:12,fontWeight:'700',color:t.subtext,marginBottom:8,textTransform:'uppercase',letterSpacing:0.3},
    swapBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingVertical:8,marginBottom:10},
    swapTxt:{fontSize:13,color:t.primary,fontWeight:'600'},
    convResult:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,backgroundColor:t.primary+'15',borderRadius:12,padding:14,marginBottom:12,flexWrap:'wrap'},
    convFrom:{fontSize:15,fontWeight:'600',color:t.subtext},
    convTo:{fontSize:22,fontWeight:'800',color:t.primary},
    convRate:{width:'100%',textAlign:'center',fontSize:11,color:t.subtext,marginTop:4,fontStyle:'italic'},
    refreshBtn:{flexDirection:'row',alignItems:'center',backgroundColor:t.primary,borderRadius:10,padding:12,justifyContent:'center',gap:8},
    refreshTxt:{color:'#fff',fontWeight:'600',fontSize:13},
    navGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},
    navCard:{width:'22%',alignItems:'center',backgroundColor:t.card,borderRadius:12,padding:12,elevation:1},
    navIcon:{width:42,height:42,borderRadius:11,alignItems:'center',justifyContent:'center',marginBottom:7},
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