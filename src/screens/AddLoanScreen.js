import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { AppContext } from '../../App';

const CURRENCIES = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','PLN'];

export default function AddLoanScreen({ navigation }) {
  const { appData, saveData, theme } = useContext(AppContext);
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [amount, setAmount] = useState('');
  const [remaining, setRemaining] = useState('');
  const [rate, setRate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState(appData.baseCurrency);
  const s = makeStyles(theme);

  const save = () => {
    if (!name||!amount||!remaining||!dueDate) { Alert.alert('Error','Fill required fields'); return; }
    saveData({loans:[...(appData.loans||[]),{id:Date.now().toString(),name,lender,amount:parseFloat(amount),remaining:parseFloat(remaining),interestRate:parseFloat(rate)||0,dueDate,currency,createdAt:new Date().toISOString()}]});
    navigation.goBack();
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.section}><Text style={s.lbl}>Loan Name *</Text><TextInput style={s.input} placeholder="e.g. Car Loan" value={name} onChangeText={setName} placeholderTextColor={theme.subtext}/></View>
      <View style={s.section}><Text style={s.lbl}>Lender</Text><TextInput style={s.input} placeholder="e.g. BDO, SSS, Friend" value={lender} onChangeText={setLender} placeholderTextColor={theme.subtext}/></View>
      <View style={s.section}><Text style={s.lbl}>Original Amount *</Text><TextInput style={s.input} placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholderTextColor={theme.subtext}/></View>
      <View style={s.section}><Text style={s.lbl}>Remaining Balance *</Text><TextInput style={s.input} placeholder="0.00" value={remaining} onChangeText={setRemaining} keyboardType="numeric" placeholderTextColor={theme.subtext}/></View>
      <View style={s.section}><Text style={s.lbl}>Annual Interest Rate (%)</Text><TextInput style={s.input} placeholder="e.g. 5.5" value={rate} onChangeText={setRate} keyboardType="numeric" placeholderTextColor={theme.subtext}/></View>
      <View style={s.section}><Text style={s.lbl}>Due Date * (YYYY-MM-DD)</Text><TextInput style={s.input} placeholder="2026-12-31" value={dueDate} onChangeText={setDueDate} placeholderTextColor={theme.subtext}/></View>
      <View style={s.section}><Text style={s.lbl}>Currency</Text><View style={s.chips}>{CURRENCIES.map(c=><TouchableOpacity key={c} style={[s.chip,currency===c&&s.chipSel]} onPress={()=>setCurrency(c)}><Text style={[s.chipTxt,currency===c&&s.chipTxtSel]}>{c}</Text></TouchableOpacity>)}</View></View>
      <TouchableOpacity style={s.saveBtn} onPress={save}><Text style={s.saveTxt}>Add Loan</Text></TouchableOpacity>
    </ScrollView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    section:{padding:18,paddingBottom:0},
    lbl:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:10},
    input:{backgroundColor:t.card,borderWidth:1,borderColor:t.border,borderRadius:12,padding:14,fontSize:16,color:t.text},
    chips:{flexDirection:'row',flexWrap:'wrap',gap:8},
    chip:{paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:t.card,borderWidth:1,borderColor:t.border},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:13,color:t.text},
    chipTxtSel:{color:'#fff',fontWeight:'600'},
    saveBtn:{margin:18,backgroundColor:t.primary,padding:18,borderRadius:16,alignItems:'center'},
    saveTxt:{fontSize:17,fontWeight:'700',color:'#fff'},
  });
}
