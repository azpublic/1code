const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': '1code-fork-analyzer'
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function getBranches(owner) {
  try {
    const branches = await fetchJSON(`https://api.github.com/repos/${owner}/1code/branches`);
    return branches.map(b => ({
      name: b.name,
      commit: b.commit.sha.substring(0, 7)
    }));
  } catch (e) {
    return [];
  }
}

async function getRecentCommits(owner, perPage = 20) {
  try {
    const commits = await fetchJSON(`https://api.github.com/repos/${owner}/1code/commits?per_page=${perPage}`);
    return commits.map(c => ({
      sha: c.sha.substring(0, 7),
      message: c.commit.message.split('\n')[0],
      author: c.author?.login || c.commit.author.name,
      date: c.commit.author.date
    }));
  } catch (e) {
    return [];
  }
}

async function getReadme(owner) {
  try {
    const readme = await fetchJSON(`https://api.github.com/repos/${owner}/1code/readme`);
    const content = Buffer.from(readme.content, 'base64').toString('utf-8');
    return content.substring(0, 500); // First 500 chars
  } catch (e) {
    return '';
  }
}

async function analyzeFork(owner, stars, description) {
  console.log(`\n🔍 Analyzing @${owner} (⭐ ${stars})...`);

  const [branches, commits, readme] = await Promise.all([
    getBranches(owner),
    getRecentCommits(owner, 30),
    getReadme(owner)
  ]);

  const nonMainBranches = branches.filter(b => b.name !== 'main');
  const customCommits = commits.filter(c => {
    const msg = c.message.toLowerCase();
    return !msg.includes('merge') && !msg.includes('sync') && !msg.includes('upstream') &&
           !msg.startsWith('release v') && !msg.startsWith('merge branch');
  });

  return {
    owner,
    stars,
    description,
    branches: nonMainBranches,
    customCommits: customCommits.slice(0, 10),
    readmePreview: readme,
    url: `https://github.com/${owner}/1code`
  };
}

async function main() {
  const interestingForks = [
    { owner: 'aadivar', stars: 6, description: 'Original contributor' },
    { owner: 'tum4y', stars: 3, description: 'Popular fork' },
    { owner: 'CyizaLandry5', stars: 3, description: 'Popular fork' },
    { owner: 'AndreiTelteu', stars: 0, description: 'Windows path fixes' },
    { owner: 'JamesChampion', stars: 1, description: 'Starred fork' },
    { owner: 'AkaraChen', stars: 1, description: 'Free binary variant' }
  ];

  const results = [];

  for (const fork of interestingForks) {
    try {
      const analysis = await analyzeFork(fork.owner, fork.stars, fork.description);
      results.push(analysis);
    } catch (e) {
      console.error(`Error analyzing ${fork.owner}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n\n=================================');
  console.log('DETAILED FORK ANALYSIS (101-200)');
  console.log('=================================\n');

  results.forEach((r, i) => {
    console.log(`\n${i + 1}. @${r.owner} ⭐ ${r.stars}`);
    console.log(`   URL: ${r.url}`);
    console.log(`   Description: ${r.description}`);

    if (r.branches.length > 0) {
      console.log(`   📁 Branches: ${r.branches.map(b => b.name).join(', ')}`);
    }

    if (r.customCommits.length > 0) {
      console.log(`   💡 Unique commits:`);
      r.customCommits.forEach(c => {
        console.log(`      [${c.sha}] ${c.message} (${c.author})`);
      });
    }

    if (r.readmePreview && r.readmePreview.length > 0) {
      console.log(`   📖 README preview:`);
      const lines = r.readmePreview.split('\n').slice(0, 5);
      lines.forEach(line => console.log(`      ${line}`));
    }

    // Worth investigating?
    const worthIt = r.stars > 0 || r.customCommits.length > 3 || r.branches.length > 0;
    console.log(`   ${worthIt ? '✅ WORTH INVESTIGATING' : '❌ Skip'}`);
  });

  // Summary
  console.log('\n\n========== SUMMARY ==========');
  console.log('Most promising to investigate:');
  results.filter(r => r.stars >= 3 || r.customCommits.length >= 3)
    .forEach(r => {
      console.log(`  - @${r.owner}: ${r.customCommits.length} custom commits, ${r.stars} stars`);
    });
}

main().catch(console.error);
