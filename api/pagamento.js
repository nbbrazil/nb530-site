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
              amount: amountInt,
              currency: 'BRL',
              method: method,
              description: PRODUTO + ' Tam.' + size,
              externalRef: orderId,
              payer: { name: payer.name.trim(), taxId, email: payer.email.trim(), phone },
              items: [{ quantity: parseInt(qty), name: PRODUTO, price: amountInt, type: 'DIGITAL' }],
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
          console.log('KEYS:', JSON.stringify(Object.keys(data)));
          console.log('DATA:', JSON.stringify(data).substring(0, 500));

  if (response.ok) {
              // Tenta todos os campos possíveis onde a MagicPay pode colocar o código PIX
            const pixCode =
                          data.pixCode || data.pix_code || data.qr_code || data.emv ||
                          data.code || data.brCode || data.br_code ||
                          (data.pix && (data.pix.code || data.pix.qr_code || data.pix.emv || data.pix.brCode)) ||
                          (data.payment && (data.payment.pixCode || data.payment.code)) || '';

            const pixQrUrl =
                          data.pixQrUrl || data.qrUrl || data.qr_url || data.qrcode_url ||
                          (data.pix && (data.pix.qrUrl || data.pix.qr_url)) || '';

            return res.status(200).json({ success: true, orderId, pixCode, pixQrUrl, status: data.status || '', raw: data });
  }
          return res.status(400).json({ success: false, message: data.message || data.error || JSON.stringify(data) });
}
