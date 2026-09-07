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
    <div
      id="thermal-print-area"
      dir="rtl"
      className="hidden print:block"
      style={{
        width: width === '58mm' ? '54mm' : '76mm',
        margin: '0 auto',
        fontFamily: "'Courier New', Courier, monospace, 'Cairo', Tahoma, sans-serif",
        fontSize: '13px',
        lineHeight: 1.35,
        color: '#000000',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Store Header */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginBottom: '2px' }}>
        {storeName}
      </div>
      <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: '3px' }}>
        {storeSubtitle}
      </div>
      {storePhone && (
        <div style={{ textAlign: 'center', fontSize: '11px', marginBottom: '3px' }}>
          هاتف: {storePhone}
        </div>
      )}

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

      {/* Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <span>فاتورة #: <strong>{invoice.number}</strong></span>
        <span>{invoice.time} {invoice.date}</span>
      </div>
      <div style={{ fontSize: '12px', marginTop: '2px' }}>
        العميل: <strong>{invoice.customer || 'عميل نقدي'}</strong> ({invoice.paymentType === 'credit' ? 'آجل' : 'نقدي'})
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

      {/* Items List */}
      <div>
        {invoice.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4px 0', fontSize: '12px' }}>
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
                  padding: '3px 0',
                  borderBottom: '1px dotted #888',
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                  {index + 1}. {item.name || 'صنف'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
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

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

      {/* Totals */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold',
          fontSize: '14px',
          marginTop: '3px',
        }}
      >
        <span>الإجمالي الكلي:</span>
        <span>{formatNumber(invoice.total)} {currency}</span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          marginTop: '2px',
        }}
      >
        <span>عدد الأصناف:</span>
        <span>{invoice.items.length}</span>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }}></div>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '6px', lineHeight: 1.4 }}>
        شكراً لزيارتكم {storeName}<br />
        يرجى الاحتفاظ بالإيصال
      </div>
    </div>
  );
};
