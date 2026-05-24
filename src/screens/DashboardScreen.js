import React, { useContext, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const { width } = Dimensions.get('window');

// All possible quick actions the user can pick
const ALL_ACTIONS = [
  { id:'AddExpense',    title:'Add Expense',    icon:'remove-circle',    color:'danger'    },
  { id:'AddIncome',     title:'Add Income',     icon:'trending-up',      color:'success'   },
  { id:'AddAccount',    title:'Add Account',    icon:'wallet',           color:'primary'   },
  { id:'AddLoan',       title:'Add Loan',       icon:'add-circle',       color:'warning'   },
  { id:'Transfer',      title:'Transfer',       icon:'swap-horizontal',  color:'secondary' },
  { id:'Investments',   title:'Investments',    icon:'bar-chart',        color:'accent'    },
  { id:'Loans',         title:'Loan Tracker',   icon:'card',             color:'warning'   },
  { id:'NetWorth',      title:'Net Worth',      icon:'analytics',        color:'accent'    },
  { id:'Income',        title:'Income List',    icon:'list',             color:'success'   },
  { id:'Budget',        title:'Budget',         icon:'pie-chart',        color:'primary'   },
  { id:'Expenses',      title:'Expenses',       icon:'receipt',          color:'danger'    },
  { id:'Accounts',      title:'Accounts',       icon:'wallet-outline',   color:'accent'    },
  { id:'Transactions',  title:'Transactions',   icon:'list-outline',     color:'secondary' },
];

export default function DashboardScreen({ navigation }) {
  const { appData, saveData, theme } = useContext(AppContext);
  const [qaModal, setQaModal] = useState(false);
  const s = makeStyles(theme);

  const toBase = (a,c) => { const r=appData.exchangeRates[c]||1,br=appData.exchangeRates[appData.baseCurrency]||1; return (a/r)*br; };
  const fmt = (a) => new Intl.NumberFormat('en-PH',{style:'currency',currency:appData.baseCurrency,minimumFractionDigits:2}).format(a);

  const accountsTotal = appData.accounts.reduce((s,a)=>s+toBase(a.balance,a.currency),0);
  const allTimeIncome = (appData.incomes||[]).reduce((s,i)=>s+toBase(i.amount,i.currency),0);
  const allTimeTransferred = (appData.transfers||[]).reduce((s,t)=>s+toBase(t.amount,t.currency),0);
  const incomePool = allTimeIncome - allTimeTransferred;
  const totalLoans = (appData.loans||[]).reduce((s,l)=>s+toBase(l.remaining,l.currency),0);
  const netWorth   = accountsTotal - totalLoans;

  const now = new Date();
  const monthExpenses = appData.expenses.filter(e=>{const d=new Date(e.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();})
    .reduce((s,e)=>s+toBase(e.amount,e.currency),0);
  const monthIncome = (appData.incomes||[]).filter(i=>{const d=new Date(i.date);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();})
    .reduce((s,i)=>s+toBase(i.amount,i.currency),0);

  const totalBudget   = appData.budget.reduce((s,b)=>s+toBase(b.allocated,b.currency||appData.baseCurrency),0);
  const budgetUsed    = totalBudget>0?(monthExpenses/totalBudget)*100:0;

  // Active quick actions
  const activeQA = (appData.quickActions||['AddExpense','Income','Transfer']);
  const selectedActions = ALL_ACTIONS.filter(a=>activeQA.includes(a.id));

  const toggleQA = (id) => {
    const cur = appData.quickActions || ['AddExpense','Income','Transfer'];
    const next = cur.includes(id) ? cur.filter(x=>x!==id) : [...cur, id];
    saveData({ quickActions: next });
  };

  const recentExpenses = appData.expenses.slice(0,5);

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={theme.gradient} style={s.header}>
        <Text style={s.greeting}>Hello! 👋</Text>
        <Text style={s.headerSub}>Your financial overview</Text>

        {/* Two balance cards */}
        <View style={s.balanceRow}>
          <View style={s.balCard}>
            <Text style={s.balCardLbl}>Accounts Balance</Text>
            <Text style={s.balCardVal}>{fmt(accountsTotal)}</Text>
            <Text style={s.balCardSub}>{appData.accounts.length} account{appData.accounts.length!==1?'s':''}</Text>
          </View>
          <View style={[s.balCard,{borderLeftWidth:1,borderLeftColor:'rgba(255,255,255,0.3)'}]}>
            <Text style={s.balCardLbl}>Income Pool</Text>
            <Text style={[s.balCardVal,{color:incomePool>=0?'#86efac':'#fca5a5'}]}>{fmt(incomePool)}</Text>
            <Text style={s.balCardSub}>Available to allocate</Text>
          </View>
        </View>

        {/* Net worth strip */}
        <View style={s.nwStrip}>
          <View style={s.nwItem}><Text style={s.nwLbl}>Net Worth</Text><Text style={[s.nwVal,{color:netWorth>=0?'#86efac':'#fca5a5'}]}>{fmt(netWorth)}</Text></View>
          <View style={s.nwDiv}/>
          <View style={s.nwItem}><Text style={s.nwLbl}>Mo. Income</Text><Text style={[s.nwVal,{color:'#86efac'}]}>{fmt(monthIncome)}</Text></View>
          <View style={s.nwDiv}/>
          <View style={s.nwItem}><Text style={s.nwLbl}>Mo. Spent</Text><Text style={[s.nwVal,{color:'#fca5a5'}]}>{fmt(monthExpenses)}</Text></View>
        </View>
      </LinearGradient>

      <View style={s.content}>
        {/* Stats */}
        <View style={s.statsGrid}>
          {[
            {icon:'pie-chart-outline',color:theme.primary,label:'Budget Used',val:`${budgetUsed.toFixed(1)}%`},
            {icon:'card-outline',color:theme.warning,label:'Total Debt',val:fmt(totalLoans)},
            {icon:'bar-chart-outline',color:theme.accent,label:'Investments',val:`${(appData.investments||[]).length} items`},
            {icon:'cash-outline',color:theme.success,label:'Income Pool',val:fmt(incomePool)},
          ].map((item,i)=>(
            <View key={i} style={[s.statCard,{borderLeftColor:item.color}]}>
              <Ionicons name={item.icon} size={20} color={item.color}/>
              <Text style={s.statLabel}>{item.label}</Text>
              <Text style={s.statVal} numberOfLines={1}>{item.val}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions header with edit button */}
        <View style={s.qaHeader}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={s.editQaBtn} onPress={()=>setQaModal(true)}>
            <Ionicons name="settings-outline" size={15} color={theme.primary}/>
            <Text style={s.editQaTxt}>Customize</Text>
          </TouchableOpacity>
        </View>

        <View style={s.actionsGrid}>
          {selectedActions.map((a,i)=>(
            <TouchableOpacity key={i} style={s.actionCard} onPress={()=>navigation.navigate(a.id)}>
              <View style={[s.actionIcon,{backgroundColor:theme[a.color]+'22'}]}>
                <Ionicons name={a.icon} size={22} color={theme[a.color]}/>
              </View>
              <Text style={s.actionTitle}>{a.title}</Text>
            </TouchableOpacity>
          ))}
          {selectedActions.length===0&&(
            <TouchableOpacity style={[s.actionCard,{width:'100%',flexDirection:'row',gap:10}]} onPress={()=>setQaModal(true)}>
              <Ionicons name="add-circle-outline" size={22} color={theme.primary}/>
              <Text style={[s.actionTitle,{color:theme.primary}]}>Tap to add quick actions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Expenses */}
        <Text style={s.sectionTitle}>Recent Expenses</Text>
        {recentExpenses.map(exp=>{
          const isForeign = exp.currency !== appData.baseCurrency;
          const baseAmt   = toBase(exp.amount,exp.currency);
          return (
            <View key={exp.id} style={s.expRow}>
              <View style={s.expIcon}><Ionicons name="receipt" size={16} color={theme.primary}/></View>
              <View style={s.expDetails}>
                <Text style={s.expCat}>{exp.category}{exp.subCategory?` › ${exp.subCategory}`:''}</Text>
                <Text style={s.expMeta}>{new Date(exp.date).toLocaleDateString()} · {exp.account||'—'}</Text>
              </View>
              <View style={s.expAmtCol}>
                <Text style={s.expAmt}>-{new Intl.NumberFormat('en-PH',{style:'currency',currency:exp.currency}).format(exp.amount)}</Text>
                {isForeign&&<Text style={s.expConv}>≈ {fmt(baseAmt)}</Text>}
                <View style={s.expCurTag}><Text style={s.expCurTagTxt}>{exp.currency}</Text></View>
              </View>
            </View>
          );
        })}
        {appData.expenses.length===0&&(
          <View style={s.empty}><Ionicons name="receipt-outline" size={48} color={theme.border}/><Text style={s.emptyTxt}>No expenses yet</Text></View>
        )}
      </View>

      {/* ── Customize Quick Actions Modal ── */}
      <Modal visible={qaModal} animationType="slide" transparent>
        <View style={s.overlay}><View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Customize Quick Actions</Text>
            <TouchableOpacity onPress={()=>setQaModal(false)}><Ionicons name="close" size={22} color={theme.subtext}/></TouchableOpacity>
          </View>
          <Text style={s.modalSub}>Tap to toggle which actions appear on your dashboard</Text>
          <ScrollView style={{maxHeight:340}} showsVerticalScrollIndicator={true}>
            {ALL_ACTIONS.map(a=>{
              const active=(appData.quickActions||[]).includes(a.id);
              return (
                <TouchableOpacity key={a.id} style={[s.qaItem,active&&s.qaItemOn]} onPress={()=>toggleQA(a.id)}>
                  <View style={[s.qaItemIcon,{backgroundColor:theme[a.color]+'22'}]}>
                    <Ionicons name={a.icon} size={20} color={theme[a.color]}/>
                  </View>
                  <Text style={[s.qaItemTxt,active&&{color:theme.primary,fontWeight:'700'}]}>{a.title}</Text>
                  <Ionicons name={active?'checkmark-circle':'ellipse-outline'} size={22} color={active?theme.primary:theme.border}/>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={[s.btn,s.btnSave,{marginTop:12}]} onPress={()=>setQaModal(false)}>
            <Text style={s.btnSaveTxt}>Done</Text>
          </TouchableOpacity>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    header:{padding:22,paddingTop:60,paddingBottom:28,borderBottomLeftRadius:28,borderBottomRightRadius:28},
    greeting:{fontSize:28,fontWeight:'800',color:'#fff',marginBottom:4},
    headerSub:{fontSize:14,color:'rgba(255,255,255,0.85)',marginBottom:18},
    balanceRow:{flexDirection:'row',backgroundColor:'rgba(255,255,255,0.18)',borderRadius:18,overflow:'hidden',marginBottom:14},
    balCard:{flex:1,padding:16},
    balCardLbl:{fontSize:11,color:'rgba(255,255,255,0.8)',marginBottom:5},
    balCardVal:{fontSize:20,fontWeight:'800',color:'#fff',marginBottom:3},
    balCardSub:{fontSize:11,color:'rgba(255,255,255,0.7)'},
    nwStrip:{flexDirection:'row',backgroundColor:'rgba(255,255,255,0.12)',borderRadius:14,padding:12},
    nwItem:{flex:1,alignItems:'center'},
    nwDiv:{width:1,backgroundColor:'rgba(255,255,255,0.25)'},
    nwLbl:{fontSize:10,color:'rgba(255,255,255,0.75)',marginBottom:3},
    nwVal:{fontSize:13,fontWeight:'700',color:'#fff'},
    content:{padding:16},
    statsGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginBottom:20},
    statCard:{width:'48%',backgroundColor:t.card,borderRadius:14,padding:14,marginBottom:10,borderLeftWidth:4,elevation:2},
    statLabel:{fontSize:11,color:t.subtext,marginTop:6,marginBottom:3},
    statVal:{fontSize:16,fontWeight:'700',color:t.text},
    qaHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},
    sectionTitle:{fontSize:16,fontWeight:'700',color:t.text},
    editQaBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:t.primary+'18',paddingHorizontal:10,paddingVertical:6,borderRadius:20},
    editQaTxt:{fontSize:12,color:t.primary,fontWeight:'600'},
    actionsGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',marginBottom:22},
    actionCard:{width:'31%',backgroundColor:t.card,borderRadius:14,padding:14,alignItems:'center',marginBottom:10,elevation:2},
    actionIcon:{width:44,height:44,borderRadius:12,alignItems:'center',justifyContent:'center',marginBottom:8},
    actionTitle:{fontSize:11,fontWeight:'600',color:t.text,textAlign:'center'},
    expRow:{flexDirection:'row',alignItems:'center',backgroundColor:t.card,borderRadius:12,padding:12,marginBottom:8,elevation:1},
    expIcon:{width:34,height:34,borderRadius:9,backgroundColor:t.primary+'22',alignItems:'center',justifyContent:'center',marginRight:10},
    expDetails:{flex:1},
    expCat:{fontSize:13,fontWeight:'600',color:t.text,marginBottom:2},
    expMeta:{fontSize:11,color:t.subtext},
    expAmtCol:{alignItems:'flex-end',minWidth:90},
    expAmt:{fontSize:13,fontWeight:'700',color:t.danger},
    expConv:{fontSize:12,color:t.subtext,fontWeight:'600',fontStyle:'italic',marginTop:1},
    expCurTag:{backgroundColor:t.border,borderRadius:5,paddingHorizontal:5,paddingVertical:1,marginTop:3,alignSelf:'flex-end'},
    expCurTagTxt:{fontSize:9,color:t.subtext,fontWeight:'700'},
    empty:{alignItems:'center',paddingVertical:30},
    emptyTxt:{fontSize:14,color:t.subtext,marginTop:10},
    // Modal
    overlay:{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
    modal:{backgroundColor:t.card,borderTopLeftRadius:24,borderTopRightRadius:24,padding:22,paddingBottom:40,maxHeight:'85%'},
    modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8},
    modalTitle:{fontSize:19,fontWeight:'700',color:t.text},
    modalSub:{fontSize:13,color:t.subtext,marginBottom:16},
    qaItem:{flexDirection:'row',alignItems:'center',padding:14,borderRadius:12,borderWidth:1,borderColor:t.border,backgroundColor:t.background,marginBottom:8,gap:12},
    qaItemOn:{borderColor:t.primary+'60',backgroundColor:t.primary+'0A'},
    qaItemIcon:{width:40,height:40,borderRadius:10,alignItems:'center',justifyContent:'center'},
    qaItemTxt:{flex:1,fontSize:14,color:t.text},
    btn:{padding:15,borderRadius:12,alignItems:'center'},
    btnSave:{backgroundColor:t.primary},
    btnSaveTxt:{fontSize:15,fontWeight:'600',color:'#fff'},
  });
}
