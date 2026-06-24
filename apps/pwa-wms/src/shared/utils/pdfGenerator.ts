// Helper format Rupiah
const formatRupiah = (num: any) => {
  const value = Number(num) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const generateInvoiceHTML = (transaction: any, settings?: any) => {
  const items = transaction.items || [];
  let itemRows = "";

  items.forEach((item: any, index: number) => {
    itemRows += `
      <tr>
        <td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">${index + 1}</td>
        <td style="padding:8px; border-bottom:1px solid #eee;">
          <div style="font-weight:bold;">${item.itemName || "Item Dihapus"}</div>
        </td>
        <td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">
          ${item.qty} ${item.uom || ""}
        </td>
        <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">${formatRupiah(item.price)}</td>
        <td style="padding:8px; border-bottom:1px solid #eee; text-align:right; font-weight:bold;">${formatRupiah(item.subtotal)}</td>
      </tr>
    `;
  });

  return `
    <div style="font-family:'Inter', sans-serif; max-width:800px; margin:auto; color:#333; padding:20px; border:1px solid #eee;">
      <table style="width:100%; margin-bottom:30px;">
        <tr>
          <td width="60%" valign="top">
             ${
               settings?.company_logo_url
                 ? `<img src="${settings.company_logo_url}" alt="Logo" style="height:60px; object-fit:contain; margin-bottom:10px;">`
                 : `<h1 style="margin:0; color:#0284c7;">INVOICE PIUTANG</h1>`
             }
             <div style="font-weight:bold; font-size:18px;">${settings?.company_name || "Asstro Pusat"}</div>
          </td>
          <td width="40%" valign="top" style="text-align:right;">
            <h2 style="margin:0; color:#cbd5e1; font-size:24px; letter-spacing:2px;">INVOICE</h2>
            <table style="width:100%; margin-top:10px; font-size:12px;">
              <tr>
                <td style="text-align:right; color:#64748b;">No. Invoice:</td>
                <td style="text-align:right; font-weight:bold;">${transaction.id}</td>
              </tr>
              <tr>
                <td style="text-align:right; color:#64748b;">Tanggal:</td>
                <td style="text-align:right; font-weight:bold;">${formatDate(transaction.tanggal)}</td>
              </tr>
              <tr>
                <td style="text-align:right; color:#64748b;">Status:</td>
                <td style="text-align:right; font-weight:bold; color:${
                  (transaction.status || "").toUpperCase() === "PAID"
                    ? "green"
                    : "red"
                }">
                  ${(transaction.status || "UNPAID").toUpperCase()}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="margin-bottom:30px; background:#f8fafc; padding:15px; border-radius:8px;">
        <div style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:bold; margin-bottom:5px;">Tagihan Kepada:</div>
        <div style="font-size:16px; font-weight:bold; color:#1e293b;">${transaction.outlet}</div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:30px;">
        <thead style="background:#0f172a; color:white;">
          <tr>
            <th style="padding:10px; text-align:center; width:50px;">#</th>
            <th style="padding:10px; text-align:left;">Deskripsi Item</th>
            <th style="padding:10px; text-align:center; width:80px;">Qty</th>
            <th style="padding:10px; text-align:right; width:120px;">Harga</th>
            <th style="padding:10px; text-align:right; width:120px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="padding:15px; text-align:right; font-weight:bold; border-top:2px solid #333;">TOTAL TAGIHAN</td>
            <td style="padding:15px; text-align:right; font-weight:bold; font-size:16px; color:#0284c7; border-top:2px solid #333;">
              ${formatRupiah(transaction.total)}
            </td>
          </tr>
          <tr>
            <td colspan="4" style="padding:15px; text-align:right; font-weight:bold; border-top:1px solid #eee;">TELAH DIBAYAR</td>
            <td style="padding:15px; text-align:right; font-weight:bold; font-size:14px; color:#16a34a; border-top:1px solid #eee;">
              ${formatRupiah(transaction.dibayar)}
            </td>
          </tr>
          <tr>
            <td colspan="4" style="padding:15px; text-align:right; font-weight:bold; border-top:1px solid #eee;">SISA TAGIHAN</td>
            <td style="padding:15px; text-align:right; font-weight:bold; font-size:14px; color:#dc2626; border-top:1px solid #eee;">
              ${formatRupiah(transaction.sisa)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
};

// Fungsi Trigger Browser Print
export const printHTML = (htmlContent: string) => {
  const printWindow = window.open("", "_blank", "width=800,height=900");
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Dokumen</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};
