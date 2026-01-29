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
    return branches.map(b => b.name).filter(b => b !== 'main');
  } catch (e) {
    return [];
  }
}

async function getCommits(owner) {
  try {
    const commits = await fetchJSON(`https://api.github.com/repos/${owner}/1code/commits?per_page=5`);
    return commits.filter(c => {
      const msg = c.commit.message.toLowerCase();
      return !msg.includes('merge') && !msg.includes('sync') && !msg.includes('upstream');
    }).map(c => ({
      message: c.commit.message.split('\n')[0],
      date: c.commit.author.date,
      author: c.author?.login || c.commit.author.name
    }));
  } catch (e) {
    return [];
  }
}

async function compareWithUpstream(owner) {
  try {
    const comparison = await fetchJSON(`https://api.github.com/repos/${owner}/1code/compare/21st-dev:main...${owner}:main`);
    return {
      ahead: comparison.ahead_by,
      behind: comparison.behind_by,
      diverged: comparison.status !== 'identical'
    };
  } catch (e) {
    return { ahead: 0, behind: 0, diverged: false };
  }
}

async function analyzeForks() {
  console.log('Fetching forks 101-200...\n');
  const forks = await fetchJSON('https://api.github.com/repos/21st-dev/1code/forks?per_page=100&page=2');

  const results = [];

  for (const fork of forks) {
    const owner = fork.owner.login;
    const stars = fork.stargazers_count;
    const description = fork.description || '';
    const url = fork.html_url;

    // Skip if no description and no stars (likely inactive)
    if (!description && stars === 0) {
      continue;
    }

    console.log(`Analyzing ${owner}...`);

    const [customBranches, uniqueCommits, comparison] = await Promise.all([
      getBranches(owner),
      getCommits(owner),
      compareWithUpstream(owner)
    ]);

    if (customBranches.length > 0 || uniqueCommits.length > 0 || comparison.ahead > 0 || stars > 0) {
      results.push({
        owner,
        description,
        stars,
        url,
        customBranches,
        uniqueCommits,
        comparison
      });
    }

    // Rate limit delay
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=== INTERESTING FORKS (101-200) ===\n');
  results.forEach((r, i) => {
    console.log(`${i + 1}. @${r.owner}`);
    console.log(`   URL: ${r.url}`);
    console.log(`   Stars: ${r.stars}`);
    console.log(`   Description: ${r.description}`);
    if (r.customBranches.length > 0) {
      console.log(`   Custom branches: ${r.customBranches.join(', ')}`);
    }
    if (r.comparison.ahead > 0) {
      console.log(`   Ahead of upstream: ${r.comparison.ahead} commits`);
    }
    if (r.uniqueCommits.length > 0) {
      console.log(`   Unique commits:`);
      r.uniqueCommits.forEach(c => {
        console.log(`     - ${c.message} (${c.author}, ${c.date})`);
      });
    }
    console.log('');
  });

  console.log(`\nTotal interesting forks found: ${results.length}`);
}

analyzeForks().catch(console.error);
