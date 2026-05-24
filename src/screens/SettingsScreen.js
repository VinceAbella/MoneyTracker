import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const CURRENCIES = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','CNY','KRW','PLN'];

export default function SettingsScreen({ navigation }) {
  const { appData, saveData, fetchExchangeRates, theme } = useContext(AppContext);
  const s = makeStyles(theme);

  // Custom converter modal
  const [convModal,   setConvModal]   = useState(false);
  const [convAmount,  setConvAmount]  = useState('');
  const [convFrom,    setConvFrom]    = useState('USD');
  const [convTo,      setConvTo]      = useState('PHP');

  const toBase = (a,c) => { const r=appData.exchangeRates[c]||1,br=appData.exchangeRates[appData.baseCurrency]||1; return (a/r)*br; };
  const fmt = (a,c) => new Intl.NumberFormat('en-PH',{style:'currency',currency:c||appData.baseCurrency}).format(a);

  const convertResult = () => {
    const amt=parseFloat(convAmount);
    if(!amt||isNaN(amt)) return null;
    const fromRate=appData.exchangeRates[convFrom]||1;
    const toRate  =appData.exchangeRates[convTo]||1;
    return (amt/fromRate)*toRate;
  };

  const clearData = (type) => {
    const messages = {
      all:    'This will delete ALL data including accounts, expenses, income, loans and budgets.',
      expenses:'This will delete all expense records.',
      budget:  'This will delete all budget categories.',
      loans:   'This will delete all loan records.',
      income:  'This will delete all income records.',
    };
    Alert.alert(`Clear ${type==='all'?'All Data':type}`, messages[type], [
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive',onPress:()=>{
        if(type==='all') saveData({accounts:[],expenses:[],budget:[],loans:[],netWorth:[],incomes:[],investments:[],transfers:[],customCategories:[]});
        else if(type==='expenses') saveData({expenses:[]});
        else if(type==='budget')   saveData({budget:[]});
        else if(type==='loans')    saveData({loans:[]});
        else if(type==='income')   saveData({incomes:[],transfers:[]});
      }}
    ]);
  };

  const convRes = convertResult();

  return (
    <ScrollView style={s.container}>
      <View style={s.header}><Text style={s.title}>Settings</Text></View>

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
        <TouchableOpacity style={s.converterBtn} onPress={()=>setConvModal(true)}>
          <Ionicons name="swap-horizontal" size={20} color={theme.primary}/>
          <Text style={s.converterBtnTxt}>Open Converter</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.subtext}/>
        </TouchableOpacity>
      </View>

      {/* Exchange Rates */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Exchange Rates</Text>
        <Text style={s.note}>Live rates via exchangerate-api.com</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={fetchExchangeRates}>
          <Ionicons name="refresh" size={18} color="#fff"/>
          <Text style={s.refreshTxt}>Refresh Live Rates</Text>
        </TouchableOpacity>
        <View style={s.ratesList}>
          {['USD','EUR','GBP','JPY','SGD','PLN','CNY','KRW'].map(c=>(
            <View key={c} style={s.rateItem}>
              <Text style={s.rateCur}>{c}</Text>
              <Text style={s.rateVal}>{appData.exchangeRates[c]?appData.exchangeRates[c].toFixed(4):'—'}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Navigation */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>More Screens</Text>
        {[
          {title:'Net Worth Tracker',icon:'analytics',color:theme.accent,  bg:theme.accent+'22',  screen:'NetWorth'},
          {title:'Investments',      icon:'bar-chart', color:theme.primary, bg:theme.primary+'22', screen:'Investments'},
          {title:'Transfer Money',   icon:'swap-horizontal',color:theme.success,bg:theme.success+'22',screen:'Transfer'},
        ].map((item,i)=>(
          <TouchableOpacity key={i} style={s.menuItem} onPress={()=>navigation.navigate(item.screen)}>
            <View style={[s.menuIcon,{backgroundColor:item.bg}]}><Ionicons name={item.icon} size={18} color={item.color}/></View>
            <Text style={s.menuText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.subtext}/>
          </TouchableOpacity>
        ))}
      </View>

      {/* App Stats */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>App Stats</Text>
        <View style={s.statsGrid}>
          {[
            {label:'Accounts',  val:appData.accounts.length},
            {label:'Expenses',  val:appData.expenses.length},
            {label:'Budgets',   val:appData.budget.length},
            {label:'Loans',     val:(appData.loans||[]).length},
            {label:'Incomes',   val:(appData.incomes||[]).length},
            {label:'Investments',val:(appData.investments||[]).length},
          ].map((item,i)=>(
            <View key={i} style={s.statBox}>
              <Text style={s.statVal}>{item.val}</Text>
              <Text style={s.statLbl}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Data Management */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Data Management</Text>
        {[
          {label:'Clear Expenses',  type:'expenses', color:theme.warning},
          {label:'Clear Budgets',   type:'budget',   color:theme.warning},
          {label:'Clear Loans',     type:'loans',    color:theme.warning},
          {label:'Clear Income',    type:'income',   color:theme.warning},
          {label:'Clear ALL Data',  type:'all',      color:theme.danger},
        ].map((item,i)=>(
          <TouchableOpacity key={i} style={[s.clearBtn,{borderColor:item.color+'44',backgroundColor:item.color+'0F'}]} onPress={()=>clearData(item.type)}>
            <Ionicons name="trash-outline" size={16} color={item.color}/>
            <Text style={[s.clearBtnTxt,{color:item.color}]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{height:40}}/>

      {/* Currency Converter Modal */}
      <Modal visible={convModal} animationType="slide" transparent>
        <View style={s.overlay}><ScrollView><View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>💱 Currency Converter</Text>
            <TouchableOpacity onPress={()=>setConvModal(false)}><Ionicons name="close" size={22} color={theme.subtext}/></TouchableOpacity>
          </View>

          <Text style={s.lbl}>Amount</Text>
          <TextInput style={s.input} value={convAmount} onChangeText={setConvAmount} keyboardType="numeric" placeholder="Enter amount..." placeholderTextColor={theme.subtext}/>

          <Text style={s.lbl}>From</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
            <View style={s.chips}>{CURRENCIES.map(c=><TouchableOpacity key={c} style={[s.chip,convFrom===c&&s.chipSel]} onPress={()=>setConvFrom(c)}><Text style={[s.chipTxt,convFrom===c&&s.chipTxtSel]}>{c}</Text></TouchableOpacity>)}</View>
          </ScrollView>

          <TouchableOpacity style={s.swapBtn} onPress={()=>{ const tmp=convFrom; setConvFrom(convTo); setConvTo(tmp); }}>
            <Ionicons name="swap-vertical" size={20} color={theme.primary}/>
            <Text style={s.swapBtnTxt}>Swap currencies</Text>
          </TouchableOpacity>

          <Text style={s.lbl}>To</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
            <View style={s.chips}>{CURRENCIES.map(c=><TouchableOpacity key={c} style={[s.chip,convTo===c&&s.chipSel]} onPress={()=>setConvTo(c)}><Text style={[s.chipTxt,convTo===c&&s.chipTxtSel]}>{c}</Text></TouchableOpacity>)}</View>
          </ScrollView>

          {convRes!==null&&(
            <View style={s.convResult}>
              <Text style={s.convResultFrom}>{convAmount} {convFrom}</Text>
              <Ionicons name="arrow-down" size={20} color={theme.primary}/>
              <Text style={s.convResultTo}>{convRes.toFixed(4)} {convTo}</Text>
              <Text style={s.convResultRate}>1 {convFrom} = {((appData.exchangeRates[convTo]||1)/(appData.exchangeRates[convFrom]||1)).toFixed(4)} {convTo}</Text>
            </View>
          )}
          <TouchableOpacity style={[s.btn,s.btnSave,{marginTop:12}]} onPress={()=>setConvModal(false)}><Text style={s.btnSaveTxt}>Done</Text></TouchableOpacity>
        </View></ScrollView></View>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    header:{padding:24,paddingTop:60,backgroundColor:t.card},
    title:{fontSize:28,fontWeight:'800',color:t.text},
    section:{margin:18,marginBottom:0},
    sectionTitle:{fontSize:13,fontWeight:'700',color:t.subtext,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12},
    row:{flexDirection:'row',alignItems:'center',backgroundColor:t.card,borderRadius:12,padding:16,marginBottom:8},
    rowIcon:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',marginRight:12},
    rowText:{flex:1,fontSize:15,fontWeight:'600',color:t.text},
    chipGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
    chip:{paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:t.card,borderWidth:1,borderColor:t.border},
    chips:{flexDirection:'row',gap:8,paddingBottom:4},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:13,color:t.text},
    chipTxtSel:{color:'#fff',fontWeight:'600'},
    converterBtn:{flexDirection:'row',alignItems:'center',gap:12,backgroundColor:t.card,borderRadius:12,padding:16},
    converterBtnTxt:{flex:1,fontSize:15,fontWeight:'600',color:t.text},
    note:{fontSize:13,color:t.subtext,marginBottom:12},
    refreshBtn:{flexDirection:'row',alignItems:'center',backgroundColor:t.primary,borderRadius:12,padding:14,justifyContent:'center',gap:8,marginBottom:14},
    refreshTxt:{color:'#fff',fontWeight:'600',fontSize:14},
    ratesList:{backgroundColor:t.card,borderRadius:12,overflow:'hidden'},
    rateItem:{flexDirection:'row',justifyContent:'space-between',padding:14,borderBottomWidth:1,borderBottomColor:t.border},
    rateCur:{fontSize:14,fontWeight:'600',color:t.text},
    rateVal:{fontSize:14,color:t.subtext},
    menuItem:{flexDirection:'row',alignItems:'center',backgroundColor:t.card,borderRadius:12,padding:16,marginBottom:8},
    menuIcon:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',marginRight:12},
    menuText:{flex:1,fontSize:15,fontWeight:'600',color:t.text},
    statsGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',backgroundColor:t.card,borderRadius:12,padding:16,gap:4},
    statBox:{width:'30%',alignItems:'center',padding:8},
    statVal:{fontSize:22,fontWeight:'800',color:t.primary,marginBottom:4},
    statLbl:{fontSize:11,color:t.subtext,textAlign:'center'},
    clearBtn:{flexDirection:'row',alignItems:'center',gap:10,padding:14,borderRadius:12,borderWidth:1,marginBottom:8},
    clearBtnTxt:{fontSize:14,fontWeight:'700'},
    // Modal
    overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
    modal:{backgroundColor:t.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:22,paddingBottom:40},
    modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
    modalTitle:{fontSize:19,fontWeight:'700',color:t.text},
    lbl:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:8},
    input:{borderWidth:1,borderColor:t.border,borderRadius:12,padding:14,marginBottom:14,fontSize:16,color:t.text,backgroundColor:t.background},
    swapBtn:{flexDirection:'row',alignItems:'center',gap:8,justifyContent:'center',padding:10,marginBottom:14},
    swapBtnTxt:{fontSize:14,color:t.primary,fontWeight:'600'},
    convResult:{alignItems:'center',backgroundColor:t.primary+'18',borderRadius:16,padding:20,marginBottom:14,gap:8},
    convResultFrom:{fontSize:18,fontWeight:'700',color:t.subtext},
    convResultTo:{fontSize:30,fontWeight:'800',color:t.primary},
    convResultRate:{fontSize:13,color:t.subtext,fontStyle:'italic'},
    btn:{padding:15,borderRadius:12,alignItems:'center'},
    btnSave:{backgroundColor:t.primary},
    btnSaveTxt:{fontSize:15,fontWeight:'600',color:'#fff'},
  });
}
