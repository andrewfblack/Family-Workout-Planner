import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('renders sign-in instead of a blank screen when browser storage is unavailable',async()=>{
  const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const elements={
    '#app':{innerHTML:''},
    '#register':{},
    '.primary':{},
    'form':{}
  };
  const document={
    body:{className:''},
    querySelector:selector=>elements[selector],
    querySelectorAll:()=>[]
  };
  const context={document};
  Object.defineProperty(context,'localStorage',{get(){throw new Error('Storage is disabled')}});

  vm.runInNewContext(source,context);

  assert.equal(document.body.className,'auth');
  assert.match(elements['#app'].innerHTML,/Welcome to your family space/);
  assert.equal(typeof elements.form.onsubmit,'function');
});
