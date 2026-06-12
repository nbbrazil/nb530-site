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
    const orderId = 'NB530-' + Date.now();

  const payload = {
        amount: parseInt(amount),
        currency: 'BRL',
        method: method,
        description: qty > 1 ? PRODUTO + ' Tam.' + size + ' (' + qty + ' pares)' : PRODUTO + ' Tam.' + size,
        externalRef: orderId,
        payer: {
                name: payer.name.trim(),
                taxId: payer.taxId.replace(/\D/g, ''),
                email: payer.email.trim(),
                phone: '55' + payer.phone.replace(/\D/g, ''),
        },
        items: [{ quantity: parseInt(qty), name: PRODUTO + ' Tam.' + size, price: parseInt(amount), type: 'PHYSICAL' }],
  };

  if (method === 'CREDIT_CARD' && card) {
        const [month, year] = (card.expiry || '/').split('/');
        payload.card = {
                number: card.number.replace(/\s/g, ''),
                holderName: card.holder.toUpperCase(),
                expiryMonth: month.trim(),
                expiryYear: '20' + year.trim(),
                cvv: card.cvv,
                installments: parseInt(card.installments || 1),
        };
  }

  const response = await fetch(MAGICPAY_URL, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (response.ok) {
        return res.status(200).json({
                success: true, orderId,
                pixCode: data.pixCode || data?.pix?.code || '',
                pixQrUrl: data.pixQrUrl || data?.pix?.qrUrl || '',
                status: data.status || '',
        });
  }
    return res.status(400).json({ success: false, message: data.message || data.error || JSON.stringify(data) });
}
