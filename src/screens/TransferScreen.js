import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const CURRENCIES = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','CNY','KRW','PLN'];

export default function TransferScreen({ navigation }) {
  const { appData, saveData, theme } = useContext(AppContext);
  const [mode, setMode]           = useState('pool_to_account');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount,   setToAccount]   = useState('');
  const [amount,  setAmount]      = useState('');
  const [currency,setCurrency]    = useState(appData.baseCurrency);
  const [note,    setNote]        = useState('');
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRate, setCustomRate]       = useState('');
  const s = makeStyles(theme);

  const toBase = (a,c) => { const r=appData.exchangeRates[c]||1,br=appData.exchangeRates[appData.baseCurrency]||1; return (a/r)*br; };
  const fmtBase = (a) => new Intl.NumberFormat('en-PH',{style:'currency',currency:appData.baseCurrency}).format(a);
  const fmt = (a,c) => new Intl.NumberFormat('en-PH',{style:'currency',currency:c||appData.baseCurrency}).format(a);

  const totalIncomePool = (appData.incomes||[]).reduce((s,i)=>s+toBase(i.amount,i.currency),0);
  const totalTransferred = (appData.transfers||[]).reduce((s,t)=>s+toBase(t.amount,t.currency),0);
  const availablePool   = totalIncomePool - totalTransferred;

  const parsedAmt = parseFloat(amount)||0;
  const poolCostInBase = parsedAmt>0 ? toBase(parsedAmt,currency) : 0;
  const poolAfter = availablePool - poolCostInBase;

  const handleToAccSelect = (accName) => {
    setToAccount(accName);
    if (mode==='pool_to_account') {
      const acc = appData.accounts.find(a=>a.name===accName);
      if (acc) setCurrency(acc.currency);
    }
  };

  const doTransfer = () => {
    const amt = parseFloat(amount);
    if (!amount||isNaN(amt)||amt<=0){Alert.alert('Error','Enter valid amount');return;}

    if (mode==='pool_to_account') {
      if (!toAccount){Alert.alert('Error','Select destination account');return;}
      if (poolCostInBase>availablePool+0.01){Alert.alert('Insufficient Pool',`Only ${fmt(availablePool)} available in your income pool`);return;}
      const acc = appData.accounts.find(a=>a.name===toAccount);
      if (!acc){Alert.alert('Error','Account not found');return;}
      const accRate = appData.exchangeRates[acc.currency]||1;
      const srcRate = appData.exchangeRates[currency]||1;
      const credit  = (amt/srcRate)*accRate;
      const transferRecord = {id:Date.now().toString(),amount:amt,currency,toAccount,note,date:new Date().toISOString().split('T')[0]};
      const updAccs = appData.accounts.map(a=>a.name===toAccount?{...a,balance:a.balance+credit}:a);
      saveData({transfers:[...(appData.transfers||[]),transferRecord],accounts:updAccs});
      Alert.alert('✅ Transferred',`${fmt(amt,currency)} → ${toAccount}${acc.currency!==currency?`\n(${fmt(credit,acc.currency)} credited)`:''}`,[{text:'OK',onPress:()=>navigation.goBack()}]);

    } else {
      if(!fromAccount||!toAccount){Alert.alert('Error','Select both accounts');return;}
      if(fromAccount===toAccount){Alert.alert('Error','Cannot transfer to same account');return;}
      const from=appData.accounts.find(a=>a.name===fromAccount);
      const to  =appData.accounts.find(a=>a.name===toAccount);
      if(!from||!to) return;
      // Amount is in selected currency; convert to from-account currency to deduct
      const selRate  = appData.exchangeRates[currency]||1;
      const fromRate = appData.exchangeRates[from.currency]||1;
      const toRate   = appData.exchangeRates[to.currency]||1;
      const deductInFrom = (amt/selRate)*fromRate;
      const creditInTo   = (amt/selRate)*toRate;
      if(from.balance<deductInFrom){Alert.alert('Insufficient Funds',`${from.name} only has ${fmt(from.balance,from.currency)}\nThis transfer costs ${fmt(deductInFrom,from.currency)}`);return;}
      const updAccs = appData.accounts.map(a => {
        if (a.name === fromAccount) return { ...a, balance: a.balance - deductInFrom };
        if (a.name === toAccount) return { ...a, balance: a.balance + creditInTo };
        return a;
      });

      const transferRecord = {
        id: Date.now().toString(),
        amount: amt,
        currency,
        fromAccount,
        toAccount,
        note,
        date: new Date().toISOString().split('T')[0],
      };

      saveData({ transfers: [...(appData.transfers || []), transferRecord], accounts: updAccs });
      Alert.alert('✅ Transferred', `${fmt(amt, currency)} from ${fromAccount} → ${toAccount}\n(-${fmt(deductInFrom, from.currency)} / +${fmt(creditInTo, to.currency)})`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  };

  return (
    <ScrollView style={s.container}>
      {/* Mode selector */}
      <View style={s.modeRow}>
        <TouchableOpacity style={[s.modeBtn,mode==='pool_to_account'&&s.modeBtnSel]} onPress={()=>setMode('pool_to_account')}>
          <Ionicons name="wallet" size={16} color={mode==='pool_to_account'?'#fff':theme.subtext}/>
          <Text style={[s.modeTxt,mode==='pool_to_account'&&s.modeTxtSel]}>Pool → Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.modeBtn,mode==='account_to_account'&&s.modeBtnSel]} onPress={()=>setMode('account_to_account')}>
          <Ionicons name="swap-horizontal" size={16} color={mode==='account_to_account'?'#fff':theme.subtext}/>
          <Text style={[s.modeTxt,mode==='account_to_account'&&s.modeTxtSel]}>Account → Account</Text>
        </TouchableOpacity>
      </View>

      {/* Pool banner */}
      {mode==='pool_to_account'&&(
        <View style={s.poolBanner}>
          <Text style={s.poolLbl}>Available Income Pool</Text>
          <Text style={[s.poolVal,{color:availablePool>=0?theme.success:theme.danger}]}>{fmt(availablePool)}</Text>
          {parsedAmt>0&&<Text style={[s.poolAfter,{color:poolAfter>=0?theme.success:theme.danger}]}>After transfer: {fmt(poolAfter)}</Text>}
        </View>
      )}

      {/* From account (account-to-account only) */}
      {mode==='account_to_account'&&(
        <View style={s.section}>
          <Text style={s.lbl}>From Account</Text>
          {appData.accounts.map(a=>(
            <TouchableOpacity key={a.id} style={[s.accItem,fromAccount===a.name&&s.accItemSel]} onPress={()=>setFromAccount(a.name)}>
              <View style={s.accItemLeft}>
                <Text style={[s.accItemName,fromAccount===a.name&&{color:'#fff'}]}>{a.name}</Text>
                <Text style={[s.accItemBal,fromAccount===a.name&&{color:'rgba(255,255,255,0.8)'}]}>{fmt(a.balance,a.currency)} · {a.currency}</Text>
              </View>
              {fromAccount===a.name&&<Ionicons name="checkmark-circle" size={18} color="#fff"/>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={s.arrowWrap}><Ionicons name="arrow-down" size={26} color={theme.primary}/></View>

      {/* To Account */}
      <View style={s.section}>
        <Text style={s.lbl}>To Account</Text>
        {appData.accounts.map(a=>(
          <TouchableOpacity key={a.id} style={[s.accItem,toAccount===a.name&&s.accItemSel]} onPress={()=>handleToAccSelect(a.name)}>
            <View style={s.accItemLeft}>
              <Text style={[s.accItemName,toAccount===a.name&&{color:'#fff'}]}>{a.name}</Text>
              <Text style={[s.accItemBal,toAccount===a.name&&{color:'rgba(255,255,255,0.8)'}]}>{fmt(a.balance,a.currency)} · {a.currency}</Text>
            </View>
            {toAccount===a.name&&<Ionicons name="checkmark-circle" size={18} color="#fff"/>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Amount */}
      <View style={s.section}>
        <Text style={s.lbl}>Amount</Text>
        <TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.subtext}/>
      </View>

      {/* Currency selector — always shown */}
      <View style={s.section}>
        <Text style={s.lbl}>Transfer Currency</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.chips}>
            {CURRENCIES.map(c=>(
              <TouchableOpacity key={c} style={[s.chip,currency===c&&s.chipSel]} onPress={()=>setCurrency(c)}>
                <Text style={[s.chipTxt,currency===c&&s.chipTxtSel]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        {/* Show conversion preview for both modes */}
        {parsedAmt>0&&fromAccount&&mode==='account_to_account'&&(()=>{
          const from=appData.accounts.find(a=>a.name===fromAccount);
          const to  =appData.accounts.find(a=>a.name===toAccount);
          const selRate=appData.exchangeRates[currency]||1;
          const fromRate=appData.exchangeRates[from?.currency]||1;
          const toRate=appData.exchangeRates[to?.currency]||1;
          const deduct=(parsedAmt/selRate)*fromRate;
          const credit=(parsedAmt/selRate)*toRate;
          return <View style={s.convPreview}>
            {from&&<Text style={s.convLine}>Deduct from {from.name}: -{fmt(deduct,from.currency)}</Text>}
            {to  &&<Text style={s.convLine}>Credit to {to.name}: +{fmt(credit,to.currency)}</Text>}
          </View>;
        })()}

        {/* Custom Rate Override */}
        <View style={s.customRateRow}>
          <TouchableOpacity style={[s.customRateToggle, useCustomRate && s.customRateToggleOn]} onPress={()=>setUseCustomRate(!useCustomRate)}>
            <Ionicons name={useCustomRate ? 'checkmark-circle' : 'radio-button-off'} size={18} color={useCustomRate ? '#fff' : theme.subtext}/>
            <Text style={[s.customRateTxt, useCustomRate && {color:'#fff'}]}>Use custom exchange rate</Text>
          </TouchableOpacity>
        </View>
        {useCustomRate && (()=>{
          const currencyRate = appData.exchangeRates[currency] || 1;
          const baseRate = appData.exchangeRates[appData.baseCurrency] || 1;
          const liveRate = (baseRate / currencyRate).toFixed(4);
          return (
            <View style={s.customRateInput}>
              <Text style={s.lbl}>1 {currency} = ? {appData.baseCurrency} (on transfer date)</Text>
              {liveRate && <Text style={s.convNote}>Live rate: 1 {currency} = {liveRate} {appData.baseCurrency}</Text>}
              <TextInput style={s.input} value={customRate} onChangeText={setCustomRate} keyboardType="numeric" placeholder={`e.g. ${liveRate || '1.0'}`} placeholderTextColor={theme.subtext}/>
              {parseFloat(amount)>0 && parseFloat(customRate)>0 && currency!==appData.baseCurrency && (
                <Text style={[s.convNote,{color:theme.warning}]}>With custom rate: {fmt(parseFloat(amount),currency)} = {fmtBase(parseFloat(amount)*parseFloat(customRate))}</Text>
              )}
            </View>
          );
        })()}
      </View>

      {/* Note */}
      <View style={s.section}>
        <Text style={s.lbl}>Note <Text style={s.opt}>(optional)</Text></Text>
        <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="Reason for transfer..." placeholderTextColor={theme.subtext}/>
      </View>

      <TouchableOpacity style={s.saveBtn} onPress={doTransfer}>
        <Ionicons name="swap-horizontal" size={20} color="#fff"/>
        <Text style={s.saveTxt}>Transfer Now</Text>
      </TouchableOpacity>
      <View style={{height:40}}/>
    </ScrollView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background,padding:18},
    modeRow:{flexDirection:'row',gap:10,marginBottom:18},
    modeBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,padding:13,borderRadius:12,backgroundColor:t.card,borderWidth:1,borderColor:t.border},
    modeBtnSel:{backgroundColor:t.primary,borderColor:t.primary},
    modeTxt:{fontSize:13,fontWeight:'600',color:t.subtext},
    modeTxtSel:{color:'#fff'},
    poolBanner:{backgroundColor:t.primary+'18',borderRadius:14,padding:18,marginBottom:18,alignItems:'center'},
    poolLbl:{fontSize:13,color:t.subtext,marginBottom:4},
    poolVal:{fontSize:28,fontWeight:'800',marginBottom:4},
    poolAfter:{fontSize:13,fontWeight:'600'},
    section:{marginBottom:6},
    lbl:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:10},
    opt:{fontWeight:'400',color:t.subtext},
    accItem:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:14,borderRadius:12,borderWidth:1,borderColor:t.border,backgroundColor:t.card,marginBottom:8},
    accItemSel:{backgroundColor:t.primary,borderColor:t.primary},
    accItemLeft:{flex:1},
    accItemName:{fontSize:14,fontWeight:'700',color:t.text,marginBottom:3},
    accItemBal:{fontSize:12,color:t.subtext},
    arrowWrap:{alignItems:'center',marginVertical:6},
    input:{borderWidth:1,borderColor:t.border,borderRadius:12,padding:14,fontSize:16,color:t.text,backgroundColor:t.card,marginBottom:16},
    chips:{flexDirection:'row',gap:8,paddingBottom:4},
    chip:{paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:t.card,borderWidth:1,borderColor:t.border},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:13,color:t.text,fontWeight:'600'},
    chipTxtSel:{color:'#fff',fontWeight:'700'},
    convPreview:{backgroundColor:t.background,borderRadius:10,padding:12,marginTop:8,gap:4},
    convLine:{fontSize:13,color:t.text,fontWeight:'600'},
    customRateRow:{marginBottom:14},
    customRateToggle:{flexDirection:'row',alignItems:'center',gap:8,padding:12,borderRadius:12,borderWidth:1,borderColor:t.border,backgroundColor:t.card},
    customRateToggleOn:{backgroundColor:t.primary,borderColor:t.primary},
    customRateTxt:{fontSize:13,fontWeight:'600',color:t.text},
    customRateInput:{backgroundColor:t.card,borderRadius:10,padding:12,marginBottom:14},
    saveBtn:{backgroundColor:t.primary,padding:18,borderRadius:16,alignItems:'center',flexDirection:'row',justifyContent:'center',gap:10,marginTop:16},
    saveTxt:{fontSize:17,fontWeight:'700',color:'#fff'},
  });
}
