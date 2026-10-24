const { PrismaClient: WeCrunchPrisma } = require('./projects/wecrunch/node_modules/@prisma/client');
const { PrismaClient: WeChaiPrisma } = require('./projects/wechai/node_modules/@prisma/client');

async function check() {
  const crunch = new WeCrunchPrisma();
  console.log('=== WECRUNCH MEDIA ASSETS ===');
  const crunchMedia = await crunch.mediaAsset.findMany();
  for (const m of crunchMedia) {
    console.log(m.id, m.filename, m.url);
  }
  
  const crunchPages = await crunch.page.findMany({ include: { sections: true } });
  for (const p of crunchPages) {
    console.log('\nPage:', p.slug, p.title);
    for (const s of p.sections) {
      console.log('  Sec:', s.type, s.key, JSON.stringify(s.content));
    }
  }

  const chai = new WeChaiPrisma();
  console.log('\n=== WECHAI MEDIA ASSETS ===');
  const chaiMedia = await chai.mediaAsset.findMany();
  for (const m of chaiMedia) {
    console.log(m.id, m.filename, m.url);
  }

  await crunch.$disconnect();
  await chai.$disconnect();
}

check().catch(console.error);
