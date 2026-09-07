import React from 'react';
import { Invoice } from '../types';
import { formatNumber } from '../utils/arabic';

interface ThermalPrintReceiptProps {
  invoice: Invoice;
  storeName: string;
  storeSubtitle: string;
  storePhone?: string;
  currency?: string;
  width?: '58mm' | '80mm';
}

export const ThermalPrintReceipt: React.FC<ThermalPrintReceiptProps> = ({
  invoice,
  storeName,
  storeSubtitle,
  storePhone,
  currency = 'ر.ي',
  width = '80mm',
}) => {
  return (
    <div id="thermal-print-area" className="hidden" dir="rtl">
      {/* Header */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', marginBottom: '2px' }}>
        {storeName}
      </div>
      <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: '2px' }}>
        {storeSubtitle}
      </div>
      {storePhone && (
        <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '4px' }}>
          هاتف: {storePhone}
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: '11px' }}>
        --------------------------------
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          fontFamily: 'monospace',
        }}
      >
        <span>فاتورة #: <strong>{invoice.number}</strong></span>
        <span>{invoice.date} {invoice.time}</span>
      </div>

      <div style={{ marginTop: '2px', fontSize: '11px' }}>
        العميل: <strong>{invoice.customer || 'عميل نقدي'}</strong> ({invoice.paymentType === 'credit' ? 'آجل' : 'نقدي'})
      </div>

      <div style={{ textAlign: 'center', fontSize: '11px' }}>
        --------------------------------
      </div>

      {/* Items List */}
      <div>
        {invoice.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4px 0', fontSize: '11px' }}>
            -- لا توجد أصناف --
          </div>
        ) : (
          invoice.items.map((item, index) => {
            const qty = item.qty || 1;
            const unitPrice = qty > 0 ? (item.total / qty).toFixed(1) : '0';

            return (
              <div
                key={item.id || index}
                style={{
                  marginBottom: '3px',
                  borderBottom: '1px dotted #666',
                  paddingBottom: '2px',
                  textAlign: 'right',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                  {index + 1}. {item.name || 'صنف'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    marginTop: '1px',
                  }}
                >
                  <span>الكمية: {qty} × {unitPrice}</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {formatNumber(item.total)} {currency}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      <div style={{ textAlign: 'center', fontSize: '11px' }}>
        --------------------------------
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 'bold',
          fontSize: '13px',
          marginTop: '2px',
        }}
      >
        <span>الإجمالي الكلي:</span>
        <span>{formatNumber(invoice.total)} {currency}</span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          marginTop: '2px',
        }}
      >
        <span>عدد الأصناف:</span>
        <span>{invoice.items.length}</span>
      </div>

      <div style={{ textAlign: 'center', fontSize: '11px' }}>
        --------------------------------
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '6px', lineHeight: '1.4' }}>
        شكراً لزيارتكم {storeName}<br />
        يرجى الاحتفاظ بالإيصال
      </div>
    </div>
  );
};
