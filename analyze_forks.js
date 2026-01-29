// Script to analyze GitHub forks 201-300
const https = require('https');
const fs = require('fs');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'User-Agent': '1Code-Fork-Analyzer'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 500)}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function analyzeFork(owner) {
  try {
    // Get repo info
    const repo = await fetch(`https://api.github.com/repos/${owner}/1code`);
    const stars = repo.stargazers_count;
    const description = repo.description || '';

    // Get branches
    const branches = await fetch(`https://api.github.com/repos/${owner}/1code/branches?per_page=100`);
    const customBranches = branches
      .filter(b => b.name !== 'main' && b.name !== 'master')
      .map(b => ({ name: b.name, commit: b.commit.sha }));

    // Get commits
    const commits = await fetch(`https://api.github.com/repos/${owner}/1code/commits?per_page=10`);
    const uniqueCommits = commits
      .filter(c => {
        const msg = c.commit.message.toLowerCase();
        const isOwnCommit = c.author?.login === owner;
        return isOwnCommit &&
               !msg.includes('merge') &&
               !msg.includes('upstream') &&
               !msg.includes('sync') &&
               !msg.includes('cherry');
      })
      .slice(0, 5)
      .map(c => ({
        message: c.commit.message.split('\n')[0].substring(0, 100),
        date: c.commit.author.date.substring(0, 10),
        author: c.author?.login
      }));

    // Compare with upstream
    let aheadBy = 0;
    let behindBy = 0;
    try {
      const comparison = await fetch(`https://api.github.com/repos/${owner}/1code/compare/21st-dev:main...${owner}:main`);
      aheadBy = comparison.ahead_by || 0;
      behindBy = comparison.behind_by || 0;
    } catch (e) {
      // Comparison may fail if branches diverged too much
    }

    return {
      owner,
      url: `https://github.com/${owner}/1code`,
      stars,
      description,
      customBranches,
      branchCount: customBranches.length,
      uniqueCommits,
      aheadBy,
      behindBy,
      interesting: customBranches.length > 0 || aheadBy > 0 || uniqueCommits.length > 0 || stars > 0
    };
  } catch (error) {
    return {
      owner,
      error: error.message,
      interesting: false
    };
  }
}

async function main() {
  console.log('Fetching forks page 3 (201-300)...\n');

  // Fetch forks list
  const forks = await fetch('https://api.github.com/repos/21st-dev/1code/forks?per_page=100&page=3');
  console.log(`Found ${forks.length} forks\n`);

  const results = [];
  let processed = 0;

  for (const fork of forks) {
    const owner = fork.owner.login;
    process.stdout.write(`Analyzing ${owner}... `);

    const result = await analyzeFork(owner);
    results.push(result);
    processed++;

    if (result.error) {
      console.log(`ERROR: ${result.error}`);
    } else {
      console.log(`OK (branches: ${result.branchCount}, ahead: ${result.aheadBy}, stars: ${result.stars})`);
    }

    // Rate limiting - wait between requests
    await new Promise(r => setTimeout(r, 300));
  }

  // Sort by interesting criteria
  results.sort((a, b) => {
    if (!a.interesting && !b.interesting) return 0;
    if (!a.interesting) return 1;
    if (!b.interesting) return -1;
    return b.stars - a.stars || b.aheadBy - a.aheadBy || b.branchCount - a.branchCount;
  });

  // Print report
  console.log('\n' + '='.repeat(80));
  console.log('FORKS ANALYSIS REPORT (201-300)');
  console.log('='.repeat(80) + '\n');

  const interesting = results.filter(r => r.interesting);
  console.log(`Total forks analyzed: ${processed}`);
  console.log(`Interesting forks: ${interesting.length}\n`);

  console.log('='.repeat(80));
  console.log('MOST INTERESTING FORKS');
  console.log('='.repeat(80) + '\n');

  interesting.forEach((fork, i) => {
    console.log(`${i + 1}. ${fork.owner}`);
    console.log(`   URL: ${fork.url}`);
    console.log(`   Stars: ${fork.stars}`);
    if (fork.description) console.log(`   Description: ${fork.description}`);
    if (fork.customBranches.length > 0) {
      console.log(`   Custom branches (${fork.customBranches.length}): ${fork.customBranches.map(b => b.name).join(', ')}`);
    }
    if (fork.aheadBy > 0) {
      console.log(`   Ahead of upstream: ${fork.aheadBy} commits`);
    }
    if (fork.behindBy > 0) {
      console.log(`   Behind upstream: ${fork.behindBy} commits`);
    }
    if (fork.uniqueCommits.length > 0) {
      console.log('   Unique commits:');
      fork.uniqueCommits.forEach(c => {
        console.log(`     - ${c.message} (${c.date})`);
      });
    }
    console.log(`   Worth investigating: ${fork.interesting ? 'YES' : 'no'}`);
    console.log('');
  });

  // Save full results
  fs.writeFileSync('forks_analysis_201_300.json', JSON.stringify(results, null, 2));
  console.log('Full results saved to forks_analysis_201_300.json');
}

main().catch(console.error);
