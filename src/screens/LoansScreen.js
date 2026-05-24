import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

export default function LoansScreen({ navigation }) {
  const { appData, saveData, theme } = useContext(AppContext);
  const [payModal, setPayModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const s = makeStyles(theme);

  const fmt = (a,c) => new Intl.NumberFormat('en-PH',{style:'currency',currency:c||appData.baseCurrency}).format(a);

  // Calculate accrued interest: P * r * t (simple interest)
  const calcInterest = (loan) => {
    if (!loan.interestRate||loan.interestRate===0) return 0;
    const start = new Date(loan.createdAt||loan.dueDate);
    const now = new Date();
    const years = (now - start) / (1000*60*60*24*365);
    return loan.remaining * (loan.interestRate/100) * Math.max(years,0);
  };

  const totalDebt = (appData.loans||[]).reduce((sum,l)=>{
    const r=appData.exchangeRates[l.currency]||1,br=appData.exchangeRates[appData.baseCurrency]||1;
    return sum+((l.remaining+calcInterest(l))/r)*br;
  },0);

  const openPay = (loan) => { setSelectedLoan(loan); setPayAmount(''); setPayAccount(appData.accounts[0]?.name||''); setPayModal(true); };

  const makePay = () => {
    if (!payAmount||isNaN(parseFloat(payAmount))) { Alert.alert('Error','Enter valid amount'); return; }
    const amt = parseFloat(payAmount);
    const loan = selectedLoan;
    const interest = calcInterest(loan);
    const totalOwed = loan.remaining + interest;

    if (amt > totalOwed) { Alert.alert('Error',`Amount exceeds total owed (${fmt(totalOwed,loan.currency)})`); return; }

    const acc = appData.accounts.find(a=>a.name===payAccount);
    if (!acc) { Alert.alert('Error','Select an account'); return; }

    const loanRate = appData.exchangeRates[loan.currency]||1;
    const accRate = appData.exchangeRates[acc.currency]||1;
    const deductFromAcc = (amt/loanRate)*accRate;

    if (acc.balance < deductFromAcc) { Alert.alert('Insufficient Funds',`${acc.name} has ${fmt(acc.balance,acc.currency)}`); return; }

    // Interest pays first, then principal
    const interestPaid = Math.min(amt, interest);
    const principalPaid = amt - interestPaid;
    const newRemaining = Math.max(loan.remaining - principalPaid, 0);

    const updLoans = appData.loans.map(l=>l.id===loan.id?{...l,remaining:newRemaining,createdAt:new Date().toISOString()}:l)
      .filter(l=>l.remaining>0.01); // remove fully paid

    const updAccs = appData.accounts.map(a=>a.name===payAccount?{...a,balance:a.balance-deductFromAcc}:a);

    const expense = { id:Date.now().toString(), amount:amt, category:'Loan Payment', note:`Payment for ${loan.name}${interestPaid>0?` (incl. ${fmt(interestPaid,loan.currency)} interest)`:''}`, date:new Date().toISOString().split('T')[0], currency:loan.currency, account:payAccount };

    saveData({ loans:updLoans, accounts:updAccs, expenses:[expense,...appData.expenses] });

    if (newRemaining <= 0.01) Alert.alert('🎉 Loan Paid Off!', `Congratulations! You fully paid off ${loan.name}!`);
    else Alert.alert('Payment Made',`Paid ${fmt(amt,loan.currency)}. Remaining: ${fmt(newRemaining,loan.currency)}`);

    setPayModal(false);
  };

  const deleteLoan = (id) => Alert.alert('Delete Loan','Are you sure?',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>saveData({loans:(appData.loans||[]).filter(l=>l.id!==id)})}]);

  return (
    <View style={s.container}>
      <ScrollView>
        <View style={s.totalCard}>
          <Text style={s.totalLbl}>Total Outstanding Debt</Text>
          <Text style={s.totalVal}>{fmt(totalDebt)}</Text>
        </View>

        {(appData.loans||[]).map(loan=>{
          const interest = calcInterest(loan);
          const totalOwed = loan.remaining + interest;
          const progress = ((loan.amount-loan.remaining)/loan.amount)*100;
          return (
            <View key={loan.id} style={s.card}>
              <View style={s.cardHeader}>
                <View>
                  <Text style={s.loanName}>{loan.name}</Text>
                  <Text style={s.lender}>{loan.lender||'—'}</Text>
                </View>
                <TouchableOpacity onPress={()=>deleteLoan(loan.id)}><Ionicons name="trash-outline" size={18} color={theme.danger}/></TouchableOpacity>
              </View>

              <View style={s.amtRow}>
                <View><Text style={s.amtLbl}>Original</Text><Text style={s.amtVal}>{fmt(loan.amount,loan.currency)}</Text></View>
                <View><Text style={s.amtLbl}>Principal</Text><Text style={[s.amtVal,{color:theme.warning}]}>{fmt(loan.remaining,loan.currency)}</Text></View>
                <View><Text style={s.amtLbl}>Interest</Text><Text style={[s.amtVal,{color:theme.danger}]}>{fmt(interest,loan.currency)}</Text></View>
              </View>

              <View style={s.totalOwedRow}>
                <Text style={s.totalOwedLbl}>Total Owed (with interest)</Text>
                <Text style={[s.totalOwedVal,{color:theme.danger}]}>{fmt(totalOwed,loan.currency)}</Text>
              </View>

              <View style={s.progressBar}><View style={[s.progressFill,{width:`${Math.min(progress,100)}%`,backgroundColor:progress>=100?theme.success:theme.primary}]}/></View>
              <Text style={s.progressTxt}>{progress.toFixed(1)}% paid off • Rate: {loan.interestRate||0}% p.a.</Text>
              <Text style={s.dueTxt}>Due: {new Date(loan.dueDate).toLocaleDateString()}</Text>

              <TouchableOpacity style={s.payBtn} onPress={()=>openPay(loan)}>
                <Ionicons name="card" size={16} color="#fff"/>
                <Text style={s.payBtnTxt}>Make Payment</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {(!appData.loans||appData.loans.length===0)&&(
          <View style={s.empty}><Ionicons name="card-outline" size={64} color={theme.border}/><Text style={s.emptyTxt}>No loans tracked</Text></View>
        )}
      </ScrollView>

      <TouchableOpacity style={s.fab} onPress={()=>navigation.navigate('AddLoan')}>
        <Ionicons name="add" size={28} color="#fff"/>
      </TouchableOpacity>

      <Modal visible={payModal} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}>
          <Text style={s.modalTitle}>Make Payment</Text>
          {selectedLoan&&(
            <>
              <View style={s.loanInfo}>
                <Text style={s.loanInfoName}>{selectedLoan.name}</Text>
                <Text style={s.loanInfoSub}>Principal: {fmt(selectedLoan.remaining,selectedLoan.currency)}</Text>
                <Text style={s.loanInfoSub}>Interest accrued: {fmt(calcInterest(selectedLoan),selectedLoan.currency)}</Text>
                <Text style={[s.loanInfoTotal,{color:theme.danger}]}>Total owed: {fmt(selectedLoan.remaining+calcInterest(selectedLoan),selectedLoan.currency)}</Text>
              </View>
              <Text style={s.lbl}>Payment Amount ({selectedLoan.currency})</Text>
              <TextInput style={s.input} value={payAmount} onChangeText={setPayAmount} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.subtext}/>
              <Text style={s.lbl}>Pay from Account</Text>
              <View style={s.chips}>{appData.accounts.map(a=><TouchableOpacity key={a.id} style={[s.chip,payAccount===a.name&&s.chipSel]} onPress={()=>setPayAccount(a.name)}><Text style={[s.chipTxt,payAccount===a.name&&s.chipTxtSel]}>{a.name}</Text><Text style={[s.chipBal,payAccount===a.name&&{color:'#fff'}]}>{a.balance.toFixed(0)} {a.currency}</Text></TouchableOpacity>)}</View>
              <Text style={s.interestNote}>⚡ Interest is paid first, then principal</Text>
            </>
          )}
          <View style={s.row}>
            <TouchableOpacity style={[s.btn,s.btnCancel]} onPress={()=>setPayModal(false)}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,s.btnSave]} onPress={makePay}><Text style={s.btnSaveTxt}>Pay</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    totalCard:{margin:18,padding:18,backgroundColor:t.card,borderRadius:16,elevation:2,alignItems:'center'},
    totalLbl:{fontSize:13,color:t.subtext,marginBottom:6},
    totalVal:{fontSize:28,fontWeight:'800',color:t.danger},
    card:{margin:18,marginTop:0,padding:18,backgroundColor:t.card,borderRadius:14,elevation:1},
    cardHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14},
    loanName:{fontSize:17,fontWeight:'700',color:t.text,marginBottom:4},
    lender:{fontSize:13,color:t.subtext},
    amtRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:12},
    amtLbl:{fontSize:11,color:t.subtext,marginBottom:3},
    amtVal:{fontSize:13,fontWeight:'700',color:t.text},
    totalOwedRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:t.danger+'12',borderRadius:8,padding:10,marginBottom:12},
    totalOwedLbl:{fontSize:12,color:t.text,fontWeight:'600'},
    totalOwedVal:{fontSize:15,fontWeight:'800'},
    progressBar:{height:8,backgroundColor:t.border,borderRadius:4,overflow:'hidden',marginBottom:6},
    progressFill:{height:'100%',borderRadius:4},
    progressTxt:{fontSize:12,color:t.subtext,marginBottom:4},
    dueTxt:{fontSize:12,color:t.subtext,marginBottom:14},
    payBtn:{backgroundColor:t.primary,borderRadius:12,padding:13,flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8},
    payBtnTxt:{color:'#fff',fontWeight:'700',fontSize:15},
    fab:{position:'absolute',right:20,bottom:20,width:56,height:56,borderRadius:28,backgroundColor:t.primary,alignItems:'center',justifyContent:'center',elevation:8},
    empty:{alignItems:'center',paddingVertical:60},
    emptyTxt:{fontSize:16,color:t.subtext,marginTop:16,fontWeight:'600'},
    overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.55)',justifyContent:'flex-end'},
    modal:{backgroundColor:t.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:40},
    modalTitle:{fontSize:19,fontWeight:'700',color:t.text,marginBottom:16},
    loanInfo:{backgroundColor:t.background,borderRadius:12,padding:14,marginBottom:16},
    loanInfoName:{fontSize:16,fontWeight:'700',color:t.text,marginBottom:6},
    loanInfoSub:{fontSize:13,color:t.subtext,marginBottom:4},
    loanInfoTotal:{fontSize:15,fontWeight:'700',marginTop:4},
    lbl:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:8},
    input:{borderWidth:1,borderColor:t.border,borderRadius:12,padding:14,marginBottom:14,fontSize:16,color:t.text,backgroundColor:t.background},
    chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:14},
    chip:{paddingHorizontal:13,paddingVertical:9,borderRadius:14,backgroundColor:t.background,borderWidth:1,borderColor:t.border},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:13,color:t.text,fontWeight:'600'},
    chipTxtSel:{color:'#fff',fontWeight:'700'},
    chipBal:{fontSize:11,color:t.subtext,marginTop:2},
    interestNote:{fontSize:12,color:t.warning,marginBottom:14,fontWeight:'600'},
    row:{flexDirection:'row',gap:12,marginTop:4},
    btn:{flex:1,padding:15,borderRadius:12,alignItems:'center'},
    btnCancel:{backgroundColor:t.light},
    btnCancelTxt:{fontSize:15,fontWeight:'600',color:t.subtext},
    btnSave:{backgroundColor:t.primary},
    btnSaveTxt:{fontSize:15,fontWeight:'600',color:'#fff'},
  });
}
