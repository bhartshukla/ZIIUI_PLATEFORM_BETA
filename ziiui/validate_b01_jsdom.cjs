const fs = require('fs');
const { JSDOM } = require('jsdom');

// B-01: Test bare addEventListener in classic script context
console.log('=== B-01: Bare addEventListener Resolution ===');

// Test 1: Classic script (no type=module) - what ZiiUI actually generates
try {
  const dom1 = new JSDOM('<!DOCTYPE html><html><body><script>var __b01_result = "no_error"; addEventListener("load", function(){});</script></body></html>', { runScripts: 'dangerously' });
  console.log('Classic script bare addEventListener: ' + dom1.window.__b01_result);
} catch(e) {
  console.log('Classic script bare addEventListener: ERROR -', e.message);
}

// Test 2: Module script context
try {
  const dom2 = new JSDOM('<!DOCTYPE html><html><body><script type="module">var __b01m_result = "no_error"; addEventListener("load", function(){});</script></body></html>', { runScripts: 'dangerously', pretendToBeVisual: true });
  // Module scripts are deferred; wait a tick
  setTimeout(() => {
    console.log('Module script bare addEventListener: ' + (dom2.window.__b01m_result || 'THREW (undefined = ReferenceError caught by JSDOM)'));
  }, 200);
} catch(e) {
  console.log('Module script bare addEventListener: ERROR -', e.message);
}

// Test 3: Verify what builders.js generates
const html3 = fs.readFileSync('C:\\Users\\BHARTS~1\\AppData\\Local\\Temp\\kilo\\imagetrail_generated.html', 'utf8');
console.log('\n=== Generated HTML Analysis ===');
console.log('Uses <script type=module>:', html3.includes('type=module'));
console.log('Uses <script> (classic):', /<script(?![^>]*type=module)[^>]*>/.test(html3));
console.log('External scripts:', (html3.match(/<script src=/g) || []).length);
console.log('Inline scripts:', (html3.match(/<script>(?!<)/g) || []).length);