import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const ACCOUNT_TYPES = ['savings','checking','cash','investment','credit','e-wallet'];
const CURRENCIES    = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','CNY','KRW','PLN'];

export default function AddAccountScreen({ navigation }) {
  const { appData, saveData, theme } = useContext(AppContext);
  const s = makeStyles(theme);

  const [name, setName]             = useState('');
  const [balance, setBalance]       = useState('');
  const [type, setType]             = useState('savings');
  const [currency, setCurrency]     = useState(appData.baseCurrency);
  const [bank, setBank]             = useState('');
  const [fundFromPool, setFundFromPool] = useState(true);
  // Initial sub-accounts
  const [subs, setSubs]             = useState([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubPurpose, setNewSubPurpose] = useState('');

  const toBase = (a,c) => { const r=appData.exchangeRates[c]||1, br=appData.exchangeRates[appData.baseCurrency]||1; return (a/r)*br; };
  const fmtBase= (a)   => new Intl.NumberFormat('en-PH',{style:'currency',currency:appData.baseCurrency}).format(a);
  const fmt    = (a,c) => new Intl.NumberFormat('en-PH',{style:'currency',currency:c||appData.baseCurrency}).format(a);

  const totalIncome = (appData.incomes||[]).reduce((s,i)=>s+toBase(i.amount,i.currency),0);
  const totalOut    = (appData.transfers||[]).reduce((s,t)=>s+toBase(t.amount,t.currency),0);
  const incomePool  = totalIncome - totalOut;

  const parsedBal   = parseFloat(balance)||0;
  const balInBase   = toBase(parsedBal, currency);
  const poolAfter   = incomePool - balInBase;

  const addSub = () => {
    if (!newSubName.trim()) { Alert.alert('Error','Enter sub-account name'); return; }
    setSubs(prev => [...prev, { id:Date.now().toString(), name:newSubName.trim(), purpose:newSubPurpose.trim(), balance:0, currency }]);
    setNewSubName(''); setNewSubPurpose('');
  };
  const removeSub = (id) => setSubs(prev => prev.filter(s=>s.id!==id));

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Error','Enter account name'); return; }
    const bal = parseFloat(balance)||0;
    if (fundFromPool && bal > 0 && balInBase > incomePool+0.01) {
      Alert.alert('Insufficient Pool',`Only ${fmtBase(incomePool)} available.\n\nCreate with ₱0 instead?`,[
        {text:'Cancel',style:'cancel'},
        {text:'Create with 0',onPress:()=>createAccount(0,false)},
      ]);
      return;
    }
    createAccount(bal, fundFromPool && bal > 0);
  };

  const createAccount = (bal, deduct) => {
    const acc = { id:Date.now().toString(), name:name.trim(), balance:bal, type, currency, bank:bank.trim(), createdAt:new Date().toISOString(), subAccounts:subs };
    let updTransfers = appData.transfers||[];
    if (deduct && bal > 0) {
      updTransfers = [...updTransfers, { id:Date.now().toString()+'_init', amount:bal, currency, toAccount:name.trim(), note:`Initial funding for ${name.trim()}`, date:new Date().toISOString().split('T')[0] }];
    }
    saveData({ accounts:[...appData.accounts, acc], transfers:updTransfers });
    navigation.goBack();
  };

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">

      {/* Pool banner */}
      <View style={s.poolBanner}>
        <Ionicons name="cash-outline" size={16} color={theme.primary}/>
        <View style={{flex:1}}>
          <Text style={s.poolLbl}>Income Pool Available</Text>
          <Text style={[s.poolVal,{color:incomePool>=0?theme.success:theme.danger}]}>{fmtBase(incomePool)}</Text>
        </View>
      </View>

      {/* ── Fields ── */}
      <View style={s.section}>
        <Text style={s.lbl}>Account Name *</Text>
        <TextInput style={s.input} placeholder="e.g. BDO Savings" value={name} onChangeText={setName} placeholderTextColor={theme.subtext}/>
        <Text style={s.lbl}>Bank / Institution</Text>
        <TextInput style={s.input} placeholder="e.g. BDO, BPI, GCash" value={bank} onChangeText={setBank} placeholderTextColor={theme.subtext}/>
        <Text style={s.lbl}>Opening Balance</Text>
        <TextInput style={s.input} placeholder="0.00" value={balance} onChangeText={setBalance} keyboardType="numeric" placeholderTextColor={theme.subtext}/>
        {parsedBal>0 && currency!==appData.baseCurrency && <Text style={s.convNote}>≈ {fmtBase(balInBase)}</Text>}
      </View>

      {/* Funding source */}
      {parsedBal > 0 && (
        <View style={s.section}>
          <Text style={s.lbl}>Funding Source</Text>
          {[
            {val:true,  title:'From Income Pool', sub:`Deducts ${fmtBase(balInBase)} · Pool after: ${fmtBase(poolAfter)}`, icon:'trending-up'},
            {val:false, title:'External / Existing', sub:'Money already in the account (no deduction)', icon:'add-circle-outline'},
          ].map(opt=>(
            <TouchableOpacity key={String(opt.val)} style={[s.fundOpt,fundFromPool===opt.val&&s.fundOptSel]} onPress={()=>setFundFromPool(opt.val)}>
              <Ionicons name={opt.icon} size={18} color={fundFromPool===opt.val?'#fff':theme.subtext}/>
              <View style={{flex:1}}>
                <Text style={[s.fundOptTitle,fundFromPool===opt.val&&{color:'#fff'}]}>{opt.title}</Text>
                <Text style={[s.fundOptSub,fundFromPool===opt.val&&{color:'rgba(255,255,255,0.8)'}]}>{opt.sub}</Text>
              </View>
              {fundFromPool===opt.val&&<Ionicons name="checkmark-circle" size={18} color="#fff"/>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Account type */}
      <View style={s.section}>
        <Text style={s.lbl}>Account Type</Text>
        <View style={s.chipGrid}>
          {ACCOUNT_TYPES.map(t=>(
            <TouchableOpacity key={t} style={[s.chip,type===t&&s.chipSel]} onPress={()=>setType(t)}>
              <Text style={[s.chipTxt,type===t&&s.chipTxtSel]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Currency */}
      <View style={s.section}>
        <Text style={s.lbl}>Currency</Text>
        <View style={s.chipGrid}>
          {CURRENCIES.map(c=>(
            <TouchableOpacity key={c} style={[s.chip,currency===c&&s.chipSel]} onPress={()=>setCurrency(c)}>
              <Text style={[s.chipTxt,currency===c&&s.chipTxtSel]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Sub-accounts ── */}
      <View style={s.section}>
        <Text style={s.lbl}>Sub-accounts <Text style={s.opt}>(optional)</Text></Text>
        <Text style={s.sublbl}>e.g. BDO House, BDO Med Payments</Text>

        {subs.map(sub=>(
          <View key={sub.id} style={s.subRow}>
            <View style={s.subDot}/>
            <View style={{flex:1}}>
              <Text style={s.subName}>{sub.name}</Text>
              {sub.purpose?<Text style={s.subPurpose}>{sub.purpose}</Text>:null}
            </View>
            <TouchableOpacity onPress={()=>removeSub(sub.id)}>
              <Ionicons name="close-circle" size={18} color={theme.danger}/>
            </TouchableOpacity>
          </View>
        ))}

        <View style={s.addSubBox}>
          <TextInput style={[s.input,{marginBottom:8}]} placeholder="Sub-account name" value={newSubName} onChangeText={setNewSubName} placeholderTextColor={theme.subtext}/>
          <TextInput style={[s.input,{marginBottom:8}]} placeholder="Purpose (optional)" value={newSubPurpose} onChangeText={setNewSubPurpose} placeholderTextColor={theme.subtext}/>
          <TouchableOpacity style={s.addSubBtn} onPress={addSub}>
            <Ionicons name="add" size={15} color={theme.primary}/>
            <Text style={s.addSubBtnTxt}>Add Sub-account</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
        <Text style={s.saveBtnTxt}>Add Account</Text>
      </TouchableOpacity>
      <View style={{height:40}}/>
    </ScrollView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    poolBanner:{flexDirection:'row',alignItems:'center',gap:12,margin:16,marginBottom:4,padding:14,backgroundColor:t.primary+'18',borderRadius:12,borderWidth:1,borderColor:t.primary+'30'},
    poolLbl:{fontSize:11,color:t.subtext,marginBottom:2},
    poolVal:{fontSize:17,fontWeight:'800'},
    section:{padding:16,paddingBottom:0},
    lbl:{fontSize:12,fontWeight:'700',color:t.text,marginBottom:8,textTransform:'uppercase',letterSpacing:0.3},
    opt:{fontWeight:'400',color:t.subtext,textTransform:'none'},
    sublbl:{fontSize:11,color:t.subtext,marginBottom:10,marginTop:-6},
    input:{borderWidth:1,borderColor:t.border,borderRadius:10,padding:12,fontSize:15,color:t.text,backgroundColor:t.card},
    convNote:{fontSize:11,color:t.subtext,marginTop:4,marginBottom:8,fontStyle:'italic'},
    fundOpt:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:12,borderWidth:1.5,borderColor:t.border,backgroundColor:t.card,marginBottom:8},
    fundOptSel:{backgroundColor:t.primary,borderColor:t.primary},
    fundOptTitle:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:2},
    fundOptSub:{fontSize:11,color:t.subtext},
    chipGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
    chip:{paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:t.card,borderWidth:1,borderColor:t.border},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:13,color:t.text},
    chipTxtSel:{color:'#fff',fontWeight:'600'},
    subRow:{flexDirection:'row',alignItems:'center',backgroundColor:t.card,borderRadius:10,padding:10,marginBottom:7,gap:8},
    subDot:{width:8,height:8,borderRadius:4,backgroundColor:t.primary},
    subName:{fontSize:13,fontWeight:'600',color:t.text},
    subPurpose:{fontSize:11,color:t.subtext,marginTop:1},
    addSubBox:{backgroundColor:t.background,borderRadius:10,borderWidth:1,borderColor:t.border,padding:12,marginTop:4},
    addSubBtn:{flexDirection:'row',alignItems:'center',gap:6,justifyContent:'center',paddingVertical:8,borderRadius:8,borderWidth:1,borderColor:t.primary},
    addSubBtnTxt:{fontSize:13,color:t.primary,fontWeight:'600'},
    saveBtn:{margin:16,backgroundColor:t.primary,padding:16,borderRadius:14,alignItems:'center'},
    saveBtnTxt:{fontSize:16,fontWeight:'700',color:'#fff'},
  });
}
