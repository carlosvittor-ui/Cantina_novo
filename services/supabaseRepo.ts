import { supabase } from '../lib/supabaseClient';
import type { Product, Sale, PaymentMethod, CashDrawer, HistoricalReport, Withdrawal } from '../types';

const todayStr = () => new Date().toISOString().split('T')[0];

// ====== LOAD (Bootstrap) ======
export async function fetchInitialData(): Promise<{
  products: Product[];
  sales: Sale[];
  cashDrawer: Partial<CashDrawer>;
  historicalReports: Record<string, HistoricalReport>;
}> {
  // Produtos
  const { data: prodData, error: prodErr } = await supabase
    .from('products')
    .select('id,name,stock,price,category,active')
    .order('name', { ascending: true });
  if (prodErr) throw new Error('Erro ao carregar produtos: ' + prodErr.message);

  const products: Product[] = (prodData || []).map(p => ({
    id: p.id,
    name: p.name,
    stock: Number(p.stock || 0),
    price: Number(p.price || 0),
    category: (p.category as any) ?? 'Alimentos',
  }));

  // Vendas + itens (últimos 60 dias)
  const since = new Date();
  since.setDate(since.getDate() - 60);

  const { data: salesData, error: salesErr } = await supabase
    .from('sales')
    .select('id,subtotal,discount_type,discount_value,discount_amount,total,payment_method,timestamp,sale_items(id,product_id,product_name,quantity,price_per_item)')
    .gte('timestamp', since.toISOString())
    .order('timestamp', { ascending: true });
  if (salesErr) throw new Error('Erro ao carregar vendas: ' + salesErr.message);

  const sales: Sale[] = (salesData || []).map((s: any) => ({
    id: s.id,
    items: (s.sale_items || []).map((it: any) => ({
      productId: it.product_id,
      productName: it.product_name,
      quantity: Number(it.quantity),
      pricePerItem: Number(it.price_per_item),
    })),
    subtotal: Number(s.subtotal),
    discountType: s.discount_type ?? undefined,
    discountValue: s.discount_value !== null ? Number(s.discount_value) : undefined,
    discountAmount: Number(s.discount_amount || 0),
    total: Number(s.total),
    paymentMethod: s.payment_method as PaymentMethod,
    timestamp: new Date(s.timestamp),
  }));

  // Caixa de hoje
  const { data: cd, error: cdErr } = await supabase
    .from('cash_drawers').select('*').eq('date', todayStr()).maybeSingle();
  if (cdErr) throw new Error('Erro ao carregar caixa do dia: ' + cdErr.message);

  // Sangrias (últimos 60 dias)
  const { data: wds, error: wdErr } = await supabase
    .from('withdrawals').select('*')
    .gte('date', since.toISOString().slice(0,10))
    .order('ts', { ascending: true });
  if (wdErr) throw new Error('Erro ao carregar sangrias: ' + wdErr.message);

  // Monta histórico por dia a partir de cash_drawers e withdrawals
  const reports: Record<string, HistoricalReport> = {};
  const { data: cds } = await supabase
    .from('cash_drawers').select('*')
    .gte('date', since.toISOString().slice(0,10))
    .order('date', { ascending: true });

  (cds || []).forEach((row: any) => {
    reports[row.date] = {
      openingCash: Number(row.opening_cash || 0),
      closingCash: row.closing_cash !== null ? Number(row.closing_cash) : 0,
      date: row.date,
      withdrawals: [],
    };
  });

  (wds || []).forEach((w: any) => {
    const d = w.date;
    if (!reports[d]) reports[d] = { openingCash: 0, closingCash: 0, date: d, withdrawals: [] };
    reports[d].withdrawals.push({
      id: w.id,
      amount: Number(w.amount),
      reason: w.reason || '',
      timestamp: new Date(w.ts),
    });
  });

  const cashDrawer: Partial<CashDrawer> = cd
    ? { isOpen: true, openingCash: Number(cd.opening_cash || 0), previousClosingCash: Number(cd.previous_closing_cash || 0) }
    : { isOpen: false, openingCash: 0, previousClosingCash: Number((cds || []).slice(-1)[0]?.closing_cash || 0) };

  return { products, sales, cashDrawer, historicalReports: reports };
}

// ====== AÇÕES ======
export async function upsertProduct(p: Product) {
  const { error } = await supabase.from('products').upsert({
    id: p.id, name: p.name, stock: p.stock, price: p.price,
    category: p.category, active: true, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error('Erro ao salvar produto: ' + error.message);
}

export async function upsertProducts(list: Product[]) {
  if (!list?.length) return;
  const rows = list.map(p => ({ id: p.id, name: p.name, stock: p.stock, price: p.price, category: p.category, active: true, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from('products').upsert(rows);
  if (error) throw new Error('Erro ao salvar produtos: ' + error.message);
}

export async function recordSale(sale: Sale) {
  const { error: e1 } = await supabase.from('sales').insert({
    id: sale.id,
    subtotal: sale.subtotal,
    discount_type: sale.discountType ?? null,
    discount_value: sale.discountValue ?? null,
    discount_amount: sale.discountAmount,
    total: sale.total,
    payment_method: sale.paymentMethod,
    timestamp: sale.timestamp.toISOString(),
  });
  if (e1) throw new Error('Erro ao salvar venda: ' + e1.message);

  const items = sale.items.map((it, idx) => ({
    id: `${sale.id}-i${idx}`,
    sale_id: sale.id,
    product_id: it.productId || null,
    product_name: it.productName,
    quantity: it.quantity,
    price_per_item: it.pricePerItem,
  }));
  const { error: e2 } = await supabase.from('sale_items').insert(items);
  if (e2) throw new Error('Erro ao salvar itens da venda: ' + e2.message);
}

export async function openCashDrawer(openingAmount: number, previousClosingCash: number) {
  const { error } = await supabase.from('cash_drawers').upsert({
    date: todayStr(), opening_cash: openingAmount, previous_closing_cash: previousClosingCash ?? 0,
  });
  if (error) throw new Error('Erro ao abrir caixa: ' + error.message);
}

export async function closeCashDrawer(closingCash: number) {
  const { error } = await supabase.from('cash_drawers').update({ closing_cash: closingCash }).eq('date', todayStr());
  if (error) throw new Error('Erro ao fechar caixa: ' + error.message);
}

export async function recordWithdrawal(w: Withdrawal, onDateISO: string) {
  const { error } = await supabase.from('withdrawals').insert({
    id: w.id, date: onDateISO, amount: w.amount, reason: w.reason, ts: w.timestamp.toISOString(),
  });
  if (error) throw new Error('Erro ao registrar sangria: ' + error.message);
}
