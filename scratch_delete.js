const { createClient } = require('@supabase/supabase-js');
const url = 'https://dqvhuxrezcreporxmghi.supabase.co';
const key = 'sb_publishable_nBix8MKCg2HpWlWGXeDLJg_uqhmpsGz';

const sb = createClient(url, key);

async function run() {
  console.log("Deleting customers...");
  const { data: d1, error: e1 } = await sb.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(e1 || "Success", d1);
  
  console.log("Deleting bookings...");
  const { data: d2, error: e2 } = await sb.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(e2 || "Success", d2);
  
  console.log("Deleting invoices...");
  const { data: d3, error: e3 } = await sb.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(e3 || "Success", d3);

  console.log("Deleting payments...");
  const { data: d4, error: e4 } = await sb.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(e4 || "Success", d4);
}

run();
