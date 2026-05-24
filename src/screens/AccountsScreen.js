import React, { useContext, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const TYPES  = ['savings','checking','cash','investment','credit','e-wallet'];
const CURRENCIES = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','CNY','KRW','PLN'];
const ICONS  = { savings:'wallet', checking:'card', cash:'cash', investment:'bar-chart', credit:'card-outline', 'e-wallet':'phone-portrait' };
const COLORS = { savings:'#6366F1', checking:'#14B8A6', cash:'#10B981', investment:'#F59E0B', credit:'#EF4444', 'e-wallet':'#EC4899' };

export default function AccountsScreen({ navigation }) {
  const { appData, saveData, theme } = useContext(AppContext);
  const s = makeStyles(theme);

  // Fund from pool modal
  const [fundModal,   setFundModal]   = useState(false);
  const [fundAcc,     setFundAcc]     = useState(null);
  const [fundAmt,     setFundAmt]     = useState('');
  const [fundNote,    setFundNote]    = useState('');

  // Sub-account modal
  const [subModal,    setSubModal]    = useState(false);
  const [subForAcc,   setSubForAcc]   = useState(null); // parent account
  const [editingSub,  setEditingSub]  = useState(null); // null=new, obj=editing
  const [subName,     setSubName]     = useState('');
  const [subPurpose,  setSubPurpose]  = useState('');
  const [subBalance,  setSubBalance]  = useState('');
  const [subCurrency, setSubCurrency] = useState('PHP');

  const fmt     = (a,c) => new Intl.NumberFormat('en-PH',{style:'currency',currency:c||appData.baseCurrency}).format(a);
  const fmtBase = (a)   => fmt(a, appData.baseCurrency);
  const toBase  = (a,c) => { const r=appData.exchangeRates[c]||1, br=appData.exchangeRates[appData.baseCurrency]||1; return (a/r)*br; };

  const totalBalance = appData.accounts.reduce((s,a) => s+toBase(a.balance,a.currency), 0);
  const totalIncome  = (appData.incomes||[]).reduce((s,i) => s+toBase(i.amount,i.currency), 0);
  const totalOut     = (appData.transfers||[]).reduce((s,t) => s+toBase(t.amount,t.currency), 0);
  const incomePool   = totalIncome - totalOut;

  const typeBreakdown = useMemo(() => TYPES.reduce((acc,type) => {
    acc[type] = appData.accounts
      .filter(a => a.type === type)
      .reduce((s,a) => s + toBase(a.balance, a.currency), 0);
    return acc;
  }, {}), [appData.accounts, appData.exchangeRates]);

  // ── Fund from pool ───────────────────────────────────────────────
  const openFund = (acc) => { setFundAcc(acc); setFundAmt(''); setFundNote(''); setFundModal(true); };
  const doFund = () => {
    const amt = parseFloat(fundAmt);
    if (!amt || amt <= 0) { Alert.alert('Error','Enter valid amount'); return; }
    const cost = toBase(amt, fundAcc.currency);
    if (cost > incomePool + 0.01) { Alert.alert('Insufficient Pool', `Only ${fmtBase(incomePool)} available`); return; }
    const tx = { id:Date.now().toString(), amount:amt, currency:fundAcc.currency, toAccount:fundAcc.name, note:fundNote||`Fund ${fundAcc.name}`, date:new Date().toISOString().split('T')[0] };
    saveData({ accounts: appData.accounts.map(a => a.id===fundAcc.id ? {...a,balance:a.balance+amt} : a), transfers:[...(appData.transfers||[]),tx] });
    setFundModal(false);
  };

  // ── Sub-accounts ─────────────────────────────────────────────────
  const openAddSub = (acc) => {
    setSubForAcc(acc); setEditingSub(null);
    setSubName(''); setSubPurpose(''); setSubBalance('0'); setSubCurrency(acc.currency);
    setSubModal(true);
  };
  const openEditSub = (acc, sub) => {
    setSubForAcc(acc); setEditingSub(sub);
    setSubName(sub.name); setSubPurpose(sub.purpose||''); setSubBalance(String(sub.balance)); setSubCurrency(sub.currency||acc.currency);
    setSubModal(true);
  };
  const saveSub = () => {
    if (!subName.trim()) { Alert.alert('Error','Enter sub-account name'); return; }
    const newSub = { id: editingSub?.id || Date.now().toString(), name:subName.trim(), purpose:subPurpose.trim(), balance:parseFloat(subBalance)||0, currency:subCurrency };
    const updAccs = appData.accounts.map(a => {
      if (a.id !== subForAcc.id) return a;
      const subs = a.subAccounts || [];
      return { ...a, subAccounts: editingSub ? subs.map(s => s.id===editingSub.id ? newSub : s) : [...subs, newSub] };
    });
    saveData({ accounts: updAccs });
    setSubModal(false);
  };
  const deleteSub = (acc, subId) => Alert.alert('Delete','Remove this sub-account?',[
    {text:'Cancel',style:'cancel'},
    {text:'Delete',style:'destructive',onPress:()=>saveData({ accounts: appData.accounts.map(a => a.id===acc.id ? {...a,subAccounts:(a.subAccounts||[]).filter(s=>s.id!==subId)} : a) })}
  ]);
  const deleteAccount = (id) => Alert.alert('Delete Account','This cannot be undone.',[
    {text:'Cancel',style:'cancel'},
    {text:'Delete',style:'destructive',onPress:()=>saveData({accounts:appData.accounts.filter(a=>a.id!==id)})}
  ]);

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={theme.gradient} style={s.header}>
          <Text style={s.headerTitle}>Accounts</Text>
          <View style={s.headerRow}>
            <View style={s.headerCard}>
              <Text style={s.headerCardLbl}>Total Balance</Text>
              <Text style={s.headerCardVal}>{fmtBase(totalBalance)}</Text>
            </View>
            <View style={[s.headerCard,{borderLeftWidth:1,borderLeftColor:'rgba(255,255,255,0.3)'}]}>
              <Text style={s.headerCardLbl}>Income Pool</Text>
              <Text style={[s.headerCardVal,{color:incomePool>=0?'#86efac':'#fca5a5'}]}>{fmtBase(incomePool)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Type overview */}
        {appData.accounts.length > 0 && (
          <View style={s.overviewCard}>
            <Text style={s.overviewTitle}>By Type</Text>
            <View style={s.overviewGrid}>
              {TYPES.filter(t => appData.accounts.some(a=>a.type===t)).map(type => (
                <View key={type} style={[s.overviewItem,{borderLeftColor:COLORS[type]}]}>
                  <View style={[s.overviewIcon,{backgroundColor:COLORS[type]+'22'}]}>
                    <Ionicons name={ICONS[type]} size={16} color={COLORS[type]}/>
                  </View>
                  <Text style={s.overviewType}>{type}</Text>
                  <Text style={s.overviewCount}>{appData.accounts.filter(a=>a.type===type).length} acct{appData.accounts.filter(a=>a.type===type).length!==1?'s':''}</Text>
                  <Text style={[s.overviewTotal,{color:COLORS[type]}]} numberOfLines={1}>{fmtBase(typeBreakdown[type]||0)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Account list */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Your Accounts</Text>
            <TouchableOpacity style={s.addBtn} onPress={()=>navigation.navigate('AddAccount')}>
              <Ionicons name="add" size={15} color="#fff"/>
              <Text style={s.addBtnTxt}>Add</Text>
            </TouchableOpacity>
          </View>

          {appData.accounts.length === 0 && (
            <View style={s.empty}>
              <Ionicons name="wallet-outline" size={56} color={theme.border}/>
              <Text style={s.emptyTxt}>No accounts yet</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={()=>navigation.navigate('AddAccount')}>
                <Text style={s.emptyBtnTxt}>Add First Account</Text>
              </TouchableOpacity>
            </View>
          )}

          {appData.accounts.map(acc => {
            const subs     = acc.subAccounts || [];
            const isForeign= acc.currency !== appData.baseCurrency;
            const budgets  = appData.budget.filter(b => b.linkedAccount === acc.name);
            const col      = COLORS[acc.type] || theme.primary;
            const subTotal = subs.reduce((s,sub) => s + toBase(sub.balance, sub.currency||acc.currency), 0);

            return (
              <View key={acc.id} style={s.accCard}>
                {/* Card top stripe */}
                <View style={[s.accStripe,{backgroundColor:col}]}/>

                <View style={s.accBody}>
                  {/* Account header row */}
                  <View style={s.accHeader}>
                    <View style={[s.accTypeIcon,{backgroundColor:col+'22'}]}>
                      <Ionicons name={ICONS[acc.type]||'wallet'} size={20} color={col}/>
                    </View>
                    <View style={s.accInfo}>
                      <Text style={s.accName}>{acc.name}</Text>
                      <Text style={s.accMeta}>{acc.bank?`${acc.bank} · `:''}{acc.type?.toUpperCase()} · {acc.currency}</Text>
                    </View>
                    <TouchableOpacity style={s.deleteAccBtn} onPress={()=>deleteAccount(acc.id)}>
                      <Ionicons name="trash-outline" size={15} color={theme.danger}/>
                    </TouchableOpacity>
                  </View>

                  {/* Balance */}
                  <View style={s.balRow}>
                    <View>
                      <Text style={s.balLbl}>Balance</Text>
                      <Text style={s.balVal}>{fmt(acc.balance, acc.currency)}</Text>
                      {isForeign && <Text style={s.balBase}>≈ {fmtBase(toBase(acc.balance,acc.currency))}</Text>}
                    </View>
                    {subs.length > 0 && (
                      <View style={s.subTotalBox}>
                        <Text style={s.subTotalLbl}>Sub-accounts</Text>
                        <Text style={s.subTotalVal}>{fmtBase(subTotal)}</Text>
                      </View>
                    )}
                  </View>

                  {/* Linked budgets */}
                  {budgets.length > 0 && (
                    <View style={s.linkedRow}>
                      <Text style={s.linkedLbl}>Budgets: </Text>
                      <View style={s.linkedTags}>
                        {budgets.map(b=><View key={b.id} style={s.linkedTag}><Text style={s.linkedTagTxt}>{b.icon} {b.key}</Text></View>)}
                      </View>
                    </View>
                  )}

                  {/* Sub-accounts */}
                  {subs.length > 0 && (
                    <View style={s.subsSection}>
                      <Text style={s.subsTitle}>Sub-accounts ({subs.length})</Text>
                      {subs.map(sub => (
                        <View key={sub.id} style={s.subRow}>
                          <View style={[s.subDot,{backgroundColor:col}]}/>
                          <View style={s.subInfo}>
                            <Text style={s.subName}>{sub.name}</Text>
                            {sub.purpose ? <Text style={s.subPurpose}>{sub.purpose}</Text> : null}
                            {(sub.currency||acc.currency) !== appData.baseCurrency && (
                              <Text style={s.subBalBase}>≈ {fmtBase(toBase(sub.balance, sub.currency||acc.currency))}</Text>
                            )}
                          </View>
                          <Text style={s.subBal}>{fmt(sub.balance, sub.currency||acc.currency)}</Text>
                          <TouchableOpacity style={s.subEditBtn} onPress={()=>openEditSub(acc,sub)}>
                            <Ionicons name="pencil" size={12} color={theme.primary}/>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={()=>deleteSub(acc,sub.id)}>
                            <Ionicons name="close-circle" size={16} color={theme.danger}/>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action row */}
                  <View style={s.accActions}>
                    <TouchableOpacity style={s.accActionBtn} onPress={()=>openFund(acc)}>
                      <Ionicons name="add-circle-outline" size={14} color={theme.success}/>
                      <Text style={[s.accActionTxt,{color:theme.success}]}>Fund</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.accActionBtn} onPress={()=>navigation.navigate('Transfer')}>
                      <Ionicons name="swap-horizontal" size={14} color={theme.primary}/>
                      <Text style={[s.accActionTxt,{color:theme.primary}]}>Transfer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.accActionBtn} onPress={()=>openAddSub(acc)}>
                      <Ionicons name="git-branch-outline" size={14} color={theme.accent}/>
                      <Text style={[s.accActionTxt,{color:theme.accent}]}>Add Sub</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{height:20}}/>
      </ScrollView>

      {/* ── Fund Modal ── */}
      <Modal visible={fundModal} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Fund from Pool</Text>
            <TouchableOpacity onPress={()=>setFundModal(false)}><Ionicons name="close" size={20} color={theme.subtext}/></TouchableOpacity>
          </View>
          <View style={s.poolBanner}>
            <Text style={s.poolBannerLbl}>Pool Available</Text>
            <Text style={[s.poolBannerVal,{color:incomePool>=0?theme.success:theme.danger}]}>{fmtBase(incomePool)}</Text>
          </View>
          <Text style={s.lbl}>Amount ({fundAcc?.currency})</Text>
          <TextInput style={s.input} value={fundAmt} onChangeText={setFundAmt} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.subtext}/>
          {parseFloat(fundAmt)>0 && fundAcc && fundAcc.currency!==appData.baseCurrency && (
            <Text style={s.convNote}>≈ {fmtBase(toBase(parseFloat(fundAmt),fundAcc.currency))}</Text>
          )}
          <Text style={s.lbl}>Note <Text style={s.opt}>(optional)</Text></Text>
          <TextInput style={s.input} value={fundNote} onChangeText={setFundNote} placeholder="Reason..." placeholderTextColor={theme.subtext}/>
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn,s.btnCancel]} onPress={()=>setFundModal(false)}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,s.btnSave]} onPress={doFund}><Text style={s.btnSaveTxt}>Fund Account</Text></TouchableOpacity>
          </View>
        </View></View>
      </Modal>

      {/* ── Sub-account Modal ── */}
      <Modal visible={subModal} animationType="slide" transparent>
        <View style={s.overlay}><ScrollView keyboardShouldPersistTaps="handled"><View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{editingSub?'Edit':'Add'} Sub-account</Text>
            <TouchableOpacity onPress={()=>setSubModal(false)}><Ionicons name="close" size={20} color={theme.subtext}/></TouchableOpacity>
          </View>
          {subForAcc && (
            <View style={s.parentBanner}>
              <Ionicons name={ICONS[subForAcc.type]||'wallet'} size={16} color={COLORS[subForAcc.type]||theme.primary}/>
              <Text style={s.parentBannerTxt}>Under: <Text style={{fontWeight:'700'}}>{subForAcc.name}</Text></Text>
            </View>
          )}
          <Text style={s.lbl}>Sub-account Name *</Text>
          <TextInput style={s.input} value={subName} onChangeText={setSubName} placeholder="e.g. House Fund, Med Payments" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Purpose <Text style={s.opt}>(optional)</Text></Text>
          <TextInput style={s.input} value={subPurpose} onChangeText={setSubPurpose} placeholder="e.g. Monthly mortgage payments" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Allocated Balance</Text>
          <TextInput style={s.input} value={subBalance} onChangeText={setSubBalance} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.subtext}/>
          <Text style={s.lbl}>Currency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
            <View style={s.chips}>{CURRENCIES.map(c=><TouchableOpacity key={c} style={[s.chip,subCurrency===c&&s.chipSel]} onPress={()=>setSubCurrency(c)}><Text style={[s.chipTxt,subCurrency===c&&s.chipTxtSel]}>{c}</Text></TouchableOpacity>)}</View>
          </ScrollView>
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn,s.btnCancel]} onPress={()=>setSubModal(false)}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn,s.btnSave]} onPress={saveSub}><Text style={s.btnSaveTxt}>{editingSub?'Save Changes':'Add Sub'}</Text></TouchableOpacity>
          </View>
        </View></ScrollView></View>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    header:{padding:22,paddingTop:60,paddingBottom:26,borderBottomLeftRadius:24,borderBottomRightRadius:24},
    headerTitle:{fontSize:26,fontWeight:'800',color:'#fff',marginBottom:14},
    headerRow:{flexDirection:'row',backgroundColor:'rgba(255,255,255,0.18)',borderRadius:14,overflow:'hidden'},
    headerCard:{flex:1,padding:14},
    headerCardLbl:{fontSize:11,color:'rgba(255,255,255,0.8)',marginBottom:4},
    headerCardVal:{fontSize:18,fontWeight:'800',color:'#fff'},
    overviewCard:{margin:16,padding:16,backgroundColor:t.card,borderRadius:14,elevation:2},
    overviewTitle:{fontSize:13,fontWeight:'700',color:t.subtext,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12},
    overviewGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},
    overviewItem:{width:'31%',borderLeftWidth:3,backgroundColor:t.background,borderRadius:10,padding:10},
    overviewIcon:{width:30,height:30,borderRadius:8,alignItems:'center',justifyContent:'center',marginBottom:5},
    overviewType:{fontSize:11,fontWeight:'700',color:t.text,textTransform:'capitalize',marginBottom:1},
    overviewCount:{fontSize:10,color:t.subtext,marginBottom:3},
    overviewTotal:{fontSize:12,fontWeight:'800'},
    section:{padding:16,paddingTop:0},
    sectionHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},
    sectionTitle:{fontSize:17,fontWeight:'700',color:t.text},
    addBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:t.primary,paddingHorizontal:14,paddingVertical:8,borderRadius:10},
    addBtnTxt:{color:'#fff',fontWeight:'700',fontSize:13},
    empty:{alignItems:'center',paddingVertical:40},
    emptyTxt:{fontSize:15,color:t.subtext,marginTop:10,marginBottom:14,fontWeight:'600'},
    emptyBtn:{backgroundColor:t.primary,paddingHorizontal:18,paddingVertical:10,borderRadius:10},
    emptyBtnTxt:{color:'#fff',fontWeight:'700'},
    accCard:{backgroundColor:t.card,borderRadius:16,overflow:'hidden',marginBottom:14,elevation:2},
    accStripe:{height:4},
    accBody:{padding:14},
    accHeader:{flexDirection:'row',alignItems:'center',marginBottom:12,gap:10},
    accTypeIcon:{width:40,height:40,borderRadius:10,alignItems:'center',justifyContent:'center'},
    accInfo:{flex:1},
    accName:{fontSize:15,fontWeight:'700',color:t.text,marginBottom:2},
    accMeta:{fontSize:11,color:t.subtext},
    deleteAccBtn:{padding:4},
    balRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end',marginBottom:10},
    balLbl:{fontSize:11,color:t.subtext,marginBottom:3},
    balVal:{fontSize:22,fontWeight:'800',color:t.text},
    balBase:{fontSize:12,color:t.subtext,fontStyle:'italic',marginTop:1},
    subTotalBox:{alignItems:'flex-end'},
    subTotalLbl:{fontSize:11,color:t.subtext,marginBottom:2},
    subTotalVal:{fontSize:14,fontWeight:'700',color:t.primary},
    linkedRow:{flexDirection:'row',alignItems:'flex-start',marginBottom:10,flexWrap:'wrap'},
    linkedLbl:{fontSize:11,color:t.subtext,marginTop:2},
    linkedTags:{flexDirection:'row',flexWrap:'wrap',gap:5,flex:1},
    linkedTag:{backgroundColor:t.primary+'18',borderRadius:6,paddingHorizontal:7,paddingVertical:3},
    linkedTagTxt:{fontSize:10,color:t.primary,fontWeight:'600'},
    subsSection:{backgroundColor:t.background,borderRadius:10,padding:10,marginBottom:10},
    subsTitle:{fontSize:11,fontWeight:'700',color:t.subtext,textTransform:'uppercase',marginBottom:8},
    subRow:{flexDirection:'row',alignItems:'center',paddingVertical:7,borderBottomWidth:1,borderBottomColor:t.border,gap:8},
    subDot:{width:8,height:8,borderRadius:4},
    subInfo:{flex:1},
    subName:{fontSize:13,fontWeight:'600',color:t.text},
    subPurpose:{fontSize:11,color:t.subtext,marginTop:1},
    subBal:{fontSize:13,fontWeight:'700',color:t.text},
    subEditBtn:{padding:3},
    accActions:{flexDirection:'row',borderTopWidth:1,borderTopColor:t.border,paddingTop:10,gap:0},
    accActionBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,padding:8},
    accActionTxt:{fontSize:12,fontWeight:'600'},
    // Modals
    overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.55)',justifyContent:'flex-end'},
    modal:{backgroundColor:t.card,borderTopLeftRadius:22,borderTopRightRadius:22,padding:20,paddingBottom:36},
    modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},
    modalTitle:{fontSize:17,fontWeight:'700',color:t.text},
    poolBanner:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:t.success+'18',borderRadius:10,padding:12,marginBottom:14},
    poolBannerLbl:{fontSize:12,color:t.subtext},
    poolBannerVal:{fontSize:18,fontWeight:'800'},
    parentBanner:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:t.border,borderRadius:10,padding:10,marginBottom:14},
    parentBannerTxt:{fontSize:13,color:t.text},
    lbl:{fontSize:13,fontWeight:'700',color:t.text,marginBottom:8},
    opt:{fontWeight:'400',color:t.subtext},
    input:{borderWidth:1,borderColor:t.border,borderRadius:10,padding:13,marginBottom:12,fontSize:15,color:t.text,backgroundColor:t.background},
    convNote:{fontSize:12,color:t.subtext,marginBottom:10,marginTop:-8,fontStyle:'italic'},
    subBalBase:{fontSize:12,color:t.subtext,marginTop:4,fontStyle:'italic'},
    chips:{flexDirection:'row',gap:8},
    chip:{paddingHorizontal:12,paddingVertical:7,borderRadius:18,backgroundColor:t.background,borderWidth:1,borderColor:t.border},
    chipSel:{backgroundColor:t.primary,borderColor:t.primary},
    chipTxt:{fontSize:12,color:t.text},
    chipTxtSel:{color:'#fff',fontWeight:'600'},
    btnRow:{flexDirection:'row',gap:10,marginTop:6},
    btn:{flex:1,padding:14,borderRadius:10,alignItems:'center'},
    btnCancel:{backgroundColor:t.light},
    btnCancelTxt:{fontSize:14,fontWeight:'600',color:t.subtext},
    btnSave:{backgroundColor:t.primary},
    btnSaveTxt:{fontSize:14,fontWeight:'600',color:'#fff'},
  });
}
