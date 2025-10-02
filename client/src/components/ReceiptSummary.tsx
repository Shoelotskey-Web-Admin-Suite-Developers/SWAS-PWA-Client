import React from 'react';

export interface ReceiptSummaryProps {
  type: 'request-summary' | 'acknowledgement-receipt';
  data: any;
  branch: string;
}

const ReceiptSummary: React.FC<ReceiptSummaryProps> = ({ type, data, branch }) => {
  return (
    <div className="receipt-summary">
      <h2>{type === 'request-summary' ? 'Service Request Summary' : 'Acknowledgement Receipt'}</h2>
      <p><strong>Branch:</strong> {branch}</p>
      <p><strong>Customer Name:</strong> {data.cust_name}</p>
      <p><strong>Customer ID:</strong> {data.cust_id || 'NEW'}</p>
      <p><strong>Date:</strong> {data.date}</p>
      <hr />
      {data.shoes.map((shoe: any, i: number) => (
        <div key={i}>
          <p><strong>Shoe {i + 1}:</strong> {shoe.model}</p>
          {shoe.services.map((srv: any, j: number) => (
            <p key={j}>- {srv.name} ({srv.price})</p>
          ))}
          {shoe.additionals.map((add: any, k: number) => (
            <p key={k}>- {add.name} x{add.qty} ({add.price * add.qty})</p>
          ))}
          {shoe.rush && <p>- Rush Service ({shoe.rushFee})</p>}
          <p><strong>Subtotal:</strong> {shoe.subtotal}</p>
          <hr />
        </div>
      ))}
      <p><strong>Total Bill:</strong> {data.totalBill}</p>
      {data.discountAmount ? <p><strong>Discount:</strong> ({data.discountAmount})</p> : null}
      <p><strong>Amount Paid:</strong> {data.amountPaid}</p>
      <p><strong>Balance:</strong> {data.balance}</p>
    </div>
  );
};

export default ReceiptSummary;
