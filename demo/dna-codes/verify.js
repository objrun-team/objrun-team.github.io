// Browser-side recheck of the archived file. The original two host checks
// are in checker.py and final-independent-check.json in the run directory.
async function verifyDnaCertificate(raw) {
  const words = raw.trimEnd().split('\n');
  const distinct = new Set(words);
  const shape = words.every(word => /^[ACGT]{10}$/.test(word));
  const gc = words.every(word => [...word].filter(base => base === 'G' || base === 'C').length === 5);
  const complement = {A:'T', T:'A', C:'G', G:'C'};
  const reverse = word => [...word].reverse().join('');
  const comp = word => [...word].map(base => complement[base]).join('');
  const closed = words.every(word => distinct.has(reverse(word)) && distinct.has(comp(word)));
  const triples = words.every(word => {
    const parts = Array.from({length:word.length-2}, (_,i) => word.slice(i,i+3));
    return parts.every(part => !parts.includes(reverse(comp(part))));
  });
  // A nonzero two-bit slot represents exactly one differing letter.
  // Each half of a length-10 word fits in a 10-bit lookup table.
  const lettersChanged = new Uint8Array(1024);
  for (let i = 1; i < lettersChanged.length; i++) {
    lettersChanged[i] = lettersChanged[i >>> 2] + Number((i & 3) !== 0);
  }
  const encoded = words.map(word => {
    let code = 0;
    for (const base of word) code = (code << 2) | 'ACGT'.indexOf(base);
    return code;
  });
  let pairs = 0, minimum = 10;
  if (shape) {
    for (let i = 0; i < encoded.length; i++) {
      for (let j = i+1; j < encoded.length; j++) {
        const bits = encoded[i] ^ encoded[j];
        const distance = lettersChanged[bits >>> 10] + lettersChanged[bits & 1023];
        minimum = Math.min(minimum,distance);
        pairs++;
      }
    }
  }
  let hash;
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
    hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2,'0')).join('');
  }
  const size = words.length;
  return {size, unique:distinct.size, pairs, minimum, shape, gc, closed, triples, hash,
    valid:distinct.size === size && shape && gc && closed && triples && minimum >= 4};
}
