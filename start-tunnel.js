import localtunnel from 'localtunnel';

async function start() {
  console.log('🌐 Starting public HTTPS tunnel for CCDI QRScan...');
  try {
    const tunnel = await localtunnel({ port: 5173 });
    console.log('\n=============================================================');
    console.log('🚀 CCDI QRScan IS LIVE ONLINE & READY FOR CLASSMATES!');
    console.log('=============================================================');
    console.log(`🔗 Public HTTPS URL: ${tunnel.url}`);
    console.log(`📱 Local Wi-Fi (LAN) URL: http://192.168.0.102:5173`);
    console.log('=============================================================');
    console.log('💡 How to open on classmate smartphones / laptops:');
    console.log(`   1. Send them this link: ${tunnel.url}`);
    console.log('   2. If prompted by localtunnel "Tunnel Password", tell them to click "Click to Continue" or enter your public IP.');
    console.log('   3. They can log in as a Student (e.g. 2023-00101) and scan your projector QR code in real-time!\n');

    tunnel.on('close', () => {
      console.log('Tunnel closed.');
    });
  } catch (err) {
    console.error('Failed to start tunnel:', err);
  }
}

start();
