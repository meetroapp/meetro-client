import assert from 'node:assert/strict';import test from 'node:test';
import {proposeDepositInstruction} from '../src/utils/depositInstruction.js';
test('natural Deposit wording stays verbatim customerMessage',()=>{
 const text='Thank you for trusting me with your home. You can send payment via Zelle, Check or Apple Cash.';
 const patch=proposeDepositInstruction(text);assert.equal(patch.customerMessage,text);assert.equal(patch.paymentInstructions,'Zelle, Check or Apple Cash');assert.equal(patch.notes,undefined);
});
for(const text of ['payment via Zelle','pay via Zelle','payment by Check','pay with Apple Cash']) test(text,()=>{const patch=proposeDepositInstruction(text);assert.equal(patch.customerMessage,text);assert.ok(patch.paymentInstructions);});
test('empty instructions do not propose a mutation and explicit notes remain notes',()=>{assert.equal(proposeDepositInstruction('  '),null);assert.deepEqual(proposeDepositInstruction('Note: Call before arrival'),{notes:'Call before arrival'});});
