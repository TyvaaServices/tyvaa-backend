export function generatePaymentLink({amount}) {
    return `https://pay.wave.com/m/M_sn_7lpUxnUvMXtX/c/sn/?amount=${encodeURIComponent(amount)}`;
}
