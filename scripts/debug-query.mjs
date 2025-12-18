import { Session } from '../src/runtime/session.mjs';

const session = new Session({ geometry: 2048 });
const dsl = `
  isA Alice Customer
  isA Customer Buyer
  isA Buyer Participant
  isA Participant Actor
  isA Actor Entity
  has Alice CreditCard
  isA CreditCard Card
  isA Card PaymentMethod
  has Bob DebitCard
  isA DebitCard Card
  has Eve Cash
  isA Cash PaymentMethod
  @payCond has ?x PaymentMethod
  @payConc can ?x Pay
  Implies $payCond $payConc
`;
console.log('learn', session.learn(dsl));
const query = '@q can ?who Pay';
const result = await session.query(query);
console.dir(result, { depth: 5 });
