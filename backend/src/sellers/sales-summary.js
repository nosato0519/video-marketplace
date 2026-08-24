export function summarizeSellerSales({ sellerId, rows }) {
  if (!sellerId) throw new Error('seller_required');
  if (!Array.isArray(rows)) throw new Error('invalid_sales_rows');

  const ownRows = rows.filter((row) => row.seller_id === sellerId);
  const paid = ownRows.filter((row) => row.status === 'paid');
  const refunded = ownRows.filter((row) => row.status === 'refunded');

  const gross = paid.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const refundedAmount = refunded.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return {
    orderCount: ownRows.length,
    paidOrderCount: paid.length,
    grossAmount: gross,
    refundedAmount,
    netBeforeFees: gross - refundedAmount,
  };
}
