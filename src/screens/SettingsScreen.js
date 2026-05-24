import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

export default function SettingsScreen({ navigation }) {
  const { appData, saveData, theme } = useContext(AppContext);
  const s = makeStyles(theme);

  const clearData = (type) => {
    const labels = {
      all:'ALL Data', expenses:'Expenses', budget:'Budgets',
      loans:'Loans', income:'Income & Transfers',
    };
    Alert.alert(`Clear ${labels[type]}`, `This will permanently delete all ${labels[type].toLowerCase()}.`, [
      { text:'Cancel', style:'cancel' },
      { text:'Delete', style:'destructive', onPress:() => {
        if      (type==='all')      saveData({accounts:[],expenses:[],budget:[],loans:[],netWorth:[],incomes:[],investments:[],transfers:[],customCategories:[]});
        else if (type==='expenses') saveData({expenses:[]});
        else if (type==='budget')   saveData({budget:[]});
        else if (type==='loans')    saveData({loans:[]});
        else if (type==='income')   saveData({incomes:[],transfers:[]});
      }},
    ]);
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.header}><Text style={s.title}>Settings</Text></View>

      {/* Appearance */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Appearance</Text>
        <View style={s.row}>
          <View style={[s.rowIcon,{backgroundColor:theme.primary+'22'}]}>
            <Ionicons name={appData.darkMode?'moon':'sunny'} size={20} color={theme.primary}/>
          </View>
          <Text style={s.rowText}>Dark Mode</Text>
          <Switch
            value={!!appData.darkMode}
            onValueChange={v=>saveData({darkMode:v})}
            trackColor={{false:theme.border,true:theme.primary}}
            thumbColor={appData.darkMode?'#fff':theme.subtext}
          />
        </View>
      </View>

      {/* Navigation shortcuts */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>More Screens</Text>
        {[
          {title:'Net Worth Tracker', icon:'analytics',        color:theme.accent,   bg:theme.accent+'22',   screen:'NetWorth'},
          {title:'Investments',       icon:'bar-chart',        color:theme.primary,  bg:theme.primary+'22',  screen:'Investments'},
          {title:'Transfer Money',    icon:'swap-horizontal',  color:theme.success,  bg:theme.success+'22',  screen:'Transfer'},
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
            {label:'Accounts',   val:appData.accounts.length},
            {label:'Expenses',   val:appData.expenses.length},
            {label:'Budgets',    val:appData.budget.length},
            {label:'Loans',      val:(appData.loans||[]).length},
            {label:'Incomes',    val:(appData.incomes||[]).length},
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
    </ScrollView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container:{flex:1,backgroundColor:t.background},
    header:{padding:24,paddingTop:60,backgroundColor:t.card},
    title:{fontSize:28,fontWeight:'800',color:t.text},
    section:{margin:18,marginBottom:0},
    sectionTitle:{fontSize:12,fontWeight:'700',color:t.subtext,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12},
    row:{flexDirection:'row',alignItems:'center',backgroundColor:t.card,borderRadius:12,padding:16,marginBottom:8},
    rowIcon:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',marginRight:12},
    rowText:{flex:1,fontSize:15,fontWeight:'600',color:t.text},
    menuItem:{flexDirection:'row',alignItems:'center',backgroundColor:t.card,borderRadius:12,padding:14,marginBottom:8},
    menuIcon:{width:36,height:36,borderRadius:9,alignItems:'center',justifyContent:'center',marginRight:12},
    menuText:{flex:1,fontSize:14,fontWeight:'600',color:t.text},
    statsGrid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',backgroundColor:t.card,borderRadius:12,padding:14},
    statBox:{width:'30%',alignItems:'center',padding:8},
    statVal:{fontSize:22,fontWeight:'800',color:t.primary,marginBottom:4},
    statLbl:{fontSize:11,color:t.subtext,textAlign:'center'},
    clearBtn:{flexDirection:'row',alignItems:'center',gap:10,padding:14,borderRadius:12,borderWidth:1,marginBottom:8},
    clearBtnTxt:{fontSize:14,fontWeight:'700'},
  });
}
