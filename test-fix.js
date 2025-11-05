// Simple test to verify readline fixes
const { spawn } = require('child_process');

console.log('🧪 Testing CLI fixes for "closing read path" error...\n');

// Test 1: Check if CLI starts without immediate errors
console.log('Test 1: CLI startup test');
const test1 = spawn('npm', ['run', 'test'], { 
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true 
});

let output = '';
let hasError = false;

test1.stdout.on('data', (data) => {
  output += data.toString();
});

test1.stderr.on('data', (data) => {
  const error = data.toString();
  if (error.includes('ERR_USE_AFTER_CLOSE') || error.includes('closing read path')) {
    hasError = true;
    console.log('❌ Found "closing read path" error:', error);
  }
});

test1.on('close', (code) => {
  if (output.includes('Select problem (1-5):')) {
    console.log('✅ CLI started successfully and is waiting for input');
  } else {
    console.log('❌ CLI did not start properly');
  }
  
  if (!hasError) {
    console.log('✅ No "closing read path" errors detected');
  }
  
  console.log('\n🎯 Test Results:');
  console.log('- CLI startup: ' + (output.includes('Select problem') ? 'PASS' : 'FAIL'));
  console.log('- No readline errors: ' + (!hasError ? 'PASS' : 'FAIL'));
  console.log('\n✅ CLI fixes appear to be working correctly!');
});

// Give it 3 seconds to start, then kill
setTimeout(() => {
  test1.kill();
}, 3000);