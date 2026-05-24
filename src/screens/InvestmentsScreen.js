import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const INV_TYPES = ['Stocks','Crypto','Mutual Fund','ETF','Bonds','Real Estate','Time Deposit','UITF','Other'];
const CURRENCIES = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','CNY','KRW','PLN'];

export default function InvestmentsScreen() {
  const { appData, saveData, theme } = useContext(AppContext);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Stocks');
  const [invested, setInvested] = useState('');
  const [currentVal, setCurrentVal] = useState('');
  const [currency, setCurrency] = useState(appData.baseCurrency);
  const s = makeStyles(theme);
  const investments = appData.investments||[];

  const fmt = (a,c) => new Intl.NumberFormat('en-PH',{style:'currency',currency:c||appData.baseCurrency}).format(a);

  const totalInvested = investments.reduce((s,i)=>{const r=appData.exchangeRates[i.currency]||1,br=appData.exchangeRates[appData.baseCurrency]||1;return s+(i.invested/r)*br;},0);
  const totalCurrent = investments.reduce((s,i)=>{const r=appData.exchangeRates[i.currency]||1,br=appData.exchangeRates[appData.baseCurrency]||1;return s+(i.currentValue/r)*br;},0);
  const totalGain = totalCurrent - totalInvested;
  const gainPct = totalInvested>0?(totalGain/totalInvested)*100:0;

  const addInvestment = () => {
    if (!name||!invested||!currentVal) { Alert.alert('Error','Fill all fields'); return; }
    const entry = { id:Date.now().toString(), name, type, invested:parseFloat(invested), currentValue:parseFloat(currentVal), currency, createdAt:new Date().toISOString() };
    saveData({ investments:[entry,...investments] });
    setName(''); setType('Stocks'); setInvested(''); setCurrentVal(''); setCurrency(appData.baseCurrency); setModal(false);
  };

  const updateValue = (id, newVal) => {
    saveData({ investments: investments.map(i=>i.id===id?{...i,currentValue:parseFloat(newVal)||i.currentValue}:i) });
  };

  const deleteInv = (id) => Alert.alert('Delete','Remove this investment?',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>saveData({investments:investments.filter(i=>i.id!==id)})}]);

  return (
    <View style={s.container}>
      <ScrollView>
        <View style={s.summaryCard}>
          <View style={s.summRow}>
            <View style={s.summItem}>
              <Text style={s.summLbl}>Total Invested</Text>
              <Text style={s.summVal}>{fmt(totalInvested)}</Text>
            </View>
            <View style={s.summItem}>
              <Text style={s.summLbl}>Current Value</Text>
              <Text style={[s.summVal,{color:theme.success}]}>{fmt(totalCurrent)}</Text>
            </View>
          </View>
          <View style={s.gainRow}>
            <Ionicons name={totalGain>=0?'trending-up':'trending-down'} size={20} color={totalGain>=0?theme.success:theme.danger}/>
            <Text style={[s.gainTxt,{color:totalGain>=0?theme.success:theme.danger}]}>
              {totalGain>=0?'+':''}{fmt(totalGain)} ({gainPct.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {investments.map(inv=>{
          const gain = inv.currentValue - inv.invested;
          const pct = inv.invested>0?(gain/inv.invested)*100:0;
          return (
            <View key={inv.id} style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.typeBadge,{backgroundColor:theme.primary+'22'}]}>
                  <Text style={[s.typeTxt,{color:theme.primary}]}>{inv.type}</Text>
                </View>
                <TouchableOpacity onPress={()=>deleteInv(inv.id)}><Ionicons name="trash-outline" size={18} color={theme.danger}/></TouchableOpacity>
              </View>
              <Text style={s.invName}>{inv.name}</Text>
              <View style={s.invRow}>
                <View><Text style={s.invLbl}>Invested</Text><Text style={s.invVal}>{fmt(inv.invested,inv.currency)}</Text></View>
                <Ionicons name="arrow-forward" size={16} color={theme.subtext}/>
                <View><Text style={s.invLbl}>Current</Text><Text style={[s.invVal,{color:gain>=0?theme.success:theme.danger}]}>{fmt(inv.currentValue,inv.currency)}</Text></View>
                <View><Text style={s.invLbl}>Gain/Loss</Text><Text style={[s.invVal,{color:gain>=0?theme.success:theme.danger}]}>{gain>=0?'+':''}{pct.toFixed(1)}%</Text></View>
              </View>
            </View>
          );
        })}

        {investments.length===0&&(
          <View style={s.empty}><Ionicons name="bar-chart-outline" size={64} color={theme.border}/><Text style={s.emptyTxt}>No investments yet</Text></View>
        )}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={()=>setModal(true)}>
        <Ionicons name="add" size={28} color="#fff"/>
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent>
        <View style={s.overlay}><ScrollView><View style={s.modal}>
          <Text style={s.modalTitle}>Add Investment</Text>
          <Text style={s.lbl}>Name</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="e.g. AYALA Corp Stock" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Type</Text>
          <View style={s.chips}>{INV_TYPES.map(t=><TouchableOpacity key={t} style={[s.chip,type===t&&s.chipSel]} onPress={()=>setType(t)}><Text style={[s.chipTxt,type===t&&s.chipTxtSel]}>{t}</Text></TouchableOpacity>)}</View>
          <Text style={s.lbl}>Amount Invested</Text>
          <TextInput style={s.input} value={invested} onChangeText={setInvested} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Current Value</Text>
          <TextInput style={s.input} value={currentVal} onChangeText={setCurrentVal} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Currency</Text>
          <View style={s.chips}>{CURRENCIES.map(c=><TouchableOpacity key={c} style={[s.chip,currency===c&&s.chipSel]} onPress={()=>setCurrency(c)}><Text style={[s.chipTxt,currency===c&&s.chipTxtSel]}>{c}</Text></TouchableOpacity>)}</View>
          <View style={s.row}>
            <TouchableOpacity style={[s.btn,s.btnCancel]} onPress={()=>setModal(false)}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,s.btnSave]} onPress={addInvestment}><Text style={s.btnSaveTxt}>Add</Text></TouchableOpacity>
          </View>
        </View></ScrollView></View>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    summaryCard:{margin:18,padding:20,backgroundColor:t.card,borderRadius:16,elevation:2},
    summRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:14,paddingBottom:14,borderBottomWidth:1,borderBottomColor:t.border},
    summItem:{},
    summLbl:{fontSize:12,color:t.subtext,marginBottom:4},
    summVal:{fontSize:20,fontWeight:'700',color:t.text},
    gainRow:{flexDirection:'row',alignItems:'center',gap:8},
    gainTxt:{fontSize:18,fontWeight:'700'},
    card:{margin:18,marginTop:0,padding:18,backgroundColor:t.card,borderRadius:14,elevation:1},
    cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10},
    typeBadge:{paddingHorizontal:10,paddingVertical:4,borderRadius:8},
    typeTxt:{fontSize:12,fontWeight:'700'},
    invName:{fontSize:17,fontWeight:'700',color:t.text,marginBottom:14},
    invRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
    invLbl:{fontSize:11,color:t.subtext,marginBottom:4},
    invVal:{fontSize:14,fontWeight:'700',color:t.text},
    fab:{position:'absolute',right:20,bottom:20,width:56,height:56,borderRadius:28,backgroundColor:t.primary,alignItems:'center',justifyContent:'center',elevation:8},
    empty:{alignItems:'center',paddingVertical:60},
    emptyTxt:{fontSize:16,color:t.subtext,marginTop:16,fontWeight:'600'},
    overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.55)',justifyContent:'flex-end'},
    modal:{backgroundColor:t.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:40},
    modalTitle:{fontSize:19,fontWeight:'700',color:t.text,marginBottom:16},
    lbl:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:8},
    input:{borderWidth:1,borderColor:t.border,borderRadius:12,padding:14,marginBottom:14,fontSize:16,color:t.text,backgroundColor:t.background},
    chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:14},
    chip:{paddingHorizontal:13,paddingVertical:7,borderRadius:20,backgroundColor:t.background,borderWidth:1,borderColor:t.border},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:13,color:t.text},
    chipTxtSel:{color:'#fff',fontWeight:'600'},
    row:{flexDirection:'row',gap:12,marginTop:8},
    btn:{flex:1,padding:15,borderRadius:12,alignItems:'center'},
    btnCancel:{backgroundColor:t.light},
    btnCancelTxt:{fontSize:15,fontWeight:'600',color:t.subtext},
    btnSave:{backgroundColor:t.primary},
    btnSaveTxt:{fontSize:15,fontWeight:'600',color:'#fff'},
  });
}
