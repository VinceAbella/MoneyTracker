import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../../App';

const INCOME_CATEGORIES = ['Salary','Freelance','Business','Investment Returns','Rental','Gift','Bonus','Side Hustle','Other'];
const CURRENCIES = ['PHP','USD','EUR','GBP','JPY','SGD','AUD','CAD','CNY','KRW','PLN'];

export default function IncomeScreen({ navigation }) {
  const { appData, saveData, theme } = useContext(AppContext);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Salary');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState(appData.baseCurrency);
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRate, setCustomRate] = useState('');
  const s = makeStyles(theme);

  const incomes = appData.incomes || [];

  const fmt = (a, c) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: c || appData.baseCurrency }).format(a);
  const fmtBase = (a) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: appData.baseCurrency }).format(a);

  // Income pool = total income - what's been transferred to accounts
  const totalIncomePool = incomes.reduce((sum, i) => {
    const r = appData.exchangeRates[i.currency] || 1;
    const br = appData.exchangeRates[appData.baseCurrency] || 1;
    return sum + (i.amount / r) * br;
  }, 0);

  const totalTransferred = (appData.transfers || []).reduce((sum, t) => {
    const r = appData.exchangeRates[t.currency] || 1;
    const br = appData.exchangeRates[appData.baseCurrency] || 1;
    return sum + (t.amount / r) * br;
  }, 0);

  const availablePool = totalIncomePool - totalTransferred;

  const now = new Date();
  const totalMonth = incomes
    .filter(i => { const d = new Date(i.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((sum, i) => { const r = appData.exchangeRates[i.currency] || 1, br = appData.exchangeRates[appData.baseCurrency] || 1; return sum + (i.amount / r) * br; }, 0);

  const resetForm = () => { setAmount(''); setCategory('Salary'); setNote(''); setDate(new Date().toISOString().split('T')[0]); setCurrency(appData.baseCurrency); setUseCustomRate(false); setCustomRate(''); };

  const addIncome = () => {
    if (!amount || isNaN(parseFloat(amount))) { Alert.alert('Error', 'Enter valid amount'); return; }
    // Income goes into pool only — not directly into any account
    const entry = { 
      id: Date.now().toString(), 
      amount: parseFloat(amount), 
      category, 
      note, 
      date, 
      currency,
      customRate: useCustomRate ? parseFloat(customRate) : null
    };
    saveData({ incomes: [entry, ...incomes] });
    resetForm();
    setAddModal(false);
  };

  const openEdit = (inc) => { setEditing(inc); setAmount(String(inc.amount)); setCategory(inc.category); setNote(inc.note || ''); setDate(inc.date); setCurrency(inc.currency); setUseCustomRate(!!inc.customRate); setCustomRate(inc.customRate ? String(inc.customRate) : ''); setEditModal(true); };

  const saveEdit = () => {
    if (!amount || isNaN(parseFloat(amount))) { Alert.alert('Error', 'Enter valid amount'); return; }
    saveData({ incomes: incomes.map(i => i.id === editing.id ? { 
      ...i, 
      amount: parseFloat(amount), 
      category, 
      note, 
      date, 
      currency,
      customRate: useCustomRate ? parseFloat(customRate) : null
    } : i) });
    setEditModal(false);
  };

  const deleteIncome = (inc) => Alert.alert('Delete Income', 'This will remove it from your income pool.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => saveData({ incomes: incomes.filter(i => i.id !== inc.id) }) }
  ]);

  const grouped = {};
  incomes.forEach(i => { const d = new Date(i.date).toLocaleDateString(); if (!grouped[d]) grouped[d] = []; grouped[d].push(i); });

  const FormContent = React.memo(({ onSave, onCancel, saveLabel, amount, setAmount, category, setCategory, note, setNote, date, setDate, currency, setCurrency, useCustomRate, setUseCustomRate, customRate, setCustomRate, appData, theme, fmt, fmtBase }) => (
    <ScrollView keyboardShouldPersistTaps="handled">
      <View style={s.modal}>
        <Text style={s.modalTitle}>{saveLabel === 'Add Income' ? 'Add Income' : 'Edit Income'}</Text>

        <View style={s.infoBox}>
          <Ionicons name="information-circle" size={16} color={theme.primary} />
          <Text style={s.infoTxt}>Income goes into your income pool. Use Transfer to move funds into your accounts.</Text>
        </View>

        <Text style={s.lbl}>Amount</Text>
        <TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0.00" placeholderTextColor={theme.subtext} />
        <Text style={s.lbl}>Category</Text>
        <View style={s.chips}>{INCOME_CATEGORIES.map(c => <TouchableOpacity key={c} style={[s.chip, category === c && s.chipSel]} onPress={() => setCategory(c)}><Text style={[s.chipTxt, category === c && s.chipTxtSel]}>{c}</Text></TouchableOpacity>)}</View>
        <Text style={s.lbl}>Currency</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={s.chips}>{CURRENCIES.map(c => <TouchableOpacity key={c} style={[s.chip, currency === c && s.chipSel]} onPress={() => setCurrency(c)}><Text style={[s.chipTxt, currency === c && s.chipTxtSel]}>{c}</Text></TouchableOpacity>)}</View>
        </ScrollView>

        {/* Custom Rate Override */}
        <View style={s.customRateRow}>
          <TouchableOpacity style={[s.customRateToggle, useCustomRate && s.customRateToggleOn]} onPress={()=>setUseCustomRate(!useCustomRate)}>
            <Ionicons name={useCustomRate ? 'checkmark-circle' : 'radio-button-off'} size={18} color={useCustomRate ? '#fff' : theme.subtext}/>
            <Text style={[s.customRateTxt, useCustomRate && {color:'#fff'}]}>Use custom exchange rate</Text>
          </TouchableOpacity>
        </View>
        {useCustomRate && (
          <View style={s.customRateInput}>
            <Text style={s.lbl}>1 {currency} = ? {appData.baseCurrency} (on income date)</Text>
            {(() => {
              const currencyRate = appData.exchangeRates[currency] || 1;
              const baseRate = appData.exchangeRates[appData.baseCurrency] || 1;
              const liveRate = (baseRate / currencyRate).toFixed(4);
              return liveRate && <Text style={s.convNote}>Live rate: 1 {currency} = {liveRate} {appData.baseCurrency}</Text>;
            })()}
            <TextInput style={s.input} value={customRate} onChangeText={setCustomRate} keyboardType="numeric" placeholder="e.g. 1.0" placeholderTextColor={theme.subtext}/>
            {parseFloat(amount)>0 && parseFloat(customRate)>0 && currency!==appData.baseCurrency && (
              <Text style={[s.convNote,{color:theme.warning}]}>With custom rate: {fmt(parseFloat(amount),currency)} = {fmtBase(parseFloat(amount)*parseFloat(customRate))}</Text>
            )}
          </View>
        )}

        <Text style={s.lbl}>Note</Text>
        <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="Note..." placeholderTextColor={theme.subtext} />
        <Text style={s.lbl}>Date (YYYY-MM-DD)</Text>
        <TextInput style={s.input} value={date} onChangeText={setDate} placeholderTextColor={theme.subtext} />
        <View style={s.row}>
          <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={onCancel}><Text style={s.btnCancelTxt}>Cancel</Text></TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.btnSave]} onPress={onSave}><Text style={s.btnSaveTxt}>{saveLabel}</Text></TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  ));

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Income</Text>
          <Text style={s.subtitle}>This month: {fmt(totalMonth)}</Text>
        </View>
        <TouchableOpacity onPress={() => setAddModal(true)}>
          <Ionicons name="add-circle" size={32} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Income Pool Summary */}
      <View style={s.poolCard}>
        <View style={s.poolRow}>
          <View style={s.poolItem}>
            <Text style={s.poolLbl}>Total Income</Text>
            <Text style={[s.poolVal, { color: theme.success }]}>{fmt(totalIncomePool)}</Text>
          </View>
          <View style={s.poolItem}>
            <Text style={s.poolLbl}>Transferred Out</Text>
            <Text style={[s.poolVal, { color: theme.warning }]}>{fmt(totalTransferred)}</Text>
          </View>
        </View>
        <View style={s.poolAvail}>
          <Text style={s.poolAvailLbl}>Available in Pool</Text>
          <Text style={[s.poolAvailVal, { color: availablePool >= 0 ? theme.primary : theme.danger }]}>{fmt(availablePool)}</Text>
        </View>
        <TouchableOpacity style={s.transferBtn} onPress={() => navigation.navigate('Transfer')}>
          <Ionicons name="swap-horizontal" size={16} color="#fff" />
          <Text style={s.transferBtnTxt}>Transfer to Account</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content}>
        {Object.keys(grouped).length === 0 && (
          <View style={s.empty}>
            <Ionicons name="trending-up-outline" size={64} color={theme.border} />
            <Text style={s.emptyTxt}>No income recorded yet</Text>
            <Text style={s.emptySub}>Add income first, then transfer to accounts</Text>
          </View>
        )}
        {Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)).map(date => (
          <View key={date} style={s.group}>
            <Text style={s.groupDate}>{date}</Text>
            {grouped[date].map(inc => (
              <View key={inc.id} style={s.card}>
                <View style={s.icon}><Ionicons name="trending-up" size={20} color={theme.success} /></View>
                <View style={s.details}>
                  <Text style={s.cat}>{inc.category}</Text>
                  <Text style={s.noteText}>{inc.note || 'No note'}</Text>
                  <Text style={s.cur}>{inc.currency}</Text>
                </View>
                <Text style={s.amt}>{fmt(inc.amount, inc.currency)}</Text>
                <TouchableOpacity style={s.actBtn} onPress={() => openEdit(inc)}><Ionicons name="pencil" size={15} color={theme.primary} /></TouchableOpacity>
                <TouchableOpacity style={s.actBtn} onPress={() => deleteIncome(inc)}><Ionicons name="trash" size={15} color={theme.danger} /></TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <Modal visible={addModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <FormContent 
            onSave={addIncome} 
            onCancel={() => { setAddModal(false); resetForm(); }} 
            saveLabel="Add Income"
            amount={amount}
            setAmount={setAmount}
            category={category}
            setCategory={setCategory}
            note={note}
            setNote={setNote}
            date={date}
            setDate={setDate}
            currency={currency}
            setCurrency={setCurrency}
            useCustomRate={useCustomRate}
            setUseCustomRate={setUseCustomRate}
            customRate={customRate}
            setCustomRate={setCustomRate}
            appData={appData}
            theme={theme}
            fmt={fmt}
            fmtBase={fmtBase}
          />
        </View>
      </Modal>

      <Modal visible={editModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <FormContent 
            onSave={saveEdit} 
            onCancel={() => setEditModal(false)} 
            saveLabel="Save Changes"
            amount={amount}
            setAmount={setAmount}
            category={category}
            setCategory={setCategory}
            note={note}
            setNote={setNote}
            date={date}
            setDate={setDate}
            currency={currency}
            setCurrency={setCurrency}
            useCustomRate={useCustomRate}
            setUseCustomRate={setUseCustomRate}
            customRate={customRate}
            setCustomRate={setCustomRate}
            appData={appData}
            theme={theme}
            fmt={fmt}
            fmtBase={fmtBase}
          />
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingTop: 60, backgroundColor: t.card },
    title: { fontSize: 28, fontWeight: '800', color: t.text, marginBottom: 4 },
    subtitle: { fontSize: 15, color: t.success, fontWeight: '600' },
    poolCard: { margin: 18, padding: 18, backgroundColor: t.card, borderRadius: 16, elevation: 2 },
    poolRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: t.border },
    poolItem: {},
    poolLbl: { fontSize: 12, color: t.subtext, marginBottom: 4 },
    poolVal: { fontSize: 18, fontWeight: '700' },
    poolAvail: { alignItems: 'center', marginBottom: 14 },
    poolAvailLbl: { fontSize: 13, color: t.subtext, marginBottom: 4 },
    poolAvailVal: { fontSize: 28, fontWeight: '800' },
    transferBtn: { backgroundColor: t.primary, borderRadius: 12, padding: 13, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    transferBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
    content: { flex: 1, padding: 18 },
    group: { marginBottom: 18 },
    groupDate: { fontSize: 13, fontWeight: '700', color: t.subtext, marginBottom: 10 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.card, borderRadius: 12, padding: 12, marginBottom: 8, elevation: 1 },
    icon: { width: 36, height: 36, borderRadius: 9, backgroundColor: t.success + '22', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    details: { flex: 1 },
    cat: { fontSize: 14, fontWeight: '600', color: t.text, marginBottom: 2 },
    noteText: { fontSize: 12, color: t.subtext, marginBottom: 2 },
    cur: { fontSize: 11, color: t.subtext },
    amt: { fontSize: 14, fontWeight: '700', color: t.success, marginRight: 4 },
    actBtn: { padding: 6 },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyTxt: { fontSize: 16, fontWeight: '600', color: t.subtext, marginTop: 16, marginBottom: 6 },
    emptySub: { fontSize: 13, color: t.subtext, textAlign: 'center', paddingHorizontal: 40 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modal: { backgroundColor: t.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 19, fontWeight: '700', color: t.text, marginBottom: 12 },
    infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: t.primary + '18', borderRadius: 10, padding: 12, marginBottom: 16 },
    infoTxt: { fontSize: 13, color: t.text, flex: 1, lineHeight: 18 },
    lbl: { fontSize: 13, fontWeight: '700', color: t.text, marginBottom: 8 },
    input: { borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 16, color: t.text, backgroundColor: t.background },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: t.background, borderWidth: 1, borderColor: t.border },
    chipSel: { backgroundColor: t.primary, borderColor: t.primary },
    chipTxt: { fontSize: 13, color: t.text },
    chipTxtSel: { color: '#fff', fontWeight: '600' },
    row: { flexDirection: 'row', gap: 12, marginTop: 8 },
    btn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
    btnCancel: { backgroundColor: t.light },
    btnCancelTxt: { fontSize: 15, fontWeight: '600', color: t.subtext },
    btnSave: { backgroundColor: t.primary },
    btnSaveTxt: { fontSize: 15, fontWeight: '600', color: '#fff' },
    customRateRow: { marginBottom: 14 },
    customRateToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.card },
    customRateToggleOn: { backgroundColor: t.primary, borderColor: t.primary },
    customRateTxt: { fontSize: 13, fontWeight: '600', color: t.text },
    customRateInput: { backgroundColor: t.card, borderRadius: 10, padding: 12, marginBottom: 14 },
    convNote: { fontSize: 11, color: t.subtext, marginTop: 4, marginBottom: 8, fontStyle: 'italic' },
  });
}
