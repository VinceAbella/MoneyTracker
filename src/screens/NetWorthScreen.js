import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

export default function NetWorthScreen() {
  const { appData, saveData, theme } = useContext(AppContext);
  const [modal, setModal] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [value, setValue] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const s = makeStyles(theme);

  const fmt = (a) => new Intl.NumberFormat('en-PH',{style:'currency',currency:appData.baseCurrency}).format(a);

  const currentNW = appData.accounts.reduce((sum,acc)=>{
    const r=appData.exchangeRates[acc.currency]||1,br=appData.exchangeRates[appData.baseCurrency]||1;
    return sum+(acc.balance/r)*br;
  },0) - (appData.loans||[]).reduce((sum,l)=>{
    const r=appData.exchangeRates[l.currency]||1,br=appData.exchangeRates[appData.baseCurrency]||1;
    return sum+(l.remaining/r)*br;
  },0);

  const addEntry = () => {
    if (!value||isNaN(parseFloat(value))) { Alert.alert('Error','Enter valid value'); return; }
    const entries = [...(appData.netWorth||[]),{id:Date.now().toString(),date,value:parseFloat(value)}]
      .sort((a,b)=>new Date(a.date)-new Date(b.date));
    saveData({netWorth:entries});
    setValue(''); setModal(false);
  };

  const sorted = [...(appData.netWorth||[])].sort((a,b)=>sortAsc?new Date(a.date)-new Date(b.date):new Date(b.date)-new Date(a.date));

  return (
    <View style={s.container}>
      <ScrollView>
        <View style={s.currentCard}>
          <Text style={s.currentLbl}>Current Net Worth</Text>
          <Text style={[s.currentVal,{color:currentNW>=0?theme.success:theme.danger}]}>{fmt(currentNW)}</Text>
          <View style={s.breakdown}>
            <View style={s.bItem}>
              <Text style={s.bLbl}>Assets</Text>
              <Text style={[s.bVal,{color:theme.success}]}>{fmt(appData.accounts.reduce((s,a)=>{const r=appData.exchangeRates[a.currency]||1,br=appData.exchangeRates[appData.baseCurrency]||1;return s+(a.balance/r)*br;},0))}</Text>
            </View>
            <Text style={s.minus}>−</Text>
            <View style={s.bItem}>
              <Text style={s.bLbl}>Liabilities</Text>
              <Text style={[s.bVal,{color:theme.danger}]}>{fmt((appData.loans||[]).reduce((s,l)=>{const r=appData.exchangeRates[l.currency]||1,br=appData.exchangeRates[appData.baseCurrency]||1;return s+(l.remaining/r)*br;},0))}</Text>
            </View>
          </View>
        </View>

        <View style={s.histHeader}>
          <Text style={s.histTitle}>History</Text>
          <TouchableOpacity style={s.sortBtn} onPress={()=>setSortAsc(!sortAsc)}>
            <Ionicons name={sortAsc?'arrow-up':'arrow-down'} size={16} color={theme.primary}/>
            <Text style={s.sortTxt}>{sortAsc?'Oldest First':'Newest First'}</Text>
          </TouchableOpacity>
        </View>

        {sorted.map(entry=>(
          <View key={entry.id} style={s.histCard}>
            <View>
              <Text style={s.histDate}>{new Date(entry.date).toLocaleDateString()}</Text>
              <Text style={[s.histVal,{color:entry.value>=0?theme.success:theme.danger}]}>{fmt(entry.value)}</Text>
            </View>
            <TouchableOpacity onPress={()=>Alert.alert('Delete','Remove this entry?',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>saveData({netWorth:(appData.netWorth||[]).filter(e=>e.id!==entry.id)})}])}>
              <Ionicons name="trash-outline" size={18} color={theme.danger}/>
            </TouchableOpacity>
          </View>
        ))}
        {(!appData.netWorth||appData.netWorth.length===0)&&(
          <View style={s.empty}><Ionicons name="trending-up-outline" size={64} color={theme.border}/><Text style={s.emptyTxt}>No history yet</Text></View>
        )}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={()=>setModal(true)}><Ionicons name="add" size={28} color="#fff"/></TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}>
          <Text style={s.modalTitle}>Add Net Worth Entry</Text>
          <Text style={s.lbl}>Date (YYYY-MM-DD)</Text>
          <TextInput style={s.input} value={date} onChangeText={setDate} placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Net Worth Value</Text>
          <TextInput style={s.input} value={value} onChangeText={setValue} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.subtext}/>
          <View style={s.row}>
            <TouchableOpacity style={[s.btn,s.btnCancel]} onPress={()=>setModal(false)}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,s.btnSave]} onPress={addEntry}><Text style={s.btnSaveTxt}>Add Entry</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    currentCard:{margin:18,padding:20,backgroundColor:t.card,borderRadius:16,elevation:2,alignItems:'center'},
    currentLbl:{fontSize:14,color:t.subtext,marginBottom:8},
    currentVal:{fontSize:36,fontWeight:'800',marginBottom:16},
    breakdown:{flexDirection:'row',alignItems:'center',gap:16},
    bItem:{alignItems:'center'},
    bLbl:{fontSize:12,color:t.subtext,marginBottom:4},
    bVal:{fontSize:15,fontWeight:'700'},
    minus:{fontSize:20,color:t.subtext,fontWeight:'300'},
    histHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:18,marginBottom:12},
    histTitle:{fontSize:17,fontWeight:'700',color:t.text},
    sortBtn:{flexDirection:'row',alignItems:'center',gap:4,backgroundColor:t.primary+'22',paddingHorizontal:12,paddingVertical:6,borderRadius:20},
    sortTxt:{fontSize:12,color:t.primary,fontWeight:'600'},
    histCard:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:t.card,borderRadius:12,padding:16,marginHorizontal:18,marginBottom:8,elevation:1},
    histDate:{fontSize:13,color:t.subtext,marginBottom:4},
    histVal:{fontSize:18,fontWeight:'700'},
    fab:{position:'absolute',right:20,bottom:20,width:56,height:56,borderRadius:28,backgroundColor:t.primary,alignItems:'center',justifyContent:'center',elevation:8},
    empty:{alignItems:'center',paddingVertical:60},
    emptyTxt:{fontSize:16,color:t.subtext,marginTop:16,fontWeight:'600'},
    overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.55)',justifyContent:'flex-end'},
    modal:{backgroundColor:t.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:40},
    modalTitle:{fontSize:19,fontWeight:'700',color:t.text,marginBottom:16},
    lbl:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:8},
    input:{borderWidth:1,borderColor:t.border,borderRadius:12,padding:14,marginBottom:14,fontSize:16,color:t.text,backgroundColor:t.background},
    row:{flexDirection:'row',gap:12,marginTop:4},
    btn:{flex:1,padding:15,borderRadius:12,alignItems:'center'},
    btnCancel:{backgroundColor:t.light},
    btnCancelTxt:{fontSize:15,fontWeight:'600',color:t.subtext},
    btnSave:{backgroundColor:t.primary},
    btnSaveTxt:{fontSize:15,fontWeight:'600',color:'#fff'},
  });
}
