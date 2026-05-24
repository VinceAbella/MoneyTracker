import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const ACCOUNT_TYPES = ['savings','checking','cash','investment','credit','e-wallet'];
const CURRENCIES    = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','CNY','KRW','PLN'];

export default function AddAccountScreen({ navigation }) {
  const { appData, saveData, theme } = useContext(AppContext);
  const s = makeStyles(theme);

  // Main account fields
  const [name, setName]         = useState('');
  const [balance, setBalance]   = useState('');
  const [type, setType]         = useState('savings');
  const [currency, setCurrency] = useState(appData.baseCurrency);
  const [bank, setBank]         = useState('');
  const [fundFromPool, setFundFromPool] = useState(true);

  // Custom rate for main account
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRate, setCustomRate]       = useState('');

  // Sub-accounts list
  const [subs, setSubs]               = useState([]);
  // New sub-account form fields
  const [newSubName, setNewSubName]         = useState('');
  const [newSubPurpose, setNewSubPurpose]   = useState('');
  const [newSubBalance, setNewSubBalance]   = useState('');
  const [newSubCurrency, setNewSubCurrency] = useState(appData.baseCurrency);
  const [newSubUseRate, setNewSubUseRate]   = useState(false);
  const [newSubRate, setNewSubRate]         = useState('');

  const toBase  = (a,c) => { const r=appData.exchangeRates[c]||1, br=appData.exchangeRates[appData.baseCurrency]||1; return (a/r)*br; };
  const fmtBase = (a)   => new Intl.NumberFormat('en-PH',{style:'currency',currency:appData.baseCurrency}).format(a);
  const fmt     = (a,c) => new Intl.NumberFormat('en-PH',{style:'currency',currency:c||appData.baseCurrency}).format(a);
  const getLiveRate = (c) => c===appData.baseCurrency ? null : ((appData.exchangeRates[appData.baseCurrency]||1)/(appData.exchangeRates[c]||1)).toFixed(4);

  const totalIncome = (appData.incomes||[]).reduce((s,i)=>s+toBase(i.amount,i.currency),0);
  const totalOut    = (appData.transfers||[]).reduce((s,t)=>s+toBase(t.amount,t.currency),0);
  const incomePool  = totalIncome - totalOut;

  const parsedBal = parseFloat(balance)||0;
  const balInBase = toBase(parsedBal, currency);
  const poolAfter = incomePool - balInBase;
  const liveRate  = getLiveRate(currency);

  // Add a sub-account to the list
  const addSub = () => {
    if (!newSubName.trim()) { Alert.alert('Error','Enter sub-account name'); return; }
    setSubs(prev => [...prev, {
      id: Date.now().toString(),
      name: newSubName.trim(),
      purpose: newSubPurpose.trim(),
      balance: parseFloat(newSubBalance)||0,
      currency: newSubCurrency,
      customRate: newSubUseRate && parseFloat(newSubRate)>0 ? parseFloat(newSubRate) : null,
    }]);
    // Reset sub form
    setNewSubName(''); setNewSubPurpose(''); setNewSubBalance('');
    setNewSubCurrency(appData.baseCurrency); setNewSubUseRate(false); setNewSubRate('');
  };

  const removeSub = (id) => setSubs(prev => prev.filter(s=>s.id!==id));

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Error','Enter account name'); return; }
    if (fundFromPool && parsedBal > 0 && balInBase > incomePool+0.01) {
      Alert.alert(
        'Insufficient Pool',
        `Only ${fmtBase(incomePool)} available.\n\nCreate with ₱0 instead?`,
        [
          { text:'Cancel', style:'cancel' },
          { text:'Create with 0', onPress:()=>createAccount(0,false) },
        ]
      );
      return;
    }
    createAccount(parsedBal, fundFromPool && parsedBal > 0);
  };

  const createAccount = (bal, deduct) => {
    const acc = {
      id: Date.now().toString(),
      name: name.trim(),
      balance: bal,
      type, currency,
      bank: bank.trim(),
      createdAt: new Date().toISOString(),
      subAccounts: subs,
      customRate: useCustomRate && parseFloat(customRate)>0 ? parseFloat(customRate) : null,
    };
    let updTransfers = appData.transfers||[];
    if (deduct && bal > 0) {
      updTransfers = [...updTransfers, {
        id: Date.now().toString()+'_init',
        amount: bal, currency,
        toAccount: name.trim(),
        note: `Initial funding for ${name.trim()}`,
        date: new Date().toISOString().split('T')[0],
      }];
    }
    saveData({ accounts:[...appData.accounts, acc], transfers:updTransfers });
    navigation.goBack();
  };

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">

      {/* Pool availability banner */}
      <View style={s.poolBanner}>
        <Ionicons name="cash-outline" size={16} color={theme.primary}/>
        <View style={{flex:1}}>
          <Text style={s.poolLbl}>Income Pool Available</Text>
          <Text style={[s.poolVal,{color:incomePool>=0?theme.success:theme.danger}]}>{fmtBase(incomePool)}</Text>
        </View>
      </View>

      {/* ── Main Account Fields ── */}
      <View style={s.section}>
        <Text style={s.lbl}>Account Name *</Text>
        <TextInput style={s.input} placeholder="e.g. BDO Savings" value={name} onChangeText={setName} placeholderTextColor={theme.subtext}/>

        <Text style={s.lbl}>Bank / Institution</Text>
        <TextInput style={s.input} placeholder="e.g. BDO, BPI, GCash" value={bank} onChangeText={setBank} placeholderTextColor={theme.subtext}/>

        <Text style={s.lbl}>Opening Balance</Text>
        <TextInput style={s.input} placeholder="0.00" value={balance} onChangeText={setBalance} keyboardType="numeric" placeholderTextColor={theme.subtext}/>
        {parsedBal>0 && currency!==appData.baseCurrency && <Text style={s.convNote}>≈ {fmtBase(balInBase)}</Text>}
      </View>

      {/* Funding source — only if balance > 0 */}
      {parsedBal > 0 && (
        <View style={s.section}>
          <Text style={s.lbl}>Funding Source</Text>
          {[
            { val:true,  title:'From Income Pool', sub:`Deducts ${fmtBase(balInBase)} · Pool after: ${fmtBase(poolAfter)}`, icon:'trending-up' },
            { val:false, title:'External / Existing', sub:'Money already in this account (no pool deduction)', icon:'add-circle-outline' },
          ].map(opt=>(
            <TouchableOpacity key={String(opt.val)} style={[s.fundOpt,fundFromPool===opt.val&&s.fundOptSel]} onPress={()=>setFundFromPool(opt.val)}>
              <Ionicons name={opt.icon} size={17} color={fundFromPool===opt.val?'#fff':theme.subtext}/>
              <View style={{flex:1}}>
                <Text style={[s.fundOptTitle,fundFromPool===opt.val&&{color:'#fff'}]}>{opt.title}</Text>
                <Text style={[s.fundOptSub,fundFromPool===opt.val&&{color:'rgba(255,255,255,0.8)'}]}>{opt.sub}</Text>
              </View>
              {fundFromPool===opt.val&&<Ionicons name="checkmark-circle" size={17} color="#fff"/>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Account Type */}
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
            <TouchableOpacity key={c} style={[s.chip,currency===c&&s.chipSel]} onPress={()=>{setCurrency(c);setUseCustomRate(false);setCustomRate('');}}>
              <Text style={[s.chipTxt,currency===c&&s.chipTxtSel]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Custom Rate — only if foreign currency */}
      {currency !== appData.baseCurrency && (
        <View style={s.section}>
          <TouchableOpacity style={[s.rateToggle,useCustomRate&&s.rateToggleOn]} onPress={()=>setUseCustomRate(!useCustomRate)}>
            <Ionicons name={useCustomRate?'checkmark-circle':'radio-button-off'} size={17} color={useCustomRate?'#fff':theme.subtext}/>
            <View style={{flex:1}}>
              <Text style={[s.rateToggleTitle,useCustomRate&&{color:'#fff'}]}>Custom exchange rate</Text>
              {liveRate&&<Text style={[s.rateToggleSub,useCustomRate&&{color:'rgba(255,255,255,0.8)'}]}>Live: 1 {currency} = {liveRate} {appData.baseCurrency}</Text>}
            </View>
          </TouchableOpacity>
          {useCustomRate && (
            <View style={s.rateInputBox}>
              <Text style={s.lbl}>1 {currency} = ? {appData.baseCurrency}</Text>
              <TextInput style={s.input} value={customRate} onChangeText={setCustomRate} keyboardType="numeric" placeholder={liveRate||'0.0000'} placeholderTextColor={theme.subtext}/>
              {parsedBal>0&&parseFloat(customRate)>0&&<Text style={[s.convNote,{color:theme.warning}]}>= {fmtBase(parsedBal*parseFloat(customRate))}</Text>}
            </View>
          )}
        </View>
      )}

      {/* ── Sub-accounts ── */}
      <View style={s.section}>
        <Text style={s.lbl}>Sub-accounts <Text style={s.opt}>(optional)</Text></Text>
        <Text style={s.sublbl}>e.g. "BDO House Fund", "BDO Med Payments"</Text>

        {/* Existing subs */}
        {subs.map(sub=>(
          <View key={sub.id} style={s.subChip}>
            <View style={[s.subDot,{backgroundColor:theme.primary}]}/>
            <View style={{flex:1}}>
              <Text style={s.subChipName}>{sub.name}</Text>
              <Text style={s.subChipMeta}>
                {fmt(sub.balance,sub.currency)}
                {sub.purpose?` · ${sub.purpose}`:''}
                {sub.customRate?' · custom rate':''}
              </Text>
            </View>
            <TouchableOpacity onPress={()=>removeSub(sub.id)} style={{padding:4}}>
              <Ionicons name="close-circle" size={18} color={theme.danger}/>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add sub form */}
        <View style={s.addSubBox}>
          <Text style={s.addSubBoxTitle}>Add Sub-account</Text>

          <Text style={s.lbl}>Name *</Text>
          <TextInput style={s.input} placeholder="e.g. BDO House Fund" value={newSubName} onChangeText={setNewSubName} placeholderTextColor={theme.subtext}/>

          <Text style={s.lbl}>Purpose <Text style={s.opt}>(optional)</Text></Text>
          <TextInput style={s.input} placeholder="e.g. Monthly mortgage" value={newSubPurpose} onChangeText={setNewSubPurpose} placeholderTextColor={theme.subtext}/>

          <Text style={s.lbl}>Allocated Balance</Text>
          <TextInput style={s.input} placeholder="0.00" value={newSubBalance} onChangeText={setNewSubBalance} keyboardType="numeric" placeholderTextColor={theme.subtext}/>

          <Text style={s.lbl}>Currency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
            <View style={s.chips}>
              {CURRENCIES.map(c=>(
                <TouchableOpacity key={c} style={[s.chip,newSubCurrency===c&&s.chipSel]} onPress={()=>{setNewSubCurrency(c);setNewSubUseRate(false);setNewSubRate('');}}>
                  <Text style={[s.chipTxt,newSubCurrency===c&&s.chipTxtSel]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Custom rate for sub */}
          {newSubCurrency !== appData.baseCurrency && (
            <>
              <TouchableOpacity style={[s.rateToggle,newSubUseRate&&s.rateToggleOn,{marginBottom:8}]} onPress={()=>setNewSubUseRate(!newSubUseRate)}>
                <Ionicons name={newSubUseRate?'checkmark-circle':'radio-button-off'} size={16} color={newSubUseRate?'#fff':theme.subtext}/>
                <Text style={[s.rateToggleTitle,newSubUseRate&&{color:'#fff'}]}>Custom rate for this sub-account</Text>
              </TouchableOpacity>
              {newSubUseRate && (
                <TextInput style={[s.input,{marginBottom:8}]} value={newSubRate} onChangeText={setNewSubRate} keyboardType="numeric" placeholder={`1 ${newSubCurrency} = ? ${appData.baseCurrency}`} placeholderTextColor={theme.subtext}/>
              )}
            </>
          )}

          <TouchableOpacity style={s.addSubBtn} onPress={addSub}>
            <Ionicons name="add" size={16} color={theme.primary}/>
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
    sublbl:{fontSize:11,color:t.subtext,marginBottom:10,marginTop:-4},
    input:{borderWidth:1,borderColor:t.border,borderRadius:10,padding:12,fontSize:15,color:t.text,backgroundColor:t.card,marginBottom:0},
    convNote:{fontSize:11,color:t.subtext,marginTop:5,marginBottom:4,fontStyle:'italic'},
    fundOpt:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:12,borderWidth:1.5,borderColor:t.border,backgroundColor:t.card,marginBottom:8},
    fundOptSel:{backgroundColor:t.primary,borderColor:t.primary},
    fundOptTitle:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:2},
    fundOptSub:{fontSize:11,color:t.subtext},
    chipGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
    chips:{flexDirection:'row',gap:8},
    chip:{paddingHorizontal:13,paddingVertical:8,borderRadius:18,backgroundColor:t.card,borderWidth:1,borderColor:t.border},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:13,color:t.text},
    chipTxtSel:{color:'#fff',fontWeight:'600'},
    rateToggle:{flexDirection:'row',alignItems:'center',gap:10,padding:12,borderRadius:12,borderWidth:1,borderColor:t.border,backgroundColor:t.card},
    rateToggleOn:{backgroundColor:t.warning,borderColor:t.warning},
    rateToggleTitle:{fontSize:13,fontWeight:'600',color:t.text,flex:1},
    rateToggleSub:{fontSize:11,color:t.subtext,marginTop:2},
    rateInputBox:{backgroundColor:t.warning+'12',borderRadius:10,padding:12,marginTop:8},
    subChip:{flexDirection:'row',alignItems:'center',backgroundColor:t.card,borderRadius:10,padding:12,marginBottom:8,gap:10,borderWidth:1,borderColor:t.border},
    subDot:{width:8,height:8,borderRadius:4},
    subChipName:{fontSize:13,fontWeight:'600',color:t.text,marginBottom:2},
    subChipMeta:{fontSize:11,color:t.subtext},
    addSubBox:{backgroundColor:t.background,borderRadius:12,borderWidth:1,borderColor:t.border,padding:14,marginTop:8,gap:8},
    addSubBoxTitle:{fontSize:13,fontWeight:'700',color:t.primary,marginBottom:4},
    addSubBtn:{flexDirection:'row',alignItems:'center',gap:6,justifyContent:'center',paddingVertical:10,borderRadius:10,borderWidth:1.5,borderColor:t.primary,marginTop:4},
    addSubBtnTxt:{fontSize:13,color:t.primary,fontWeight:'700'},
    saveBtn:{margin:16,backgroundColor:t.primary,padding:16,borderRadius:14,alignItems:'center',marginTop:20},
    saveBtnTxt:{fontSize:16,fontWeight:'700',color:'#fff'},
  });
}
