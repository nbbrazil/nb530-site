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
        description: PRODUTO + ' Tam.' + size, externalRef: orderId,
        payer: { name: payer.name.trim(), taxId, email: payer.email.trim(), phone },
        items: [{ quantity: parseInt(qty), name: PRODUTO, price: amountInt, type: 'DIGITAL' }],
  };

  if (method === 'CREDIT_CARD' && card) {
        const [month, year] = (card.expiry || '/').split('/');
        payload.card = { number: card.number.replace(/\s/g,''), holderName: card.holder.toUpperCase(), expiryMonth: month.trim(), expiryYear: '20'+year.trim(), cvv: card.cvv, installments: parseInt(card.installments||1) };
  }

  const headers = { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' };

  // Passo 1: Cria a transacao
  const r1 = await fetch(MAGICPAY_URL, { method: 'POST', headers, body: JSON.stringify(payload) });
    const d1 = await r1.json();
    if (!r1.ok) return res.status(400).json({ success: false, message: d1.message || JSON.stringify(d1) });

  const txId = d1.id;
    console.log('TX criada:', txId, 'status:', d1.status);

  // Passo 2: Busca os detalhes com o pixCode (aguarda 1s para MagicPay processar)
  await new Promise(r => setTimeout(r, 1500));
    const r2 = await fetch(MAGICPAY_URL + '/' + txId, { headers });
    const d2 = await r2.json();
    console.log('TX detalhes keys:', Object.keys(d2));

  // Extrai pixCode de todos os campos possiveis
  const pixCode = d2.pixCode || d2.pix_code || d2.emv || d2.brCode || d2.qrCode ||
        (d2.data && (d2.data.emvqrcps || d2.data.qrcode || d2.data.emv || d2.data.brCode)) ||
        d1.pixCode || d1.emv || '';
    const pixQrUrl = d2.pixQrUrl || d2.qrUrl || (d2.data && d2.data.qrcodeUrl) || '';
    console.log('pixCode len:', pixCode.length, 'primeiros 50:', pixCode.substring(0,50));

  return res.status(200).json({ success: true, orderId, pixCode, pixQrUrl, status: d2.status || d1.status || '' });
}
