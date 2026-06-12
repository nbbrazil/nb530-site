const API_KEY = process.env.MAGICPAY_API_KEY;
const MAGICPAY_URL = 'https://api.sistema-magicpay.com/v1/payment';
const PRODUTO = 'Tenis New Balance 530';

export default async function handler(req, res) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              if (req.method === 'OPTIONS') return res.status(200).end();
              if (req.method !== 'POST') return res.status(405).json({ success: false });

  const { payer, qty, size, amount, method, card } = req.body;
              const taxId = String(payer.taxId).replace(/\D/g, '');
              const phone = String(payer.phone).replace(/\D/g, '');
              const orderId = 'NB530-' + Date.now();
              const amountInt = parseInt(amount);

  const payload = {
                  amount: amountInt, currency: 'BRL', method: method,
                  description: PRODUTO + ' Tam.' + size,
                  externalRef: orderId,
                  payer: { name: payer.name.trim(), taxId, email: payer.email.trim(), phone },
                  items: [{ quantity: parseInt(qty), name: PRODUTO, price: amountInt, type: 'DIGITAL' }],
  };

  if (method === 'CREDIT_CARD' && card) {
                  const [month, year] = (card.expiry || '/').split('/');
                  payload.card = { number: card.number.replace(/\s/g,''), holderName: card.holder.toUpperCase(), expiryMonth: month.trim(), expiryYear: '20'+year.trim(), cvv: card.cvv, installments: parseInt(card.installments||1) };
  }

  const response = await fetch(MAGICPAY_URL, {
                  method: 'POST',
                  headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
  });

  const data = await response.json();
              // Loga o objeto COMPLETO para ver onde esta o PIX
  console.log('FULL DATA:', JSON.stringify(data));

  if (response.ok) {
                  const d = data;
                  const pixCode = d.pixCode || d.pix_code || d.emv || d.brCode || d.qrCode ||
                                    (d.data && (d.data.emvqrcps || d.data.qrcode || d.data.code || d.data.emv || d.data.brCode)) ||
                                    (d.splits && d.splits[0] && (d.splits[0].pixCode || d.splits[0].emv || d.splits[0].qrCode)) || '';
                  const pixQrUrl = d.pixQrUrl || d.qrUrl || (d.data && (d.data.qrcodeUrl || d.data.qrUrl)) || '';
                  console.log('RESULT pixCode len:', pixCode.length);
                  return res.status(200).json({ success: true, orderId, pixCode, pixQrUrl, status: d.status || '' });
  }
              return res.status(400).json({ success: false, message: data.message || data.error || JSON.stringify(data) });
}
