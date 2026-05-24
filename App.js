import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DashboardScreen          from './src/screens/DashboardScreen';
import BudgetScreen             from './src/screens/BudgetScreen';
import ExpensesScreen           from './src/screens/ExpensesScreen';
import AccountsScreen           from './src/screens/AccountsScreen';
import TransactionHistoryScreen from './src/screens/TransactionHistoryScreen';
import MenuScreen               from './src/screens/MenuScreen';
import IncomeScreen             from './src/screens/IncomeScreen';
import LoansScreen              from './src/screens/LoansScreen';
import SettingsScreen           from './src/screens/SettingsScreen';
import AddExpenseScreen         from './src/screens/AddExpenseScreen';
import AddAccountScreen         from './src/screens/AddAccountScreen';
import AddLoanScreen            from './src/screens/AddLoanScreen';
import NetWorthScreen           from './src/screens/NetWorthScreen';
import InvestmentsScreen        from './src/screens/InvestmentsScreen';
import TransferScreen           from './src/screens/TransferScreen';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export const LIGHT_THEME = {
  primary:'#6366F1', secondary:'#EC4899', accent:'#14B8A6',
  success:'#10B981', warning:'#F59E0B', danger:'#EF4444',
  dark:'#1F2937', light:'#F3F4F6', white:'#FFFFFF',
  card:'#FFFFFF', background:'#F9FAFB', text:'#111827',
  subtext:'#6B7280', border:'#E5E7EB',
  gradient:['#6366F1','#8B5CF6','#EC4899'], isDark:false,
};
export const DARK_THEME = {
  primary:'#818CF8', secondary:'#F472B6', accent:'#2DD4BF',
  success:'#34D399', warning:'#FBBF24', danger:'#F87171',
  dark:'#F9FAFB', light:'#374151', white:'#1F2937',
  card:'#1F2937', background:'#111827', text:'#F9FAFB',
  subtext:'#9CA3AF', border:'#374151',
  gradient:['#4338CA','#6D28D9','#BE185D'], isDark:true,
};
export const AppContext = React.createContext();

const DEFAULT_DATA = {
  accounts:[], expenses:[], budget:[], loans:[],
  netWorth:[], incomes:[], investments:[], transfers:[],
  baseCurrency:'PHP', exchangeRates:{}, darkMode:false,
  customCategories:[], quickActions:['AddExpense','AddIncome','Transfer','AddAccount','AddLoan','Investments'],
};

// 5 tabs only
const TAB_CONFIG = [
  { name:'Home',         active:'grid',          inactive:'grid-outline',         component: DashboardScreen },
  { name:'Budget',       active:'pie-chart',      inactive:'pie-chart-outline',    component: BudgetScreen },
  { name:'Expenses',     active:'receipt',        inactive:'receipt-outline',      component: ExpensesScreen },
  { name:'Accounts',     active:'wallet',         inactive:'wallet-outline',       component: AccountsScreen },
  { name:'Transactions', active:'list',           inactive:'list-outline',         component: TransactionHistoryScreen },
  { name:'Menu',         active:'menu',           inactive:'menu-outline',         component: MenuScreen },
];

function MainTabs({ theme }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const cfg = TAB_CONFIG.find(t => t.name === route.name);
          return <Ionicons name={focused ? cfg?.active : cfg?.inactive} size={size} color={color}/>;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.subtext,
        tabBarStyle: {
          backgroundColor: theme.card, borderTopWidth:0, elevation:10,
          shadowColor:'#000', shadowOffset:{width:0,height:-2},
          shadowOpacity:0.12, shadowRadius:8, height:62,
          paddingBottom:8, paddingTop:5,
        },
        headerShown: false,
        tabBarLabelStyle: { fontSize:10, fontWeight:'700' },
      })}
    >
      {TAB_CONFIG.map(cfg => (
        <Tab.Screen key={cfg.name} name={cfg.name} component={cfg.component}/>
      ))}
    </Tab.Navigator>
  );
}

export default function App() {
  const [appData, setAppData] = useState(DEFAULT_DATA);
  const [loaded,  setLoaded]  = useState(false);
  const theme = appData.darkMode ? DARK_THEME : LIGHT_THEME;

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (loaded) fetchExchangeRates(); }, [loaded]);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem('@moneytracker_v2');
      if (saved) setAppData({ ...DEFAULT_DATA, ...JSON.parse(saved) });
    } catch(e) { console.error('Load error',e); }
    setLoaded(true);
  };

  const saveData = useCallback(async (newData) => {
    setAppData(prev => {
      const updated = { ...prev, ...newData };
      AsyncStorage.setItem('@moneytracker_v2', JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  const fetchExchangeRates = async () => {
    try {
      const res  = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await res.json();
      setAppData(prev => {
        const updated = { ...prev, exchangeRates: data.rates };
        AsyncStorage.setItem('@moneytracker_v2', JSON.stringify(updated)).catch(console.error);
        return updated;
      });
    } catch(e) { console.error('Exchange rate error',e); }
  };

  if (!loaded) return null;

  const hdr = {
    headerStyle:{ backgroundColor: theme.card },
    headerTintColor: theme.text,
    headerTitleStyle:{ color: theme.text },
  };

  return (
    <AppContext.Provider value={{ appData, saveData, theme, fetchExchangeRates }}>
      <NavigationContainer>
        <StatusBar style={appData.darkMode ? 'light' : 'dark'}/>
        <Stack.Navigator screenOptions={{ headerShown:false }}>
          <Stack.Screen name="MainTabs">{() => <MainTabs theme={theme}/>}</Stack.Screen>
          <Stack.Screen name="AddExpense"  component={AddExpenseScreen}  options={{ presentation:'modal', headerShown:true, title:'Add Expense',    ...hdr }}/>
          <Stack.Screen name="AddAccount"  component={AddAccountScreen}  options={{ presentation:'modal', headerShown:true, title:'Add Account',    ...hdr }}/>
          <Stack.Screen name="AddLoan"     component={AddLoanScreen}     options={{ presentation:'modal', headerShown:true, title:'Add Loan',       ...hdr }}/>
          <Stack.Screen name="AddIncome"   component={IncomeScreen}      options={{ headerShown:true, title:'Income',        ...hdr }}/>
          <Stack.Screen name="Income"      component={IncomeScreen}      options={{ headerShown:true, title:'Income',        ...hdr }}/>
          <Stack.Screen name="Loans"       component={LoansScreen}       options={{ headerShown:true, title:'Loan Tracker',  ...hdr }}/>
          <Stack.Screen name="NetWorth"    component={NetWorthScreen}    options={{ headerShown:true, title:'Net Worth',      ...hdr }}/>
          <Stack.Screen name="Investments" component={InvestmentsScreen} options={{ headerShown:true, title:'Investments',   ...hdr }}/>
          <Stack.Screen name="Transfer"    component={TransferScreen}    options={{ presentation:'modal', headerShown:true, title:'Transfer Money', ...hdr }}/>
          <Stack.Screen name="Settings"    component={SettingsScreen}    options={{ headerShown:true, title:'Settings',      ...hdr }}/>
        </Stack.Navigator>
      </NavigationContainer>
    </AppContext.Provider>
  );
}
